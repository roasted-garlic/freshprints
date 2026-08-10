# Owner QA: Design Details Current Request quantity controls

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Environment | fresh-prints-dev / local Portal against DEV |
| Reply phrase | `DEV DETAILS QTY QA: PASS` / `FAIL` / `PASS WITH NOTES` |

---

## Prerequisites
- Signed-in Portal customer with Current Request capacity
- At least one catalog design not already on the request

## Checklist

### Absent → Add
- [ ] Open Design Details for a design **not** in Current Request → primary action is **Add to request**

### Already present
- [ ] With a design already on Current Request, open Details → **Add to request** is replaced by the same qty stepper as the list card (value matches card)

### Add from open modal
- [ ] From Details, click **Add to request** → without closing, control swaps to qty stepper at qty 1 (or expected qty)
- [ ] List card for that design also shows qty controls / selected state (no close/reopen needed)

### Increment / decrement
- [ ] + / − in Details updates quantity; list card stays in sync
- [ ] + / − on list card updates Details while modal stays open

### Remove / zero rules
- [ ] At qty 1, trash/remove in Details removes from Current Request → Details shows **Add to request** again
- [ ] Typing `0` in the qty input removes (same as list card)
- [ ] No duplicate request line items for the same design

### Preserved flows
- [ ] Companion post-add suggestion still appears when applicable
- [ ] Favorites / share / report / censor reveal still work
- [ ] Guest still sees Sign in CTA (not qty controls)

### Production
- [ ] Confirm no prod promote was requested this pass

---

## Please reply with
- `DEV DETAILS QTY QA: PASS`
- `DEV DETAILS QTY QA: FAIL: [description]`
- `DEV DETAILS QTY QA: PASS WITH NOTES: [notes]`
