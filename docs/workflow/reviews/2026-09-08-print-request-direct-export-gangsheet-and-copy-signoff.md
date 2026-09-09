# Signoff: Print Request direct export, gang sheets, copy, and global Gang Sheet Settings

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Signoff by | Signoff Agent |
| Goal | `print-request-direct-export-gangsheet-and-copy` |
| Plan | `docs/workflow/plans/2026-09-08-print-request-direct-export-gangsheet-and-copy-plan.md` |
| Review | `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-08-print-request-direct-export-gangsheet-and-copy-implementation-review.md` |
| Test report | Implementation Review validation sections and evidence below |
| Owner DEV QA | **PASS** (2026-09-08) |
| Final DEV disposition | **approved** |

---

## Summary

The owner-approved Print Request production workflow is complete and signed off for DEV. Eligible Customer and Internal requests expose direct Export Images, Export x(Qty), Standard Generate Gang Sheet, and Copy actions; Working and Editing requests retain only their existing Add to Show / Add to Internal Gangsheet actions. Global Gang Sheet Settings now drive the shared layout, four width-based price tiers, weights, request totals, card summaries, and gang-sheet output surfaces.

Owner DEV QA passed. The authorized DEV Firestore Rules and callable deployment evidence is preserved below. Commit/push, Studio publish, and production promotion remain separate owner checkpoints.

## Changes Delivered

- Direct request export ZIP, quantity export, Standard request gang-sheet generation, and transactional request copy.
- Copy protections: owner/admin authorization, source isolation, no copied production state, and no cache cross-hydration.
- Canonical `settings/showQueue` Gang Sheet Settings with read-only legacy Internal fallback.
- Six global layout fields and four width-only pricing/weight tiers:
  - Pocket, 4 inches and under: `$1`, `0.40 oz`.
  - Standard Full Size, over 4 through 11 inches: `$2`, `0.75 oz`.
  - Standard Oversized, over 11 through 14 inches: `$3`, `0.75 oz`.
  - Extra Oversized, over 14 inches: `$4`, `0.75 oz`.
- Logical source-item quantity calculations, independent Price and Weight lines, ascending price terms, two-decimal gang-sheet lengths, labeled clickable request totals, per-card cost formulas, dismissible generation warnings, and bounded gang-sheet list scrolling.
- Shared Show Queue Standard, Grouped by Customer, Sheet per Customer, Internal Gang Sheet, and Customer/Internal Request Generate surfaces.
- Settings UX refinement: no-tab Show Queue settings modal, full-width URL, paired allocation/cutoff fields, normal-height settings button, vertical Settings sidebar, wider content, and two-column Gang Sheet Settings layout.

## DEV deployment evidence

| Surface | Evidence |
|---------|----------|
| Firebase project | `fresh-prints-dev` |
| Firestore Rules | `firebase deploy --only firestore:rules --project fresh-prints-dev` — PASS; ruleset `0d32ca64-8cfc-4bd8-bd56-b34f426d47bd` |
| Function | `copyStudioPrintRequest` only |
| Function runtime | `us-central1`, Node.js 20 |
| Function revision | `copystudioprintrequest-00001-yec` |
| Function source hash | `6484fccde1612904191273e4e92138f1c9c780e0` |
| Function state | ACTIVE; 100% traffic on latest revision |

No Storage Rules, indexes, migrations, backfills, Portal deployment, unauthorized Functions, or production actions occurred. Studio publish was not performed.

## Validation

### Automated

- Exact Rules command: `npm run test:rules` — exit code 0; Firestore and Storage emulators started; **169/169 passed across 22 suites**, 0 failed, 0 cancelled, 0 skipped, 0 todo; Microsoft OpenJDK `25.0.4.1`.
- Show Queue regression: **PASS**.
- Request Export regression: **PASS**.
- Copy regression: **PASS**.
- Focused amended/shared/export/UI tests: **PASS** (latest modal contract run **6/6**; preceding focused validation recorded **46/46**, **19/19**, **10/10**, and **9/9** as applicable refinements).
- Functions build: **PASS**.
- Studio Vite build: **PASS** (existing non-blocking warnings only).
- Targeted lint: **PASS**.
- `git diff --check`: **PASS**.
- Full Studio typecheck/build: blocked only by documented unrelated baseline TypeScript errors; no changed-file regression was identified.

### Manual / owner approval

- Owner DEV QA: **PASS**, 2026-09-08.
- Final DEV disposition: **approved**.

## Scope and follow-ups

- Firestore Rules scope is limited to the canonical `settings/showQueue` Gang Sheet Settings allowlist and preserves existing owner/admin mutation authority.
- Storage Rules changed: **NO**.
- Indexes changed: **NO**.
- Migration or backfill required: **NO**.
- Studio publish performed: **NO**.
- Production touched: **NO**.
- Commit/push performed during this closeout: **NO**.
- Autonomous remains **OFF**; Automatic Pass 2 remains **PARKED**; WS6 was not started.

## Final Status

**approved** — Owner DEV QA PASS recorded and the managed goal is closed. The next checkpoint is owner authorization to commit and push the closed goal.
