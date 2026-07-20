# Manual QA: Assisted approved proof → Add to Request

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Feature | Small Managed Items #1 (+ QA fixes) |
| Environment | Portal against `fresh-prints-dev` |
| Deploy | `firebase deploy --only functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev` |

## Soft-reload

Hard-refresh or soft-reload the Portal so the Approved Design card, Current Request drawer, and labels pick up the QA fixes.

**Open test request:** If you already removed the line item but still see **Already in request**, soft-reload once — button state is now derived from live working items (not sticky ingest). After reload it should show **Add to Request** for that same request.

## Steps

1. Open an **approved** Assisted Creation request (full-res still available) → Overview **Approved design** card.
   - **Expected:** Preview; **Download PNG** and **Add to Request** side by side.
2. Confirm header top-right pill reads **Current Request** (not Your Stash); bottom-nav bag FAB aria mentions Current Request.
3. Click **Add to Request**.
   - **Expected:** Brief **Adding…**; completes in a few seconds (not ~10+); Current Request drawer opens; item appears (qty 1, preview, size editable).
4. In Current Request drawer / item chrome, confirm source label is **Custom** (not **Uploaded**).
5. Click **Add to Request** again (or observe disabled state).
   - **Expected:** **Already in request**; no duplicate line.
6. Remove the item from the Current Request drawer.
   - **Expected:** Without leaving the Assisted request, the Approved Design button returns to **Add to Request** (live working items).
7. Click **Add to Request** again.
   - **Expected:** Re-attaches (idempotent path); drawer shows the item again with **Custom**.
8. Confirm **Download PNG** still works while within 14 days.

## Pass criteria

- [ ] Labels: **Add to Request** + chrome **Current Request**
- [ ] Item lands on working request; badge/pill **Custom** (not Uploaded)
- [ ] Add feels snappy (or short Adding… only)
- [ ] After remove, button resets to **Add to Request** on the same open request
- [ ] Second add does not duplicate while item is present
- [ ] Download still works when eligible

## Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
