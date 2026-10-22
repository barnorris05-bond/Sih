import fs from "node:fs";
import path from "node:path";
import { AUTH_SECRET_FALLBACK } from "@aicte/shared";

function findRepoRoot(start: string): string {
  let current = path.resolve(start);
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(current, "shared", "rules", "aphRules.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(start);
}

export const repoRoot = findRepoRoot(process.cwd());

export const dataDir = process.env.AICTE_DATA_DIR
  ? path.resolve(process.env.AICTE_DATA_DIR)
  : path.join(repoRoot, "backend", ".data");

export const databaseFile = path.join(dataDir, "db.json");

/** HS256 signing key. Override with AUTH_SECRET in every non-demo deployment. */
export const authSecret = process.env.AUTH_SECRET ?? AUTH_SECRET_FALLBACK;

export const sessionTtlHours = 12;

export const demoPassword = "demo1234";

export const demoTenant = {
  aicteCode: "1-10293846",
  name: "Sundar Institute of Technology",
};
