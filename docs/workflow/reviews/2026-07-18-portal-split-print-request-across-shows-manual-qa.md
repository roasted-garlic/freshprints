# Manual Test Checkpoint: Portal Cap B / capacity split

**Feature / area:** Portal Add to show split (Cap B + show capacity)  
**Why automated tests are insufficient:** End-to-end queue, Continuable / Current Request, bidding ack, and show picker UX  
**Environment:** local Portal `:3100` + `fresh-prints-dev`  
**Prerequisites:** Studio Settings Cap A = **50**, Cap B = **25** (or equivalent). At least two upcoming allocatable shows with enough capacity. Logged-in Portal customer.

### Steps

1. Build a Current Request totaling **50** prints (one or more lines).  
   → **Expected:** Cap A allows it; Current Request shows 50.

2. Open the request → **Add Request to Show** → select show A with plenty of capacity.  
   → **Expected:** A bordered warning callout (impossible to miss) says only **25** of **50** can be added; primary is **Choose prints for this show**.

3. Tap **Choose prints for this show** → a **dedicated** selection modal opens (not jammed under the calendar). Scrollable list + Selected/Allowed summary. Adjust qty if needed (pre-fill up to 25 is OK) → **Add to show** → complete bidding acknowledgment.  
   → **Expected:** 25 queued to show A; request stays on Current Request / draft; **Add Request to Show** still available; ~25 still need a show.

4. Add to show again → select show B → queue remaining 25 (full fit) + bidding ack.  
   → **Expected:** Fully queued; request leaves Continuable / Current Request; status active.

5. **Capacity overflow:** Request with qty larger than a show’s remaining spots but under Cap B.  
   → **Expected:** Same split path using the tighter show-capacity limit.

6. **Blocked show:** Cap B already used on a show (or show full).  
   → **Expected:** No empty split; message to choose another show.

7. Copy check: no em dashes in new split / blocked / capacity messages.

### Pass criteria

- [ ] Cap B 50→25+25 primary scenario works
- [ ] Remainder stays on Current Request after partial queue
- [ ] Bidding ack on each queue confirm
- [ ] Capacity-tighter and blocked cases behave as above

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
