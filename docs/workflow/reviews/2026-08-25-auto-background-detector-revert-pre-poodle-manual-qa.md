# Manual QA Checkpoint — Auto Background C2b (Revert Pre-Poodle)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Feature | Import Auto artwork-background — restored pre-poodle luma + cream/sparse secondary |
| Environment | local Studio / **fresh-prints-dev** |
| Why automated insufficient | Real PNGs not in repo |

## Prerequisites

1. **Fully restart Studio** (quit Electron, not just HMR) so main process reloads `@fresh-prints/shared` detector.
2. Session background = **Auto**, halftone = **Normal**.

## Steps

| # | Artwork | Expected Auto | Pass? |
|---|---------|---------------|-------|
| 1 | Cream/light **poodle** | **Dark** (secondary) | ☐ |
| 2 | **99 problems 420 solutions** | **Light** | ☐ |
| 3 | Daddy Is My Hero | **Dark** if white lettering ≥~90% of opaque ink; else Light + use per-image Dark | ☐ |
| 4 | Porch Goose / Pennywise / Uncle Sam / dense white / cannabis / gamer / Jimothy | **Light** (mixed/color) | ☐ |
| 5 | Pink Good Vibes / Grinch+Max | **Light** | ☐ |
| 6 | Per-image Light/Dark override | Wins | ☐ |
| 7 | All Halftones | Dark bg + halftone; Dark alone ≠ Halftone | ☐ |

### Pass criteria
- [x] Owner accepted current Auto detector for this refinement (PASS WITH NOTES)
- [x] Further Auto Background calibration deferred (non-blocking)
- [x] Per-image override remains escape hatch

### Owner reply
**PASS WITH NOTES** (2026-08-25) — see `2026-08-25-auto-background-detector-revert-pre-poodle-owner-qa-pass.md`
