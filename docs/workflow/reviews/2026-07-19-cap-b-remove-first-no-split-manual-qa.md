# Human Checkpoint: Cap B remove-first (no choose-prints)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test / Cap B overflow = remove-first |
| Environment | local Portal + **fresh-prints-dev** Functions |

---

## Soft-reload first

1. Soft-reload the Portal (browser refresh on the running Portal app) so the remove-first Add-to-show UI loads.
2. Functions are already deployed to `fresh-prints-dev` (marker `cap-b-remove-first-v1`). Owner need not deploy.

---

## Manual Test Checkpoint

**Feature / area:** Portal Cap B / show capacity — remove-first gate  
**Why automated tests are insufficient:** End-to-end queue UX + copy  
**Prerequisites:**

- Studio Settings: Cap A = **50**, Cap B = **25** (saved)
- Soft-reloaded Portal against `fresh-prints-dev`

### Steps

1. Build a Continuable request totaling **50** prints. Open **Add to show**.  
   → **Expected:** Bordered warning callout (not Choose prints). Title like “Each Customer Is Limited to 25 Prints Per Show.” Body says you can add at most 25, request has 50, remove/lower by 25, another request later OK. Primary actions: **Cancel** / **Go edit request**. **No** Add to show / Choose prints.

2. Click **Go edit request** (or Cancel). Lower request to **25** total. Add to show again.  
   → **Expected:** No overflow callout; **Add to show** → bidding ack → queues successfully.

3. Start a **second** Continuable request for the remaining prints (within Cap A). Queue to another show (or same show only if Cap B remaining allows).  
   → **Expected:** Works under daily allotment; no split picker appears.

### Pass criteria

- [ ] Overflow shows remove-first message; cannot queue 50 when Cap B is 25
- [ ] After lowering to 25, can queue
- [ ] Second request for the rest works
- [ ] No “Choose prints for this show” / split allotment UI

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]`  
- `PASS WITH NOTES: [notes]`
