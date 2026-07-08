# Plan: Phase 8 — Fresh Prints Portal Foundation

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | `docs/project/ROADMAP.md` Phase 8, ADR-FP-063, ADR-FP-008 |

---

## Goal

Deliver **Fresh Prints Portal** — a mobile-first customer web app — on Firebase App Hosting, sharing Firebase Auth/Firestore/Storage with Studio. Phase 8 exit criteria: customers can register/login, browse the approved catalog, create print requests, and track request progress.

This plan chooses an **incremental monorepo** layout: bootstrap `apps/portal` and `packages/shared` now; **leave Studio at the repo root** (`electron/`, `src/renderer/`) until a later low-risk migration to `apps/studio/`.

---

## Background

- Phase 7 Studio MVP is signed off (2026-07-07). User direction: Portal is next; Gang Sheet Builder and Whatnot scheduled sync are deferred/cancelled.
- `portal_customer` origin, customer types, and staff-side customer records already exist in Studio — Portal must connect registered Auth users to `customers/{id}` and write `printRequests` with `requestOrigin: "portal_customer"`.
- **Current Firestore rules are staff-only** for `designs`, `categories`, `tags`, `customers`, `printRequests`, and `printRequestItems`. Portal requires a dedicated rules slice — security review and human-approved deploy required before customer QA in live environments.
- Firebase App Hosting supports monorepos via **App root directory** (`apps/portal`); full repo is cloned at build time; only Portal is built/deployed.

---

## Scope

### In Scope

**Repository structure (Slice 0)**

- npm workspaces at repo root: `apps/portal`, `packages/shared`
- Move root `shared/` → `packages/shared/src/` (package name `@fresh-prints/shared`)
- Update Studio/Electron/tsconfig/eslint import paths to `@fresh-prints/shared` (mechanical)
- Scaffold `apps/portal` as **Next.js App Router** (TypeScript)
- Add `apps/portal/apphosting.yaml` and `firebase.json` `apphosting` block (`rootDir: ./apps/portal`)
- Root scripts: `dev:studio` (existing vite), `dev:portal`, `build:studio`, `build:portal`, `lint` scoped appropriately
- Document layout in `ARCHITECTURE.md` (incremental monorepo; Studio migration deferred)

**Customer auth (Slice 1)**

- Portal login, registration, logout, session persistence
- New Cloud Function `registerCustomer` (callable): validates input, creates/links `users/{uid}` with `role: customer`, creates `customers/{id}` with `userId`, `isGuest: false`, username reservation — mirrors staff `createTeamUser` pattern but customer-self-service
- Block `role: customer` users from Studio routes (already enforced by staff role checks; Portal must enforce inverse)
- Auth-gated layout and public marketing/login/register routes

**Catalog read (Slice 2)**

- Firestore rules: authenticated customers may **read** `designs` where `status == "ready"` (catalog fields only — no staff-only AI fields if restricted in rules)
- Firestore rules: customers read `categories` and approved `tags` needed for browse/filter
- Storage rules: customers read `thumbnailPath` / `previewPath` objects for ready designs (signed URL or public read per existing storage model — verify and extend)
- Portal services/hooks for catalog query (paginated, search/filter parity with Studio Design Library **read** surface only)

**Print requests (Slice 3)**

- Firestore rules: customers create/read/update **own** `printRequests` and `printRequestItems` (`requestOrigin: portal_customer`, `customerId` matches linked customer, `createdBy`/`updatedBy` == auth uid)
- Reuse `@fresh-prints/shared` types and pure utils (`printRequestQueueState`, sizing helpers where applicable)
- Portal UI: list requests, create request, add/remove catalog designs with quantity, read-only detail where Studio owns advanced edit rules
- **No** show allocation, show queue, import, AI, or design status changes from Portal

**Progress tracking (Slice 4)**

- Read-only view of request status derived from existing allocation data (same derivation rules as Studio badges where safe for customers)
- Customers see high-level progress (e.g. not queued / queued / printed) without staff production internals

**Docs & handoff**

- Update `DATA_MODEL.md`, `BACKEND.md`, `DEPLOYMENT.md`, `TESTING.md`, `project-chatgpt-handoff/*` per signoff skill

### Out of Scope

- Moving Studio into `apps/studio/` (deferred follow-up phase)
- Gang Sheet Builder, Whatnot scheduled sync, Custom Requests (Phase 9), payments/checkout
- Customer self-service profile edit beyond registration fields (follow-up)
- Favorites, analytics (Phase 10)
- Native mobile apps, Electron in Portal
- Email invitation flows for customers (open registration unless human chooses invite-only)
- Production App Hosting / custom domain deploy without human approval
- Backfilling existing guest customers with Portal accounts

---

## Target Repository Structure

```txt
fresh-prints/
├── apps/
│   └── portal/                 # Next.js — Firebase App Hosting root
│       ├── app/
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       └── apphosting.yaml
├── packages/
│   └── shared/
│       ├── package.json        # @fresh-prints/shared
│       └── src/                # moved from repo-root shared/
├── electron/                   # Studio main (unchanged location)
├── src/renderer/               # Studio UI (unchanged location)
├── functions/
├── docs/
├── firestore.rules
├── storage.rules
├── firebase.json               # + apphosting block
├── package.json                # workspaces root
└── package-lock.json
```

**Rationale:** App Hosting gets a clean `rootDir`. Shared types stay single-source. Studio avoids a risky mass move during Portal bootstrap.

---

## Affected Areas

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Monorepo root | `package.json`, `package-lock.json`, `tsconfig.json`, `.eslintrc.cjs` |
| Shared package | `packages/shared/**` (from `shared/**`) |
| Studio path updates | `electron/**`, `src/renderer/**`, existing tests under `shared/` → `packages/shared` |
| Portal app | `apps/portal/**` (new) |
| Firebase hosting | `firebase.json`, `apps/portal/apphosting.yaml` |
| Security rules | `firestore.rules`, `storage.rules`, `firestore.indexes.json` (if customer queries need indexes) |
| Cloud Functions | `functions/src/registerCustomer.ts`, `functions/src/index.ts` |
| Docs | `docs/architecture/*`, `docs/standards/DEPLOYMENT.md`, `docs/standards/TESTING.md`, handoff package |

### Architecture Impact

- [x] Details: Two-app platform becomes real in repo layout. Portal is a Next.js SSR app on App Hosting; Studio remains Electron+Vite. Shared business types live in `@fresh-prints/shared`. Portal must not import `electron/`, `src/renderer/`, or Studio UI components.

### Security Impact

- [x] Details: New customer Firestore/Storage read and write surfaces. New callable `registerCustomer`. Must fail closed: customers cannot read non-ready designs, staff collections, other customers' requests, or write show allocations/designs/settings. Security Agent review required before rules deploy.

### Data Model Impact

- [x] Details: No new collections. Uses existing `users`, `customers`, `customerUsernames`, `printRequests`, `printRequestItems`, `designs`, `categories`, `tags`. Portal writes `requestOrigin: portal_customer`. May add indexes for customer-scoped print request queries.

### Backend Impact

- [x] Details: New callable function; possible Auth trigger alternative (decision: prefer explicit callable after `createUser` for atomic provisioning). App Hosting backend in Firebase console. Env vars via `apphosting.yaml` / console (`NEXT_PUBLIC_*` Firebase config).

### UI / UX Impact

- [x] Details: New mobile-first Portal UI per `STYLE_GUIDE.md` Portal section. Manual UX review checkpoint before signoff.

### Migration Impact

- [x] Forward steps: Move `shared/` → `packages/shared`; update imports; no Firestore data migration.
- [x] Rollback: Revert monorepo commit; Studio continues to work from root layout if rollback before Portal depends on new paths.

---

## Implementation Slices

Execute in order. Each slice should pass automated checks before the next.

### Slice 0 — Monorepo + Portal scaffold + App Hosting wiring

1. Add root `workspaces` and `@fresh-prints/shared` package; move `shared/` contents.
2. Update Studio `tsconfig` paths, Vite resolve alias, Electron tsconfig, all imports, and test paths.
3. `npx create-next-app@latest` (or manual scaffold) in `apps/portal` with App Router, TS, ESLint.
4. Portal depends on `@fresh-prints/shared` via workspace.
5. Add `apphosting.yaml` (starter `runConfig`; framework adapter default build).
6. Extend `firebase.json` with `apphosting` entry (`rootDir: ./apps/portal`).
7. Verify Studio `npm run dev` / `npm run build` still pass after shared move.
8. Portal `npm run dev` serves placeholder home page.

**Slice 0 exit:** Studio unchanged functionally; Portal shell runs locally; shared package resolves in both apps.

### Slice 1 — Customer registration and login

1. Implement `registerCustomer` callable (permissions: unauthenticated signup flow or post-auth callable — prefer: client `createUserWithEmailAndPassword` then callable to provision Firestore docs idempotently).
2. Portal auth pages: register, login, logout, auth guard.
3. Load linked `customers/{id}` after login; handle “Auth exists but no customer doc” error state.
4. Unit tests for shared validation helpers; function tests where pattern exists.

**Slice 1 exit:** Customer can register, log in, and see an authenticated shell (no catalog yet).

### Slice 2 — Security rules + catalog read API

1. Add `isCustomer()` / `isPortalCustomer()` helpers in `firestore.rules`.
2. Customer read rules for ready `designs`, `categories`, `tags`; deny all writes except own customer-linked entities per slice 3.
3. Extend `storage.rules` for customer read of design thumbnails/previews.
4. Deploy rules to **dev** project (human checkpoint).
5. Portal `catalogService` + hooks: paginated ready designs, category filter, search (client-side or indexed query per Studio patterns).

**Slice 2 exit:** Logged-in customer sees approved catalog grid (mobile-first).

### Slice 3 — Customer print requests

1. Rules: customer create/read/update own `printRequests` + `printRequestItems` with validation functions (origin, customerId, design ready, no staff-only fields).
2. Portal pages: my requests, new request, add designs from catalog, quantity.
3. Reuse shared naming/sequence logic via callable or transactional writes (may need `allocateCustomerPrintRequestSequence` callable if rules cannot safely increment customer counter).

**Slice 3 exit:** Customer creates and revisits print requests.

### Slice 4 — Progress tracking

1. Customer-safe read of allocation summary for their requests (rules + queries).
2. Portal UI: status badges aligned with Studio customer-visible semantics.

**Slice 4 exit:** Phase 8 roadmap exit criteria met.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Studio typecheck | `npx tsc --noEmit` (root / Studio tsconfig) | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` (or equivalent) | yes |
| Lint | `npm run lint` (root, both workspaces) | yes |
| Shared unit tests | `npx tsx --test packages/shared/**/*.test.ts` + existing Studio/electron tests | yes |
| Portal unit tests | As added under `apps/portal` | yes (slice 1+) |
| Functions build | `npm --prefix functions run build` | yes (slice 1+) |
| Studio build | `npm run build:studio` | yes |
| Portal build | `npm run build:portal` | yes |

### Manual

- [ ] Studio smoke: login, Design Library, Print Requests still work after shared package move
- [ ] Portal register/login on dev Firebase
- [ ] Catalog browse on phone-width viewport
- [ ] Create print request end-to-end
- [ ] Confirm customer cannot access Studio staff routes (separate apps)
- [ ] App Hosting rollout to dev backend (human)

---

## Human Checkpoints Anticipated

- [x] Firestore + Storage rules deploy to dev (`firebase deploy --only firestore:rules,storage --project fresh-prints-dev`)
- [x] Firestore rules deploy to production — separate approval before prod customers
- [x] Cloud Functions deploy for `registerCustomer` — human approval
- [x] Firebase App Hosting backend creation + GitHub connection — human (console)
- [x] Manual UI/UX review (mobile-first catalog + request flows)
- [ ] Business: open registration vs invite-only — **default: open registration** unless user says otherwise
- [ ] App Hosting region / custom domain — configure in console when ready

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Shared package move breaks Studio imports | High | Slice 0 only; full test sweep before Slice 1 |
| Rules too permissive for customers | High | Security review; narrow read to `ready` designs; own-request writes only |
| Customer sequence/counter races | Medium | Use callable transaction or Firestore transaction pattern from Studio |
| App Hosting monorepo build paths | Medium | Follow Firebase docs; `apphosting.yaml` at `apps/portal`; test dev rollout early |
| Duplicate logic Studio vs Portal | Medium | `@fresh-prints/shared` types + pure utils; services stay per-app |
| Next.js + workspace dependency hoisting | Low | Explicit `workspaces` and portal `package.json` dependencies |

---

## Rollback Plan

- **Slice 0:** Revert monorepo commit; restore `shared/` at root.
- **Rules:** Redeploy prior `firestore.rules` / `storage.rules` from git history.
- **Functions:** Remove or disable `registerCustomer` export; redeploy functions.
- **App Hosting:** Disable rollouts in Firebase console; Studio unaffected.

---

## Documentation Updates Required

- [x] ARCHITECTURE.md — incremental monorepo layout, Portal stack
- [x] DATA_MODEL.md — Portal customer auth linkage, `portal_customer` writes
- [x] BACKEND.md — `registerCustomer`, App Hosting
- [x] DEPLOYMENT.md — Portal App Hosting commands, workspace scripts
- [x] TESTING.md — portal test commands
- [x] DECISIONS.md — ADR for monorepo + Phase 8 kickoff
- [x] project-chatgpt-handoff/CURRENT-STATE.md, 04-features-inventory.md

---

## Open Questions

- [ ] **Registration policy:** Open signup (default) vs staff invite-only?
- [ ] **App Hosting:** Start with `fresh-prints-dev` only (recommended) — confirm?
- [ ] **Username:** Required at registration (matches Studio customer CR naming) — recommend **yes**?

Non-blocking: Studio → `apps/studio/` migration timing (defer).

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Development Tooling | `package.json` workspaces, scripts, eslint/tsconfig |
| Documentation | Architecture, deployment, testing, handoff |
| Starter Surface | None |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-07-phase-8-portal-foundation-review.md`
- Verdict: **approved**

**Recommended first implementation slice after approval:** Slice 0 (monorepo + Portal scaffold) — unblocks App Hosting and all Portal work without customer-facing security changes.
