# Manual QA: Portal upload limits layout / copy / ZIP alignment

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Environment | fresh-prints-dev Portal (soft-reload) |
| Prerequisites | Signed-in portal customer; note Studio Settings image/day for print-request and donate |
| **Result** | **PASS** — owner 2026-07-18 (“The # upload capp seems PASSED”) |
| Includes | Layout / copy / ZIP formula; Choose files title removal residual |

## Feature / area
Portal Upload + Donate Choose files panel

## Why automated tests are insufficient
Layout order, plain-English copy, and displayed ZIP size vs Settings need visual confirmation.

---

## Manual Test Checkpoint

### Steps

1. Soft-reload Portal → **Upload** (print-request) → open Choose files.
   - **Expected layout (top → bottom):** rate-limits box → file-limitations line → Drop / Images / Folder / ZIP.
   - **Note:** Embedded **Choose files** h2 was removed in residual polish (owner PASS covers this).
2. Read rate-limits box.
   - **Expected copy sample:** `40 of 50 images left today · 22 of 25 upload starts left today · 2 of 2 ZIPs left today (resets at midnight UTC).`
   - No word **session** / **sessions**. No em dashes.
3. Read file-limitations line above buttons.
   - **Expected:** `PNG or WebP · up to 25 MB each · ZIP up to {X} … · 8 at a time`
   - `{X}` = `min(2 GB, imagesPerDay × 25 MB)` from Settings for this purpose.
   - Example: if Settings print images/day = **50** → ZIP **1.25 GB** (not 2 GB).
   - Example: if Settings images/day = **20** → ZIP **500 MB**.
4. Soft-reload → **Donate** → Choose files.
   - **Expected:** same layout; remaining counts use donation Settings; ZIP max = `min(2 GB, donationImagesPerDay × 25 MB)` (often still 2 GB when donation image limit is high).
5. Optional: pick a ZIP larger than the displayed ZIP max.
   - **Expected:** client rejects with size message matching the displayed max (not 2 GB if formula is lower).

### Pass criteria
- [x] Layout order matches steps 1 (no Choose files title)
- [x] No “session” wording; upload starts / images / ZIPs clear
- [x] Displayed ZIP size matches formula from live Settings image/day
- [x] Donate purpose uses its own remaining + ZIP max

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Owner reply (2026-07-18):** PASS — “The # upload capp seems PASSED”

---

## ZIP formula (reference)

```
maxZipBytes = min(2_GB_ceiling, imagesDailyLimit × maxSingleImageBytes)
```

- `imagesDailyLimit` = Studio Settings finalize-image / day for the purpose
- `maxSingleImageBytes` = 25 MB (shared constant until Settings gains a byte field)
- ZIP **count**/day remains a separate Settings quota
- Storage rules still allow up to 2 GB; Functions enforce the tighter max
