import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import type { SessionPayload } from "@aicte/shared";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aicte-wf-test-"));
process.env.AICTE_DATA_DIR = dir;

let be: typeof import("../src/index");
let institutionA: SessionPayload;
let institutionB: SessionPayload;
let admin: SessionPayload;

function sessionFor(user: { id: string; email: string; name: string; role: SessionPayload["role"]; institutionId: string | null }): SessionPayload {
  return { sub: user.id, email: user.email, name: user.name, role: user.role, institutionId: user.institutionId, institutionName: null } as SessionPayload;
}

before(async () => {
  be = await import("../src/index");
  const db = be.getDatabase();
  const institutionUsers = db.users.filter((u) => u.role === "INSTITUTION_USER" && u.institutionId);
  const a = institutionUsers[0]!;
  const otherInstitutionId = db.applications.map((app) => app.institutionId).find((id) => id !== a.institutionId)!;
  institutionA = sessionFor(a);
  institutionB = sessionFor({ ...a, id: "other-user", institutionId: otherInstitutionId });
  admin = sessionFor({ id: "admin", email: "a@x", name: "Admin", role: "AICTE_ADMIN", institutionId: null });
});

after(async () => {
  await be.flushDatabase();
  fs.rmSync(dir, { recursive: true, force: true });
});

const status = (code: number) => (error: Error & { status?: number }) => error.status === code;

test("institution users only see their own applications; staff see all", () => {
  const own = be.listApplications(institutionA);
  assert.ok(own.length > 0);
  assert.ok(own.every((app) => app.institutionId === institutionA.institutionId));
  assert.ok(be.listApplications(admin).length > own.length);
});

test("an institution cannot read another institution's application", () => {
  const foreign = be.listApplications(institutionB)[0];
  assert.ok(foreign, "the other institution has an application");
  assert.throws(() => be.getApplication(institutionA, foreign.id), status(403));
});

test("summaries drop the heavy payload but keep every field list views render", () => {
  const full = be.listApplications(admin);
  const summaries = be.listApplicationSummaries(admin);
  assert.equal(summaries.length, full.length);
  for (const [index, summary] of summaries.entries()) {
    const app = full[index]!;
    assert.ok(!("formData" in summary) && !("auditLogs" in summary));
    for (const key of ["id", "currentState", "complianceScore", "slaDeadline", "escalated", "updatedAt", "academicYear", "deficiencies", "institution"] as const) {
      assert.deepEqual(summary[key], app[key]);
    }
  }
  assert.ok(JSON.stringify(summaries).length < JSON.stringify(full).length * 0.5, "summaries are less than half the size");
});

test("saving a draft twice updates the same draft (idempotent)", async () => {
  const first = await be.saveDraft(institutionA, { facultyCount: 40 });
  const second = await be.saveDraft(institutionA, { facultyCount: 41 });
  assert.equal(first.id, second.id);
  assert.equal(second.formData.facultyCount, 41);
});

test("a duplicated submission is rejected, not applied twice", async () => {
  const draft = await be.saveDraft(institutionA, {});
  const first = await be.submitApplication(institutionA, draft.formData, draft.id);
  assert.notEqual(first.currentState, "DRAFT");
  const logsAfterFirst = be.getApplication(institutionA, draft.id).auditLogs.length;
  await assert.rejects(() => be.submitApplication(institutionA, draft.formData, draft.id), status(409));
  assert.equal(be.getApplication(institutionA, draft.id).auditLogs.length, logsAfterFirst, "no duplicate side effects");
});

test("institution users cannot move workflow stages", async () => {
  const app = be.listApplications(institutionA)[0]!;
  await assert.rejects(() => be.transitionApplication(institutionA, app.id, { target: "APPROVED" }), status(403));
});

test("authentication is asynchronous and rejects bad credentials", async () => {
  assert.equal(await be.authenticate("admin@aicte.demo", "definitely-wrong"), null);
  assert.equal(await be.authenticate("nobody@aicte.demo", "demo1234"), null);
  const user = await be.authenticate("admin@aicte.demo", "demo1234");
  assert.equal(user?.role, "AICTE_ADMIN");
});
