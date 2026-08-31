# Test Report — WS-CONFIG-DEFAULT

**Date:** 2026-08-30  
**Status:** **passed_with_notes**

---

## Commands run

### Focused unit tests (exit 0)

```bash
npx tsx --test \
  packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts \
  packages/shared/src/utils/printRequestItemSizing.test.ts \
  functions/src/addPortalCatalogDesignToPrintRequest.test.ts \
  apps/portal/features/print-requests/utils/portalCatalogAddInitialSizing.test.ts
```

**Result:** 58 tests, 0 failures.

### Functions build (exit 0)

```bash
cd functions && npm run build
```

### git diff --check (exit 0)

No whitespace errors in diff.

---

## Not run / pre-existing failures

| Check | Result |
|-------|--------|
| Portal `npm run typecheck` | **Failed** — pre-existing errors in `portalShowDiscoveryContent.ts` (unrelated) |
| Studio `npx tsc --noEmit` | **Failed** — pre-existing errors across unrelated modules |
| Full monorepo lint | Not run (scoped change) |
| E2E / manual DEV QA | **Pending** — owner retest after DEV deploy 2026-08-30 |

**Post-deploy:** Functions deployed at commit `c246123`. Owner DEV QA checklist issued; await PASS/FAIL.

---

## Coverage highlights

- Setting absent → 11″ fallback
- Setting 10.5 / 11 / 11.5 resolution
- Invalid persisted value → 11″ fallback
- Decimal save/load round-trip (callable parse)
- Portal server + client sizing agreement at runtime default
- DPI safety when runtime default exceeds safe width
- Explicit requested size and Standard Size override unchanged
