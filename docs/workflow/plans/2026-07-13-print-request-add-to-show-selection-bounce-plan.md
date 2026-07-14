# Plan: Fix Print Requests Add-to-Show selection bounce

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-13-print-request-add-to-show-selection-bounce-review.md |

---

## Goal

After Studio **Add to Show** succeeds, staff stay on that print request’s **detail** view on the correct list tab (usually **Queued**), instead of briefly seeing details then bouncing to the Queued list with no selection.

## Background

Owner report: after adding a print request to a show, the UI is supposed to land on that request’s details, but it flashes details then returns to the Queued tab list (empty detail / “No request selected”).

ADR-FP-052 made tab/detail selection sync so a request that left **Working** would not keep showing as a stale Working detail; the sync effect falls back to the active tab’s first request or clears selection. URL hydration later tries to follow `requestId`, but races with non-silent reloads and the clear/fallback path produce the bounce.

Previous goal `studio-import-auto-start-ai-processing` remains parked awaiting manual PASS (not blocked by this fix).

## Scope

### In Scope
- Print Requests page: after Add to Show, keep/select the same request and switch to its derived tab (Queued / Printing / …)
- Tab-selection sync: when the **current selection** moves to another tab, **follow** that request (switch tab + URL) instead of clearing or picking another Working card
- Prefer silent reloads after allocate so detail does not drop into empty/loading incorrectly
- Doc note (WORKFLOWS / DECISIONS amendment) for follow-selection behavior

### Out of Scope
- Show Queue “add request” modal UX beyond not regressing
- Portal queue-to-show navigation
- Concurrent enqueue / import AI work

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/.../print-requests/pages/PrintRequestsPage.tsx`
- Possibly small pure helper + test under `packages/shared/src/utils/` if tab-follow logic is extracted
- `docs/WORKFLOWS.md` and/or `docs/project/DECISIONS.md` (amend ADR-FP-052 consequence)
- Workflow artifacts under `docs/workflow/plans|reviews/`

### Architecture Impact
- [x] None (renderer selection/navigation only)

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Add to Show success keeps detail open on Queued (or derived) tab

### Migration Impact
- [x] None

---

## Approach

1. **Post-add handler** on Print Requests: after successful allocate reload, derive the request’s list tab from updated totals, `setActiveListTab`, keep `selectedRequestId`, `navigate(getPrintRequestsPath({ requestId, tab }))` with `replace: true`.
2. **Silent reloads** in that path (`reloadAllocationTotals` / `reloadPrintRequests` / `reloadPrintRequest` with `{ silent: true }` where supported) so `visibleSelectedRequest` is not nulled mid-flight.
3. **Selection sync effect**: if `selectedRequestId` (or URL `requestId`) exists in another list tab, switch `activeListTab` (and URL) to that tab; only fall back to `resolveSelectedRequestIdForTab` when the selection is missing from all tabs.
4. **URL hydration**: when switching tab for a deep-linked request, also rewrite the `tab` query param so URL matches.
5. Update WORKFLOWS / ADR note: follow the selected request across tabs after allocate; do not leave Queued with an empty detail when that request is still selected/URL-linked.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Shared tab-selection / follow helper tests | `npx tsx --test packages/shared/src/utils/printRequestTabSelection.test.ts` (+ new test file if extracted) | yes |
| Lint touched files | ReadLints | yes |

### Manual
| Check | Required |
|-------|----------|
| Studio: Add to Show from Working → stay on that request’s detail on Queued | yes |
| Back-to-back: detail remains; tab is Queued; no empty bounce | yes |
| Remove from show queue still returns to Working with selection kept | yes |

### Human Checkpoints Anticipated
- [x] Manual Studio UI checkpoint (PASS / FAIL)

---

## Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Following selection conflicts with intentional “stay on Working after queue” | Owner wants follow-to-detail; document amendment to ADR-FP-052 UX |
| Infinite tab/navigate loop | Only navigate when tab or requestId actually changes |

Rollback: revert PrintRequestsPage selection/navigation changes.

---

## Open Questions
None — owner intent is clear.

---

## FreshForge Impact (if applicable)
- [x] N/A (Fresh Prints product fix)
