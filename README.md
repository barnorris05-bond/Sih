# Veridion

*Every requirement. Every stage. One clear path.*

**AICTE Approval Cloud**

Formal SIH title: **Integrated AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System** — SIH26262.

> Veridion is the working name of a Smart India Hackathon prototype. It is not an official AICTE product and is not affiliated with or endorsed by AICTE, and no trademark is claimed.

A production-shaped full-stack prototype that turns the AICTE Approval Process Handbook into
executable rules: applications score themselves as institutions type, scrutiny runs on a guarded
finite state machine, SLAs escalate automatically, and every actor gets a purpose-built,
animated workspace.

![Landing page](screenshots/landing.png)

---

## What is implemented

| Area | Details |
| --- | --- |
| **Rule engine** | Six weighted handbook constraints (SFR, cadre, built-up area, land, doctoral share, library) with pure, deterministic scoring and explainable remediation guidance. Shared by client and server. |
| **Workflow** | Finite state machine with per-edge role guards, automated validation transitions, immutable audit entries, and deficiency show-cause loops with 7-day remediation windows. |
| **SLA automation** | In-process sweeper escalates breached files every 20s, writes an automated audit entry, and broadcasts a critical event over SSE. |
| **Auth & RBAC** | Signed JWT session (jose, HS256) in an httpOnly cookie, scrypt password hashing, edge middleware that gates `/institution`, `/reviewer`, `/admin` by role. |
| **Institution portal** | Status timeline, live compliance gauge, SLA monitor, rule checklist, four-step wizard with live recalculation, deficiency remediation desk with resubmission. |
| **Scrutiny desk** | Three-pane audit workspace: pipeline queue, declared metrics + evidence dossier with verification, live verdict and guarded claim/flag/EVC/approve/reject actions. |
| **Executive center** | KPI counters, state heatmap, regional throughput, compliance distribution, SLA bottleneck chart, deficiency Pareto, sortable applications grid, live audit stream, auto-escalation queue. |
| **Motion & polish** | Framer Motion page/step transitions, spring gauge, animated counters, morphing modals, live feed entries, toast stack, celebratory confetti on approval, ambient aurora + cyber grid, dark/light themes, reduced-motion support. |
| **Seed data** | 50 rich applications across 24 institutions: 18 approved, 10 in scrutiny, 15 deficiency notices, 5 SLA breaches, plus draft/submitted/EVC/rejected states. |

---

## Quick start (zero infrastructure)

```bash
npm install
npm run seed        # optional; the dataset is generated on first request
npm run dev
```

Open <http://localhost:3000>.

### Demo accounts — password `demo1234`

| Role | Email | Landing route |
| --- | --- | --- |
| Institution | `institution@aicte.demo` | `/institution` |
| Scrutiny member | `reviewer@aicte.demo` | `/reviewer` |
| Regional officer | `officer@aicte.demo` | `/admin` |
| AICTE admin | `admin@aicte.demo` | `/admin` |

> The demo store is written to `backend/.data/db.json`. Delete it (or run `npm run reset:data`)
> to regenerate the exact seeded dataset. All timestamps are generated relative to first boot.

### Data scope, durability and rate limiting

**Who sees what.** Admins and scrutiny members see every application. Institution users see only their
own institution's. A **regional officer** sees only applications whose institution is registered in the
officer's assigned region: the `region` field on the officer's *user record* (one of the `REGIONS`),
read on the server for every request. Nothing from a request body, query string or URL can widen it,
and an officer with no valid assignment has no data scope at all (deny by default). The same scope
applies to lists, single-record reads, transitions, analytics, the audit feed, the SLA queue and the live
event stream; out-of-scope records answer `404`, exactly like a record that does not exist. The demo
officer is assigned the region of the demo institution (North) in the seed. *Policy decision for the
operator:* which region each real officer covers, and whether regional officers should see
nation-wide aggregates, is not defined by this repository; assign `region` on the user record.

**Durability.** Business writes (drafts, submissions, resubmissions, transitions, deficiency updates)
are acknowledged only after the snapshot containing them has been written and atomically renamed: an
acknowledged change survives the process being killed. Concurrent writers share one write (group
commit). If the write fails (after quick retries) the change is rolled back, the caller gets
`503 PERSISTENCE_FAILED` (safe to retry), and no event is published for it. Set `AICTE_FSYNC=1` to also
survive an OS crash or power loss (about +1 ms per write). On a read-only filesystem (serverless) the store
is memory-only: writes succeed but are not durable, and responses carry `X-Durability: memory-only`.
The single JSON file is for the zero-infrastructure demo; use the PostgreSQL path for real deployments.

**Rate limiting.** Failed sign-ins are throttled per account (8 per 5 minutes) regardless of where they
come from. A per-source limit (30 per 5 minutes) is added **only** when `AICTE_TRUSTED_PROXY_HOPS` tells
the app how many trusted reverse proxies sit in front of it (for example `1` on Vercel or behind one load
balancer); the client address is then the `X-Forwarded-For` entry that many positions from the right.
Without that setting forwarded headers are ignored, because any client can forge them. Limits are
in-memory per process.

---

## Repository layout

```
aicte-approval-platform/
├── frontend/                       # Next.js 14 App Router (TypeScript, Tailwind)
│   ├── src/app/
│   │   ├── page.tsx                # Animated landing + role gateway
│   │   ├── (auth)/login/page.tsx   # Glassmorphic auth portal
│   │   ├── institution/            # Dashboard, wizard, deficiency desk
│   │   ├── reviewer/               # Split-screen scrutiny desk
│   │   ├── admin/                  # Executive command center
│   │   └── api/                    # Auth, applications, analytics, SSE
│   ├── src/components/             # ui/, animations/, dashboard/, forms/, effects/, admin/, reviewer/
│   ├── src/hooks/                  # useLiveEvents
│   └── src/lib/                    # API client, validation, session, motion, formatting
├── backend/
│   ├── src/
│   │   ├── engines/
│   │   │   ├── ruleEngine.ts       # Re-export of the shared pure engine
│   │   │   ├── stateMachine.ts     # FSM + role guard matrix
│   │   │   ├── alertScheduler.ts   # SLA sweeper / auto-escalation
│   │   │   └── analytics.ts        # KPIs, heatmap, Pareto, SLA buckets
│   │   ├── controllers/            # Auth, application workflow, analytics
│   │   ├── auth/                   # scrypt hashing + JWT sessions
│   │   ├── sockets/eventBus.ts     # In-process pub/sub for SSE
│   │   ├── store/                  # File repository + 50-application seed
│   │   └── runtime.ts              # Idempotent background bootstrap
│   └── prisma/                     # Production PostgreSQL schema + seed entry
├── shared/
│   ├── rules/aphRules.json         # Handbook rule book (thresholds, weights, remedies)
│   └── src/                        # Types, constants, pure rule engine
├── docker-compose.yml              # PostgreSQL 16 + Redis 7
└── README.md
```

npm workspaces tie `frontend`, `backend` and `shared` together. Next transpiles the workspace
packages directly, so there is no separate backend build step in the demo.

---

## Workflow

```
DRAFT ──submit──▶ SUBMITTED ──validate──▶ UNDER_SCRUTINY ──▶ EVC_INSPECTION ──▶ APPROVED
                     │                         │                    │
                     └─fail─▶ RULE_VALIDATION_FAILED               └──▶ REJECTED
                                     │
                                     ▼
                            DEFICIENCY_NOTIFIED ──fix & resubmit──▶ SUBMITTED
```

Guards enforced by [`stateMachine.ts`](backend/src/engines/stateMachine.ts):

- Only institutions may submit; only staff may move a file forward.
- Final decisions (`APPROVED` / `REJECTED`) require `SCRUTINY_MEMBER` or `AICTE_ADMIN`.
- Invalid edges throw a typed `StateTransitionError` → HTTP 409.
- Every transition writes actor, role, previous/new state, notes and automation flag.

SLA windows: Submitted 48h · Scrutiny 72h · EVC 120h · Deficiency 168h.

---

## Handbook rules

| Code | Constraint | Weight | Severity | Threshold |
| --- | --- | --- | --- | --- |
| `APH_2026_SFR` | Student-faculty ratio | 28% | CRITICAL | 1:20 (1:15 accredited) |
| `APH_2026_CADRE` | Cadre pyramid | 18% | HIGH | 1 : 2 : 6 |
| `APH_2026_INFRA` | Built-up instructional area | 20% | HIGH | 2.5 m²/student |
| `APH_2026_LAND` | Contiguous campus parcel | 12% | MEDIUM | 8,000 m² |
| `APH_2026_PHD` | Doctoral faculty strength | 12% | HIGH | 40% of full-time faculty |
| `APH_2026_LIBRARY` | Library volumes | 10% | MEDIUM | 12 volumes/student |

The score is the weighted sum of passing rules (0–100%). The same function
([`shared/src/rule-engine.ts`](shared/src/rule-engine.ts)) runs in the browser wizard and in the
server submission path, so the live meter can never disagree with the verdict.

---

## API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Credential check + httpOnly JWT cookie |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/auth/session` | Current session |
| `GET` | `/api/applications` | Role-scoped application list |
| `POST` | `/api/applications/draft` | Partial draft save (auto-scored) |
| `POST` | `/api/applications/submit` | Full validation + automated deficiency path |
| `POST` | `/api/applications/[id]/resubmit` | Corrected filing after remediation |
| `PATCH` | `/api/applications/[id]/transition` | Guarded FSM transition |
| `PATCH` | `/api/applications/[id]/deficiencies` | Toggle remediation checklist |
| `GET` | `/api/analytics` | KPIs, distributions, SLA queue, audit feed |
| `GET` | `/api/events` | Server-Sent Events stream (state changes, breaches, approvals) |

All mutations resolve the session server-side, never accept an actor id from the client, and map
domain errors to explicit status codes.

---

## Verification performed

- `npm run typecheck` — backend + frontend strict TypeScript, zero errors.
- `npm run build` — Next.js production build succeeds for all routes.
- `npm run seed` — 50 applications / 24 institutions / 15 deficiency notices / 5 SLA breaches.
- Browser walkthrough: login as institution → apply statutory minimums (live index 2% → 100%,
  6/6 rules) → save draft → advance all four steps → submit → record persisted as `SUBMITTED`
  with 48h SLA and two audit entries.
- Reviewer and admin workspaces exercised with the same seeded pipeline.

---

## Production path

The demo deliberately runs without external services so it is reproducible on any machine.
Everything needed to move to the reference stack is in the repository:

```bash
docker compose up -d                      # PostgreSQL 16 + Redis 7
cp .env.example .env                      # set AUTH_SECRET + DATABASE_URL
npx prisma db push --schema backend/prisma/schema.prisma
```

[`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) mirrors the runtime shapes 1:1
(JSONB `formData`, enums, audit log, deficiencies, platform events) and adds the indexes used by
the queues and dashboards.

Planned adapters at the seams already defined in the code:

1. **Repository** — `backend/src/store/database.ts` exposes a narrow interface
   (`getDatabase`, `mutateDatabase`, `findApplication`, …). Replace its body with Prisma
   delegates; controllers and engines stay unchanged.
2. **SLA scheduler** — `sweepSlaDeadlines()` is transport-agnostic. Schedule it with a BullMQ
   repeatable job (`REDIS_URL`) instead of the 20s in-process timer; horizontal scaling then
   requires no code changes.
3. **Event bus** — `publishEvent()` / `subscribeToEvents()` are the only fan-out points. Swap the
   in-process emitter for Redis pub/sub + socket.io if multi-instance WebSocket delivery is
   required. The SSE endpoint and `useLiveEvents` hook remain the client contract.
4. **Password hashing** — the demo uses Node's scrypt (`scrypt$salt$hash`) to avoid native build
   steps. Replace with Argon2id in production by changing `auth/password.ts` and rehashing on
   next login.

### Known deviations from the original brief

| Brief | Implemented | Why |
| --- | --- | --- |
| Separate Express server | Next.js route handlers + shared backend package | One process, same controllers/service layer, no duplicated runtime |
| Argon2 | scrypt with encoded scheme | Zero native dependencies on Windows/Linux; swap documented |
| socket.io | Server-Sent Events | No custom server needed for Next App Router; same push contract |
| BullMQ workers | In-process idempotent sweeper | Demo must run with a single command; BullMQ adapter documented |
| Prisma at runtime | JSON repository + Prisma schema | Reviewers can run the prototype without Docker/Postgres |

---

## Design system

- Tokens in [`globals.css`](frontend/src/app/globals.css) + [`tailwind.config.ts`](frontend/tailwind.config.ts):
  HSL variables for dark/light, glass layers, aurora blobs, cyber grid, gradient typography.
- Motion primitives in [`lib/motion.ts`](frontend/src/lib/motion.ts) and
  [`components/animations`](frontend/src/components/animations): fade-up, staggered reveals,
  spring counters, animated gauge, toast stack.
- Accessibility: semantic tables, labelled inputs, keyboard-operable Radix dialogs/tabs, visible
  focus rings, and `prefers-reduced-motion` disables non-essential motion.

---

## Scripts

```bash
npm run dev          # Next dev server
npm run build        # Production build
npm run start        # Serve the production build
npm run seed         # Regenerate the demo dataset
npm run typecheck    # Strict TS across both workspaces
npm run reset:data   # Delete the demo store
```
