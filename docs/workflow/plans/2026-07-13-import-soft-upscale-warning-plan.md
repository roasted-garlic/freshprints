# Plan: Import soft-upscale quality warning

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-13-import-soft-upscale-warning-review.md |

---

## Goal

Keep the import/upload headroom target at **15″ @ 300 DPI (4500px)**. When an image is upscaled by **≥ 3×** to reach that floor, emit an additional staff-facing warning that print quality may look soft at large sizes (prefer smaller prints).

## Background

Import already trims transparent padding, then upscales any file under 4500px wide to 4500px. Large files are left alone after trim (correct). Tiny sources (e.g. 2–4″) still get stretched to 15″ pixel width; that invents detail. Owner confirmed: keep 15″ headroom, add soft-quality guidance when upscale is aggressive.

## Scope

### In Scope
- Shared constant for soft-scale threshold (`3`)
- Shared helpers: scale factor + soft-quality message formatter
- New import warning code `IMAGE_UPSCALED_SOFT_QUALITY`
- Studio PNG validator emits the extra warning when upscale ratio ≥ 3
- Unit tests for math / message / threshold boundary
- Brief DECISIONS note

### Out of Scope
- Changing `IMPORT_UPSCALE_TARGET_WIDTH_INCHES` (stays 15)
- Changing request default print width (stays 10″)
- Portal customer-facing upload UI copy (unless already reuses the same warning pipeline — do not expand)
- Blocking / rejecting high-upscale imports
- AI upscaling

---

## Affected Areas

### Files / Modules (expected)
- `packages/shared/src/constants/printSize.constants.ts`
- `packages/shared/src/utils/printSizeMath.ts` (+ tests)
- `packages/shared/src/utils/importPrintSizeMessages.ts` (+ tests)
- `packages/shared/src/types/import/importIpc.types.ts`
- `apps/studio/electron/ipc/import/pngValidator.ts`
- `docs/project/DECISIONS.md` (ADR-FP-077)

### Architecture Impact
- [x] None — messaging + threshold only

### Security Impact
- [x] None

### Data Model Impact
- [x] None — warnings are ephemeral import IPC payloads

### Backend Impact
- [x] None required for this pass (Studio import path)

### UI / UX Impact
- [x] Details: Studio import validation list shows an extra warning under the existing upscale line when scale ≥ 3×

### Migration Impact
- [x] None

---

## Approach

1. Add `IMPORT_UPSCALE_SOFT_SCALE_FACTOR_THRESHOLD = 3`.
2. Add `getImportUpscaleScaleFactor(fromWidth, toWidth)` and `isImportUpscaleSoftQuality(...)`.
3. Add `formatImageUpscaledSoftQualityMessage(scaleFactor)` explaining soft risk + prefer smaller prints.
4. Extend `ImportPngWarningCode` with `IMAGE_UPSCALED_SOFT_QUALITY`.
5. In `pngValidator`, after `IMAGE_UPSCALED`, if soft threshold met, push the soft-quality warning (include scale in details).
6. Tests: 10″→15″ (~1.5×) no soft warn; 4″→15″ (~3.75×) soft warn; exact 3× boundary.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test packages/shared/src/utils/printSizeMath.test.ts packages/shared/src/utils/importPrintSizeMessages.test.ts` | yes |

### Manual
- [ ] Optional: import a ~4″ PNG and a ~10″ PNG in Studio; confirm soft warning only on the small one

---

## Human Checkpoints Anticipated
- [ ] None required for implementation (copy is operational, not pricing/policy)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Warning noise on mildly upscaled files | Low | Threshold at 3× (≈ under 5″ sources) |
| Staff ignore warning | Low | Clear copy; does not change sizing defaults |

---

## Rollback Plan

Revert the commit; behavior returns to upscale-only message with no soft warning.

---

## Documentation Updates Required
- [x] DECISIONS.md (ADR-FP-077)

---

## Open Questions
- [x] None — owner chose keep 15″ + soft warning

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-13-import-soft-upscale-warning-review.md
- Verdict: approved
