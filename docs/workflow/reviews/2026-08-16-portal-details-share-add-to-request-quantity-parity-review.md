# Review: Portal Design Details / share Add-to-request quantity parity (TD-030)

| Field | Value |
|-------|-------|
| Date | 2026-08-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-16-portal-details-share-add-to-request-quantity-parity-plan.md |
| Verdict | **approved** |

---

## Summary

The plan correctly identifies a **share-page wiring gap**, not a missing quantity component. Design Details already renders `CatalogRequestQuantityControls` when parents pass membership and handlers; Discover/catalog cards remain the parity baseline. The smallest safe change is to reuse that same stepper and `useAddDesignToRequestFlow` on `/share/design/{id}` without new listeners, SSR/OG edits, or backend work.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Share CTA + confirm Details; cutover/Phase 9/Algolia/Rules out |
| Architecture alignment | pass | Component reuses existing hook/service path; no Firebase in UI |
| Security impact addressed | pass | Qty only when authenticated; guests keep Sign in |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None — confirmed |
| Test strategy adequate | pass | Source-level tests match Portal catalog pattern; DEV QA listed |
| Human checkpoints identified | pass | Owner DEV QA; production App Hosting STOP |
| Roadmap alignment | pass | Phase 8 polish / TD-030; cutover stays CLOSED |
| Documentation plan | pass | ROADMAP/TECH_DEBT at signoff after both surfaces pass |
| No silent scope expansion | pass | Explicit reuse; no parallel stepper |

---

## Architecture Review

**Findings:**
- Share page already computes `isInCurrentRequest` from `currentRequestAggregates.quantityByDesignId` and still always renders Add. That is the defect.
- Reuse `CatalogRequestQuantityControls` + `addDesignFlow.setQuantity` / `removeDesign` + `primaryQuantityByDesignId ?? quantityByDesignId` (same as `CatalogHomePageContent`).
- Do not extract a new wrapper unless the duplicated JSX is large; calling the existing component is enough.
- Do not edit `apps/portal/app/(app)/share/design/[id]/page.tsx` metadata/SSR.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Guest share remains public. Request qty and Working Request membership must not render for unauthenticated users.
- No Rules/Auth/schema change.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production App Hosting rollout — **after** this goal’s DEV signoff, via `AUTHORIZE PROD APP HOSTING ROLLOUT: TD-030 QTY PARITY`. Not this implement pass.

---

## Data Model Review

**Findings:**
- Adding a design still updates request artwork/item state only. Design lifecycle unchanged.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No Functions, indexes, Storage, Algolia, or App Hosting changes.
- No new Firestore reads/listeners on the share page.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Extend `CatalogDesignDetailsRequestQty.test.ts` (or adjacent share source test) for: Add vs qty branch, guest Sign in, no `onSnapshot`/`getDoc` in the share page component.
- Keep existing Details parent-wiring asserts.
- Run Portal typecheck, lint, `build:portal`, `git diff --check`.
- Owner DEV QA is required before closing TD-030.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Plan, review, test report, checkpoint, and later signoff are sufficient.
- Close TD-030 in `TECH_DEBT.md` only if **both** Details and share pass owner QA.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Scope is a one-surface wiring fix plus confirmation of existing Details behavior. Architecture, security, and read-amplification constraints are respected. Backend/deploy = none. Proceed to implement.

---

## Next Step

Implement approved scope on `development`. Stop before production App Hosting promotion.
