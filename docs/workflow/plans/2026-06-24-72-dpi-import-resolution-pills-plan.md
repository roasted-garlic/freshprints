# Plan: 72 DPI Minimum Import + Resolution Color Pills

**Date:** 2026-06-24  
**Phase:** Managed — Plan  
**Status:** Complete

## Goal

Relax PNG import rejection to a **72 effective DPI floor** at import-normalized print size, and show **color-coded resolution pills** on Design Library cards (and detail modals) using persisted `effectiveDpi`.

## Product decisions (locked)

| Tier | Label | Color | Rule |
|------|-------|-------|------|
| optimal | Optimal | Green | effectiveDpi ≥ 300 |
| good | Good | Yellow | effectiveDpi ≥ 250 |
| bad | Bad | Red | effectiveDpi ≥ 200 |
| terrible | Terrible | Black | effectiveDpi ≥ 72 and < 200 |
| — | Minimum accepted | — | effectiveDpi ≥ 72 at import; reject below |

- Display metric: persisted `effectiveDpi` on `designs`, not embedded metadata DPI alone.
- Import validation stays in shared math + `pngValidator` (not client-only).

## Import normalization math

**Problem today:** Rejection uses `maxPrintWidthAt300 < 3.5″`. Normalizing at 300 DPI always yields `effectiveDpi = 300`, so a width floor cannot express sub-300 quality tiers.

**Approach:**

1. **Normalization DPI selection**
   - If `pixelWidth / TARGET_PRINT_DPI ≥ MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES` (3.5″): normalize at **300 DPI** (unchanged for standard assets).
   - Else: normalize at **72 DPI** (`MIN_ACCEPTABLE_EFFECTIVE_DPI`) so persisted print size is larger and `effectiveDpi ≈ 72`.

2. **Persisted fields** (`buildImportPrintSizeCreateFields`)
   - `printWidthInches` / `printHeightInches` from normalization DPI above.
   - `effectiveDpi` = `pixelWidth / printWidthInches` (aspect locked).

3. **Rejection**
   - Reject when `min(pixelWidth, pixelHeight) < 72` (cannot meet 72 DPI floor on limiting axis).
   - Reject when computed `effectiveDpi < 72` after normalization (safety guard).

4. **Equivalence:** A file previously rejected at 1049×500 px will normalize at 72 DPI (~14.57″ × ~6.94″), persist `effectiveDpi = 72`, import with `terrible` tier warning.

**Acceptance levels** (import warnings, derived from effectiveDpi):

| effectiveDpi | `PrintSizeAcceptanceLevel` |
|--------------|----------------------------|
| ≥ 300 | `accept` |
| ≥ 250 | `warn` |
| ≥ 200 | `small_format` |
| ≥ 72 | `terrible` (new) |
| < 72 | `reject` |

Width-based `meetsPreferredWidth` flags remain on assessment for reference but no longer drive rejection.

## Scope

### A. Import acceptance

- `shared/constants/printSize.constants.ts` — `MIN_ACCEPTABLE_EFFECTIVE_DPI = 72`; tier constant aliases.
- `shared/utils/printSizeMath.ts` — `resolveImportNormalizationTargetDpi`, refactor `assessPrintSizeCapability`, effective-DPI-based acceptance.
- `shared/utils/importPrintSizeMetadata.ts` — use assessment `targetDpi` (may be 72).
- `shared/utils/importPrintSizeMessages.ts` — 72 DPI rejection message; terrible-tier warning helper.
- `electron/ipc/import/pngValidator.ts` — `terrible` warning branch.
- `importOrchestrationService.ts` — no logic change beyond shared assessment.
- Tests: `printSizeMath.test.ts`, `importPrintSizeMetadata.test.ts`.

**Out:** PNG/ZIP size limits; print-size edit UX beyond label/color alignment.

### B. Resolution tier model (shared)

- `shared/types/printSize/printSize.enums.ts` — `EffectiveDpiQualityLevel`: `optimal | good | bad | terrible`; add `terrible` to `PrintSizeAcceptanceLevel`.
- `shared/utils/effectiveDpiQuality.ts` — tier resolution, labels, messages, pill CSS token helper.
- New `shared/utils/effectiveDpiQuality.test.ts` — boundaries 299, 250, 200, 72, 71.

### C. Resolution pill + library catalog

- `src/renderer/src/shared/components/ResolutionQualityPill.tsx` — Badge-based pill with tooltip.
- `DesignCard.tsx` — pill when `effectiveDpi` defined.
- `DesignDetailsModal.tsx` — use pill component.
- `DesignPrintSettingsFields.tsx` — same tier labels/colors.
- `designPrintSizeDisplay.ts` — map tiers to CSS classes.
- `design-library.css` — green/yellow/red/black pill tokens; update `.design-print-quality-*`.
- `importPrintSizeDisplay.ts` — `terrible` acceptance label.

### D. Documentation

- `docs/architecture/DATA_MODEL.md` — tier meanings, 72 floor.
- `docs/WORKFLOWS.md` — import acceptance rules.
- `docs/standards/STYLE_GUIDE.md` — resolution pill colors.

## Risks

- Existing designs with `effectiveDpi` from old 300-only normalization show **Optimal** until re-imported or staff edits print size — expected; tiers derive from stored value.
- Rounding on very small pixel dimensions — guarded by `min(pixels) < 72` reject.

## Test strategy

- Unit: tier boundaries, import normalization fallback, 1049px accept, 71px reject.
- Manual: import mixed-resolution batch; verify library pills match legend.

## AppForge impact

Documentation, shared utils, renderer components — **not** Starter Surface distribution change.
