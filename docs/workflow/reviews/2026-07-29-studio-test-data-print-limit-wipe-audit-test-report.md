# Test Report: Studio Test Data legacy print-limit counter cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Tester | FreshForge Test Agent |
| Plan | `docs/workflow/plans/2026-07-29-studio-test-data-print-limit-wipe-audit-plan.md` |
| Implementation | Current working-tree implementation following approved Formal Review |
| Overall | **passed_with_notes** |

---

## Summary

The approved automated verification scope is acceptable. The focused shared contract suite passes
28/28, the Functions/shared compatibility build passes, changed-file ESLint passes with zero
findings, and `git diff --check` passes. No automated test invoked
`wipeOperationalTestData`, deleted data, deployed anything, or contacted production.

The full Studio build and repository lint remain non-zero only on the documented repository
baselines:

- Studio compilation reports exactly the established 29 TypeScript errors and none in this goal's
  changed application/test files.
- Repository lint reports exactly the established 41 findings (31 errors, 10 warnings) and none in
  this goal's changed files.

The required non-destructive owner UI smoke subsequently returned **PASS**. The owner confirmed the
legacy label/copy and preset-selection behavior and canceled without submitting a wipe.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Toolchain | `npx tsc -v` | 0 | pass | TypeScript 5.9.3 |
| Focused unit tests | `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts` | 0 | pass | 28 tests, 28 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo across 5 suites; the unchanged UI-safety file was intentionally included |
| Functions/shared compatibility build | `npm run build --prefix functions` | 0 | pass | `tsc` completed; no Functions behavior changed and no deployment is required |
| Studio build | `npm run build:studio` | 1 at the root npm command; nested workspace lifecycle reported code 2 | fail_documented | Build stops at `tsc` with exactly 29 established TypeScript diagnostics; no diagnostic names a goal-changed application/test file. A PowerShell attribution rerun captured `$LASTEXITCODE=2`, matching the nested TypeScript/workspace lifecycle code and the documented baseline |
| Changed-file lint | `npx eslint apps/studio/src/renderer/src/features/test-data-reset/constants/wipeTargetOptions.ts apps/studio/src/renderer/src/features/test-data-reset/pages/TestDataResetPage.tsx packages/shared/src/utils/operationalWipeTargets.ts packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts --report-unused-disable-directives --max-warnings 0` | 0 | pass | 0 errors, 0 warnings; the unchanged UI-safety test was included exactly as prescribed |
| Repository lint | `npm run lint` | 1 | fail_documented | Exactly 41 existing findings: 31 errors and 10 warnings; none in this goal's changed files |
| Whitespace check | `git diff --check` | 0 | pass | No whitespace errors; PowerShell displayed informational LF-to-CRLF working-copy warnings |

---

## Focused Behavior Coverage

The 28/28 passing focused suite verifies:

- the stable `printRequestDesignDailyLimits` wire target remains accepted;
- selecting it alone expands to exactly `deleteCollections:
  ["printRequestDesignDailyLimits"]`;
- standalone cleanup does not reset sequences, design request stats, show allocation totals, or
  any Storage family and does not expand to requests, items, shows, allocations, or settings;
- the renamed `LEGACY_PRINT_LIMIT_COUNTERS_WIPE_PRESET_TARGETS` still contains only the stable
  legacy target id;
- Print Requests still includes legacy counter cleanup;
- Select all still includes legacy counter cleanup;
- All (-) Designs still includes legacy counter cleanup while excluding full Designs;
- existing toggle and destructive-selection safety behavior remains covered.

No test executed the callable or performed a live wipe.

---

## Documented Baseline Failures

### Studio TypeScript baseline

- **Command:** `npm run build:studio`
- **Observed root command exit:** 1
- **Nested workspace/TypeScript lifecycle code:** 2
- **Diagnostics:** 29
- **Goal-changed application/test-file diagnostics:** 0
- **In scope to fix:** no
- **Action taken:** none; unrelated cleanup belongs to the separately queued
  `preproduction-static-analysis-cleanup` goal.

The diagnostics match the established 29-error baseline and occur in unrelated AI review,
assisted-creation, customer-upload, design, Firebase subscription, print-request, settings,
staff-inbox, upcoming-show, user-audit, and shared assisted-creation files. The build did not reach
Vite or Electron packaging because `tsc` failed first.

### Repository lint baseline

- **Command:** `npm run lint`
- **Exit code:** 1
- **Findings:** 41 total (31 errors, 10 warnings)
- **Goal-changed-file findings:** 0
- **In scope to fix:** no
- **Action taken:** none.

The focused changed-file lint command independently passed, confirming the goal introduced no lint
finding.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Rules tests | No Firestore or Storage Rules change |
| Portal typecheck/build | No Portal change |
| Live callable/integration wipe | Destructive execution is forbidden; the shared compatibility contract is covered without invoking the callable |
| Deployment verification | No deployment is required or authorized |
| Production verification | Production access/action is forbidden |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Non-destructive owner Studio UI smoke | pass | Owner PASS, 2026-07-29; no wipe submitted |

Manual test instructions:

1. Fully reload development Studio connected to `fresh-prints-dev` and sign in as owner.
2. Open **Test Data Reset**.
3. Confirm the preset and target both read **Legacy print-limit counters**.
4. Expand the target and confirm the copy says the counters are legacy and unenforced and does not
   promise restored allowance.
5. Select the preset and confirm only that target is checked.
6. Confirm **Print Requests** and **All (-) Designs** still include the legacy target.
7. Proceed only far enough to confirm the typed `WIPE TEST DATA` phrase dialog appears, then cancel.
8. **Do not submit the wipe.**

---

## Recommendations

- Proceed to independent Implementation Review.
- If approved, present only the non-destructive owner UI smoke above.
- Do not deploy Functions, Rules, or any other resource for this copy/internal-symbol correction.
- Leave the unrelated 29 TypeScript errors and 41 lint findings for their separately queued cleanup
  goal.

---

## Signoff Readiness

- [x] All required automated checks pass or unrelated failures are documented exactly
- [x] Manual test complete — owner PASS
- [x] Ready for signoff phase

**Next step:** signoff.
