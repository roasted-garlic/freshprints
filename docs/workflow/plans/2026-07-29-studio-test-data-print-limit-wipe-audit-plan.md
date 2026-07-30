# Plan: Studio Test Data legacy print-limit counter cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-review.md` |

---

## Goal

Make the Studio Test Data Reset surface accurately describe
`printRequestDesignDailyLimits` as an obsolete Cap A counter collection retained only for optional
development-data cleanup. Preserve the target identifier and bounded backend delete behavior for
compatibility, while removing every claim that this action resets a current customer allowance or
changes whether customers can add prints.

## Background

ADR-FP-102 removed the standalone daily Cap A system. The collection
`printRequestDesignDailyLimits/{uid}_{yyyyMMdd}` is no longer written or enforced, and both
`docs/architecture/DATA_MODEL.md` and `docs/architecture/BACKEND.md` already classify it as legacy,
optional cleanup on `fresh-prints-dev`.

The remaining Studio Test Data Reset presentation is stale:

- `wipeTargetOptions.ts` labels the target **Print request daily limits** and says deleting it
  “Resets Cap A so customers can add prints again.”
- `TestDataResetPage.tsx` exposes a same-named preset button and repeats “Cap A counters only”
  without saying the counters are obsolete and unenforced.
- `PRINT_REQUEST_DAILY_LIMITS_WIPE_PRESET_TARGETS` still gives the legacy cleanup a name that
  implies a live product limit.

The underlying cleanup remains useful and safe to preserve:

- the stable request target id is part of the shared callable contract;
- the owner-only wipe callable deletes only the exact legacy collection for this standalone target;
- the broader Print Requests wipe already includes the collection so stale dev fixtures do not
  accumulate;
- All / All (-) Designs selection continues to represent complete operational cleanup;
- owner deletion also cleans a specific user's matching legacy records.

Authoritative references: ADR-FP-102 in `docs/project/DECISIONS.md`;
`docs/architecture/DATA_MODEL.md` operational collections;
`docs/architecture/BACKEND.md` print-limit behavior; `docs/standards/SECURITY.md`;
`docs/standards/TESTING.md`.

### Audit conclusion and target contract

| Surface | Current state | Planned state |
|---------|---------------|---------------|
| Active product limit | Sole per-request/per-customer-per-show limit `L` | Unchanged |
| Legacy collection | No longer written or enforced | Unchanged; optional dev cleanup |
| Shared target id | `printRequestDesignDailyLimits` | Preserve for request compatibility |
| Backend expansion | Deletes only `printRequestDesignDailyLimits` when selected alone | Preserve exactly |
| Print Requests wipe | Also deletes legacy counters | Preserve exactly |
| All presets | Include legacy cleanup | Preserve exactly |
| Standalone Studio label | “Print request daily limits” | “Legacy print-limit counters” |
| Standalone explanation | Claims reset lets customers add prints | State that cleanup has no effect on current limits, Current Request room, or queue capacity |
| Shared preset symbol | Named as a current daily-limit wipe | Rename to a legacy-counter cleanup symbol; no target-array behavior change |

---

## Scope

### In Scope

- Rename the standalone Studio preset and checkbox label to **Legacy print-limit counters**.
- Rewrite its summary, expanded description, and preset-help copy to say:
  - the documents are obsolete Cap A daily-counter leftovers;
  - current code does not write or enforce them;
  - deleting them does not reset current-request room, customer/show limit `L`, show capacity, or
    any other active product constraint;
  - the action keeps requests, items, and Current Request contents.
- Rename the internal shared preset export to a legacy-counter cleanup name while preserving its
  exact single target value.
- Preserve `printRequestDesignDailyLimits` as an accepted shared target and preserve its exact
  expansion to the same collection.
- Preserve automatic inclusion in Print Requests, Select all, and All (-) Designs cleanup.
- Add/update focused tests that prove the legacy target remains bounded and the broader wipe
  inclusions do not regress.
- Update Test Data Reset documentation to use the truthful legacy-cleanup terminology.
- Perform a non-destructive Studio UI smoke; do not execute a wipe merely to verify copy.

### Out of Scope

- Reintroducing or changing a daily print allowance.
- Changing sole limit `L`, Current Request quantity behavior, per-customer/per-show capacity,
  Portal gates, show capacity, or print-request status behavior.
- Removing or renaming the wire-level `printRequestDesignDailyLimits` target id.
- Deleting the legacy collection from the cleanup contract, Print Requests wipe, Select all, or
  All (-) Designs.
- Changing `wipeOperationalTestData` authorization, project allowlist, confirmation phrase,
  batching, collection-delete implementation, or response schema.
- Changing `ownerDeleteUser` cleanup.
- Firestore schema migration, backfill, one-off data deletion, or live dev wipe.
- Firestore Rules, Storage Rules, Functions runtime behavior, indexes, dependencies, or environment
  configuration.
- Any deployment, especially production.
- `preproduction-static-analysis-cleanup`,
  `customer-upload-oversized-image-normalization-and-processing-performance`, or
  `production-release`.

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/src/renderer/src/features/test-data-reset/constants/wipeTargetOptions.ts`
  - truthful legacy label, summary, and detail text only.
- `apps/studio/src/renderer/src/features/test-data-reset/pages/TestDataResetPage.tsx`
  - truthful preset button/help text and renamed preset import.
- `packages/shared/src/utils/operationalWipeTargets.ts`
  - rename the standalone preset export/comment; clarify legacy-cleanup comments; preserve target
    lists and expansion.
- `packages/shared/src/utils/operationalWipeTargets.test.ts`
  - update the renamed export and assert the standalone and bundled cleanup boundaries.
- `packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts`
  - only if the Formal Review determines an additional select-all legacy inclusion assertion is
    needed.
- `docs/standards/TESTING.md`
  - replace current-limit wording with optional legacy-counter cleanup wording.
- Workflow artifacts under `docs/workflow/plans/` and `docs/workflow/reviews/`.

Files inspected but not expected to change:

- `packages/shared/src/types/admin/wipeOperationalTestData.types.ts`
- `functions/src/wipeOperationalTestData.ts`
- `functions/src/ownerDeleteUser.ts`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/project/DECISIONS.md`
- `docs/standards/SECURITY.md`
- `docs/standards/DEPLOYMENT.md`

Those files already encode the intended compatibility, cleanup, data-model, and security behavior.
Any need to change one requires Review confirmation before implementation; a backend/security
behavior change is outside this plan and must not be inferred from copy cleanup.

### Architecture Impact

- [x] None. Studio continues to select a shared target and call the existing service; the shared
  expansion remains the source of truth. No renderer-side Firebase or deletion logic is added.

### Security Impact

- [x] Details: no authorization change. The UI remains available only in a development Studio build
  connected to the allowlisted `fresh-prints-dev` project. The callable continues to require an
  authenticated active owner, enforce the server-side project allowlist, validate target ids, and
  require the exact confirmation phrase. Admins and production builds remain excluded.

### Data Model Impact

- [x] None. No collection, field, target id, status, or relationship changes.
  `printRequestDesignDailyLimits` remains an optional legacy-cleanup collection.

### Backend Impact

- [x] None. The standalone target still expands to exactly one collection delete, and broader wipe
  expansions retain their current inclusion. No Functions redeployment is required for a Studio
  copy/internal-symbol-only correction.

### UI / UX Impact

- [x] Details: owner-facing development-only copy changes from an apparently active daily-limit
  reset to explicit legacy-data cleanup. Existing control placement, selection behavior,
  confirmation flow, destructive styling, and result presentation remain unchanged.

### Migration Impact

- [x] None.
- [ ] Forward steps: not applicable.
- [x] Rollback / compatibility: the stable wire target id and backend delete behavior remain
  compatible with already deployed Functions and older clients.

---

## Approach

1. Establish regression tests around the compatibility contract before changing presentation:
   selecting `printRequestDesignDailyLimits` alone must delete only that collection; Print Requests
   and the broad presets must continue including it; no request/item/show deletion may be introduced
   by the standalone selection.
2. Rename the internal preset export from current-limit terminology to explicit legacy-counter
   cleanup terminology. Keep the array value exactly `["printRequestDesignDailyLimits"]`.
3. Update Studio preset/button/help/target copy to the audit conclusion. Do not add another control
   and do not change selection state or confirmation handling.
4. Update shared comments and `docs/standards/TESTING.md` so code documentation and operator
   instructions use the same legacy-cleanup language.
5. Verify source diffs contain no change to target order, expansion, callable logic, authorization,
   or deployed configuration.
6. Run focused tests, affected builds/typechecks, lint accounting, and a non-destructive UI smoke.
   Record exact exit codes and distinguish known repository baseline findings from changed-file
   findings.

### Acceptance criteria

- Studio no longer calls the target or preset a current “daily limit” reset.
- Studio explicitly says the collection is legacy, no longer written/enforced, and deleting it
  cannot restore any current customer allowance.
- The stable target id remains accepted by the callable contract.
- Standalone expansion remains exactly one legacy collection.
- Print Requests and broad cleanup presets continue clearing legacy counter leftovers.
- No wipe is executed as part of automated or manual verification.
- No Function/Rules/index/deployment/production action occurs.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Toolchain record | `npx tsc -v` | yes |
| Focused unit tests | `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts` | yes |
| Functions/shared compatibility build | `npm run build --prefix functions` | yes |
| Studio build | `npm run build:studio` | yes; report non-zero honestly against documented baseline |
| Changed-file lint | `npx eslint apps/studio/src/renderer/src/features/test-data-reset/constants/wipeTargetOptions.ts apps/studio/src/renderer/src/features/test-data-reset/pages/TestDataResetPage.tsx packages/shared/src/utils/operationalWipeTargets.ts packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts --report-unused-disable-directives --max-warnings 0` | yes |
| Repository lint | `npm run lint` | yes; report baseline and changed-line attribution |
| Whitespace check | `git diff --check` | yes |
| Rules tests | Not required: no Rules change | no |
| Portal build/typecheck | Not required: no Portal change | no |

Tests must cover:

- exact standalone target expansion;
- preservation of the legacy target id;
- inclusion in the Print Requests wipe;
- inclusion in Select all / All (-) Designs;
- no expansion into print requests, items, shows, allocations, limits/settings, or Storage when
  selected alone;
- preset constant rename without changing its target value.

### Manual

- [x] Details: fully reload development Studio connected to `fresh-prints-dev`, sign in as owner,
  and open Test Data Reset.
- Confirm the preset and target both read **Legacy print-limit counters**.
- Expand the target and confirm the copy says legacy/unenforced and does not promise restored
  allowance.
- Select the preset and confirm only that target is checked.
- Confirm Print Requests and All (-) Designs still include the legacy target.
- Confirm the typed phrase confirmation still appears if the user proceeds, then cancel it.
- Do **not** submit the wipe.
- Confirm non-owner and non-allowlisted/production-build gates remain unchanged by source/tests; no
  destructive live role-switch check is required.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review: one non-destructive owner smoke after independent Implementation Review.
- [ ] Design approval: not required; development-only operational copy.
- [ ] Business logic decision: not blocking. ADR-FP-102 and current architecture already establish
  that the counter is obsolete and optional cleanup.
- [ ] Production deploy: forbidden.
- [ ] Database migration: none.
- [ ] Auth / external service setup: none.
- [ ] Secrets / env vars: none.
- [ ] Other deployment: none expected. If implementation evidence unexpectedly proves a Functions
  change is necessary, stop and return to Review rather than deploying.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Removing the legacy target breaks older callers or leaves stale dev fixtures | Medium | Preserve the target id, type, expansion, broad-preset inclusion, and backend behavior; tests lock these invariants |
| New copy still implies deleting counters changes active limit `L` | Medium | Require explicit “no longer written or enforced” and “does not reset current limits/room/capacity” language |
| A copy-only change accidentally alters destructive selection behavior | High | Limit code paths, compare target arrays/expansion, and add exact focused assertions before signoff |
| A developer executes a destructive wipe merely to test the label | Medium | Manual QA ends at the confirmation modal and cancels; no data deletion is part of verification |
| Compatibility-only shared rename is mistaken for a backend deployment requirement | Low | Preserve expansion/runtime behavior, run Functions build locally, and document that no deployment is required |
| Scope expands into limit `L`, Portal capacity, or later queued goals | High | Explicit out-of-scope list and Formal/Implementation Reviews; touch only proven files |
| Existing Studio TypeScript/lint baseline obscures a new issue | Medium | Run focused tests and changed-file lint separately; report repository non-zero commands exactly |

No persistent new project risk is introduced; a `RISK_REGISTER.md` entry is not planned unless
Review identifies an unresolved risk that survives this managed goal.

See also: `.cursor/workflow/risk-checklist.md`.

---

## Rollback Plan

Revert only the Studio copy/import, shared preset-symbol/comment, focused test, and TESTING
documentation changes. Because the wire target id and backend expansion are unchanged, rollback
requires no data restoration, Functions rollback, Rules rollback, migration, or deployment.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md — already truthful; verify only
- [ ] BACKEND.md — already truthful; verify only
- [x] TESTING.md
- [ ] DEPLOYMENT.md — no deployment behavior changes
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md — ADR-FP-102 already authoritative
- [x] Other: workflow Formal Review, test report, independent Implementation Review, QA checkpoint,
  signoff, workflow state, and current handoff records as required by later phases

---

## Open Questions

- [x] None blocking.

The evidence-backed default is to retain one clearly labeled standalone legacy-cleanup action,
rather than remove a safe cleanup path or rename its wire-level target id. Formal Review must
independently confirm this is the narrowest adequate interpretation before implementation.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-29-studio-test-data-print-limit-wipe-audit-review.md`
- Verdict: pending
