# Test Report: Studio Pre-Release Print Request Download and Intake Navigation

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-plan.md` |
| Implementation | Current `development` checkout; Signoff complete and reviewed commit/push recorded |
| Overall | **passed_with_notes** |

---

## Summary

The approved implementation is complete within scope. Final focused tests, regression tests,
changed-file lint, Studio typecheck, Studio packaging build, and `git diff --check` passed. Owner
DEV QA replied **PASS** on 2026-09-16 with no notes or failures, covering native PNG dimensions/save
behavior and interactive Uploaded/Donated list-selection behavior.

An initial focused run exposed two implementation defects and was corrected before the final run:
the card props were not destructured, and the new IPC validator accepted an extra `quantity`
property. The final checks below were run after those corrections.

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|---|---|---:|---|---|
| Studio typecheck | `npx tsc --noEmit -p apps/studio/tsconfig.json` | 0 | pass | Final run clean. |
| Targeted lint | `npx eslint <all changed TS/TSX implementation/test files> --report-unused-disable-directives --max-warnings 0` | 0 | pass | Changed-file lint clean after replacing the control-character regex with a character-code check. |
| Focused tests | `npx tsx --test` over shared filename/resolver/asset/navigation tests, Electron validation, intake parity, and Print Request contracts | 0 | pass | **70/70** tests passed. |
| Export/gang-sheet regressions | `npx tsx --test` over Show Export filename, gang-sheet cache/planners/labels/compositor, and Functions copy-core tests | 0 | pass | **85/85** tests passed; no Functions source changed or deployed. |
| Studio build/package | `npm run build:studio` | 0 | pass_with_notes | Vite/Electron packaging completed. Existing bundler chunk/dynamic-import warnings and Windows electron-builder rename retries were non-fatal. |
| Diff check | `git diff --check` | 0 | pass_with_notes | No whitespace errors; Git reported existing LF/CRLF normalization warnings. |
| Portal typecheck/build | Not run | — | skip | Portal is out of scope and unchanged. |
| Functions build/deploy | Not run/deployed | — | skip | No Functions changes; no deployment authorized. |
| Rules/Storage Rules tests | Not run | — | skip | No Rules changes. |

## Implemented surfaces

### Workstream A

- Typed single-image export request/result and preload API in
  `packages/shared/src/types/export/showExportIpc.types.ts`.
- Dedicated direct-item filename helper in
  `packages/shared/src/utils/printRequestExportFilename.ts`.
- Additive `DOWNLOAD_EXPORT_IMAGE` channel, validation, preload bridge, handler, and
  `apps/studio/electron/services/export/exportSingleImage.ts`.
- Renderer `useDownloadPrintRequestItem` hook, page wiring, and per-item Download/busy/error UI.
- Existing source-aware request resolver and `downloadAndResizeExportImage` remain authoritative;
  ZIP, gang-sheet, quantity, cache, allocation, and lifecycle paths are bypassed.

### Workstream B

- Uploaded/Donated intake list selection responds to ArrowUp/ArrowDown across the current loaded
  filtered `intake.rows` (no wrap, no auto-load-more), with editable-target and modal/lightbox
  guards.
- Mistaken lightbox-only `enableVerticalNavigation` wiring was removed from
  `DesignPreviewLightbox` / intake; lightbox Left/Right/Escape/Previous/Next remain unchanged.

## Corrective work recorded

1. Studio typecheck caught missing `onDownload`/`downloadState` destructuring in
   `PrintRequestItemCard`; the props were wired and the final typecheck passed.
2. IPC validation test caught that unknown `quantity` input was accepted; validation now rejects
   quantity, allocation, and raw storage-path fields and the final focused suite passed.
3. Targeted lint caught a `no-control-regex` violation; the validator now checks control characters
   with character codes and targeted lint passed.
4. Owner DEV QA clarified Workstream B: ArrowUp/ArrowDown belong on the intake **list selection**,
   not the lightbox. Lightbox vertical aliases were removed; list keyboard selection was added.
   Lightbox open state was then hoisted to the intake section so Previous/Next no longer closes
   the lightbox when selection remounts the detail card.
5. Owner feedback: Print Request download success notice now uses shared `DismissibleSuccessAlert`
   (X + timeout).

## Manual Testing

| Test | Status | Notes |
|---|---|---|
| Studio Print Request per-item Download | pass | Owner DEV QA **PASS** on 2026-09-16; native save, pixel dimensions, saved-size change, source parity, quantity, dismissal, and failure handling accepted. |
| Studio Uploaded Designs ArrowUp/ArrowDown | pass | Owner DEV QA **PASS** on 2026-09-16; list selection, boundaries, editable-focus guard, and lightbox non-interference accepted. |
| Studio Donated Designs ArrowUp/ArrowDown | pass | Owner DEV QA **PASS** on 2026-09-16; `catalog_donation` list selection behavior accepted. |

Manual instructions: [Owner DEV QA checklist](2026-09-15-studio-pre-release-pr-item-download-and-intake-navigation-owner-dev-qa-checklist.md)

## Environment notes

- `npm run build:studio` completed successfully but electron-builder logged non-fatal Windows
  `EPERM` directory-rename retries and fell back to copy/delete.
- Vite logged existing chunk-size and dynamic-import placement warnings.
- No production, DEV Functions, Rules, Storage Rules, IAM, secret, external-service, migration,
  schema, index, or data-mutation action occurred.

## Expected promotion delta

Recorded for Signoff and added to the cumulative promotion manifest:

- Studio release: **REQUIRED**
- Portal App Hosting: **NONE**
- Functions: **NONE**
- Firestore Rules: **NONE**
- Storage Rules: **NONE**
- Indexes: **NONE**
- Migrations/backfills/data mutation: **NONE**

## Signoff Readiness

- [x] All required automated checks pass or are honestly documented.
- [x] Manual tests complete — Owner DEV QA **PASS** on 2026-09-16.
- [x] Ready for Signoff phase.

**Next step:** Signoff and reviewed commit/push on `development`.
