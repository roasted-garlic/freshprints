# Plan: Portal Review Request navigation race

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-19-portal-review-request-nav-race-review.md |

---

## Goal

After wipe / fresh start, rapidly adding designs then clicking **Review Request** in the Current Request drawer must open the **working request detail** page (or wait until the request id is known)—never strand the user on the requests list while the cart has items.

## Background

Cap B allotment bug phase is parked. Owner reports: after wipe, rapid Add to Request → open cart → Review Request sometimes navigates to `/requests?tab=working` instead of `/requests/{id}`.

Root cause (code): `CurrentRequestDrawer` builds `reviewHref` from `workingRequest` only and falls back to the list when null. During lazy create, `workingRequest` (list-backed) lags while `pendingWorkingRequestId` / `ensureWorkingPrintRequestId` already know (or are creating) the id; optimistic `workingItems` can be non-empty in that window.

Related parked item: “Fix rapid Add to Request duplicate working-request create race” (ensure/coalesce already exists; this bug is the drawer href fallback).

## Scope

### In Scope
- Resolve Review navigation id from `workingRequest?.id ?? pendingWorkingRequestId`
- When cart non-empty and id still unknown: await `ensureWorkingPrintRequestId` then navigate to detail (show “Preparing request…” while resolving)—do not link to list
- Small pure helper + unit test for id resolution if useful
- Soft-reload Portal for owner QA; update workflow state

### Out of Scope
- Fixing remaining duplicate-create races beyond what ensure already does
- Cap B allotment bug (parked)
- Committing
- Production deploy

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/print-requests/components/CurrentRequestDrawer.tsx`
- Optional: `apps/portal/features/print-requests/utils/resolveCurrentRequestReviewId.ts` (+ `.test.ts`)

### Architecture Impact
- [x] Details: UI uses existing context fields (`pendingWorkingRequestId`, `ensureWorkingPrintRequestId`); no new layers

### Security Impact
- [x] None — navigates only to caller’s own pending/working request id from trusted context

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Review may briefly show “Preparing request…” then land on detail; never list with non-empty cart

### Migration Impact
- [x] None

---

## Approach

1. Add `resolveCurrentRequestReviewId(workingRequestId, pendingWorkingRequestId)` → preferred id or null.
2. In `CurrentRequestDrawer`:
   - If resolved id → `Link` to `buildRequestDetailHref(id, { from: 'library' })` (unchanged).
   - Else if cart non-empty → button that awaits `ensureWorkingPrintRequestId()`, then `router.push` detail; label “Preparing request…” while `isEnsuringWorkingRequest` or local resolving.
   - Never use `/requests?tab=working` as Review href when cart has items.
3. Unit-test the resolver; manual QA steps for wipe + rapid add + Review.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck | portal / workspace as available | preferred |
| Unit tests | vitest for resolver helper | yes |
| Lint | if touched files | preferred |
| Build | no | no |
| E2E | no | no |

### Manual
- [x] Wipe / fresh customer → rapid Add designs → open Current Request → Review Request → must land on detail (or Preparing then detail), not list

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review (owner QA after soft-reload)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Ensure fails on Review click | low | Show error in drawer; keep cart; user can retry |
| Detail page brief empty while items load | low | Existing detail already treats pending id as current |

---

## Rollback Plan

Revert drawer / helper changes; list fallback returns (undesired but previous behavior).

---

## Documentation Updates Required
- [x] Other: workflow plan/review/state only (no permanent product doc change required for this UX race fix)

---

## Open Questions
- [x] None

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-19-portal-review-request-nav-race-review.md
- Verdict: pending
