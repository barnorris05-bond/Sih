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

const globalForDb = globalThis as unknown as { __aicteDatabase?: DatabaseShape };

function ensureDataDir(): void {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {
    // Ignore — if the directory can't be created, writeToDisk will handle it.
  }
}

function readFromDisk(): DatabaseShape | null {
  try {
    if (!fs.existsSync(databaseFile)) return null;
    const raw = fs.readFileSync(databaseFile, "utf8");
    const parsed = JSON.parse(raw) as DatabaseShape;
    if (!parsed || !Array.isArray(parsed.applications) || !Array.isArray(parsed.users)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeToDisk(db: DatabaseShape): void {
  try {
    ensureDataDir();
    const temp = path.join(dataDir, `db.${process.pid}.tmp`);
    fs.writeFileSync(temp, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(temp, databaseFile);
  } catch (err) {
    // Vercel and other read-only serverless environments cannot persist to the
    // filesystem. Log once and continue — the database stays in-memory for the
    // lifetime of this container.
    if ((err as NodeJS.ErrnoException).code === "EROFS" ||
        (err as NodeJS.ErrnoException).code === "EACCES" ||
        (err as NodeJS.ErrnoException).code === "ENOENT") {
      if (!process.env.__AICTE_FS_WARNED) {
        process.env.__AICTE_FS_WARNED = "1";
        console.warn("[aicte-db] Filesystem is read-only; running with in-memory store only.");
      }
      return;
    }
    throw err;
  }
}

export function getDatabase(): DatabaseShape {
  if (globalForDb.__aicteDatabase) return globalForDb.__aicteDatabase;
  const seeded = readFromDisk();
  if (seeded) {
    globalForDb.__aicteDatabase = seeded;
    return seeded;
  }
  const fresh = createSeedDatabase();
  globalForDb.__aicteDatabase = fresh;
  writeToDisk(fresh);
  return fresh;
}

/** Runs a mutation against the database and flushes the result atomically. */
export function mutateDatabase<T>(mutator: (db: DatabaseShape) => T): T {
  const db = getDatabase();
  const result = mutator(db);
  writeToDisk(db);
  return result;
}

export function saveDatabase(): void {
  writeToDisk(getDatabase());
}

export function resetDatabase(): DatabaseShape {
  const fresh = createSeedDatabase();
  globalForDb.__aicteDatabase = fresh;
  writeToDisk(fresh);
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
  const db = getDatabase();
  if (user.role === "INSTITUTION_USER" && user.institutionId) {
    return db.applications.filter((app) => app.institutionId === user.institutionId);
  }
  return [...db.applications];
}

export function findApplication(id: string): Application | null {
  return getDatabase().applications.find((app) => app.id === id) ?? null;
}

export function pushEvent(event: PlatformEvent): void {
  const db = getDatabase();
  db.events.unshift(event);
  db.events = db.events.slice(0, 120);
  writeToDisk(db);
}

export function recentEvents(limit = 30): PlatformEvent[] {
  return getDatabase().events.slice(0, limit);
}
