# Plan: Cap A qty clamp + shorter request-full banner

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-19-cap-a-qty-clamp-banner-review.md |

---

## Goal

When a Portal qty edit would push the Current Request over Cap A (working max), **clamp** the line to remaining room instead of rejecting and rolling back to the previous qty (often 1). Shorten the request-full banner helper so it fits on mobile (2 lines, not 3).

## Background

Owner example (Cap A / working max = 50): design A = 25, design B typed as 26 → UI snaps B back to **1**. Expected: clamp to **25** (room = 50 − 25), then block further qty-up / add / duplicate.

Root cause: `updatePortalPrintRequestItemQuantity` **rejects** over-max increases; Portal detail autosave rolls back to the last saved qty (often 1). There is no shared clamp-to-room helper.

Prior Cap B one-request-per-show work is parked (manual QA). This is a separate narrow fix.

## Scope

### In Scope

1. **Clamp formula** (shared + server + Portal write paths):

   ```
   remainingCapARoom = maxPerRequest − sum(other line quantities on this request)
   clampedQty = min(requestedQty, remainingCapARoom)
   ```

   - Also respect Cap A **daily** remaining on increases: `min(clampedQty, currentQty + dailyRemaining)`.
   - Never force a line to 1 unless `remainingCapARoom` (and daily headroom) actually allow only 1.
   - If clamp yields no increase (`clampedQty <= currentQty`), no-op (keep current); do not wipe qty.
   - Decreases unchanged (min 1 / remove flows).
   - When total == Cap A: keep existing disable gates for add / qty-up / duplicate; qty edit cannot push over (clamp).

2. **Banner helper** (copy-only): shorten `formatWorkingRequestFullHelperText()`.

   - Line 1 (unchanged): `This request is full (N prints)`
   - Line 2 (new): `Add to a show. Extra prints move to a new request.`

3. Soft-reload Portal; deploy Functions to **`fresh-prints-dev`** if quantity callable changes.

### Out of Scope

- Cap B / queue / remainder behavior
- Production deploy
- Cap A charge formula changes beyond clamp-on-qty-update
- Broader toast copy rewrite (`formatWorkingRequestFullUserMessage`) unless needed for consistency

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/printRequestWorkingRequestMax.ts` (+ tests) — clamp helper + helper copy
- `functions/src/updatePortalPrintRequestItemQuantity.ts` — clamp instead of hard-reject on over-max increase
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts` and/or `useAddDesignToRequestFlow.ts` — client clamp before callable (optimistic UI matches server)
- Unit test updates for helper text

### Architecture Impact

- [x] Details: Shared pure clamp; Functions remain source of truth; Portal mirrors for UX.

### Security Impact

- [x] Details: Server still enforces max; clamp cannot exceed Cap A / daily remaining. No client bypass.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: `updatePortalPrintRequestItemQuantity` returns clamped quantity; deploy to fresh-prints-dev.

### UI / UX Impact

- [x] Details: Qty fields settle at remaining room; shorter request-full helper on banner/drawer. Soft-reload. Manual smoke.

### Migration Impact

- [x] None

---

## Approach

1. Add `clampItemQuantityToWorkingRequestMax({ requestedQuantity, currentQuantity, otherItemsPrintCount, maxPerRequest, dailyRemaining? })` in shared.
2. Unit tests: 25+26→25; room=1→1; room=0 increase→keep current; decrease untouched.
3. Functions qty update: compute other sum; clamp; charge delta of clamped; early return if no change.
4. Portal: clamp in detail `updateItem` / catalog `setQuantity` using working items + `capAQuota.limit` / remaining before calling service.
5. Shorten helper string; update copy tests.
6. Deploy Functions to fresh-prints-dev; soft-reload Portal guidance.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit | `node --test` on `printRequestWorkingRequestMax.test.ts` (via package script) | yes |
| Functions typecheck / related test if present | project scripts | if cheap |

### Manual

1. Soft-reload Portal (Cap A = 50).
2. Add design A qty 25, design B type 26 → **Expected:** B becomes **25**, total 50; qty-up / add disabled.
3. Confirm banner line 2 is short on mobile width.
4. Qty-down still works; then qty-up re-enables until full again.

---

## Human Checkpoints

- Soft manual smoke after soft-reload (and Functions deploy if shipped).
- No production deploy.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Client clamp without server clamp → desync | Clamp on both |
| Daily remaining tighter than working room | Include daily in clamp |
| Oversized existing carts | Keep current when no room rather than snap to 1 |

Rollback: revert shared/portal/functions commits; redeploy previous Functions.

---

## Open Questions

None — owner specified clamp formula and banner meaning.
