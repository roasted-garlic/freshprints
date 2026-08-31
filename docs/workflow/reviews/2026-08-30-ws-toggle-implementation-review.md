# WS-TOGGLE Implementation Review

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Verdict | **approved_with_changes** |

## Summary

WS-TOGGLE replaces the destructive one-way Studio enhance path with a per-item **baseline/enhanced** toggle, non-destructive interactive derivatives, request-driven upscale targets, and shared cumulative ≤6× policy.

## Checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | No destructive baseline replacement | **Pass** — writes `*.interactive.png` siblings |
| 2 | One derivative per lineage | **Pass** — `interactiveEnhanceGeneratedAt` gate |
| 3 | Repeat ON reuses | **Pass** — selection-only after derivative exists; no regeneration on larger size |
| 3b | Size edit preserves enhanced mode | **Pass** — Studio mapper + merge fix (2026-08-31) |
| 4 | OFF restores baseline + pre-enhance size | **Pass** — with 200 DPI floor |
| 5 | Native cumulative ≤6× | **Pass** — `resolveInteractiveUpscaleCapacity` |
| 6 | Request-driven target | **Pass** — `resolveInteractiveEnhanceTargetPixels` |
| 7 | Catalog + upload support | **Pass** — callable core |
| 8 | Portal ownership enforcement | **Pass** — portal auth path in callable |
| 9 | No customer quota | **Pass** |
| 10 | Export/gang-sheet resolver | **Pass** — `resolvePrintAssetPaths` enhanced branch; **Note:** Studio export hooks still read `design.originalPath` directly — amend before production |
| 11 | Legacy items default baseline | **Pass** — absent `artworkEnhanceMode` |
| 12 | No migration | **Pass** |
| 13 | Fallback 10″ | **Pass** |
| 14 | Runtime configurable default preserved | **Pass** |
| 15 | Automatic 15″ target preserved | **Pass** — import path untouched |
| 16 | Standard Size preserved | **Pass** |
| 17 | Production untouched | **Pass** |
| 18 | Smart Profiling untouched | **Pass** |

## State-machine corrective (2026-08-31)

| Rule | Status |
|------|--------|
| One derivative per lineage; OFF/ON = selection only | **Implemented** |
| No regeneration when print size increases | **Implemented** — `generateInteractiveDerivative` unreachable when `hasDerivative` |
| No auto-baseline / no “not needed” when derivative exists | **Implemented** |
| Mode switch preserves print inches | **Implemented** |
| Portal Improve resolution parity | **Implemented** |

**Binding statement:** Once `artworkEnhanceMode` is `enhanced`, ordinary Print Request size changes preserve enhanced mode. Only explicit user mode selection or Reset to Default may return the item to baseline.

**Superseded policy (removed):** “Regenerate when existing enhanced file is insufficient for larger print size.”

## Required follow-ups before signoff

1. ~~**Portal item-card toggle UI**~~ — wired in state-machine corrective (2026-08-31).
2. **Export hook parity** — update `useExportGangSheetPng`, `useExportShowZip`, `useGangSheetBuilder` to use `resolvePrintAssetPaths` with item `artworkEnhanceMode`.
3. **Expanded automated suite** — 60-case formal plan partially covered; expand before signoff.
4. **Firestore rules** — confirm callable-only writes for new item/asset fields if rules tests required.

## Superseded components

| Component | Status |
|-----------|--------|
| `enhancePrintRequestArtworkCore` destructive overwrite | **Superseded** — delegates to toggle core |
| Studio one-way "Upscale artwork" button | **Superseded** — OFF/ON toggle |
| `shouldOfferManualArtworkEnhanceAction` DPI gate | **Superseded** — toggle eligibility |

## Reusable components

- `processArtworkEnhancePng`, `resolveNativeProductionSourcePixels`, per-asset locks, automated 15″ import pipeline
