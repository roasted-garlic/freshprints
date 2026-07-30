# Signoff: Studio Test Data legacy print-limit counter cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-29-studio-test-data-print-limit-wipe-audit-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-review.md` — `approved` |
| Test report | `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-test-report.md` — `passed_with_notes` |
| Implementation Review | `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-implementation-review-19.md` — `APPROVED` |
| Owner QA | `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-qa-checkpoint.md` — `PASS` |
| Final status | **approved** |

---

## Summary

The Studio Test Data Reset surface now presents `printRequestDesignDailyLimits` truthfully as
optional cleanup of obsolete, unenforced Cap A counter documents. The owner-facing label is
**Legacy print-limit counters**, and the supporting copy makes clear that deleting those documents
does not change current limit `L`, Current Request room, customer allowance, or show capacity.

The stable wire target id, exact standalone delete scope, Print Requests inclusion, Select all
inclusion, All (-) Designs inclusion, callable security boundary, and all active product-limit
behavior are preserved. Owner QA passed the complete non-destructive UI checkpoint.

## Changes Delivered

### Behavior

- Renamed the development-only standalone preset and target presentation to **Legacy print-limit
  counters**.
- Replaced stale active-limit language with explicit legacy, no-longer-written, and unenforced
  cleanup language.
- Preserved `printRequestDesignDailyLimits` as the stable wire-level target.
- Preserved standalone expansion to exactly the legacy collection.
- Preserved inclusion in Print Requests, Select all, and All (-) Designs.
- Preserved the owner-only, development-project-only, typed-confirmation destructive boundary.
- Added focused regression coverage for the exact standalone scope and broader preset inclusions.

### Files Created

- `docs/workflow/plans/2026-07-29-studio-test-data-print-limit-wipe-audit-plan.md`
- `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-review.md`
- `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-test-report.md`
- `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-implementation-review-19.md`
- `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-qa-checkpoint.md`
- `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-signoff.md`

### Files Modified

- `apps/studio/src/renderer/src/features/test-data-reset/constants/wipeTargetOptions.ts`
- `apps/studio/src/renderer/src/features/test-data-reset/pages/TestDataResetPage.tsx`
- `packages/shared/src/utils/operationalWipeTargets.ts`
- `packages/shared/src/utils/operationalWipeTargets.test.ts`
- `docs/standards/TESTING.md`

### Documentation Updated

- Test Data Reset guidance now distinguishes optional legacy-counter cleanup from active
  limit/capacity behavior.
- The Plan, Formal Review, test report, Implementation Review 19, owner QA checkpoint, and this
  signoff provide the complete managed-phase record.

## Tests

### Automated

| Command | Exit | Result |
|---------|------|--------|
| `npx tsc -v` | 0 | TypeScript 5.9.3 |
| `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts` | 0 | 28/28 passed; 0 failed, cancelled, skipped, or todo |
| `npm run build --prefix functions` | 0 | Passed; compatibility build only, with no Functions behavior change |
| `npm run build:studio` | 1 at root; nested lifecycle 2 | Documented unrelated baseline: 29 TypeScript diagnostics, zero in goal-changed application/test files |
| Changed-file ESLint command recorded in the test report | 0 | Zero errors and zero warnings |
| `npm run lint` | 1 | Documented unrelated baseline: 41 findings (31 errors, 10 warnings), none in goal-changed files |
| `git diff --check` | 0 | No whitespace errors; informational line-ending warnings only |

The non-zero Studio build and repository lint commands are not described as clean or passing.
Their unchanged findings are unrelated to this goal and remain assigned to the queued
`preproduction-static-analysis-cleanup` goal.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner Studio Test Data Reset UI smoke | PASS | Owner, 2026-07-29 |
| Legacy label and truthful unenforced-cleanup copy | PASS | Owner, 2026-07-29 |
| Legacy-only, Print Requests, and All (-) Designs selection behavior | PASS | Owner, 2026-07-29 |
| Typed-confirmation dialog opened and canceled without submission | PASS | Owner, 2026-07-29 |

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner UI/UX smoke | obtained | 2026-07-29 | Owner returned `PASS` |
| Production deploy | not required | 2026-07-29 | No deployment was performed or authorized |
| Database migration or wipe | not required | 2026-07-29 | No wipe was submitted and no data was deleted |
| Business / policy | not required | 2026-07-29 | ADR-FP-102 already defines the legacy status |
| Secrets / environment | not required | 2026-07-29 | No secrets or environment changes |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Studio repository TypeScript baseline: 29 diagnostics | Existing / unrelated | Address only in `preproduction-static-analysis-cleanup`; zero diagnostics were attributed to goal-changed application/test files |
| Repository lint baseline: 41 findings (31 errors, 10 warnings) | Existing / unrelated | Address only in `preproduction-static-analysis-cleanup`; changed-file lint passed with zero findings |

No persistent new project risk survives this goal, so no new `RISK_REGISTER.md` entry is required.

## Deferred Items (Roadmap)

- Exact next queued managed goal: `preproduction-static-analysis-cleanup`.
- `customer-upload-oversized-image-normalization-and-processing-performance` and
  `production-release` remain queued and untouched.
- No later goal was started as part of this signoff.

## Open Blockers

- [x] None

## Verdict

**approved.** Formal Review approved the bounded plan, all goal-changed focused tests and lint
checks pass, Implementation Review 19 independently returned `APPROVED` with no required changes,
and the owner returned `PASS` on the non-destructive UI checkpoint. The documented non-zero Studio
build and repository lint baselines are unrelated and do not block this goal.

No operational wipe, data deletion, deployment, migration, or production action occurred.

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` reviewed; no update required
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other applicable handoff records refreshed

**Recommended next action for user:** Send `Continue Workflow` when ready to begin the confirmed
next queued managed goal, `preproduction-static-analysis-cleanup`. It is not started by this
signoff.
