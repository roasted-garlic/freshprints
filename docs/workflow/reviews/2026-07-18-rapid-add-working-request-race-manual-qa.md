# Manual QA: Rapid Add working-request create race

**Date:** 2026-07-18  
**Environment:** Portal local `:3100` (soft-reloaded)  
**Plan:** `docs/workflow/plans/2026-07-18-rapid-add-working-request-race-plan.md`

## Prerequisites

- Signed-in customer
- **No** working Current Request (empty Stash / no draft-editing request)
- Catalog page open

## Steps

1. With empty Stash, rapidly click **Add to request** on **2–3 different** designs (within ~1s).  
   **Expected:** No error toast/banner “You already have a request in progress…”. All designs appear in Your Stash on one request.
2. Repeat with a slightly slower double-click on the same design’s Add.  
   **Expected:** Qty increases (or second tap becomes stepper); no create error.
3. Clear or queue the request so Stash is empty again; add **one** design slowly, then immediately add another.  
   **Expected:** Both land on the same request; no false “in progress” error.
4. After success, Add buttons remain usable (not stuck disabled).

## Pass criteria

- [ ] No false one-working-request error on rapid first creates
- [ ] One working request created; designs attach to it
- [ ] UI not permanently blocked after create succeeds

## Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]`  
- `PASS WITH NOTES: [notes]`
