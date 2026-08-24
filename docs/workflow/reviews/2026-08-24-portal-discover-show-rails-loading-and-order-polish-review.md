# Review: Portal Discover Show Rails Loading and Order Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-24-portal-discover-show-rails-loading-and-order-polish-plan.md |
| Verdict | **approved** |

---

## Summary

The plan correctly identifies the primary root cause — a parent-level `isLoading || isShowRailsLoading` OR gate in `CatalogHomePageContent` — and proposes a narrow, architecture-aligned fix: split show-rail service loaders, independent hook state per rail, localized loading sections, and a non-mutating presentation helper for This Week reversal. Scope is bounded, security/data/backend impact is none, and the test strategy covers the loading isolation and ordering contracts. Approved to proceed to implementation after owner acknowledgment.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | In/out scope matches owner goal; no Phase 9 / production / bug phase bleed |
| Architecture alignment | pass | Services own data; hooks coordinate; components render; no SDK in UI |
| Security impact addressed | pass | Same public callables; ADR-FP-142 preserved |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None; duplicate callable noted as acceptable tradeoff |
| Test strategy adequate | pass | New service + containment tests; typecheck/lint/build |
| Human checkpoints identified | pass | Manual DEV QA at localhost:3100 before signoff |
| Roadmap alignment | pass | Phase 8 Portal post-launch refinement |
| Documentation plan | pass | Workflow state + handoff on signoff |
| No silent scope expansion | pass | No redesign, no View All reorder, no schema |

---

## Architecture review

**Findings:**

- Root cause analysis is evidence-based (cited line 243–244 gate, sequential `loadPortalShowHomeRails`, single hook flag).
- Proposed boundary matches existing layered structure; `loadCatalogShowDesigns` / `useCatalogShowDesigns` correctly excluded from ordering changes.
- `designsForShowHomeRailPresentation` with spread-copy reversal is the right pattern to avoid shared mutation.
- Replacing monolithic `loadPortalShowHomeRails` is safe — single consumer (`usePortalShowHomeRails`).

**Required changes:**

- [x] None

---

## Security review

**Findings:**

- No new data paths; `hydrateShowDesigns` → `listPortalShowCatalogDesigns` + `getReadyDesignsByIds` unchanged.
- Customer-upload filtering remains server-side in `portalShowCatalogDesigns.ts` (`isCatalogDesignAllocation`).
- Guest Discover remains public; login-gated mutations untouched.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] None in this goal (production deploy explicitly out of scope)

---

## Data model review

**Findings:**

- No entity, field, or status changes.

**Required changes:**

- [x] None

---

## Backend review

**Findings:**

- Two parallel `listPortalPublicShows` invocations on Discover load is a deliberate UX tradeoff; acceptable for this narrow goal.
- No Cloud Function or index changes required.

**Required changes:**

- [x] None

---

## Testing review

**Findings:**

- Containment test for removal of combined OR gate is essential and planned.
- Presentation helper tests cover non-mutation contract.
- Manual QA checklist matches owner acceptance criteria (9 scenarios).
- Existing `useCatalogDesigns.test.ts` patterns provide a good template for page containment tests.

**Required changes:**

- [x] None

**Implementation note (non-blocking):** During implement, verify insert-position comment in plan matches rendered order after refactor — both show slots must remain after the **New** discovery rail as today.

---

## Documentation review

**Findings:**

- Workflow state update planned; handoff docs deferred to signoff per FreshForge rules — correct.
- No permanent doc updates required for this UX refinement.

---

## Required changes (if approved_with_changes)

N/A — full approval.

---

## Blockers (if blocked)

None.

---

## Verdict rationale

The plan addresses the actual blocking mechanism (full-grid OR gate), not a cosmetic workaround. The proposed split loaders and per-rail hook state satisfy independence acceptance criteria. This Week reversal is scoped to presentation only with an explicit helper and tests, protecting View All and other consumers. Risks are documented with proportionate mitigations. No security, data, or backend gates are violated.

---

## Next step

**Await owner implementation approval**, then proceed to Implement phase per approved plan. Do not start the separate upcoming bug managed phase until this goal reaches Test + Signoff and FreshForge returns to IDLE.
