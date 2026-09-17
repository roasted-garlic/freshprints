# Review: Portal Show Rails Design Description Parity

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-16-portal-show-rails-design-description-parity-plan.md` |
| Verdict | **approved** |

---

## Summary

The plan correctly identifies a shared Portal homepage path: both `Next Show` and `Added to Shows
This Week` use the compact show-card mapper, `CatalogSelectionCard`, and the existing
`CatalogDesignDetailsModal`. Their missing description is caused by the compact DTO/mapper omitting
the field, while the normal catalog path already maps and reads the full ready design.

The bounded click-time hydration approach reuses `catalogService.getReadyDesignsByIds`, avoids a
public payload or Function change, preserves the existing modal and security boundary, and adds a
generation guard for successive selections. The plan is approved for implementation within its frozen
Portal-only file list. Owner DEV QA remains a required checkpoint before any production action.

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Homepage show-rail detail parity only; no catalog generation or unrelated Discover work. |
| Architecture alignment | pass | Existing page → catalog service → Firestore path; existing modal remains sole details UI. |
| Security impact addressed | pass | Existing ready-only by-ID mapper/allowlist is reused; no private fields or public DTO expansion. |
| Data model impact addressed | pass | Reads persisted `Design.description`; no schema, writes, migration, or backfill. |
| Backend impact addressed | pass | No Function/callable, Rules, index, or configuration change. |
| Test strategy adequate | pass | Mapper/hydration, parity, empty/stale selection, action wiring, DTO privacy, order, typecheck/lint/build, and diff checks are specified. |
| Human checkpoints identified | pass | Stop after automated validation for Owner DEV QA; no deployment before explicit QA PASS. |
| Roadmap alignment | pass | Small Portal Phase 8 production hotfix; Studio v1.0.14 remains independent. |
| Documentation plan | pass | Workflow artifacts plus roadmap/state/handoff at signoff. |
| No silent scope expansion | pass | Public show-card contract and backend are explicitly frozen. |

## Architecture Review

**Findings:**

- The affected homepage rail path is `portalShowDesignsService` → compact `PortalShowCatalogDesignCard`
  → `mapPortalShowCatalogDesignCardToCatalogDesign` → `CatalogSelectionCard` → shared
  `CatalogDesignDetailsModal`.
- `catalogService.getReadyDesignsByIds` already performs the authoritative ready-only per-ID read,
  maps `description`, and is already used for deep links, favorites, share, account, and full show
  gallery hydration.
- `loadCatalogShowDesigns` already hydrates View All show designs, so the plan does not broaden scope
  to a path that is already correct.

**Required changes:**

- [x] None

## Security Review

**Findings:**

- The fix must not add `description` or any other private field to the public show-card callable
  response. The approved approach hydrates through the existing customer-safe ready design document
  mapping.
- Non-ready, missing, or denied IDs must fail closed rather than display a stale compact object.
- Existing Explicit Content masking and session reveal behavior remains in the modal and must not be
  bypassed by the hydration helper.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] Owner DEV QA PASS is required before the pre-authorized production promotion and Portal App
  Hosting rollout.

## Data Model Review

**Findings:**

- `Design.description` is an existing optional catalog field. No write path, type, status, or
  relationship changes.
- Explicit empty descriptions must remain empty and use the modal's existing `—` display behavior.

**Required changes:**

- [x] None

## Backend Review

**Findings:**

- No Function change is needed. The existing compact `listPortalShowCatalogDesigns` response stays
  unchanged, and the established client Firestore read handles authoritative metadata.
- Expected production delta remains Portal App Hosting only, after QA PASS.

**Required changes:**

- [x] None

## Testing Review

**Findings:**

- Focused tests should prove the mapper-to-hydration seam, both named rails, ordinary catalog parity,
  empty description semantics, A→B response isolation, modal action props, no public DTO expansion,
  and unchanged rail order/membership.
- Portal typecheck, canonical changed-source lint, production build, and `git diff --check` are the
  appropriate automated gates. No backend/rules test is required because those surfaces are frozen.
- Manual visual/behavioral validation remains essential for the human-facing detail modal.

**Required changes:**

- [x] None

## Documentation Review

**Findings:**

- The plan records the exact rendering path, source object differences, existing display semantics,
  security boundary, and production checkpoint.
- Roadmap/state/current handoff must be updated during signoff, not before Owner DEV QA.

## Required Changes (if approved_with_changes)

1. None.

## Blockers (if blocked)

1. None.

## Verdict Rationale

**Approved.** The root cause is proven, the proposed change is the smallest existing-service fix,
and the plan preserves public contracts, security, ordering, membership, and the already-working
ordinary catalog path. No implementation may expand into Functions, Rules, data, or description
generation.

## Next Step

Implement the approved Portal-only plan, then run the specified focused tests and Portal gates. Stop
for Owner DEV QA before any commit/push promotion or App Hosting rollout.
