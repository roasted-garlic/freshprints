# Implementation Review — Customer Upload Artwork Quality Gate

**Date:** 2026-09-02  
**Goal:** `customer-upload-artwork-quality-gate`  
**Plan:** `docs/workflow/plans/2026-09-02-customer-upload-artwork-quality-gate-plan.md`  
**Formal review:** `docs/workflow/reviews/2026-09-02-customer-upload-artwork-quality-gate-review.md` (approved_with_changes; WebP decision resolved by owner)

## Verdict

**APPROVED for DEV owner QA** — implementation matches authorized scope. Production deploy not authorized.

## Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| PNG-only Portal customer path (`print_request`, `catalog_donation`) | ✅ | `detectCustomerPortalImageFormat` accepts decoded PNG only |
| Byte/decode inspection authoritative | ✅ | Sharp `metadata.format`; no extension/MIME trust |
| WebP rejected on customer path | ✅ | `unsupported_format` + customer copy |
| WebP retained for staff/assisted paths | ✅ | `skipCustomerQualityGates` / `detectFormatAllowingJpeg` unchanged |
| Trim-only transparency pass removed | ✅ | No `trimShrinkRatio` pass condition |
| Edge-connected exterior transparency | ✅ | `analyzeTransparencyCanvas` flood-fill from edges |
| Thin-border screenshot regression | ✅ | `thinBorderScreenshot` rule + tests |
| Native quality before upscale | ✅ | Pre-upscale projection via `resolveImportUpscaleTargetPx` + `assessPrintSizeCapability` |
| Existing 6× / 15″ / DPI contract reused | ✅ | No new sizing policy |
| Server-authoritative READY | ✅ | Failed uploads never reach `technicalStatus: ready` in processor |
| Attach/donation confirm guards | ✅ | Existing `ready` requirement unchanged (wiring tests pass) |
| No AI classifier | ✅ | Deterministic gates only |
| Portal accept list PNG-only | ✅ | Panel + service + batch hook |
| Storage rules scoped PNG-only | ✅ | `isValidCustomerUploadSource()` on customer-upload source path only |
| ZIP per-file failure preserved | ✅ | `isCandidateImageEntryName` PNG-only; mixed batch behavior unchanged |
| Customer-safe failure copy | ✅ | `customerUploadFailureMessages.ts` |

## Risks / follow-ups

- **Portal typecheck:** repo-wide `npm run typecheck --workspace @fresh-prints/portal` fails on pre-existing `catalogService.ts` interactive-enhance fields — unrelated to this goal; customer-upload files not implicated.
- **Semantic screenshot bypass:** if owner QA still sees editor/watermark screenshots pass, open separate AI/visual follow-up (explicitly out of scope for V1).

## Test evidence

Focused run (2026-09-02):

```text
npx tsx --test \
  packages/shared/src/utils/customerUploadTransparency.test.ts \
  functions/src/lib/customerUploadProcessing.test.ts \
  functions/src/lib/customerUploadZip.test.ts \
  functions/src/lib/meaningfulTransparencyMeasurement.test.ts

# tests 49 | fail 0
```

Functions build:

```text
npm --prefix functions run build  # exit 0
```

## DEV deploy scope

| Surface | Deploy? |
|---------|---------|
| Cloud Functions | **YES** |
| Portal (local restart / DEV) | **YES** |
| Storage rules | **YES** (scoped PNG-only on customer source path) |
| Firestore rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |
| Production | **NOT AUTHORIZED** |
