# Signoff: 72 DPI Minimum Import + Resolution Color Pills

**Date:** 2026-06-24  
**Plan:** `docs/workflow/plans/2026-06-24-72-dpi-import-resolution-pills-plan.md`  
**Review:** `docs/workflow/reviews/2026-06-24-72-dpi-import-resolution-pills-review.md`  
**Tests:** `docs/workflow/reviews/2026-06-24-72-dpi-import-resolution-pills-test-report.md`  
**Status:** approved_with_notes

## Delivered

### A. Import acceptance (72 DPI floor)

- `MIN_ACCEPTABLE_EFFECTIVE_DPI = 72` in `printSize.constants.ts`
- `resolveImportNormalizationTargetDpi()` — 300 DPI when width ≥ 3.5″ at 300; else 72 DPI
- `assessPrintSizeCapability()` — rejects only when `min(pixels) < 72` or `effectiveDpi < 72`; acceptance levels from effective DPI tiers
- Updated `pngValidator`, `importPrintSizeMessages`, `ImportPngWarningCode` (`PRINT_SIZE_TERRIBLE`)

### B. Resolution tier model

- `EffectiveDpiQualityLevel`: `optimal | good | bad | terrible`
- `effectiveDpiQuality.ts` — single source for labels, messages, CSS class tokens

### C. UI

- `ResolutionQualityPill` shared component
- `DesignCard` — resolution pill on catalog cards
- `DesignDetailsModal` — pill in print settings
- `DesignPrintSettingsFields` — aligned tier labels/colors
- `design-library.css` — green/yellow/red/black resolution tokens

### D. Documentation

- `DATA_MODEL.md`, `WORKFLOWS.md`, `STYLE_GUIDE.md` updated

## Acceptance criteria

| Criterion | Status |
|-----------|--------|
| PNG with effective DPI ≥ 72 at normalized size imports | **PASS** (unit + math) |
| PNG with effective DPI < 72 rejected with clear error | **PASS** (71px test) |
| Design Library cards show color pill | **Implemented** — manual QA pending |
| Tier colors match legend | **PASS** (CSS + unit tiers) |
| Edit Design uses same tiers | **PASS** |
| Unit tests for boundaries | **PASS** (22 tests) |
| Manual QA import + library pills | **PENDING** |

## Manual Test Checkpoint

**Feature / area:** Import + Design Library resolution pills  
**Why automated tests are insufficient:** Visual pill colors and import UX  
**Environment:** Local dev (`npm run dev`)  
**Prerequisites:** Staff login; sample PNGs at varied resolutions (e.g. 1049×500, 3000×1500, 71×71)

### Steps

1. Import a **1049px wide** PNG → **Expected:** succeeds with terrible-resolution warning; Firestore `effectiveDpi` ≈ 72  
2. Import a **71×71** PNG → **Expected:** rejected with 72 DPI minimum message  
3. Open Design Library → **Expected:** imported design shows **Terrible** black pill on card  
4. Open design details → **Expected:** same pill tier as card  
5. Import a **3000×1500** PNG → **Expected:** **Optimal** green pill (effectiveDpi 300)

### Pass criteria

- [ ] Sub-threshold width asset imports (previously rejected)
- [ ] 71px asset rejected
- [ ] Pills match legend colors on card and details

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

## Open follow-ups

- Existing catalog designs imported before this change may show **Optimal** until re-imported or print size edited (expected).
- `npm test` script not added (TD-002); tests run via `npx tsx --test`.

## Human approvals

None required (local dev only).
