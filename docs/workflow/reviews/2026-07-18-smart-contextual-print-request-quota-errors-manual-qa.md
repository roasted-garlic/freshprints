# Manual QA: Smart contextual Cap A/B quota errors + create gate

**Feature / area:** Portal Cap A exhausted copy + hard gate; Cap B / capacity queue copy  
**Why automated tests are insufficient:** Situation copy and disable gates need live Current Request + Settings limits  
**Environment:** local Portal `:3100` against `fresh-prints-dev`  
**Prerequisites:** Studio Settings Cap A = **50**, Cap B = **25** (or note actual values). Logged-in Portal customer. At least two allocatable shows. Cap A wipe available if re-testing from a clean day counter.

**Copy note (owner):** Do not say “Stash”. Use **Current Request** / **request** / **print request**. Chrome keeps **Add to Request** and drawer title **Current Request**.

## State matrix (expected)

| # | Situation | Expected copy / CTA | Allowed | Blocked |
|---|-----------|---------------------|---------|---------|
| A1 | Cap A 0; Current Request has prints; nothing queued yet | Add your Current Request to a show / split (not midnight as primary) | Queue, remove, qty down | Add, qty up, duplicate, create |
| A2 | Cap A 0; queued some; remainder on Current Request | Finish remainder on another show; can’t add more until midnight | Queue remainder, remove, qty down | Add, qty up, duplicate, create |
| A3 | Cap A 0; Current Request empty (all on shows) | Can’t add / start new request until after midnight Central | Browse | Create, Add, attach, assisted add |
| B1 | This show Cap B full | Choose **another** show | Other shows | Queue overflow on same show |
| B2 | Show capacity full | Clear capacity message; pick another / wait | Other shows | Queue into full show |
| R1 | Cap A 0 with items → qty down / remove | Remaining increases; Add re-enables | Add again when remaining &gt; 0 | - |

### Steps

1. **A1 - full Current Request, not queued**  
   Fill Current Request to Cap A (e.g. 50). Do **not** queue.  
   → **Expected:** Banner/helper says daily limit + **Add your Current Request to a show** (split if needed). Catalog Add / qty-up disabled. Try Add → situational error, not “come back tomorrow” as the only CTA. Add to show still works.

2. **A2 - 25 queued, 25 left**  
   Queue 25 to show A; keep 25 on Current Request. Try Add.  
   → **Expected:** Copy about finishing remainder on another show; cannot add more prints until midnight. Queue to show B still works.

3. **A3 - empty after full queue**  
   Queue remaining so Current Request is empty; Cap A still 0. Try Create / Add / upload attach / assisted Add.  
   → **Expected:** Blocked with midnight / cannot start new print request. Browse works.

4. **B1 - Cap B full on a show**  
   With Cap B 25, try to put more than remaining Cap B on a show already at 25.  
   → **Expected:** Message says choose another show (no Cap jargon).

5. **B2 - capacity full show**  
   Pick a show with no room.  
   → **Expected:** Clear capacity / full message; pick another.

6. **R1 - refund re-enables**  
   From Cap A 0 with items on Current Request, qty down or remove.  
   → **Expected:** Remaining increases; Add / qty-up re-enable.

### Pass criteria

- [ ] A1 does not lead with midnight when Current Request still has prints to queue
- [ ] A2 / A3 copy match the matrix
- [ ] Create blocked only when Cap A 0 and no useful create path (empty / A3)
- [ ] Qty down / remove / Add to show remain available at Cap A 0
- [ ] Cap B / capacity messages push another show
- [ ] No em dashes / no “Cap A/B” jargon / no “Stash” in customer-visible strings

### Split UX re-test tip (after polish)

1. Fill Current Request past one show’s Cap B (e.g. Cap A 50, Cap B 25) → **Add to show**.
2. Select a show that cannot take everything.  
   → **Expected:** Warning callout sits **below** the show list / above Cancel + primary button. Capacity / progress row on the selected show card stays fully visible (no overlay; body scrolls if needed; selected card does not paint under the callout).
3. Tap **Choose prints for this show**.  
   → **Expected:** Each row shows a design thumbnail (grey artwork preview bg), title/size, and Add-to-this-show qty control (no per-row “left on Current Request”). Summary strip:
   - **Allowed on this show** = show allowance right now
   - **Chosen for this show** = sum of qty inputs
   - **Left to choose** = Allowed − Chosen
   Amber callout at top still explains the overall partial-fit split (e.g. 25 of 50).

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  
