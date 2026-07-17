## Current Goal
phase-9c-assisted-creation

## Current Mode
managed-phase

## Phase
test

## Plan Status
complete

## Review Status
approved

## Implementation Status
complete

## Test Status
pending_manual

## Signoff Status
pending

## Human Checkpoint Required
yes

## Human Checkpoint Reason
Manual cross-app QA is required for Phase 9C after the fresh-prints-dev deploy and automated checks.

## Allowed Actions
Read documentation; record manual QA feedback; update test/checkpoint records; answer clarifying questions.

## Forbidden Actions
Begin proof-ready email implementation; implement unrelated changes; deploy production; change secrets; migrate data; expand Phase 9C scope.

## Next Required Step
Await human `PASS`, `FAIL: [description]`, or `PASS WITH NOTES: [notes]` for `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-manual-qa.md`.

## DONE
no

## Last Completed Step
2026-07-16 — Automated test phase recorded. Functions deploy, Portal typecheck, targeted lint, 25 targeted tests, and Studio Vite/Electron build passed; repository-level failures are documented. Manual QA is pending.

## Plan Path
docs/workflow/plans/2026-07-16-phase-9c-assisted-creation-plan.md

## Amendment Plan Path
docs/workflow/plans/2026-07-16-phase-9c-customer-additions-while-submitted-plan.md

## Review Path
docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-review.md

## Amendment Review Path
docs/workflow/reviews/2026-07-16-phase-9c-customer-additions-while-submitted-review.md

## Decision Log
- 2026-07-16 — No fee; screenshot-based wizard minus Rights; one open; owner/admin mutate helper view; proofing flow; Studio tabs Assisted|AI|Etsy|Suggestions.
- 2026-07-16 — Implementation complete for MVP; awaiting manual QA.
- 2026-07-16 — Owner approved fresh-prints-dev deploy; backend live for Assisted Creation.
- 2026-07-16 — Initial functions deploy (selective): `submitAssistedCreationRequest`, `cancelAssistedCreationRequest`, `customerRespondToAssistedCreationProof`, `staffUpdateAssistedCreationStatus`, `staffAddAssistedCreationProof`. Full `functions` deploy aborted (orphan `ensurePortalWorkingPrintRequest`). Rules/indexes/storage deployed.
- 2026-07-16 — QA bug fix: refresh on mid-wizard assisted URL no longer snaps to step 1 / choose.
- 2026-07-16 — QA bug fix: status Back + Custom Designs nav stay on choose path when an open request exists.
- 2026-07-16 — Portal customer views: richer brief/details + proofs tabs; cancel confirm; optional approval rating (needs callable redeploy on fresh-prints-dev).
- 2026-07-16 — Studio inbox stage tabs + proof detail modal; Find Reset/Continue draft controls.
- 2026-07-16 — Checks/balances: required staff cancel/reject reasons; owner restore; staged proof submit; sidebar actionable count; customer denser modular layout.
- 2026-07-16 — Product: until request is `in_progress`, customer may make additions (update answers + references while `submitted`); server-enforced via `customerUpdateAssistedCreationRequest`.
- 2026-07-16 — Diagnosis: Portal Update → `internal` because `customerUpdateAssistedCreationRequest` was never in any deploy wave (added after initial selective deploy). Code path exports + client name/payload match; local functions build includes the export.
- 2026-07-16 — Re-check (new refs): upload path parity with submit OK; Storage `assisted-creation/{userId}/pending` customer create OK; no move-to-references on submit (paths stay pending). Client maps not-found/internal to clearer copy; Update sheet header stacked (shared `AssistedCreationUpdateModal`). Still need functions redeploy before Update QA can pass.
- 2026-07-16 — Live list reconfirm: `customerUpdateAssistedCreationRequest` absent on fresh-prints-dev. Update modal keeps open on failure with in-modal error; closes on success. Parent page no longer shows update errors behind the overlay.
- 2026-07-16 — Human approved the pending dev deploy. Built Functions successfully and selectively deployed `customerUpdateAssistedCreationRequest`, `customerRespondToAssistedCreationProof`, `staffUpdateAssistedCreationStatus`, `staffAddAssistedCreationProof`, `submitAssistedCreationRequest`, `cancelAssistedCreationRequest`, and `wipeOperationalTestData` to fresh-prints-dev.
- 2026-07-16 — Automated checks completed and recorded in `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-test-report.md`; manual checkpoint created at `docs/workflow/reviews/2026-07-16-phase-9c-assisted-creation-manual-qa.md`.

## Tests Run

- Functions TypeScript build: passed
- Portal typecheck: passed
- Changed-feature targeted lint: passed
- Assisted/suggestion tests: 11 passed
- Stable Print Request list/query/origin tests: 14 passed
- Studio Vite/Electron build: passed with bundle warnings
- Full lint: failed_documented (existing ESLint configuration/repository findings)
- Studio standalone typecheck: failed_documented (existing TypeScript `ignoreDeprecations` configuration)
- Portal production build: blocked_documented (active dev server owns `.next/trace`)
- Broader Print Request utility sweep: failed_documented (five existing sizing-policy expectation failures)

## Deploy checklist (`fresh-prints-dev` only — do not production deploy)

### A) Cloud Functions (required for Update + post-MVP QA)

From repo root (after `cd functions && npm run build && cd ..` if preferred; Firebase predeploy may build):

```bash
firebase deploy --only functions:customerUpdateAssistedCreationRequest,functions:customerRespondToAssistedCreationProof,functions:staffUpdateAssistedCreationStatus,functions:staffAddAssistedCreationProof,functions:submitAssistedCreationRequest,functions:cancelAssistedCreationRequest,functions:wipeOperationalTestData --project fresh-prints-dev
```

| Callable | Why redeploy |
|----------|----------------|
| `customerUpdateAssistedCreationRequest` | **Never deployed** — causes Update → `internal` / NOT_FOUND |
| `customerRespondToAssistedCreationProof` | Optional 1–5 rating + approval note |
| `staffUpdateAssistedCreationStatus` | Required cancel/reject/restore reasons; owner-only restore |
| `staffAddAssistedCreationProof` | Safe to include (same module; keeps proof path current) |
| `submitAssistedCreationRequest` | Safe to include (same module) |
| `cancelAssistedCreationRequest` | Safe to include (same module) |
| `wipeOperationalTestData` | Assisted wipe target `assistedCreationRequests` + Storage `assisted-creation/` |

**Note:** Do **not** use bare `firebase deploy --only functions` until orphan remote function `ensurePortalWorkingPrintRequest` is deleted or restored in source (prior full deploy aborted).

### B) Rules / indexes / storage

Already deployed in the initial 9C wave. Redeploy only if local files changed since then (they have wipe/rules docs, but Assisted collection/rules/storage paths were in that wave):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project fresh-prints-dev
```

Optional if unsure whether wipe/rules drift exists — safe on dev.

### C) Portal hosting

- **Local Portal (`apps/portal` npm run dev):** **No** App Hosting deploy required for Update UI / QA.
- **Hosted Portal on App Hosting:** **Yes** if humans test the deployed site — UI for Update modal is client-only and not on hosting until:

```bash
firebase deploy --only apphosting --project fresh-prints-dev
```

### D) Studio

- **Restart** Studio (`npm run dev` in `apps/studio`) so renderer picks up Assisted inbox / cancel-reason / proof UI.
- **No new Electron IPC** specific to Assisted downloads beyond existing `desktopAppService.downloadUrlToFile` — full Electron rebuild only if main-process download IPC changed and restart alone is insufficient.
- No Firebase Studio deploy (desktop app).

### E) Anything else

- Production: **none**
- Emulator: not required for this QA path (Portal/Studio → live `fresh-prints-dev`)
- After functions deploy: hard-refresh Portal; retry Update on a `submitted` request → expect success; after Studio **Start work**, Update should be blocked with failed-precondition messaging
