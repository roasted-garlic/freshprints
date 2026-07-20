# Human Checkpoint: Cap B one request ↔ one show + auto remainder

**Feature / area:** Portal Cap B / capacity queue split  
**Why automated tests are insufficient:** End-to-end queue + Firestore remainder create + Portal navigation/copy  
**Environment:** local Portal against `fresh-prints-dev`  
**Prerequisites:** Soft-reload Portal (hard refresh). Studio Settings Cap A = **50**, Cap B = **25**. Two upcoming allocatable shows with capacity.

### Steps

1. Soft-reload Portal. Build one Current Request with **25** of design A + **25** of design B (50 total). Cap A should allow this (working max = Cap A).
2. Open **Add to show**, pick show 1 (plenty of capacity). Confirm callout: only 25 can go on this show; leftovers move to a **new** request.
3. Click **Choose prints for this show**. Set **12** of A and **13** of B (total 25). Continue → bidding ack → Add to show.
4. **Expected:** Request 1 is fully on show 1 only (status active / no longer Continuable). You land on **request 2** with banner: “Remaining prints are on a new request. Add them to another show.” Request 2 has **13** of A + **12** of B (25).
5. On request 2, **Add to show** → pick show 2 → full fit → ack → queue.
6. **Expected:** Request 2 on show 2 only. Request 1 is **not** linked to show 2. Cap A was not re-charged for the remainder move.

### Pass criteria

- [ ] Soft-reload done before testing
- [ ] 50-print request can be built (Cap A max, not Cap B-blocked at 26)
- [ ] Choose 12+13 queues only those 25 to show 1 on request 1
- [ ] Auto-created request 2 holds the other 25; navigate + clear copy
- [ ] Request 1 never spans two shows
- [ ] Bidding ack still required
- [ ] Cap A remaining unchanged by the split move (already charged on add)

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
