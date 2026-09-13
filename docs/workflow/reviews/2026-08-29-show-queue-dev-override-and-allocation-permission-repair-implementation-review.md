# Implementation Review — Show Queue DEV Override + Allocation Permission Repair

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `show-queue-dev-override-and-allocation-permission-repair` |
| Plan | `docs/workflow/plans/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-plan.md` |
| Formal review | `docs/workflow/reviews/2026-08-29-show-queue-dev-override-and-allocation-permission-repair-review.md` |
| Verdict | **approved_for_dev_deploy_checkpoint** |

---

## Scope delivered

### Part A — Allocation permission repair

- Reconciled Firestore rules allowlists with persisted schemas:
  - `printRequestRequiredFieldsValid`: `customerUsernameAtCreationSnapshot`, `customerDisplayNameAtCreationSnapshot`
  - `whatnotUpcomingShowFieldsValid` / `staffGangSheetUpcomingShowFieldsValid` / `upcomingShowCommonFieldsValid`: production-resolution metadata fields
- Added `dev_fixture` validator branch without broadening unrelated permissions.
- Emulator regression suite exercises the full allocate sequence (create allocation → update show capacity → activate print request).

### Part B — DEV-only `DEV-OVERRIDE`

- Shared sentinel + parsing guards (`whatnotShowUrl`, `firebaseDevFixtureGate`).
- Callable `upsertDevFixtureShow` with staff auth + `GCLOUD_PROJECT === "fresh-prints-dev"` gate.
- Studio create flow routes sentinel to callable; Show Queue list includes `dev_fixture` via `isWhatnotQueueSurfaceShow`.
- Show Detail displays **DEV OVERRIDE** and “No external Whatnot URL”; no external link.
- Import matching unchanged (`source === "whatnot"` only in `desktopAppService.openImportWindow`).

---

## Implementation review checklist

| # | Requirement | Result |
|---|-------------|--------|
| 1 | Rules fix matches current schemas | **Pass** |
| 2 | No wildcard allowlist broadening | **Pass** |
| 3 | Full allocation sequence passes emulator tests | **Pass** (10/10) |
| 4 | Manual + imported shows same permission contract | **Pass** |
| 5 | `DEV-OVERRIDE` impossible outside approved DEV | **Pass** (client gate + callable project gate) |
| 6 | Callable independently project-gates | **Pass** |
| 7 | No fake external identity persisted | **Pass** |
| 8 | Import matching ignores DEV fixtures | **Pass** (pre-existing whatnot-only filter) |
| 9 | Normal Whatnot URL parsing unchanged | **Pass** |
| 10 | Show Detail truthful for DEV fixtures | **Pass** |
| 11 | No external Whatnot link for DEV fixtures | **Pass** |
| 12 | No Did Not Print / re-queue behavior | **Pass** (out of scope) |
| 13 | WS4 untouched | **Pass** |
| 14 | Production untouched | **Pass** (no deploy) |

---

## Automated test evidence

| Suite | Command | Result |
|-------|---------|--------|
| Rules — allocation sequence | `firebase emulators:exec --only firestore "npx tsx --test tests/firebase/showQueueAllocation.rules.test.ts"` | **10 pass / 0 fail** |
| Shared — sentinel + DEV gate | `npx tsx --test packages/shared/src/utils/whatnotShowUrl.test.ts packages/shared/src/utils/firebaseDevFixtureGate.test.ts` | **pass** |
| Functions — project gate | `npx tsx --test functions/src/lib/devFixtureProjectGate.test.ts` | **3 pass** |
| Studio — display | `npx tsx --test apps/studio/.../upcomingShowDisplay.test.ts` | **2 pass** |
| Functions build | `npm run build` (functions) | **pass** |

Scoped monorepo typecheck/lint: touched paths compile via Functions build and unit tests; full monorepo typecheck not re-run (may contain unrelated documented errors).

---

## Unexpected architecture issues

None blocking. Rules customer-denial test logs Firestore expression budget warnings (expected for complex rules); denial still asserted.

---

## DEV deploy checkpoint (NOT executed)

Owner approval required before:

```bash
firebase deploy --only firestore:rules,functions:upsertDevFixtureShow --project fresh-prints-dev
```

No index deploy required for this phase.

---

## DEV deployment record (2026-08-29)

| Item | Result |
|------|--------|
| Owner authorization | **approved — DEV only** (`fresh-prints-dev`) |
| Branch | `development` |
| Pre-deploy Functions build | **pass** |
| Pre-deploy rules suite | **10/10 pass** (`showQueueAllocation.rules.test.ts`) |
| Command | `firebase deploy --only firestore:rules,functions:upsertDevFixtureShow --project fresh-prints-dev` |
| Exit code | **0** |
| Firestore Rules | **released** (`firestore.rules` compiled successfully) |
| Function | **`upsertDevFixtureShow` created** (Node.js 20, 2nd Gen, `us-central1`, callable) |
| `firebase functions:list` | **`upsertDevFixtureShow` present** |
| Indexes | **not deployed** |
| Storage rules | **not deployed** |
| Other Functions | **not redeployed** (single-function create only) |
| Production | **unchanged** (no deploy to prod project) |

Post-deploy agent smoke (limited): local `npm run dev:studio` process healthy; no `dev_fixture` runtime errors in dev-server logs. **Owner must reload Studio against `fresh-prints-dev` and complete manual QA below.**

---

## Owner DEV QA (after deploy)

See phase prompt checklist: create show with `DEV-OVERRIDE`, verify Show Detail, attach/remove allocations on DEV fixture and normal shows, confirm no permission errors, confirm import does not match DEV fixture.
