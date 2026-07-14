# Manual Checkpoint — Upscale ceiling 6× (Achy Breaky)

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Policy | `image-quality-v2` with **≤6×** one-pass toward 12″ |
| Environment | Local / `fresh-prints-dev` (no production) |

## Why automated tests are insufficient

Owner judgment on real DTF artwork (Achy Breaky) printability and Studio/Portal staff visibility of extended upscale.

## Prerequisites

- Shared policy + Functions with 6× ceiling deployed to the environment under test (or emulators)
- Studio import/intake build current

## Manual Test Checkpoint

### Steps

1. **Import or Portal-upload Achy Breaky** (trimmed ~641×597) → **Expected:** one upscale ~5.62× to ~3600×3353; approved max ~12×11.18; request default ~10×9.31; staff-visible extended upscale (warning / soft-quality / Technical Details); **no** second pass; upload/attach not blocked.
2. **300px-wide square** → **Expected:** capped at 6× (~6″ approved max), not forced to 12″.
3. **Native >12″ / large 32″-class art** → **Expected:** no upscale; large art keeps pixels; approved max up to 15″.
4. **Tall near-envelope art** → **Expected:** height ceiling still constrains; no forced 12″ width.
5. **Halftone** → **Expected:** still human-only optional checkbox / staff toggle; no automatic detector.

### Pass criteria

- [x] Achy Breaky reaches ~12″ production in one ≤6× pass
- [x] Extended upscale visible to staff, non-blocking
- [x] Caps / no-downsample / tall / large-native behaviors preserved
- [x] Human-only halftone unchanged

### Owner result (2026-07-13)

**PASS WITH NOTES** — Image sizing, 6× one-pass upscale, approved maximum sizing, extended-upscale warning, and human-only halftone workflow work as expected. Owner found a separate unrelated bug to address outside this managed goal.
