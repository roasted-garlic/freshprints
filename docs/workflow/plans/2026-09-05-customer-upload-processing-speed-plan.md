# Plan: Customer-upload processing speed (trim/upscale + concurrency)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | ADR-FP-123 (ZIP concurrency 3); r7 raised single-image concurrent finalize to 8 |

---

## Goal

Make Portal customer-upload finalize **feel and finish faster** for typical multi-file batches (transparent line art that needs trim + print upscale), without weakening transparency / print-quality gates.

## Background

Owner screenshot: 8 files simultaneous “Trimming…” / “Upscaling…” on ~2.5 MB doodle PNGs. Current path:

1. Client fires up to **`CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE = 8`** parallel `finalizeCustomerUpload` callables.
2. Each callable does full-resolution **PNG trim encode**, then often a second **PNG upscale encode** to 12″@300dpi.
3. Dual zlib PNG encodes dominate wall clock; 8-way parallel CPU-heavy Functions can worsen batch completion vs fewer workers.

## Scope

### In Scope

- Lower concurrent finalize **8 → 4** (lease + client pool; still > ZIP’s in-invocation 3).
- Avoid intermediate PNG between trim and upscale/normalize: **trim → raw → resize → single PNG**.
- Faster production PNG encode (`compressionLevel: 3`) for customer-upload production outputs.
- Fix assisted-fast success return missing `suggestDarkArtworkBackground` (type/contract).
- Run artwork-bg detect after previews without adding a second full production decode when possible (keep fail-soft).
- Tests for pipeline behavior; ADR note; DATA_MODEL/limits comment if needed.

### Out of Scope

- Weakening transparency or upscale quality policy / target inches.
- Changing ZIP in-invocation concurrency (already 3).
- Portal UI redesign; Studio import pipeline.
- TD-034 deploy.

---

## Approach

1. `CUSTOMER_UPLOAD_MAX_CONCURRENT_FINALIZE = 4`.
2. Refactor `trimTransparentEdges` / `upscaleIfNeeded` / normalize path to prefer raw intermediate + one final `.png({ compressionLevel: 3 })` when multiple geometry ops apply.
3. Keep probe-before-trim; preserve `wasTrimmed` / dimension metadata semantics.
4. Docs: ADR-FP-180 performance.

## Test Strategy

- Existing `customerUploadProcessing.test.ts` must pass.
- Add/adjust unit coverage that trim+upscale still yields correct dimensions and transparency.
- Manual: re-upload doodle batch after Functions deploy.

## Risks

| Risk | Mitigation |
|------|------------|
| Raw trim channel mismatch | ensureAlpha before raw; channels=4 |
| Larger Storage PNGs (lower compression) | Accept for speed; still PNG |
| Concurrency 4 slower for tiny files | Accept; heavy files dominate complaint |

## Open Questions

- [x] None blocking — 4 chosen as middle ground vs proven ZIP 3 and current 8.
