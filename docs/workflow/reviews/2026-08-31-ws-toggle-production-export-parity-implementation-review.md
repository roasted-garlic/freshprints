# Implementation Review — WS-TOGGLE Production Export Parity

**Date:** 2026-08-31  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Scope:** Gang sheet + ZIP export must honor per-item `artworkEnhanceMode`  
**Verdict:** **approved_with_changes** — implementation complete; **owner manual QA A–E required** before WS-TOGGLE full PASS

---

## Root Cause

`resolvePrintAssetPaths` already understood `artworkEnhanceMode`, but Show Queue export hooks (`useExportGangSheetPng`, `useExportShowZip`) and manual gang-sheet placement (`useGangSheetBuilder`) read baseline paths directly:

- `design.originalPath`
- `upload.productionStoragePath`

Gang-sheet cache fingerprint also omitted active production asset identity, so ON/OFF toggles at the same physical size could reuse stale cached sheets.

---

## Production Asset Consumers Audited

| Consumer | Status |
|----------|--------|
| `resolvePrintAssetPaths` | Enhanced — fail-closed when derivative missing |
| `resolveShowExportProductionAsset` | **New** shared resolver (path + source pixels) |
| `buildShowExportAllocationAssets` | **New** Studio builder for all Show Queue exports |
| `useExportGangSheetPng` | **Fixed** — routes through shared builder |
| `useExportShowZip` | **Fixed** — routes through shared builder |
| `useGangSheetBuilder` | **Fixed** — `originalPathSnapshot` from resolver |
| `useGangSheetShowAssets` | **Fixed** — loads print request items for enhance mode |
| `buildGangSheetCacheFingerprint` | **Fixed** — includes `productionStoragePath` per allocation |
| Electron main-process compositor | Unchanged — consumes `downloadUrl` + `targetWidthPx` from renderer IPC (already correct once renderer resolves active asset) |

No other direct `design.originalPath` reads remain in Show Queue export / gang-sheet generation paths.

---

## Binding Rules Verified in Code

- `artworkEnhanceMode` on persisted print request item is the selector
- Absent mode → baseline (legacy)
- Enhanced + missing derivative → **fail closed** (throws; export aborts with error)
- Physical print inches unchanged; source pixels differ by variant
- Mixed items with same `designId` resolve different paths when modes differ
- Catalog `design.originalPath` never mutated
- Customer upload paths remain private per upload id

---

## Tests

| Suite | Result |
|-------|--------|
| `resolveShowExportProductionAsset.test.ts` | 10/10 pass |
| `printAssetResolution.test.ts` | 7/7 pass (incl. fail-closed) |
| `gangSheetCacheFingerprint.test.ts` | 8/8 pass (incl. asset-path invalidation) |
| `gangSheetEfficiencyLayout.test.ts` | 2/2 pass |
| `gangSheetGroupedLayout.test.ts` | 4/4 pass |
| `gangSheetContinuousCustomerGroupedLayout.test.ts` | 5/5 pass |
| `originalPathProductionProtection.test.ts` | 3/3 pass |

**Total focused run:** 39/39 pass

---

## Deployment Determination

| Layer | Changed? | Action |
|-------|----------|--------|
| Studio/Electron renderer | **Yes** | **Rebuild + reload Studio** |
| Shared package | Yes (bundled with Studio) | Same reload |
| Firestore rules (`gangSheetItems` interactive path snapshots) | **Yes** | **DEV rules deploy required** — `firestore.rules` only; **STOP for owner approval before deploy** |
| Cloud Functions | No | None |
| Portal | No | None |
| Production | **NOT AUTHORIZED** | — |

---

## Owner Manual QA (Required)

See parent workflow state — Tests A–E (baseline vs enhanced gang sheet, cache invalidation, ZIP, mixed request, customer upload).

---

## Open Items

- [ ] Owner DEV QA production export parity (Tests A–E)
- [ ] DEV Firestore rules deploy for interactive `originalPathSnapshot` on manual gang-sheet builder (if owner uses enhanced placement)
- [ ] Full WS-TOGGLE signoff blocked until owner confirms export parity
