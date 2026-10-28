import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, test } from "node:test";
import type { PlatformEvent, SessionPayload } from "@aicte/shared";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aicte-persist-test-"));
process.env.AICTE_DATA_DIR = dir;
const dbFile = path.join(dir, "db.json");

let store: typeof import("../src/store/database");
let bus: typeof import("../src/sockets/eventBus");
let workflow: typeof import("../src/controllers/applicationController");
const admin = { sub: "admin", role: "AICTE_ADMIN", name: "Admin", email: "a@x", institutionId: null, institutionName: null } as SessionPayload;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = (code: string) => Object.assign(new Error(`injected ${code}`), { code });
const mark = (i: number, tag: string) => `${tag}-${i}`;

/** A writer that records every snapshot it is asked to write and how many writes overlapped. */
function recordingWriter(delayMs = 0, failWith?: () => Error | null) {
  const log = { calls: 0, snapshots: [] as string[], maxConcurrent: 0, inFlight: 0 };
  const writer = async (json: string) => {
    log.calls += 1;
    log.inFlight += 1;
    log.maxConcurrent = Math.max(log.maxConcurrent, log.inFlight);
    try {
      if (delayMs) await sleep(delayMs);
      const error = failWith?.();
      if (error) throw error;
      log.snapshots.push(json);
      fs.writeFileSync(dbFile, json); // keep the file in step so the final state can be inspected
    } finally {
      log.inFlight -= 1;
    }
  };
  return { writer, log };
}

before(async () => {
  store = await import("../src/store/database");
  bus = await import("../src/sockets/eventBus");
  workflow = await import("../src/controllers/applicationController");
  store.getDatabase();
  await store.flushDatabase();
});

afterEach(() => store.setSnapshotWriter(null));
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("an acknowledged write has already been written: the response cannot outrun the disk", async () => {
  const { writer, log } = recordingWriter(40);
  store.setSnapshotWriter(writer);
  let acknowledged = false;
  const ack = store.mutateDatabase((db) => {
    db.applications[0]!.updatedAt = mark(0, "slow");
  }).then(() => {
    acknowledged = true;
  });
  await sleep(10);
  assert.equal(acknowledged, false, "not acknowledged while the write is still in flight");
  await ack;
  assert.equal(log.calls, 1);
  assert.ok(JSON.parse(log.snapshots.at(-1)!).applications[0].updatedAt === mark(0, "slow"), "the snapshot written before the ack contains the change");
});

test("group commit: 30 concurrent writers share one write and are all acknowledged", async () => {
  const { writer, log } = recordingWriter(5);
  store.setSnapshotWriter(writer);
  await Promise.all(
    Array.from({ length: 30 }, (_, i) =>
      store.mutateDatabase((db) => {
        db.applications[i]!.updatedAt = mark(i, "group");
      }),
    ),
  );
  assert.equal(log.calls, 1);
  const written = JSON.parse(log.snapshots.at(-1)!).applications;
  for (let i = 0; i < 30; i += 1) assert.equal(written[i].updatedAt, mark(i, "group"));
});

test("overlapping flushes: writes never run concurrently and a change made mid-write is written next", async () => {
  const { writer, log } = recordingWriter(40);
  store.setSnapshotWriter(writer);
  const order: string[] = [];
  const first = store.mutateDatabase((db) => {
    db.applications[0]!.updatedAt = mark(0, "overlap-a");
  }).then(() => order.push("A"));
  await sleep(10); // the first write is now in flight
  const second = store.mutateDatabase((db) => {
    db.applications[1]!.updatedAt = mark(1, "overlap-b");
  }).then(() => order.push("B"));
  await Promise.all([first, second]);
  assert.deepEqual(order, ["A", "B"]);
  assert.equal(log.maxConcurrent, 1, "single-flight: never two writes at once");
  assert.equal(log.calls, 2);
  assert.ok(!JSON.parse(log.snapshots[0]!).applications[1].updatedAt.startsWith("overlap-b"), "the in-flight snapshot predates the later change");
  const finalState = JSON.parse(log.snapshots.at(-1)!).applications;
  assert.equal(finalState[0].updatedAt, mark(0, "overlap-a"));
  assert.equal(finalState[1].updatedAt, mark(1, "overlap-b"));
});

test("a failed write is surfaced, retried, rolled back, and never reported as success", async () => {
  const before = JSON.stringify(store.getDatabase());
  const versionBefore = store.getDatabaseVersion();
  const failuresBefore = store.getPersistenceStats().failures;
  const { writer, log } = recordingWriter(0, () => fail("ENOSPC"));
  store.setSnapshotWriter(writer);

  const logged: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => void logged.push(args.map(String).join(" "));
  let results: PromiseSettledResult<unknown>[];
  try {
    results = await Promise.allSettled([
      store.mutateDatabase((db) => {
        db.applications[0]!.updatedAt = mark(0, "doomed-a");
      }),
      store.mutateDatabase((db) => {
        db.applications[1]!.updatedAt = mark(1, "doomed-b");
      }),
    ]);
  } finally {
    console.error = originalError;
  }

  for (const result of results) {
    assert.equal(result.status, "rejected");
    const error = (result as PromiseRejectedResult).reason as Error & { code?: string; status?: number };
    assert.equal(error.name, "PersistenceError");
    assert.equal(error.code, "PERSISTENCE_FAILED");
    assert.equal(error.status, 503);
  }
  assert.equal(log.calls, 3, "one attempt plus two quick retries");
  assert.equal(JSON.stringify(store.getDatabase()), before, "memory is back at the last committed state");
  assert.ok(store.getDatabaseVersion() > versionBefore, "caches keyed on the version are invalidated");
  assert.ok(store.getPersistenceStats().failures > failuresBefore);
  assert.equal(store.getPersistenceStats().pending, false);
  const line = logged.join("\n");
  assert.match(line, /db\.flush_failed/);
  assert.ok(!/passwordHash|scrypt|demo1234|@aicte\.demo/.test(line), "failure logs carry an error code only, never data");
});

test("after a failure the store recovers: the next write succeeds and persists", async () => {
  const { writer, log } = recordingWriter();
  store.setSnapshotWriter(writer);
  await store.mutateDatabase((db) => {
    db.applications[2]!.updatedAt = mark(2, "recovered");
  });
  assert.equal(JSON.parse(log.snapshots.at(-1)!).applications[2].updatedAt, mark(2, "recovered"));
  assert.equal(store.getPersistenceStats().mode, "disk");
});

test("a transient failure (e.g. a scanner holding the file) is retried transparently", async () => {
  let failures = 1;
  const { writer, log } = recordingWriter(0, () => (failures-- > 0 ? fail("EBUSY") : null));
  store.setSnapshotWriter(writer);
  await store.mutateDatabase((db) => {
    db.applications[3]!.updatedAt = mark(3, "retry");
  });
  assert.equal(log.calls, 2);
  assert.equal(JSON.parse(log.snapshots.at(-1)!).applications[3].updatedAt, mark(3, "retry"));
});

test("read-only filesystems degrade to memory-only and say so, instead of failing every request", async () => {
  const { writer } = recordingWriter(0, () => fail("EROFS"));
  store.setSnapshotWriter(writer);
  const warned: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => void warned.push(args.map(String).join(" "));
  try {
    await store.mutateDatabase((db) => {
      db.applications[4]!.updatedAt = mark(4, "ephemeral");
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(store.getPersistenceStats().mode, "memory");
  assert.equal(store.getDatabase().applications[4]!.updatedAt, mark(4, "ephemeral"), "the change is kept in memory");
  const { writer: good } = recordingWriter();
  store.setSnapshotWriter(good);
  await store.mutateDatabase(() => undefined);
  assert.equal(store.getPersistenceStats().mode, "disk", "durability is reported again once writes succeed");
});

test("events are announced only after their snapshot is committed, and never for a rolled-back change", async () => {
  const received: PlatformEvent[] = [];
  const unsubscribe = bus.subscribeToEvents((event) => received.push(event));
  try {
    const submitted = store.getDatabase().applications.find((a) => a.currentState === "SUBMITTED")!;

    const failing = recordingWriter(0, () => fail("EIO"));
    store.setSnapshotWriter(failing.writer);
    const eventsBefore = store.getDatabase().events.length;
    const originalError = console.error;
    console.error = () => undefined;
    try {
      await assert.rejects(() => workflow.transitionApplication(admin, submitted.id, { target: "UNDER_SCRUTINY" }), (e: Error) => e.name === "PersistenceError");
    } finally {
      console.error = originalError;
    }
    assert.equal(received.length, 0, "no event for a change that was not committed");
    assert.equal(store.getDatabase().events.length, eventsBefore, "the event was rolled back with the change");
    assert.equal(store.getDatabase().applications.find((a) => a.id === submitted.id)!.currentState, "SUBMITTED");

    const good = recordingWriter();
    store.setSnapshotWriter(good.writer);
    const updated = await workflow.transitionApplication(admin, submitted.id, { target: "UNDER_SCRUTINY" });
    assert.equal(updated.currentState, "UNDER_SCRUTINY");
    assert.equal(received.length, 1, "delivered by the time the write is acknowledged");
    const persisted = JSON.parse(good.log.snapshots.at(-1)!);
    const onDisk = persisted.applications.find((a: { id: string }) => a.id === submitted.id);
    assert.equal(onDisk.currentState, "UNDER_SCRUTINY");
    assert.equal(onDisk.auditLogs.at(-1).newState, "UNDER_SCRUTINY", "the audit record is in the same snapshot");
    assert.equal(persisted.events[0].applicationId, submitted.id, "so is the event");
  } finally {
    unsubscribe();
  }
});

test("a rejected operation changes nothing and writes nothing", async () => {
  const { writer, log } = recordingWriter();
  store.setSnapshotWriter(writer);
  const before = JSON.stringify(store.getDatabase());
  const approved = store.getDatabase().applications.find((a) => a.currentState === "APPROVED")!;
  await assert.rejects(() => workflow.transitionApplication(admin, approved.id, { target: "SUBMITTED" }));
  await assert.rejects(() => workflow.transitionApplication(admin, "no-such-application", { target: "APPROVED" }));
  await store.flushDatabase();
  assert.equal(log.calls, 0);
  assert.equal(JSON.stringify(store.getDatabase()), before);
});

/* ---------------- hard process termination ---------------- */

function crashTrial(marker: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const trialDir = fs.mkdtempSync(path.join(os.tmpdir(), "aicte-crash-"));
    const child = spawn(process.execPath, ["--import", "tsx", path.join(import.meta.dirname, "fixtures", "crash-child.ts"), trialDir, marker], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let acknowledged = false;
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (!acknowledged && output.includes("ACK\n")) {
        acknowledged = true;
        child.kill("SIGKILL"); // hard kill the instant the write was acknowledged: no exit handlers run
      }
    });
    child.on("exit", () => {
      try {
        if (!acknowledged) throw new Error(`child never acknowledged: ${output}`);
        const raw = fs.readFileSync(path.join(trialDir, "db.json"), "utf8");
        resolve(JSON.parse(raw).applications[0].updatedAt);
      } catch (error) {
        reject(error);
      } finally {
        fs.rmSync(trialDir, { recursive: true, force: true });
      }
    });
    child.on("error", reject);
  });
}

test("hard kill (SIGKILL) immediately after an acknowledgement never loses the acknowledged change", async () => {
  for (const trial of ["one", "two", "three", "four"]) {
    const marker = `ACKED-${trial}`;
    assert.equal(await crashTrial(marker), marker, `trial ${trial}`);
  }
});
