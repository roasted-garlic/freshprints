# Review: Studio Test Data legacy print-limit counter cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Reviewer | Independent Review Agent |
| Plan | `docs/workflow/plans/2026-07-29-studio-test-data-print-limit-wipe-audit-plan.md` |
| Verdict | **approved** |

---

## Summary

The plan is narrow, evidence-backed, and aligned with the current architecture. Retaining the stable
`printRequestDesignDailyLimits` target while relabeling its Studio presentation as optional legacy
cleanup is the least disruptive adequate interpretation: ADR-FP-102 removed Cap A enforcement,
current source contains no operational writer for the collection, and the existing owner-only
development wipe remains a useful compatibility and fixture-cleanup path.

The required tests explicitly lock both sides of that decision: the standalone target must expand to
only the legacy collection, while Print Requests, Select all, and All (-) Designs must continue to
include it. No Function behavior changes, so no Functions deployment is needed.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Copy, one internal preset-symbol rename, focused tests, and testing documentation only |
| Architecture alignment | pass | Existing Studio → shared target → callable boundary is preserved |
| Security impact addressed | pass | Owner/dev/project/confirmation gates remain untouched |
| Data model impact addressed | pass | Stable target id and legacy collection remain unchanged |
| Backend impact addressed | pass | Expansion and callable runtime behavior are explicitly frozen |
| Test strategy adequate | pass | Exact standalone and broad-preset behavior are required |
| Human checkpoints identified | pass | Non-destructive owner UI smoke only |
| Roadmap alignment | pass | This is the exact next queued managed goal |
| Documentation plan | pass | `TESTING.md` and workflow records are identified; already-truthful architecture docs are verification-only |
| No silent scope expansion | pass | Active limit `L`, Portal, Rules, Functions behavior, data deletion, and deployments are excluded |

---

## Architecture Review

**Findings:**

- `TestDataResetPage.tsx` currently selects shared preset constants and delegates deletion through
  the existing service/callable path. The plan preserves that ownership and introduces no Firebase
  or deletion logic in the renderer.
- `packages/shared/src/utils/operationalWipeTargets.ts` remains the single source for target
  expansion. Renaming only the standalone preset export, while preserving its array value, does not
  alter the wire contract.
- Removing the target or renaming the wire id would be a broader compatibility change without a
  demonstrated benefit. Retaining it and correcting its operator-facing meaning is the narrowest
  adequate solution.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- `wipeOperationalTestData` authenticates the caller, requires an active owner, rejects projects
  outside the `fresh-prints-dev` allowlist, validates target ids, and requires the exact confirmation
  phrase. The plan does not change these controls.
- The manual test stops at and cancels the confirmation dialog. It does not authorize or require a
  destructive wipe.
- Production and every deployment action are explicitly out of scope.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] None; production action is forbidden for this goal.

---

## Data Model Review

**Findings:**

- `DATA_MODEL.md` classifies `printRequestDesignDailyLimits/{uid}_{yyyyMMdd}` as legacy Cap A
  counters that are no longer written or enforced and remain an optional development cleanup
  target.
- ADR-FP-102 removes Cap A counters, charge/refund, quota reads, and Portal daily gates. ADR-FP-122
  changes only the former same-show uniqueness decision and leaves Cap A removal intact.
- Repository source references outside documentation are limited to the retained collection
  constant, cleanup/delete paths, target definitions, Studio copy, and tests. No active application
  writer or enforcement path was found.
- The plan correctly preserves the collection name and wire-level target id and requires no
  migration.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- The standalone target currently expands to exactly
  `["printRequestDesignDailyLimits"]`.
- The Print Requests expansion intentionally includes the legacy collection, and
  `ALL_OPERATIONAL_WIPE_TARGETS` plus `EVERYTHING_EXCEPT_DESIGNS_WIPE_PRESET_TARGETS` retain it.
- `functions/src/wipeOperationalTestData.ts` imports the expansion function, not the standalone
  Studio preset export. Renaming that export and changing comments/copy does not change callable
  behavior or its deployed contract.
- A local Functions build is appropriate as a compatibility check because Functions compile the
  shared module. A Functions deployment is not required unless implementation changes runtime
  expansion or callable code; that would be outside this approved plan and must return to Review.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Existing coverage already proves the standalone target's `deleteCollections` value is exactly the
  one legacy collection and proves Print Requests includes it, but current broad-preset assertions
  do not explicitly name this legacy invariant.
- The plan closes that gap by requiring:
  - the renamed standalone preset constant to equal only
    `["printRequestDesignDailyLimits"]`;
  - exact standalone expansion with no requests, items, shows, allocations, settings/counters reset,
    or Storage effects;
  - explicit legacy-target inclusion in Print Requests, Select all, and All (-) Designs.
- Focused shared tests, a Functions build, Studio build, changed-file lint, repository lint
  accounting, and `git diff --check` are proportionate. Rules and Portal checks are correctly
  excluded because neither surface changes.
- The non-destructive owner smoke verifies copy and selection behavior without executing the
  callable.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- `DATA_MODEL.md`, `BACKEND.md`, and ADR-FP-102 already state the authoritative legacy behavior and
  should remain unchanged unless implementation discovers a contradiction.
- `TESTING.md` currently documents wipe deployment generally but omits this standalone legacy
  cleanup preset. Updating it to distinguish copy/internal-symbol work from wipe-expansion changes
  will prevent an unnecessary Functions redeploy.
- Workflow test, implementation-review, QA, signoff, state, and handoff records are correctly
  deferred to their corresponding phases.

---

## Required Changes

None.

---

## Blockers

None.

---

## Verdict Rationale

**approved.** The plan corrects a misleading development-only label without changing active product
limits, destructive behavior, security boundaries, data shape, or backend runtime. Its acceptance
criteria and required tests are sufficiently exact to detect accidental removal, expansion, or
broad-preset regression. No deployment is justified by the approved change.

---

## Next Step

Implement only the approved scope. Preserve the stable target id and exact expansion, add the
specified focused assertions before signoff, perform no wipe, and perform no deployment. If runtime
Function or security behavior appears to require modification, stop and return to Review.
