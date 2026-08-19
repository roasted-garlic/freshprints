# Review: Portal Add to Show Unmissable (Current Request UX)

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-18-portal-add-to-show-unmissable-plan.md |
| Verdict | **approved** |

---

## Summary

The plan is copy/presentation-only on existing Portal Current Request and request-review surfaces. Exact source paths were located; drawer navigation is not a wiring defect; the review-header button opens the existing picker and is correctly relabeled **Choose a Show**. Optional **Needs a show** is gated to the working drawer using existing state. No backend, schema, callable, or analytics mixing.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Drawer + review header + muted helpers + optional pill. Guide/FAQ omitted because they already mention add-to-show. |
| Architecture alignment | pass | Existing Portal feature components; no new layer; ADR-FP-066 path untouched. |
| Security impact addressed | pass | None. |
| Data model impact addressed | pass | No new field/status. |
| Backend impact addressed | pass | Explicit invariant: no Functions/Rules/callables. |
| Test strategy adequate | pass | Source-read tests + Portal typecheck + owner DEV QA for visual/lifecycle. |
| Human checkpoints identified | pass | Owner DEV QA before signoff; production later. |
| Roadmap alignment | pass | UX clarification on existing Current Request / add-to-show flow. |
| Documentation plan | pass | ROADMAP + handoff; no ADR needed. |
| No silent scope expansion | pass | Artwork-page CTA, catalog cards, GA4, and modal submit copy stay out. |

---

## Architecture Review

**Findings:**

- Drawer CTA continues to `/requests/{id}` via existing `reviewHref` / `handleReviewWhileCreating`.
- Show selection remains `PortalQueueToShowModal` + existing callable.
- Empty-state Upload/Browse retained; header competitors removed. Global browse/upload stay.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- No auth, rules, or exposure change.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] None for this DEV implementation. Later `development` → `production` PR / App Hosting remain separate.

---

## Data Model Review

**Findings:**

- "Needs a show" is UI-only on `workingRequest && !isEmpty`. Must not appear on queued/`!isEditable` detail.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- ADR-FP-066 unchanged. Modal **"Add to show"** stays the actual queue action.

**Required changes:**

- [x] None

---

## Testing Review

**Findings:**

- Source-read tests match repo precedent (`PortalQueueToShowModal.historicalCopy.test.ts`).
- Owner DEV QA is required; do not claim visual pass from source-read alone.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- ROADMAP note is enough. Do not rewrite ADR-FP-076 history; that ADR described the original "Review Request" product name.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Scope is narrow, paths are exact, CTA truth table is correct, optional status cue is safe, and invariants forbid lifecycle/backend change. Approved to implement on `development`.

---

## Next Step

Implement approved scope on `development`. Do not create a branch. Do not mix `portal-design-engagement-analytics`.
