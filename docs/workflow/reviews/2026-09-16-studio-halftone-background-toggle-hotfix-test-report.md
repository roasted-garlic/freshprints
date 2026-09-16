# Test Report: Studio Halftone Background Toggle Hotfix

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-09-16-studio-halftone-background-toggle-hotfix-plan.md` |
| Review | `docs/workflow/reviews/2026-09-16-studio-halftone-background-toggle-hotfix-review.md` |
| Overall | **passed_with_notes** |

## Verified behavior

- Import session Halftone changes seed `All dark`/`Auto` session backgrounds.
- Single and batch item Halftone changes seed `dark`/`auto` item background overrides.
- Customer Upload Intake synchronizes the persisted light-black/default background, optimistic row state, failure latch, and retry path.
- AI Review updates the preview immediately and persists Halftone plus its paired background in one design update.
- Design Edit seeds `lightBlack`/`grey` in the form; the separate Artwork Background field remains editable afterward.
- Print Requests keeps the rail mounted while changing selections; exact-ID detail readiness prevents a
  second or later rail click from being treated as stale and bounced back by route canonicalization.
- Existing explicit background precedence tests remain green, including explicit Light while Halftone is on.

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Focused hotfix/shared contracts | `npx tsx --test apps/studio/src/renderer/src/features/imports/hooks/halftoneBackgroundToggle.contract.test.ts apps/studio/src/renderer/src/features/imports/components/importSessionSettingsModal.workstream-b-ui.test.ts apps/studio/src/renderer/src/features/customer-uploads/components/customerUploadIntakePreviewControls.workstream-c.test.ts apps/studio/src/renderer/src/features/customer-uploads/hooks/setHalftoneDecisionPendingClear.contract.test.ts apps/studio/src/renderer/src/features/ai-review/components/aiReviewHalftoneBackground.contract.test.ts apps/studio/src/renderer/src/features/designs/components/designHalftoneBackground.contract.test.ts packages/shared/src/utils/resolveImportArtworkBackgroundDecision.test.ts` | **50/50 pass** |
| Print Request selection/navigation contracts | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/utils/printRequestSelectionNavigation.contract.test.ts apps/studio/src/renderer/src/features/print-requests/constants/printRequestRoutes.test.ts apps/studio/src/renderer/src/features/print-requests/hooks/usePrintRequestDetails.liveSync.contract.test.ts` | **19/19 pass** |
| Studio typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit` | **pass** |
| Targeted ESLint | `npx eslint` over all changed Studio TS/TSX/test files | **pass** |
| Canonical release lint | `npm run lint:release` | **pass** — current 15, baseline 25, new 0 |
| Studio package build | `npm run build --workspace @fresh-prints/studio` | **pass** — renderer, Electron bundles, and Windows package built |
| Diff whitespace | `git diff --check` | **pass** |

## Broader regression notes

The directory-wide sweeps were run for context but are not part of the hotfix acceptance count. They reported unrelated existing contract drift:

- Imports: 27/28, with the existing batch-session contract still expecting the retired `CANONICAL_HALFTONE_TAG` declaration.
- Customer Uploads: 49/50, with the existing shared-intake contract expecting one `DangerOverflowMenu` while the current source contains two.
- AI Review: 244/254, with failures in existing queue-selection, draft-state, rerun-session, and scroll-wiring contracts outside the hotfix behavior.
- Designs: 295/301, with failures in existing companion-placement, managed-search, and preview-navigation contracts outside the hotfix behavior.
- Print Requests directory sweep: **194/198 pass**. The four failures are pre-existing and outside this
  addition: three oversized-selection expected-value failures (`10.5` versus the stale `11` expectation),
  and one Show ZIP persistence-barrier contract still expecting the retired `resolveQueuedPrintInches`
  wiring. The selection/navigation contracts above pass.

No hotfix-focused test failed. These unrelated contract failures were not waived or changed.

## Scope verification

The runtime change is Studio client-only. No Functions, Rules, indexes, Portal App Hosting, IAM, schema, migration, secret, or production-data files were changed. No merge to production, Studio release publication, or deployment was performed.
