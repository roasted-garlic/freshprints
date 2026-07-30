# Studio Test Data legacy print-limit counter cleanup — Implementation Review 19

**Date:** 2026-07-29  
**Plan reviewed:** `docs/workflow/plans/2026-07-29-studio-test-data-print-limit-wipe-audit-plan.md`  
**Formal Review:** `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-review.md` (`approved`)  
**Test report:** `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-test-report.md`  
**Reviewer:** independent Implementation Review 19  
**Verdict:** `APPROVED`

## Independence and reviewed scope

This review inspected the current implementation, shared wipe contract, production callable
boundary, authoritative limit documentation, focused tests, and recorded verification results. It
did not defer to the Formal Review verdict or implementation/test narrative. The reviewer
independently ran the focused contract suite, changed-file lint, and repository whitespace check.

The repository has a large accumulated dirty worktree from completed earlier goals. This review
therefore attributed this goal only to the five files listed in current workflow state and the test
report:

- `apps/studio/src/renderer/src/features/test-data-reset/constants/wipeTargetOptions.ts`
- `apps/studio/src/renderer/src/features/test-data-reset/pages/TestDataResetPage.tsx`
- `packages/shared/src/utils/operationalWipeTargets.ts`
- `packages/shared/src/utils/operationalWipeTargets.test.ts`
- `docs/standards/TESTING.md`

Unrelated pre-existing diffs in Functions, Rules, configuration, Portal, and other Studio features
were not treated as changes made by this goal. This reviewer created only this review artifact and
did not change application code, workflow state, the Plan, test report, data, or deployment state.

## Findings

### Stable wire target and exact standalone expansion are preserved

The wire-level target remains exactly `printRequestDesignDailyLimits` in
`OperationalWipeTarget`, `OPERATIONAL_WIPE_TARGETS`, the Studio option id, and the shared expansion.
The renamed internal preset export is:

```text
LEGACY_PRINT_LIMIT_COUNTERS_WIPE_PRESET_TARGETS =
  ["printRequestDesignDailyLimits"]
```

Selecting that target alone still enters the same existing expansion branch and adds only
`printRequestDesignDailyLimits` to `deleteCollections`. It does not reset sequences, design request
stats, show allocation totals, or any Storage family. The exact-plan assertion covers the complete
`ExpandedOperationalWipePlan`, so an accidental request, item, show, allocation, setting, or Storage
side effect would fail the focused suite.

The shared production expansion logic itself was not changed. The only non-test changes in
`operationalWipeTargets.ts` are truthful comments and the internal preset-symbol rename. The
callable consumes `expandOperationalWipePlan`, not the renamed Studio preset export, so the deployed
request contract remains compatible with older clients.

### Print Requests, Select all, and All (-) Designs retain the cleanup target

Current source and explicit tests verify all required inclusions:

- `PRINT_REQUESTS_WIPE_PRESET_TARGETS` still expands through the existing print-request stack,
  which contains `printRequestDesignDailyLimits`;
- `ALL_OPERATIONAL_WIPE_TARGETS` still directly contains
  `printRequestDesignDailyLimits`; and
- `EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS` is still derived by removing only `designs`, so it
  retains the legacy target.

The Studio buttons continue to use these shared arrays. No target order, toggle behavior,
confirmation handling, or destructive submission path was changed.

### UI copy is truthful and consistent with the authoritative model

The standalone preset button and checkbox now read **Legacy print-limit counters**. The summary,
expanded description, preset notes, shared comments, and Test Data Reset testing documentation all
state that the collection is legacy and no longer written or enforced. They also explicitly state
that deleting it does not change current limit `L`, customer/Current Request room, or show
capacity, and that requests and line items remain.

That copy matches ADR-FP-102, `DATA_MODEL.md`, and `BACKEND.md`: the sole enforced Portal limit is
`L`, while `printRequestDesignDailyLimits` is an optional development cleanup collection. No
operator-facing text promises restored allowance or describes this cleanup as an active daily-limit
reset.

### No backend, security, active-limit, or deployment behavior changed

The implementation does not edit `wipeOperationalTestData`, `ownerDeleteUser`, the shared request
type, Rules, indexes, environment configuration, limit settings, Portal gates, or capacity logic.
The callable still:

- accepts the stable target id;
- requires authentication and an active owner;
- permits only the allowlisted `fresh-prints-dev` project;
- validates the exact confirmation phrase and target ids; and
- delegates deletion scope to the unchanged shared expansion.

No Function build artifact requires deployment because neither callable behavior nor its wire
contract changed. There is no migration, Rules change, active-limit change, or runtime security
change.

### Test coverage and baseline reporting are sufficient

The focused suite directly covers the exact standalone plan, stable target, renamed preset value,
Print Requests inclusion, Select-all inclusion, All (-) Designs inclusion, and existing selection
safety. A live destructive integration test would be disproportionate and contrary to the Plan;
the remaining UI-copy and preset-selection confirmation is correctly reserved for a
non-destructive owner smoke that cancels before submission.

Independent commands run by this reviewer:

| Command | Exit | Result |
|---|---:|---|
| `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts` | 0 | 28/28 passed; 5 suites; 0 failed, cancelled, skipped, or todo |
| `npx eslint apps/studio/src/renderer/src/features/test-data-reset/constants/wipeTargetOptions.ts apps/studio/src/renderer/src/features/test-data-reset/pages/TestDataResetPage.tsx packages/shared/src/utils/operationalWipeTargets.ts packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts --report-unused-disable-directives --max-warnings 0` | 0 | zero findings |
| `git diff --check` | 0 | no whitespace errors; informational LF-to-CRLF working-copy warnings only |

The test report also records:

- `npx tsc -v`: exit `0`, TypeScript 5.9.3;
- `npm run build --prefix functions`: exit `0`;
- `npm run build:studio`: root exit `1`, nested workspace/TypeScript lifecycle exit `2`, exactly
  the established 29 diagnostics and zero in this goal's changed application/test files; and
- `npm run lint`: exit `1`, exactly the established 41 findings (31 errors, 10 warnings), with none
  in this goal's changed files.

Those non-zero commands are reported as documented baseline failures, not as clean or passing.
The separate changed-file lint result provides adequate changed-line attribution. The queued
`preproduction-static-analysis-cleanup` goal remains the correct owner for those unrelated
baselines.

### Destructive and roadmap boundaries were respected

The implementation and automated verification do not invoke `wipeOperationalTestData`, submit
`WIPE TEST DATA`, or delete live data. No deployment or production action is recorded or required.
No work from `preproduction-static-analysis-cleanup`,
`customer-upload-oversized-image-normalization-and-processing-performance`, or
`production-release` was started as part of this goal.

## Required changes

None.

## Blockers

None.

## Verdict rationale

**`APPROVED`**

The implementation is the narrowest approved correction: it replaces misleading active-limit copy
with accurate legacy-cleanup language while preserving the stable wire target, exact standalone
delete scope, broad-preset inclusions, callable security boundary, and every active limit/capacity
behavior. Automated coverage is proportionate and passes independently. The known Studio and
repository lint failures are unrelated, exactly accounted for, and not misrepresented.

## Next step

Open the approved non-destructive owner UI checkpoint:

1. Fully reload the development Studio connected to `fresh-prints-dev` and sign in as owner.
2. Open **Test Data Reset**.
3. Confirm the preset and target both read **Legacy print-limit counters**.
4. Confirm the expanded copy says the counters are legacy and unenforced and does not promise
   restored allowance.
5. Select that preset and confirm only the legacy target is checked.
6. Confirm **Print Requests** and **All (-) Designs** still include the legacy target.
7. Open the typed-phrase confirmation only far enough to verify it appears, then cancel.

Do not submit a wipe, deploy anything, touch production, sign off before the owner result, or start
a later queued goal.
