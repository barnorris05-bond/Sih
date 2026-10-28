import fs from "node:fs";
import path from "node:path";
import type {
  Application,
  Institution,
  PlatformEvent,
  User,
} from "@aicte/shared";
import { dataDir, databaseFile } from "../config/env";
import { createSeedDatabase } from "./seed";
import { appInScope, scopeFor } from "../security/scope";

export interface UserRecord extends User {
  passwordHash: string;
}

export interface DatabaseShape {
  version: number;
  seededAt: string;
  users: UserRecord[];
  institutions: Institution[];
  applications: Application[];
  events: PlatformEvent[];
}

/* -------------------------------------------------------------------------- */
/*  Persistence model                                                           */
/*                                                                              */
/*  The store is one in-memory object persisted as one JSON file.               */
/*                                                                              */
/*  Guarantees                                                                  */
/*  - `mutateDatabase` (every business write: drafts, submissions,             */
/*    resubmissions, transitions, deficiency updates) resolves only after a    */
/*    snapshot containing the change has been written and atomically renamed   */
/*    into place. An acknowledged change survives the process being killed.    */
/*    (Surviving an OS crash or power loss additionally needs AICTE_FSYNC=1.)  */
/*  - Writes made in the same tick, or while a write is in flight, share the   */
/*    next snapshot (group commit): one disk write acknowledges all of them.   */
/*  - If the snapshot cannot be written (after retries) every change not yet   */
/*    on disk is rolled back in memory, every waiting writer is rejected with  */
/*    PersistenceError, and events published by those changes are discarded —  */
/*    the store never reports success for, or keeps serving, a change that    */
/*    was not committed.                                                       */
/*  - Platform events are delivered to live subscribers only after the         */
/*    snapshot that contains them is committed, and travel in that snapshot.   */
/*  - On a read-only filesystem (serverless) the store is memory-only: writes   */
/*    succeed but are not durable. `getPersistenceStats().mode` reports this.  */
/*  - Mutators must validate before they mutate: a mutator that throws must    */
/*    not have changed the store (every current mutator follows this).         */
/*  - Reads may observe a change up to one flush before it is acknowledged;     */
/*    if that flush fails the change disappears again (rollback).              */
/* -------------------------------------------------------------------------- */

export class PersistenceError extends Error {
  readonly code = "PERSISTENCE_FAILED";
  readonly status = 503;

  constructor(message = "The change could not be saved. Nothing was changed; please retry.") {
    super(message);
    this.name = "PersistenceError";
  }
}

export type SnapshotWriter = (json: string) => Promise<void>;

interface Waiter {
  seq: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

interface PersistenceState {
  /** Monotonic counter bumped on every change to the in-memory store (also a cache key). */
  version: number;
  dirty: boolean;
  scheduled: boolean;
  flushing: boolean;
  writes: number;
  lastWriteMs: number;
  failures: number;
  errorLogged: boolean;
  exitHooked: boolean;
  mode: "disk" | "memory";
  /** The last snapshot known to be on disk (or loaded from it): the rollback target. */
  lastGood: string | null;
  waiters: Waiter[];
  afterCommit: Array<{ seq: number; run: () => void }>;
  writer: SnapshotWriter | null;
}

// Next.js bundles server code into several chunks, so module-level state would be duplicated
// per chunk. Everything shared lives on globalThis (same pattern as the database itself).
const globalForDb = globalThis as unknown as {
  __aicteDatabase?: DatabaseShape;
  __aictePersistence?: PersistenceState;
};

function persistence(): PersistenceState {
  if (!globalForDb.__aictePersistence) {
    globalForDb.__aictePersistence = {
      version: 0,
      dirty: false,
      scheduled: false,
      flushing: false,
      writes: 0,
      lastWriteMs: 0,
      failures: 0,
      errorLogged: false,
      exitHooked: false,
      mode: "disk",
      lastGood: null,
      waiters: [],
      afterCommit: [],
      writer: null,
    };
  }
  return globalForDb.__aictePersistence;
}

function ensureDataDir(): void {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {
    // Ignore — if the directory can't be created, the flush will handle it.
  }
}

function readSnapshotFromDisk(): { db: DatabaseShape; raw: string } | null {
  try {
    if (!fs.existsSync(databaseFile)) return null;
    const raw = fs.readFileSync(databaseFile, "utf8");
    const parsed = JSON.parse(raw) as DatabaseShape;
    if (!parsed || !Array.isArray(parsed.applications) || !Array.isArray(parsed.users)) {
      return null;
    }
    return { db: parsed, raw };
  } catch {
    return null;
  }
}

/** Read-only or ephemeral filesystems (e.g. serverless) cannot persist; the store stays in memory. */
function isUnwritable(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code;
  return code === "EROFS" || code === "EACCES" || code === "ENOENT";
}

function warnMemoryOnly(): void {
  if (!process.env.__AICTE_FS_WARNED) {
    process.env.__AICTE_FS_WARNED = "1";
    console.warn("[aicte-db] Filesystem is read-only; running with in-memory store only.");
  }
}

function reportWriteFailure(err: unknown): void {
  const state = persistence();
  state.failures += 1;
  if (!state.errorLogged) {
    state.errorLogged = true;
    console.error(
      JSON.stringify({ evt: "db.flush_failed", code: (err as NodeJS.ErrnoException)?.code ?? "UNKNOWN" }),
    );
  }
}

const FSYNC = process.env.AICTE_FSYNC === "1";

/** Default writer: temp file, optional fsync, atomic rename. */
async function writeSnapshotToDisk(json: string): Promise<void> {
  ensureDataDir();
  const temp = path.join(dataDir, `db.${process.pid}.tmp`);
  const handle = await fs.promises.open(temp, "w");
  try {
    await handle.writeFile(json, "utf8");
    if (FSYNC) await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.promises.rename(temp, databaseFile);
}

const RETRY_DELAYS_MS = [5, 25];

/** Transient failures (a scanner holding the file, momentary EBUSY) get a couple of quick retries. */
async function writeWithRetry(json: string): Promise<void> {
  const write = persistence().writer ?? writeSnapshotToDisk;
  for (let attempt = 0; ; attempt += 1) {
    try {
      await write(json);
      return;
    } catch (err) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (isUnwritable(err) || delay === undefined) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/** A snapshot covering every change up to `seq` is durable (or, memory-only, as durable as it can be). */
function settle(seq: number): void {
  const state = persistence();
  const ready = state.waiters.filter((waiter) => waiter.seq <= seq);
  state.waiters = state.waiters.filter((waiter) => waiter.seq > seq);
  const deliver = state.afterCommit.filter((item) => item.seq <= seq);
  state.afterCommit = state.afterCommit.filter((item) => item.seq > seq);
  for (const item of deliver) {
    try {
      item.run();
    } catch {
      // a faulty subscriber must never break the commit path
    }
  }
  for (const waiter of ready) waiter.resolve();
}

/** The flush failed: return memory to the last committed state and fail every writer waiting on it. */
function rollback(): void {
  const state = persistence();
  if (state.lastGood) globalForDb.__aicteDatabase = JSON.parse(state.lastGood) as DatabaseShape;
  state.dirty = false;
  state.version += 1;
  const waiters = state.waiters;
  state.waiters = [];
  state.afterCommit = [];
  for (const waiter of waiters) waiter.reject(new PersistenceError());
}

/**
 * Single-flight flush loop. Changes made while a write is in flight set `dirty` again and are written
 * by the next loop iteration, so at most one write runs at a time and nothing is ever skipped.
 */
async function runFlush(): Promise<void> {
  const state = persistence();
  state.scheduled = false;
  if (state.flushing) return;
  state.flushing = true;
  try {
    while (state.dirty) {
      state.dirty = false;
      const seq = state.version;
      const started = performance.now();
      const snapshot = JSON.stringify(getDatabase());
      try {
        await writeWithRetry(snapshot);
        state.writes += 1;
        state.lastWriteMs = performance.now() - started;
        state.mode = "disk";
        state.errorLogged = false;
        state.lastGood = snapshot;
        settle(seq);
      } catch (err) {
        if (isUnwritable(err)) {
          // Nothing can ever be persisted here (read-only / ephemeral filesystem): memory-only mode.
          warnMemoryOnly();
          state.mode = "memory";
          state.lastGood = snapshot;
          settle(seq);
        } else {
          reportWriteFailure(err);
          rollback();
          break;
        }
      }
    }
  } finally {
    state.flushing = false;
  }
}

function hookProcessExit(): void {
  const state = persistence();
  if (state.exitHooked) return;
  state.exitHooked = true;
  // 'exit' handlers must be synchronous: persist anything still pending (events, SLA escalations) so a
  // graceful shutdown never loses them. Acknowledged business writes are already on disk.
  process.on("exit", () => {
    try {
      flushDatabaseSync();
    } catch {
      // best effort during shutdown
    }
  });
}

/** Records a change to the in-memory store and schedules its flush. Returns the change's sequence number. */
function markDirty(): number {
  const state = persistence();
  state.version += 1;
  state.dirty = true;
  hookProcessExit();
  if (!state.scheduled && !state.flushing) {
    state.scheduled = true;
    // A microtask (not a timer/immediate) starts the flush as soon as the current synchronous work —
    // the mutation and the audit event it publishes — is done, so they still share one snapshot.
    queueMicrotask(() => {
      void runFlush();
    });
  }
  return state.version;
}

/** Synchronously persists pending changes (shutdown and tests). */
export function flushDatabaseSync(): void {
  const state = persistence();
  if (!state.dirty || !globalForDb.__aicteDatabase) return;
  state.dirty = false;
  const seq = state.version;
  try {
    ensureDataDir();
    const snapshot = JSON.stringify(globalForDb.__aicteDatabase);
    const temp = path.join(dataDir, `db.${process.pid}.sync.tmp`);
    fs.writeFileSync(temp, snapshot, "utf8");
    fs.renameSync(temp, databaseFile);
    state.writes += 1;
    state.lastGood = snapshot;
    settle(seq);
  } catch (err) {
    if (isUnwritable(err)) warnMemoryOnly();
    else {
      reportWriteFailure(err);
      state.dirty = true;
    }
  }
}

/** Resolves once every pending change has been written (or has failed and been rolled back). */
export async function flushDatabase(): Promise<void> {
  const state = persistence();
  while (state.scheduled || state.flushing) await new Promise((resolve) => setTimeout(resolve, 1));
  if (state.dirty) await runFlush();
}

export function getDatabaseVersion(): number {
  return persistence().version;
}

export function getPersistenceStats(): {
  version: number;
  writes: number;
  failures: number;
  lastWriteMs: number;
  pending: boolean;
  mode: "disk" | "memory";
} {
  const state = persistence();
  return {
    version: state.version,
    writes: state.writes,
    failures: state.failures,
    lastWriteMs: state.lastWriteMs,
    pending: state.dirty || state.scheduled || state.flushing,
    mode: state.mode,
  };
}

/** Test seam: replace the disk writer to inject slow or failing writes. Pass null to restore the default. */
export function setSnapshotWriter(writer: SnapshotWriter | null): void {
  persistence().writer = writer;
}

/**
 * Runs `callback` once the snapshot that contains the changes made so far is committed; it is dropped
 * if that snapshot fails and is rolled back. Used so live subscribers only hear about committed events.
 */
export function afterCommit(callback: () => void): void {
  const state = persistence();
  state.afterCommit.push({ seq: state.version, run: callback });
}

export function getDatabase(): DatabaseShape {
  if (globalForDb.__aicteDatabase) return globalForDb.__aicteDatabase;
  const loaded = readSnapshotFromDisk();
  if (loaded) {
    globalForDb.__aicteDatabase = loaded.db;
    persistence().lastGood = loaded.raw;
    return loaded.db;
  }
  const fresh = createSeedDatabase();
  globalForDb.__aicteDatabase = fresh;
  persistence().lastGood = JSON.stringify(fresh);
  markDirty();
  return fresh;
}

/**
 * Applies a business write and resolves once it is durable (see the guarantees above). The mutator
 * runs synchronously, so it is atomic with respect to every other request; a mutator that throws
 * rejects without writing, and a failed flush rejects with {@link PersistenceError} after rollback.
 */
export async function mutateDatabase<T>(mutator: (db: DatabaseShape) => T): Promise<T> {
  const db = getDatabase();
  const result = mutator(db);
  const seq = markDirty();
  await new Promise<void>((resolve, reject) => {
    persistence().waiters.push({ seq, resolve, reject });
  });
  return result;
}

/** Schedules persistence of background changes (SLA sweeps) without waiting for it. */
export function saveDatabase(): void {
  getDatabase();
  markDirty();
}

export function resetDatabase(): DatabaseShape {
  const fresh = createSeedDatabase();
  globalForDb.__aicteDatabase = fresh;
  markDirty();
  return fresh;
}

export function findUserByEmail(email: string): UserRecord | null {
  const db = getDatabase();
  return db.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function findUserById(id: string): UserRecord | null {
  return getDatabase().users.find((user) => user.id === id) ?? null;
}

export function findInstitution(id: string): Institution | null {
  return getDatabase().institutions.find((institution) => institution.id === id) ?? null;
}

export function listApplicationsForUser(user: User): Application[] {
  const scope = scopeFor({ role: user.role, institutionId: user.institutionId, region: user.region });
  return getDatabase().applications.filter((app) => appInScope(scope, app));
}

export function findApplication(id: string): Application | null {
  return getDatabase().applications.find((app) => app.id === id) ?? null;
}

export function pushEvent(event: PlatformEvent): void {
  const db = getDatabase();
  db.events.unshift(event);
  db.events = db.events.slice(0, 120);
  markDirty();
}

export function recentEvents(limit = 30): PlatformEvent[] {
  return getDatabase().events.slice(0, limit);
}
