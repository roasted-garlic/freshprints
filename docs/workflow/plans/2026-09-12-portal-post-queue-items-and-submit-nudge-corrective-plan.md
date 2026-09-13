# Plan: Portal post-queue empty items + submit nudge toast

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Author | Planning Agent |
| Status | **ready_for_review** |
| Workflow | managed-phase (corrective child) |
| Goal | `portal-post-queue-items-and-submit-nudge-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Related | Owner report during sentinel QA (empty queued detail; Undo toast not a submit nudge) |

---

## Goal

Fix two Portal customer friction points with minimal surface area:

1. After adding a Print Request to a show, the request detail sometimes shows **0 designs / No designs yet** even though items were submitted.
2. Replace the short-lived “Added … Undo” success toast with a longer-lived nudge that the customer is **not done** until they review and submit (queue to show), with a CTA that opens the request page.

---

## Background

Owner screenshots:

- Queued request `roasted_garlic-CR017` with LIVE PRINTING / QUEUED but **0 designs** and empty state.
- Current success toast: `Added “…” to your Current Request.` + **Undo** (~4s).

Investigation ([empty-designs explore](2cfbadb2-f128-4077-9f97-2679bec56afc)):

- Detail badges use `printRequest.itemCount`; list body uses `items.length` — they can diverge.
- After queue, Wave C intentionally suppresses the silent item reload (`reconcileQueued` clears `wasViewingWorkingRef` so exit-path reload does not run), then `resetWorkingCart()` clears Stash.
- Working-items subscription merge only preserves `optimistic:*` locals; an empty/partial `portalPrintRequestItems` snapshot can wipe real rows, then cart sync sets `itemCount` to `0`. With post-queue reload suppressed, the empty UI sticks.
- Cold remount/refresh depends entirely on `portalPrintRequestItems` (no Portal canonical fallback).

---

## Scope

### In Scope

1. **Post-queue item rehydration (minimal correctness fix)**
   After successful queue-to-show on the detail page, rehydrate request + items (clear read cache then `reload({ silent: true })`) so the queued detail cannot remain stuck at empty local state. Prefer always rehydrating after queue (small, explicit reads) over leaving Wave C’s zero-read path when it produces customer-visible emptiness.

2. **Working-items subscribe merge safety**
   When merging server projection snapshots into the working cart, do not discard non-optimistic local rows solely because the latest snapshot is empty/partial (same spirit as `reloadWorkingItems` merge). Prevents pre-queue wipe that post-queue then freezes.

3. **Submit-nudge toast (replace Undo announce)**
   On successful first-add to Current Request (existing `announceCurrentDesignAdded` / equivalent Assisted add success paths that use the same Undo toast):
   - Remove Undo action from this toast.
   - Copy: short reminder they still need to review/submit (queue to show) — not “you’re done.”
   - Action button: e.g. **Review request** → navigate to the working/current request detail page (`/requests/{id}`).
   - Longer duration (proposed default **12–15 seconds**; dismiss still available via ×).
   - Extend `PortalToastOptions` with optional `durationMs` only as needed (default remains 4s for other toasts).

### Out of Scope

- Sentinel corrective Signoff / multi-proof / Staff Artwork projection
- Restoring Undo as a product feature (explicitly replaced for this announce)
- Persistent page banners, modals, or dashboard redesign
- Changing queue-to-show callable / allocation logic
- Production deploy / commit / push / freeze / parent M0
- App Hosting publish

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/app/(app)/requests/[id]/PrintRequestDetailView.tsx` — post-queue reload
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` — if reconcile/reload wiring needs a small export hook
- `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` — merge safety
- `apps/portal/features/print-requests/utils/addDesignRuntime.ts` (+ tests) — announce API
- `apps/portal/features/print-requests/hooks/useAddDesignToRequestFlow.ts` — wire navigate + new copy
- Assisted add success paths that reuse the same Undo toast pattern (only if they share `announceCurrentDesignAdded` / same helper)
- `apps/portal/features/shared/context/PortalToastContext.tsx` — optional `durationMs`
- Focused contract/unit tests for post-queue hydration and toast announce

### Architecture Impact

- [x] Details: Client-only Portal UX/reliability; no new backend collections. Accepts a deliberate post-queue read (request + items) for correctness.

### Security Impact

- [x] None beyond existing authenticated Portal request reads.

### Data Model Impact

- [x] None.

### Backend Impact

- [x] None required for this corrective.

### UI / UX Impact

- [x] Details: Toast copy/CTA change; longer dwell; Undo removed from add-announce. Queued detail should show submitted items after queue.

### Migration Impact

- [x] None.

---

## Approach

1. **Empty after queue**
   In `handleQueuedToShow`, after cache clear / schedule+allocation hydrate, also `await reload({ silent: true })` (or call a dedicated `reloadItems` if already split). Update Wave C contract comments/tests that currently assert “no reload after queue” to the new correctness rule: **customer-visible item truth after queue wins**.

2. **Subscribe merge**
   Change `subscribePrintRequestItems` merge input from `current.filter(optimistic)` to full `current` (or merge helper that keeps non-optimistic rows when server list is empty and request is still the working id). Add a focused unit/contract test for “empty snapshot does not wipe hydrated server ids.”

3. **Nudge toast**
   Replace `announceCurrentDesignAdded` Undo with Review CTA + longer `durationMs`. Resolve request id from working/current request context; if id missing, fall back to `/requests` or open Current Request drawer — prefer **request detail** as owner asked. Keep companion-suggestion behavior unchanged.

Proposed copy (owner may tweak at review):

> You’re not done yet — review and submit your request when you’re ready.

Button: **Review request**

---

## Test Strategy

### Automated

| Check | Required |
|---|---|
| Post-queue hydration contract (reload invoked / items applied) | yes |
| Working-items empty-snapshot merge contract | yes |
| `announceCurrentDesignAdded` / toast options tests (no Undo; Review action; duration) | yes |
| Portal typecheck + targeted ESLint + `git diff --check` | yes |

### Manual (Owner DEV QA)

1. Add designs → long nudge toast → **Review request** opens request page with designs.
2. Queue to show → detail shows designs (not 0 / empty).
3. Refresh queued detail → designs still present (projection-backed).
4. Remove from Show & Edit still works.
5. Other toasts (errors) still dismiss at normal duration.

---

## Human Checkpoints

1. Owner accept Plan + Review (copy + duration OK).
2. Owner DEV QA after Implement/Test on localhost Portal.
3. No production / parent M0.

---

## Risks and Rollback

| Risk | Mitigation |
|---|---|
| Post-queue reload costs 1+N reads Wave C avoided | Accept for correctness; document in plan/signoff notes |
| Removing Undo surprises power users | Owner-directed; × still dismisses; qty can still be edited on request page |
| Longer toast overlaps other UI | Single toast slot already; × dismiss; duration capped (~15s) |

Rollback: revert client changes; no data migration.

---

## Open questions (non-blocking defaults)

1. Exact toast copy — default above unless owner prefers different wording.
2. Duration — default **15s** unless owner prefers another value.
3. If working request id unavailable at announce time — default navigate to `/requests` list.

---

## Next step after approval

Implement → Test → localhost Owner DEV QA → Signoff.
Do not block or invent sentinel Signoff from this work.
