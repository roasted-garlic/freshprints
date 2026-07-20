# Manual QA: Assisted Add to Request — Design Library listing consent

**Feature / area:** Assisted approved proof → Add to Request library consent  
**Why automated tests are insufficient:** Modal UX + Studio intake visibility  
**Environment:** Portal + Studio against **fresh-prints-dev** (after Functions deploy)  
**Prerequisites:** Soft-reload Portal; approved Assisted request with Add to Request available; Studio Imports/Customer Uploads access

## Field parity (expected)

Same as print-upload attach / donate confirmation:

| Modal | `catalogUseAcknowledged` | `catalogReviewStatus` | Studio intake label |
|-------|--------------------------|----------------------|---------------------|
| Allow | `true` | `pending_staff_review` | Design Library permission: **Allowed** |
| Don’t allow | `false` | `pending_staff_review` | Design Library permission: **Declined** |

Both appear in Studio Customer Uploads **pending staff review**. Neither auto-publishes to Design Library.

### Steps

1. Open an approved Assisted request Overview → Approved design card.  
   - **Expected:** Download PNG + **Add to Request** (not Already in request).
2. Click **Add to Request**.  
   - **Expected:** Modal “Add to Design Library?” with **Cancel** (far left) and **Don’t allow** / **Allow** (right). Cancel / Escape / overlay closes without adding.
3. Choose **Allow**.  
   - **Expected:** Added to Current Request; drawer opens; button becomes **Already in request**.
4. In Studio → Customer Uploads intake (pending staff review), find the new upload (assisted audit / filename).  
   - **Expected:** Status pending staff review; Design Library permission **Allowed**; can promote later (do not need to promote for this QA).
5. Remove the line from Current Request (or use another approved assisted request). Soft-reload if needed. Click **Add to Request** → **Don’t allow**.  
   - **Expected:** Still added to Current Request; Studio intake shows **Declined**.
6. With design already in request, click Add again.  
   - **Expected:** No modal; **Already in request**.
7. Click **Download PNG**.  
   - **Expected:** Download only — no consent modal.

### Pass criteria

- [ ] Modal only on first add (not when Already in request; not on Download)
- [ ] Allow → intake + Allowed
- [ ] Don’t allow → intake + Declined
- [ ] Both still add to Current Request
- [ ] No auto-publish to catalog

### Please reply with

- `APPROVE DEV DEPLOY` — deploy `customerAddAssistedApprovedProofToPrintRequest` to fresh-prints-dev, then soft-reload Portal and run the steps above
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …` after QA
