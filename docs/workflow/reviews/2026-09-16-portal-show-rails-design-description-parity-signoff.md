# Signoff: Portal Show Rails Design Description Parity

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Signoff by | FreshForge Signoff / Codex |
| Plan | `docs/workflow/plans/2026-09-16-portal-show-rails-design-description-parity-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-review.md` |
| Test report | `docs/workflow/reviews/2026-09-16-portal-show-rails-design-description-parity-test-report.md` |
| Final status | **approved** — production promoted and machine-verified |

## Summary

The Portal homepage `Next Show` and `Added to Shows This Week` rails now hydrate compact show-card
selections through the existing ready-design-by-ID catalog path before opening the shared Design
Details modal. Persisted descriptions are restored without changing the public show-card DTO,
regenerating descriptions, changing rail ordering/membership, or altering modal actions and privacy
behavior.

## Changes Delivered

### Behavior

- Restored persisted description parity for both affected homepage show rails.
- Preserved ordinary catalog behavior and explicit empty-description display semantics.
- Added stale-response protection for successive design selections and fail-closed handling when a
  design is no longer ready.

### Files Created

- `apps/portal/features/show-designs/utils/showDesignDetailsHydration.ts`
- `apps/portal/features/show-designs/utils/showDesignDetailsHydration.test.ts`
- Plan, Formal Review, Test Report, and this Signoff under `docs/workflow/`.

### Files Modified

- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.showRails.test.ts`

### Documentation Updated

- `docs/project/ROADMAP.md`
- `.cursor/workflow/state.md`
- Required project handoff snapshots and recent-work inventory.

## Tests

### Automated

- Hydration/show-rail contracts: **17/17 PASS**.
- Adjacent Portal contracts: **24/24 PASS**.
- Portal typecheck: **PASS**.
- Changed-source ESLint: **PASS**.
- Portal production build: **PASS**, including 22/22 generated pages.
- `git diff --check`: **PASS**.
- Historical unrelated baseline failures remain documented and unchanged.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Next Show description and modal parity | PASS | Owner DEV QA |
| Added to Shows This Week description and modal parity | PASS | Owner DEV QA |
| Ordinary catalog parity, successive selection freshness, actions, and rail stability | PASS | Owner DEV QA |

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Owner DEV QA | obtained | 2026-09-16 | Exact phrase: **Owner DEV QA: PASS** |
| Production Portal promotion and App Hosting rollout | obtained | 2026-09-16 | PR #100; merge `15676fcd010f572af0d4a2bc969b108d2777be0a`; rollout `build-2026-09-17-001` |
| Database migration / backend deployment | not required | 2026-09-16 | No data or backend delta |
| Secrets / environment changes | not required | 2026-09-16 | No configuration change |

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Historical unrelated Portal contract drift | Low | Documented in Test Report; no affected files changed. |
| Design unavailable between rail load and click | Low | Hydration fails closed instead of displaying stale compact data. |

## Deferred Items (Roadmap)

- None for this bounded hotfix. No Functions, Rules, indexes, Storage Rules, IAM, Firebase
  configuration, migration, backfill, or Studio release action is included.

## Open Blockers

- [x] None

## Verdict

**Approved and complete.** Owner DEV QA passed; protected PR #100 merged the candidate to
production as `15676fcd010f572af0d4a2bc969b108d2777be0a`. Portal App Hosting rollout
`build-2026-09-17-001` succeeded with the new revision at 100% traffic. Machine verification is
recorded in the Test Report.

## Workflow Complete

- [x] Plan and Formal Review complete.
- [x] Implementation completed within approved scope.
- [x] Automated tests and checks recorded.
- [x] Owner DEV QA PASS recorded.
- [x] `.cursor/workflow/state.md` and roadmap updated.
- [x] Required project handoff updated.
- [x] Development commit/push completed.
- [x] Protected production PR merged.
- [x] Portal App Hosting rollout completed and machine-verified.
