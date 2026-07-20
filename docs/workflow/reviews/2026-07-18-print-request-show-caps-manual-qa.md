# Manual QA: Print request & show design caps (Backlog #3)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Environment | `fresh-prints-dev` |
| Plan | docs/workflow/plans/2026-07-18-print-request-show-caps-plan.md |
| FAIL follow-up | Cap A counts **print qty**; refund on decrease/remove; plain-language help modal |

---

## Manual Test Checkpoint

**Feature / area:** Print request limits (Cap A daily **prints** + Cap B per-show qty) + Studio Settings + Cap A wipe  
**Why automated tests are insufficient:** Portal/Studio UX, Settings save, live callable enforcement, wipe  
**Environment:** local Portal + Studio against `fresh-prints-dev`  
**Prerequisites:** Owner Studio login; Portal customer (`dev@funkyfreshprints.com`); **soft-reload Studio + Portal** after deploy

### Cap A model (owner)

Cap A counts **print copies** today (Chicago), not designs or lines. Example: one design with 2 sizes at qty 2 each = **4** prints.

- Add / raise qty → charges that many prints.
- Lower qty / remove a design / clear Current Request → refunds that many (same Chicago day; floor at 0).
- After this deploy, wipe Cap A counters once (old line-based counters may not match print math).

### Steps

1. **Studio Settings → Print request limits**  
   - Confirm label says **Prints** added to requests / day. Cap A / Cap B **20** / **20** (or Reset to defaults → Save).  
   → **Expected:** Saved values match Portal banner limit.

2. **Wipe Cap A once (recommended after this deploy)**  
   - Studio → Test Data → preset **Print request daily limits** → Confirm → Wipe.  
   → **Expected:** Banner shows full remaining; stash unchanged.

3. **Portal sticky Cap A banner**  
   - Soft-reload Portal while logged in.  
   → **Expected:** `X of Y prints left today` (green / yellow when ≤20% or ≤5 left / red: `Daily print limit reached`).  
   - Click **?** → plain-language modal with size×qty example; refunds on remove/lower qty; midnight Central; brief per-show note. No jargon (no “Cap A”, “lines”). No em dashes.

4. **Charge by print count**  
   - Add a catalog design at qty 1 → remaining drops by **1**.  
   - Raise qty to 3 → remaining drops by **2** more.  
   - Duplicate for a second size at qty 2 → remaining drops by **2**.

5. **Refund on decrease and remove**  
   - Lower qty from 3 → 1 on a design → remaining **increases by 2**.  
   - Remove a design that had qty 2 → remaining **increases by 2**.  
   - Double-remove / spam remove → no crash; remaining does not go above the limit incorrectly (floor at 0 on counter).

6. **Cap B per show** (spot-check)  
   - Queue over Cap B → clear reject; under Cap B → ok (show capacity still separate).

### Pass criteria

- [ ] Banner uses **prints** copy; green/yellow/red; ? modal is plain language with example
- [ ] Settings Cap A label/help say prints / print count; value 20 (or intentional test value)
- [ ] Cap A wipe resets counter without deleting stash
- [ ] Qty increase charges; qty decrease and remove refund
- [ ] No em dashes; no production deploy

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
