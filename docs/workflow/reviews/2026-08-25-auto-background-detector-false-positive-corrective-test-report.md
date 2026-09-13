# Test Report: Auto Background Detector False-Positive Corrective (C2)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-auto-background-detector-false-positive-corrective-plan.md` |
| Review | `docs/workflow/reviews/2026-08-25-auto-background-detector-false-positive-corrective-review.md` |
| Verdict | **passed** (automated) — **owner manual QA required** before closing C2 |

---

## Commands run

| Check | Command | Exit |
|-------|---------|------|
| Focused detector + precedence | `npx tsx --test packages/shared/src/utils/resolveImportArtworkBackgroundDecision.test.ts functions/src/ai/importBackgroundQuality.contract.test.ts` | 0 (48 pass) |
| Studio typecheck | `cd apps/studio && npx tsc --noEmit` | 0 |
| Studio Vite build | `cd apps/studio && npx vite build` | 0 |
| Full repo lint | `npm run lint` | 0 |
| Whitespace | `git diff --check` | 0 |

---

## Chosen thresholds (recorded)

| Constant | Value | Role |
|----------|-------|------|
| `IMPORT_ARTWORK_BG_MIN_OPAQUE_PIXELS` | 64 | Enough ink |
| `IMPORT_ARTWORK_BG_POOR_LIGHT_CONTRAST_MAX` | 2.0 | Poor-on-Light pixel |
| `IMPORT_ARTWORK_BG_MIN_POOR_LIGHT_RATIO` | **0.55** (was 0.40) | Gate A — predominantly washed out |
| `IMPORT_ARTWORK_BG_MIN_DARK_IMPROVEMENT_FACTOR` | 1.35 | Gate A — Dark helps |
| `IMPORT_ARTWORK_BG_ADEQUATE_LIGHT_CONTRAST_MIN` | 3.0 | Escape hatch → Light |
| `IMPORT_ARTWORK_BG_ANCHOR_CONTRAST_MIN` | **2.5** | High-contrast-on-Light anchor |
| `IMPORT_ARTWORK_BG_MAX_HIGH_CONTRAST_ANCHOR_RATIO_FOR_DARK` | **0.12** | Gate B — ≥12% anchors → Light |
| `IMPORT_ARTWORK_BG_MAX_BBOX_OCCUPANCY_FOR_DARK` | **0.32** | Gate B — denser fills → Light |
| Canvas `sparseRatio` min floor | **removed from Dark gate** | Transparent margins must not block sparse line art |

### Why these separate cream-poodle TRUE POSITIVE from FALSE POSITIVE family

| Family | Typical signals | Outcome |
|--------|-----------------|---------|
| Sparse cream/white line art | `poorLight` high, anchors ≈ 0, `bboxOccupancy` low (thin strokes in bbox) | Dark (A∧B) |
| Dense white / solid cream fills | `bboxOccupancy` → 1.0 | Light (B fails) |
| White + black outline / blue-black structure | `highContrastAnchorRatio` ≥ 0.12 | Light (B fails) |
| Colorful / dark illustrations | mean contrast or anchors | Light |
| Ambiguous | incomplete improvement / mixed | Light |

No filename/category hard-codes. Thresholds calibrated against synthetic owner-family fixtures, not a single poodle solid fill.

---

## Implementation summary

- File: `packages/shared/src/utils/importArtworkBackgroundDetection.ts`
- Dark requires **A** (poor light + dark improvement) **AND** **B** (low anchors + sparse-enough bbox occupancy)
- Light-ink fallback retained under same A∧B gates
- Precedence / pickers / all-halftones unchanged

---

## Owner manual QA

**Required.** Synthetic tests do **not** declare C2 fixed. See:

`docs/workflow/reviews/2026-08-25-auto-background-detector-false-positive-corrective-manual-qa.md`

Real owner PNGs: **[NEEDS OWNER FIXTURE]** (not assumed in repo).
