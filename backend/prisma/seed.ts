/**
 * Rebuilds the local demo dataset (50 applications).
 *
 *   npm run seed           # from the repository root
 *   npm run seed -w @aicte/backend
 *
 * The production PostgreSQL path is documented in README.md: the same seed
 * shape maps 1:1 onto `prisma/schema.prisma`.
 */
import { resetDatabase } from "../src/store/database";

const db = resetDatabase();
console.log(
  `[seed] ${db.applications.length} applications across ${db.institutions.length} institutions, ${db.users.length} users.`,
);
console.log(`[seed] ${db.applications.filter((a) => a.currentState === "DEFICIENCY_NOTIFIED").length} deficiency notices, ${db.applications.filter((a) => a.escalated).length} SLA escalations.`);
console.log("[seed] demo credentials: institution@aicte.demo / reviewer@aicte.demo / officer@aicte.demo / admin@aicte.demo — password demo1234");
