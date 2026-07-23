# Test Report: Studio Contextual Safe Deletion

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-22-studio-contextual-safe-deletion-plan.md |
| Implementation | Session implement (Passes 1–6) |
| Overall | **pending_manual** |

---

## Summary

Automated unit tests for deletion eligibility and deleted-username display passed (7/7). Functions TypeScript build passed. Targeted ESLint on new/changed users and deletion modules passed. Full Studio `tsc --noEmit` could not complete due to a pre-existing tooling mismatch (`ignoreDeprecations: "6.0"` invalid on TypeScript 5.9.3). Manual QA on `fresh-prints-dev` is required before signoff. No production deploy.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test packages/shared/src/utils/formatCustomerUsernameForDisplay.test.ts functions/src/lib/deletionEligibility.test.ts` | 0 | pass | 7 tests |
| Functions build | `npm --prefix functions run build` | 0 | pass | Includes new callables |
| Lint (users + deletion modules) | `npx eslint apps/studio/src/renderer/src/features/users … functions/src/{tombstone,deleteEligible*,archiveTaxonomy*}.ts --max-warnings 0` | 0 | pass | |
| Lint (pages) | ESLint on PrintRequests/UpcomingShows/TestDataReset/CustomerUploads | 1 | fail (warning) | Pre-existing `react-hooks/exhaustive-deps` on UpcomingShowsPage L580 — not introduced by delete button |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | 2 | fail/skip | `TS5103: Invalid value for '--ignoreDeprecations'` — toolchain issue, not app code |
| Portal typecheck | — | — | skip | No Portal UI changes this phase (display helper available for later) |
| E2E | — | — | skip | Manual QA covers flows |
| Rules emulator | — | — | skip | No rules relaxation |

---

## Failures (if any)

### Studio typecheck ignoreDeprecations

- **Command:** `npx tsc --noEmit` (apps/studio)
- **Output excerpt:**
```
tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```
- **In scope to fix:** no (pre-existing config vs TS 5.9; out of deletion scope)
- **Action taken:** Documented; recommend separate tooling fix

### UpcomingShows exhaustive-deps warning

- **Command:** eslint UpcomingShowsPage
- **In scope to fix:** no (pre-existing)
- **Action taken:** Left unchanged

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full monorepo lint | Targeted lint used; full lint may surface unrelated warnings |
| Portal typecheck | No Portal code changes required for this phase |
| Live Functions deploy | Human gate; soft-deploy not requested |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Entity-by-entity deletion QA (20 scenarios) | pending | See manual checkpoint |

Manual test instructions: `docs/workflow/reviews/2026-07-22-studio-contextual-safe-deletion-manual-checkpoint.md`

---

## Recommendations

- Soft-deploy new Functions to `fresh-prints-dev` before manual QA (`tombstoneCustomerAccount`, print/show/upload delete, taxonomy guards).
- Fix Studio `ignoreDeprecations` / TypeScript version alignment in a separate chore.
- Add Functions integration tests with Admin emulator in a follow-up if desired.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending
- [ ] Ready for signoff phase

**Next step:** manual-test-checkpoint (after Functions soft-deploy if needed)
