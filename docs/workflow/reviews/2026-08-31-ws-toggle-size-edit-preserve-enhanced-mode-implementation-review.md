# WS-TOGGLE Size-Edit Preserve Enhanced Mode — Implementation Review

| Field | Value |
|-------|-------|
| Date | 2026-08-31 |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Verdict | **approved_with_changes** |
| Owner QA trigger | FAIL — Upscale turned OFF after manual width change (17″ → 18″) |

## Root cause

**Class B — Studio local reconciliation replacing the item with an object that omits `artworkEnhanceMode`.**

Studio `mapPrintRequestItemData` did not map `artworkEnhanceMode` / `preEnhancePrintWidthInches` / `preEnhancePrintHeightInches` from Firestore. After `updatePrintRequestItem` (size-only write), `handleUpdateItem` called `replaceRequestItem(updatedItem)` with the mapped response. The UI then resolved `resolveArtworkEnhanceMode(undefined)` → `baseline`, so the toggle appeared OFF.

**Persisted Firestore mode:** unchanged — size updates never wrote `artworkEnhanceMode`. The bug was client-side state loss, not server mutation.

Portal mapper already included enhancement fields; Portal local patches spread `...item` and were not affected.

## Binding rule (owner-approved)

> Once `artworkEnhanceMode` is `enhanced`, ordinary Print Request size changes preserve enhanced mode. Only explicit user mode selection or Reset to Default may return the item to baseline.

## Fix

| Area | Change |
|------|--------|
| `packages/shared/src/utils/printRequestItemArtworkEnhanceFields.ts` | Shared read + merge helpers for partial updates |
| `apps/studio/.../printRequestService.ts` | Map enhancement fields from Firestore |
| `apps/studio/.../PrintRequestsPage.tsx` | Merge previous item enhancement fields after size save |
| `apps/portal/.../portalPrintRequestService.ts` | Use shared read helper (parity) |

Reset to Default behavior unchanged: `nextPresetKey === null` still calls `applyArtworkEnhanceMode('baseline')` in Studio/Portal item cards.

## Tests

| Command | Result |
|---------|--------|
| `npx tsx --test packages/shared/src/utils/printRequestItemArtworkEnhanceFields.test.ts packages/shared/src/utils/interactiveArtworkEnhance.test.ts packages/shared/src/utils/printAssetResolution.test.ts functions/src/lib/setPrintRequestItemArtworkEnhanceModeCore.test.ts` | **35/35 pass** |

New regression coverage includes: size-only mapper omitting mode, repeated width edits, quantity-only saves, DPI recalc from enhanced pixels, &lt;200 DPI hard block with mode preserved.

## Build / typecheck

| Check | Result |
|-------|--------|
| `functions` build | **pass** |
| Studio `tsc --noEmit` | **failed_documented** — pre-existing unrelated errors in repo (ai-review, customer-uploads, upcoming-shows, etc.); none in changed files |

## DEV deploy

**Not required** — client-only mapper/reconciliation fix. Owner should reload/rebuild Studio (and Portal for shared helper parity).

## Remaining follow-ups (unchanged)

1. Export hook parity (`resolvePrintAssetPaths` in gang-sheet/ZIP hooks).
2. Expanded formal WS-TOGGLE suite before signoff.
