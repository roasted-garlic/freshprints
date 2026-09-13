# Plan: Show Queue / Internal Sheet print-time estimate

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Workflow | managed-phase (orthogonal Studio polish; maintenance DEV QA remains paused) |
| Owner picks | Standard (efficiency) layout only; display `12m 32s · 94 in` |

---

## Goal

On Studio Show Queue and Internal Gang Sheet detail glance stats, show an **estimated print time** derived from Standard (efficiency) gang-sheet packing: **8 seconds per linear inch** of total feed length, without artwork fetches or heavy work (same path as existing sheet-count estimates).

## Calculation (locked)

```text
totalLinearInches = sum(sheetHeightPx) / 300   // efficiency nest sheets only
printSeconds      = totalLinearInches * 8
display            = formatDuration(printSeconds) + " · " + round(inches) + " in"
```

- Use only **Standard / efficiency** packing (`planEfficiencyGangSheetLayout` / nest `sheetHeightPx`).
- Do **not** estimate from Grouped / Sheet-per-customer modes for this field.
- Sync only: reuse allocation print sizes already used in `estimateGangSheetSheetCounts`.

## Approach

1. Return `totalSheetHeightPx` from `planEfficiencyGangSheetLayout`.
2. Extend `showQueueGlanceStats` with `efficiencyLinearInches`, `PRINT_SECONDS_PER_LINEAR_INCH = 8`, `formatShowQueuePrintTimeEstimate`, and `printTimeEstimateLabel`.
3. Add `Est. print time` glance pill on `UpcomingShowsPage` (Show Queue + Internal Sheets).
4. Unit tests + owner visual QA.

## Out of scope

- Live timer / remaining-time vs elapsed print clock.
- Persisting estimates on show documents.
- Estimates for grouped layout modes.
- Portal changes.

## Acceptance

- [ ] Glance stats show Est. print time for Standard packing as duration · inches.
- [ ] Computation is sync and uses existing allocation sizes + efficiency nest.
- [ ] Show Queue and Internal Sheets both show the field.
- [ ] Owner visual QA PASS before commit/push (if requested).
