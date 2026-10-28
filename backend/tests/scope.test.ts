import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import type { Application, SessionPayload } from "@aicte/shared";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aicte-scope-test-"));
process.env.AICTE_DATA_DIR = dir;

let be: typeof import("../src/index");
let officer: SessionPayload; // assigned to the seeded demo region
let admin: SessionPayload;
let reviewer: SessionPayload;
let institution: SessionPayload;
let region: string;
let inRegion: Application[];
let outOfRegion: Application[];

const session = (sub: string, role: SessionPayload["role"], institutionId: string | null = null): SessionPayload =>
  ({ sub, email: `${sub}@x`, name: sub, role, institutionId, institutionName: null }) as SessionPayload;

const status = (code: number) => (error: Error & { status?: number }) => error.status === code;

before(async () => {
  be = await import("../src/index");
  const db = be.getDatabase();
  const officerRecord = db.users.find((u) => u.role === "REGIONAL_OFFICER")!;
  assert.ok(officerRecord.region, "the seeded officer has a region assignment");
  region = officerRecord.region!;
  officer = session(officerRecord.id, "REGIONAL_OFFICER");
  admin = session("admin", "AICTE_ADMIN");
  reviewer = session("reviewer", "SCRUTINY_MEMBER");
  const instUser = db.users.find((u) => u.role === "INSTITUTION_USER")!;
  institution = session(instUser.id, "INSTITUTION_USER", instUser.institutionId);
  inRegion = db.applications.filter((a) => a.institution.region === region);
  outOfRegion = db.applications.filter((a) => a.institution.region !== region);
  assert.ok(inRegion.length > 0 && outOfRegion.length > 0, "fixture spans several regions");
});

after(async () => {
  await be.flushDatabase();
  fs.rmSync(dir, { recursive: true, force: true });
});

/* ---------------- rule matrix ---------------- */

test("scope rules: roles, assignments and fail-closed defaults", () => {
  assert.deepEqual(be.scopeFor({ role: "AICTE_ADMIN", institutionId: null }), { kind: "all" });
  assert.deepEqual(be.scopeFor({ role: "SCRUTINY_MEMBER", institutionId: null }), { kind: "all" });
  assert.deepEqual(be.scopeFor({ role: "INSTITUTION_USER", institutionId: "inst-01" }), { kind: "institution", institutionId: "inst-01" });
  assert.deepEqual(be.scopeFor({ role: "REGIONAL_OFFICER", institutionId: null, region: "South" }), { kind: "region", region: "South" });
  for (const bad of [null, undefined, "", "Atlantis", "south"]) {
    assert.deepEqual(be.scopeFor({ role: "REGIONAL_OFFICER", institutionId: null, region: bad }), { kind: "none" }, `region ${String(bad)}`);
  }
  // An institution user with no bound institution used to see EVERY application; now sees none.
  assert.deepEqual(be.scopeFor({ role: "INSTITUTION_USER", institutionId: null }), { kind: "none" });
  assert.deepEqual(be.scopeFor({ role: "NOT_A_ROLE" as never, institutionId: null }), { kind: "none" });
});

/* ---------------- list / read ---------------- */

test("list: an officer sees exactly the applications of their assigned region", () => {
  const listed = be.listApplications(officer);
  assert.equal(listed.length, inRegion.length);
  assert.ok(listed.every((app) => app.institution.region === region));
  assert.deepEqual(be.listApplicationSummaries(officer).map((a) => a.id).sort(), listed.map((a) => a.id).sort());
});

test("list: unrestricted roles and institution isolation are unchanged", () => {
  const total = be.getDatabase().applications.length;
  assert.equal(be.listApplications(admin).length, total);
  assert.equal(be.listApplications(reviewer).length, total);
  const own = be.listApplications(institution);
  assert.ok(own.length > 0 && own.every((a) => a.institutionId === institution.institutionId));
  assert.equal(be.listApplications(session("floating", "INSTITUTION_USER", null)).length, 0);
});

test("direct read: in-region succeeds; out-of-region is indistinguishable from a missing record", () => {
  assert.equal(be.getApplication(officer, inRegion[0]!.id).id, inRegion[0]!.id);
  const foreign = outOfRegion[0]!;
  let denied: (Error & { status?: number; code?: string }) | undefined;
  try {
    be.getApplication(officer, foreign.id);
  } catch (error) {
    denied = error as Error & { status?: number; code?: string };
  }
  let missing: (Error & { status?: number; code?: string }) | undefined;
  try {
    be.getApplication(officer, "00000000-0000-0000-0000-000000000000");
  } catch (error) {
    missing = error as Error & { status?: number; code?: string };
  }
  assert.ok(denied && missing);
  assert.equal(denied.status, 404);
  assert.equal(denied.status, missing.status);
  assert.equal(denied.code, missing.code);
  assert.equal(denied.message, missing.message, "no detail distinguishes a protected record");
  assert.ok(!denied.message.includes(foreign.id) && !denied.message.includes(foreign.institution.name));
  // Reviewers/admins still read everything.
  assert.equal(be.getApplication(admin, foreign.id).id, foreign.id);
  assert.equal(be.getApplication(reviewer, foreign.id).id, foreign.id);
});

test("an institution still gets 403 for another institution's record", () => {
  const foreign = be.getDatabase().applications.find((a) => a.institutionId !== institution.institutionId)!;
  assert.throws(() => be.getApplication(institution, foreign.id), status(403));
});

/* ---------------- request tampering ---------------- */

test("the free-text region on a form cannot move an application into (or out of) an officer's scope", async () => {
  const foreign = outOfRegion[0]!;
  const original = foreign.formData.region;
  await be.mutateDatabase(() => {
    foreign.formData.region = region; // attacker-controlled declaration claims the officer's region
  });
  assert.ok(!be.listApplications(officer).some((a) => a.id === foreign.id));
  assert.throws(() => be.getApplication(officer, foreign.id), status(404));
  await be.mutateDatabase(() => {
    foreign.formData.region = original;
  });
});

test("the officer's region comes from the user record at request time, so changes apply immediately", async () => {
  const db = be.getDatabase();
  const record = db.users.find((u) => u.id === officer.sub)!;
  const other = [...new Set(db.applications.map((a) => a.institution.region))].find((r) => r !== region)!;
  await be.mutateDatabase(() => {
    record.region = other;
  });
  try {
    const listed = be.listApplications(officer);
    assert.ok(listed.length > 0 && listed.every((a) => a.institution.region === other));
    assert.throws(() => be.getApplication(officer, inRegion[0]!.id), status(404));
    await be.mutateDatabase(() => {
      record.region = null;
    });
    assert.equal(be.listApplications(officer).length, 0, "an unassigned officer has no data scope");
    assert.equal(be.getAnalytics(officer).kpis.totalApplications, 0);
  } finally {
    await be.mutateDatabase(() => {
      record.region = region;
    });
  }
  assert.equal(be.listApplications(officer).length, inRegion.length);
});

test("a session for a user that no longer exists has no scope (fail closed)", () => {
  const ghost = session("deleted-officer", "REGIONAL_OFFICER");
  assert.equal(be.listApplications(ghost).length, 0);
  assert.equal(be.getEventFeed(ghost, 50).length, 0);
});

/* ---------------- analytics and feeds ---------------- */

test("analytics, audit feed, SLA queue and events are computed over the officer's region only", () => {
  const analytics = be.getAnalytics(officer);
  assert.equal(analytics.kpis.totalApplications, inRegion.length);
  assert.deepEqual([...new Set(analytics.regions.map((r) => r.region))], [region]);
  assert.ok(analytics.states.every((s) => s.region === region));
  assert.ok(be.getAnalytics(admin).kpis.totalApplications > analytics.kpis.totalApplications);

  const regionIds = new Set(inRegion.map((a) => a.id));
  const feed = be.getAuditFeed(officer, 1000);
  assert.ok(feed.length > 0 && feed.every((item) => regionIds.has(item.applicationId)));
  assert.ok(be.getSlaQueue(officer, 1000).every((app) => regionIds.has(app.id)));
  const events = be.getEventFeed(officer, 1000);
  assert.ok(events.length > 0 && events.every((e) => e.applicationId && regionIds.has(e.applicationId)));
  assert.ok(be.getEventFeed(admin, 1000).length > events.length);

  const leaked = JSON.stringify({ analytics, feed, events }).includes(outOfRegion[0]!.institution.aicteCode);
  assert.equal(leaked, false);
});

test("institution users no longer receive other institutions' events", () => {
  const own = new Set(be.listApplications(institution).map((a) => a.id));
  const events = be.getEventFeed(institution, 1000);
  assert.ok(events.every((e) => e.applicationId && own.has(e.applicationId)));
  assert.ok(be.getEventFeed(admin, 1000).some((e) => !e.applicationId || !own.has(e.applicationId)));
});

test("live-event visibility follows the same scope, including events without an application", () => {
  const regionApp = inRegion[0]!;
  const foreignApp = outOfRegion[0]!;
  const mk = (applicationId: string | null) => ({ id: "e", type: "STATE_CHANGED", title: "t", message: "m", applicationId, severity: "INFO", timestamp: "2026-01-01T00:00:00.000Z" }) as never;
  const scope = be.resolveScope(officer);
  assert.equal(be.eventVisible(scope, mk(regionApp.id)), true);
  assert.equal(be.eventVisible(scope, mk(foreignApp.id)), false);
  assert.equal(be.eventVisible(scope, mk(null)), false);
  assert.equal(be.eventVisible({ kind: "all" }, mk(null)), true);
  assert.equal(be.eventVisible({ kind: "none" }, mk(regionApp.id)), false);
});

test("pipeline snapshot is scoped", () => {
  const snapshot = be.pipelineSnapshot(officer);
  assert.equal(Object.values(snapshot.byState).reduce((a, b) => a + b, 0), inRegion.length);
});

/* ---------------- mutations ---------------- */

async function prepare(app: Application, state: Application["currentState"]) {
  await be.mutateDatabase(() => {
    app.currentState = state;
    app.escalated = false;
  });
}

test("mutation: an officer can advance an in-region application within their role's allowed stages", async () => {
  const app = inRegion[0]!;
  await prepare(app, "UNDER_SCRUTINY");
  const updated = await be.transitionApplication(officer, app.id, { target: "EVC_INSPECTION" });
  assert.equal(updated.currentState, "EVC_INSPECTION");
});

test("mutation: an out-of-region transition is a 404 and changes nothing", async () => {
  const app = outOfRegion[0]!;
  await prepare(app, "UNDER_SCRUTINY");
  const logs = app.auditLogs.length;
  const events = be.getDatabase().events.length;
  await assert.rejects(() => be.transitionApplication(officer, app.id, { target: "EVC_INSPECTION" }), status(404));
  assert.equal(app.currentState, "UNDER_SCRUTINY");
  assert.equal(app.auditLogs.length, logs);
  assert.equal(be.getDatabase().events.length, events, "no event was published for the denied attempt");
  // Even an otherwise-invalid stage change yields the same 404, not a state-machine hint about the record.
  await assert.rejects(() => be.transitionApplication(officer, app.id, { target: "APPROVED" }), status(404));
});

test("mutation: unrestricted staff keep their abilities", async () => {
  const app = outOfRegion[1]!;
  await prepare(app, "UNDER_SCRUTINY");
  assert.equal((await be.transitionApplication(reviewer, app.id, { target: "EVC_INSPECTION" })).currentState, "EVC_INSPECTION");
  await prepare(app, "EVC_INSPECTION");
  assert.equal((await be.transitionApplication(admin, app.id, { target: "APPROVED" })).currentState, "APPROVED");
});

test("mutation: officers cannot draft, submit, resubmit or resolve deficiencies", async () => {
  const app = inRegion[1]!;
  const form = app.formData;
  await assert.rejects(() => be.saveDraft(officer, form, app.id), status(403));
  await assert.rejects(() => be.submitApplication(officer, form, app.id), status(403));
  await assert.rejects(() => be.resubmitApplication(officer, app.id, form), status(403));
  await assert.rejects(() => be.resolveDeficiency(officer, app.id, "x", true), status(403));
});

test("mutation: an institution cannot reach another institution's drafts, submissions or deficiencies", async () => {
  const foreign = be.getDatabase().applications.find((a) => a.institutionId !== institution.institutionId)!;
  await assert.rejects(() => be.saveDraft(institution, foreign.formData, foreign.id), status(403));
  await assert.rejects(() => be.resolveDeficiency(institution, foreign.id, "x", true), status(403));
  await assert.rejects(() => be.resubmitApplication(institution, foreign.id, foreign.formData), status(403));
});
