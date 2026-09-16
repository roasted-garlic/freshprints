# Owner DEV QA Preparation: Show Queue default max — apply to existing shows

| Field | Value |
|-------|-------|
| Date | 2026-09-15 |
| Goal | `show-queue-global-allocation-quota-apply-existing-shows` |
| Status | **resolved — Owner DEV QA PASS** |
| Environment | `fresh-prints-dev` + local Studio |

---

## Prerequisites

1. Local Studio running current development source.
2. Signed in as **owner or admin**.
3. **Before testing the Apply toggle ON path**, deploy the new callable to DEV only:

```bash
firebase deploy --only functions:applyShowQueueDefaultMaxToEligibleShows --project fresh-prints-dev
```

Unchecked Save can be QA’d without that deploy. Do **not** deploy to production.

---

## Manual Test Checkpoint

**Feature / area:** Show Queue Settings — default max quantity + apply to existing shows  
**Why automated tests are insufficient:** Modal toggle UX, live Firestore capacity display, and allocation enforcement need owner eyes on DEV data.

### Steps

1. Open Show Queue → Settings.  
   **Expected:** Default max field looks as before; shared **Toggle** “Apply this quota to existing shows” is off; short hint: “Updates eligible Upcoming shows only. Resets when this dialog closes.”

2. Turn the toggle **on**, then Cancel / close the modal, reopen Settings.  
   **Expected:** Toggle is **off** again (resets on close; not persisted).

3. Change default max, leave toggle **off**, Save.  
   **Expected:** Success uses the normal settings message. Global default updates. Existing shows keep their prior max. Toggle is off after reopen.

4. Note 1–2 **Upcoming** Whatnot (or DEV fixture) shows that are `open` / `full` / `printing`, plus one Past or completed show and any Internal Gang Sheet. Change default max, turn toggle **on**, Save.  
   **Expected:** Success reports updated count (and skip count if any). Eligible Upcoming shows show the new max after refresh. Past / completed / Internal GS unchanged. Toggle resets off after close.

5. Set a new max **below** an eligible show’s current allocated quantity, toggle on, Save.  
   **Expected:** That show is skipped (mentioned in success or left unchanged); other eligible shows update; no danger auto-override.

6. Optional: blank the default (no limit), toggle on, Save.  
   **Expected:** Global default cleared; eligible shows lose `maxTotalQuantity` (no limit).

7. Spot-check allocation: an updated Upcoming show enforces the new capacity (Add to Show / staff add respects remaining room).

8. Helper role (if available): Settings control remains owner/admin-only; helpers cannot save Apply.

### Pass criteria

- [ ] Toggle defaults off and resets after close / successful save
- [ ] Unchecked Save = global only; existing shows unchanged
- [ ] Checked Save updates eligible Upcoming Whatnot/DEV fixture `open`/`full`/`printing` shows
- [ ] Past, Needs Attention, terminal, Internal Gang Sheets unchanged
- [ ] Below-allocated skips reported / left alone
- [ ] Layout remains uniform with the paired settings fields
- [ ] No Rules/schema/production action

### Please reply with

- `OWNER DEV QA: SHOW QUEUE QUOTA APPLY — PASS`
- `OWNER DEV QA: SHOW QUEUE QUOTA APPLY — FAIL: [description]`
- `OWNER DEV QA: SHOW QUEUE QUOTA APPLY — PASS WITH NOTES: [notes]`

If the checked path was blocked only by a missing DEV Function, say so and authorize a DEV-only deploy if you want the agent to run it.
