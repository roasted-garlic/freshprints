# Owner DEV QA Preparation: Studio staff show-capacity allocation override

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Goal | `studio-staff-show-capacity-allocation-override` |
| Status | **resolved — Owner DEV QA PASS** |
| Environment | `fresh-prints-dev` + local Studio (current development source) |

---

## Prerequisites

1. Local Studio running this working-tree source (do **not** publish a Studio release).
2. Signed in as staff who can allocate today (**owner / admin / helper**).
3. Deploy the updated allocate callable to DEV only (required for live Allocate Anyway):

```bash
firebase deploy --only functions:allocateStudioPrintRequestToShow --project fresh-prints-dev
```

Do **not** deploy to production. No Rules, schema, Portal, or Studio release.

---

## Manual Test Checkpoint

**Feature / area:** Studio Add-to-Show — explicit show-capacity override  
**Why automated tests are insufficient:** Confirmation UX, live capacity display (`N / max`), and Portal strictness need owner eyes on DEV data.

### Steps

1. Pick an Upcoming Whatnot (or DEV fixture) show with `maxTotalQuantity = 5` and currently **4** allocated (1 remaining).  
   **Expected:** Capacity shows **4 / 5** (or equivalent “spots left” wording).

2. Open a Print Request with **3** remaining unallocated prints → **Add to Show** → select that show.  
   **Expected:** Split / overflow decision appears (does not fit entirely). **Choose designs for this show** remains available. **Allocate Anyway** is visible.

3. Click **Allocate Anyway**.  
   **Expected:** Confirmation shows current **4**, max **5**, adding **3**, new total **7**, and that the configured max stays **5**. Buttons: **Cancel** and **Allocate Anyway**.

4. Click **Cancel** on the confirmation.  
   **Expected:** No allocation occurs; show still **4 / 5**; request still has remaining prints.

5. Click **Allocate Anyway** again → confirm **Allocate Anyway**.  
   **Expected:** Allocation succeeds. Show shows **7 / 5** (or “2 over max”) with configured max still **5**. Request is fully queued. `maxQuantityOverridden` is **not** flipped by this action.

6. Repeat with an **already-full** show (**5 / 5**, 0 remaining) and a request with remaining quantity.  
   **Expected:** Show is still selectable; **Allocate Anyway** works; after confirm, allocated &gt; max (e.g. **8 / 5**).

7. Under-capacity control: allocate a request that **fits** remaining room with no override.  
   **Expected:** Normal **Add to show** succeeds without confirmation; no `overrideShowCapacity` needed.

8. Portal (customer): attempt to queue a request that exceeds remaining show capacity.  
   **Expected:** Still blocked; no override UI / capability.

9. Optional negative: Past or completed/canceled show.  
   **Expected:** Still cannot allocate (override does not unlock terminal/Past).

10. Optional coexistence: On a show now over max (e.g. 7/5), open Show Queue Settings → Apply default max **below** allocated (e.g. propose 5 or lower) with Apply toggle on.  
    **Expected:** That over-allocated show is **skipped** (ADR-FP-160 unchanged).

### Pass criteria

- [ ] Cancel on confirmation does not allocate
- [ ] Allocate Anyway places **full remaining** on the selected show and exceeds max without changing `maxTotalQuantity`
- [ ] Already-full (0 remaining) supports Allocate Anyway
- [ ] Normal under-cap allocation unchanged
- [ ] Split-to-another-show still available when partial capacity exists
- [ ] Portal remains strict
- [ ] Past / terminal still blocked
- [ ] ADR-FP-160 skip-below-allocated still holds for over-allocated shows

### Please reply with

- `OWNER DEV QA: SHOW CAPACITY OVERRIDE — PASS`
- `OWNER DEV QA: SHOW CAPACITY OVERRIDE — FAIL: [description]`
- `OWNER DEV QA: SHOW CAPACITY OVERRIDE — PASS WITH NOTES: [notes]`
