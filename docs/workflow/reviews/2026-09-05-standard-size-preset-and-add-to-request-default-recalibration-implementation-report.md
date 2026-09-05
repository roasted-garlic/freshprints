# Implementation Report: Standard Size preset + Add to Request default recalibration

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Plan | docs/workflow/plans/2026-09-05-standard-size-preset-and-add-to-request-default-recalibration-plan.md |
| Review | docs/workflow/reviews/2026-09-05-standard-size-preset-and-add-to-request-default-recalibration-review.md |
| Verdict | **complete** — no production resources changed |

---

## Behavior delivered

1. **Full Back Adult** seeds: M/L/XL → **11″**; 2XL–5XL → **12 / 13 / 14 / 15″**
2. **Full Back Youth** Y2XL → **11″** (was 11.5″)
3. **Full Front Adult/Youth** unchanged; Youth key remains **`yxs` / YXS**
4. **System fallback** `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES` → **10.5″**
5. Aspect lock, DPI floors, 22″ cap, duplicate/manual edit behavior untouched
6. Automated 15″ upscale / interactive enhance / import 10″ constants untouched
7. **No Firestore writes, no deploys, no production changes**

---

## Files changed

| File | Change |
|------|--------|
| `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.ts` | Full Back Adult/Youth seed widths |
| `packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts` | Full Adult/Youth front/back assertions |
| `packages/shared/src/utils/printRequestItemSizing.ts` | Fallback 10.5″ |
| `packages/shared/src/utils/printRequestItemSizing.test.ts` | Fallback assertions |
| `packages/shared/src/utils/interactiveArtworkEnhance.test.ts` | Fallback assertions |
| `apps/portal/features/print-requests/utils/portalCatalogAddInitialSizing.test.ts` | Optimistic default 10.5″ |
| `functions/src/addPortalCatalogDesignToPrintRequest.test.ts` | Absent-default → 10.5″ |
| `docs/project/DECISIONS.md` | ADR-FP-080 amendment 2026-09-05 |
| `docs/architecture/DATA_MODEL.md` | Fallback wording 10.5″ |
| Plan / review / test / signoff artifacts under `docs/workflow/` | Workflow |

---

## Tests run

- Unit: **87 pass / 0 fail** (presets, sizing, interactive enhance contract, Portal optimistic, Functions catalog-add)
- Functions build: **PASS**
- Portal typecheck: **PASS**
- ESLint (touched files): **PASS**
- Full lint / Studio tsc: **pre-existing failures documented** (out of scope)

---

## Production / Firebase confirmation

- **No** Firebase console actions
- **No** `settings/standardPrintSizes` writes
- **No** Functions/hosting/rules deploys
- **No** production data or configuration changes

---

## Owner follow-up (DEV)

If live Studio/Portal still shows old Full Back widths or 11″ Add to Request:

1. Studio Settings → Standard Print Sizes → **Reset to defaults** (or edit Full Back rows)
2. Set **Print Request default width** to **10.5″** if currently persisted as 11″
3. Confirm new items default to 10.5″; existing items keep saved sizes
