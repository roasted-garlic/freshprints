# Implementation Review — Interactive Original Storage Read Fix

**Date:** 2026-08-31  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Verdict:** **approved_with_changes** — DEV **Storage rules** deploy required; optional Functions deploy for stale-metadata recovery

---

## Root Cause (Owner QA FAIL)

**Class E — Storage access/security issue (not missing object, not path normalization).**

Verified via `gsutil`:

| Object | Exists |
|--------|--------|
| `gs://fresh-prints-dev.firebasestorage.app/originals/ltn0gzs2YGXPADqCejr8.png` | **YES** |
| `gs://fresh-prints-dev.firebasestorage.app/originals/ltn0gzs2YGXPADqCejr8.interactive.png` | **YES** |

Persisted design path: `/originals/ltn0gzs2YGXPADqCejr8.interactive.png`  
Resolved export path: same (resolver correct)  
Download helper: `designDerivativeUrlService.getDownloadUrlForCatalogPath` → `ref(storage, "originals/ltn0gzs2YGXPADqCejr8.interactive.png")` → `getDownloadURL`

**Failure:** `storage.rules` `match /originals/{fileName}` only allowed `isCanonicalOriginalFileName` matching `{designId}.png`. Filename `ltn0gzs2YGXPADqCejr8.interactive.png` did **not** match, so staff `getDownloadURL` was denied → service returned `null` → export failed closed with owner message.

**Not involved:** leading-slash mismatch (both sides strip correctly), generation write path (Admin SDK wrote object successfully), Firestore rules.

**Customer upload parity:** `customer-uploads/{uid}/{uploadId}/{fileName}` read rule has no `fileName` restriction for staff — interactive upload derivatives should already download. Catalog originals were the gap.

---

## Fix

1. **`storage.rules`** — add `isCanonicalInteractiveOriginalFileName` + `isStaffReadableOriginalFileName`; staff read/delete on interactive originals.
2. **`designStoragePaths.ts`** — shared filename/path classifiers aligned with rules.
3. **`setPrintRequestItemArtworkEnhanceModeCore.ts`** — `hasDerivative` requires Storage object existence; stale metadata allows regeneration; reuse fails closed with remediation message if file missing.
4. **`interactiveDerivativeStorage.ts`** — shared Admin `exists()` check.

Fail-closed export behavior **preserved**.

---

## Owner Test Item `ltn0gzs2YGXPADqCejr8`

**No Firestore repair or re-enhancement required.** Derivative object exists; only Storage rules deploy needed.

---

## Tests

**49/49 PASS** (export parity + storage path + rules alignment + enhance core)

---

## DEV Deploy Required

| Resource | Required? | Command |
|----------|-----------|---------|
| **Storage rules** | **YES** | `firebase deploy --only storage --project fresh-prints-dev` |
| Functions (`setPrintRequestItemArtworkEnhanceMode`) | **Recommended** (stale-metadata recovery) | `firebase deploy --only functions:setPrintRequestItemArtworkEnhanceMode --project fresh-prints-dev` |
| Firestore rules | No (already deployed) |
| Studio | **Reload** after pull (minor error-message tweak only) |

Production: **NOT AUTHORIZED**

---

## Owner Re-test

After Storage rules deploy: repeat Tests A–F with same batch (10" baseline + 17" enhanced). Allocation `d3MNZand4pj7P1pprcbA` should succeed.
