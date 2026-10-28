import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

// The store reads AICTE_DATA_DIR at import time, so point it at a disposable directory first.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aicte-db-test-"));
process.env.AICTE_DATA_DIR = dir;
const dbFile = path.join(dir, "db.json");

let store: typeof import("../src/store/database");
let bus: typeof import("../src/sockets/eventBus");
let workflow: typeof import("../src/controllers/applicationController");

before(async () => {
  store = await import("../src/store/database");
  bus = await import("../src/sockets/eventBus");
  workflow = await import("../src/controllers/applicationController");
  store.getDatabase();
  await store.flushDatabase();
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("first boot persists the seed as compact JSON", () => {
  const raw = fs.readFileSync(dbFile, "utf8");
  assert.ok(!raw.includes("\n  "), "file must not be pretty-printed");
  const parsed = JSON.parse(raw);
  assert.equal(parsed.applications.length, store.getDatabase().applications.length);
});

test("a burst of mutations is coalesced into one write", async () => {
  const before = store.getPersistenceStats().writes;
  const acks = Array.from({ length: 25 }, () => store.mutateDatabase((db) => db.applications[0]!.updatedAt));
  assert.equal(store.getPersistenceStats().pending, true);
  await Promise.all(acks);
  assert.equal(store.getPersistenceStats().writes - before, 1);
});

test("a workflow mutation and the audit event it publishes cost one disk write, not two", async () => {
  const admin = { sub: "a", role: "AICTE_ADMIN", name: "Admin", email: "a@x", institutionId: null, institutionName: null } as never;
  const submitted = store.getDatabase().applications.find((a) => a.currentState === "SUBMITTED");
  assert.ok(submitted, "seed contains a submitted application");
  const before = store.getPersistenceStats().writes;
  await workflow.transitionApplication(admin, submitted.id, { target: "UNDER_SCRUTINY" });
  await store.flushDatabase();
  assert.equal(store.getPersistenceStats().writes - before, 1);
  const onDisk = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  assert.equal(onDisk.applications.find((a: { id: string }) => a.id === submitted.id).currentState, "UNDER_SCRUTINY");
  assert.equal(onDisk.events[0].applicationId, submitted.id, "the event is persisted in the same snapshot");
});

test("version increases on every committed change and never on reads", async () => {
  const v0 = store.getDatabaseVersion();
  store.getDatabase();
  store.recentEvents();
  assert.equal(store.getDatabaseVersion(), v0);
  bus.emitEvent({ type: "STATE_CHANGED", title: "t", message: "m" });
  assert.ok(store.getDatabaseVersion() > v0);
  await store.flushDatabase();
});

test("what is on disk equals memory after a flush, and no temp files are left behind", async () => {
  await store.mutateDatabase((db) => {
    db.applications[1]!.updatedAt = "2030-01-01T00:00:00.000Z";
  });
  const onDisk = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  assert.equal(onDisk.applications[1].updatedAt, "2030-01-01T00:00:00.000Z");
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith(".tmp")), []);
});

test("flushDatabaseSync persists pending changes (graceful shutdown path) and acknowledges their writers", async () => {
  const ack = store.mutateDatabase((db) => {
    db.applications[2]!.updatedAt = "2031-02-02T00:00:00.000Z";
  });
  store.flushDatabaseSync();
  await ack;
  const onDisk = JSON.parse(fs.readFileSync(dbFile, "utf8"));
  assert.equal(onDisk.applications[2].updatedAt, "2031-02-02T00:00:00.000Z");
});
