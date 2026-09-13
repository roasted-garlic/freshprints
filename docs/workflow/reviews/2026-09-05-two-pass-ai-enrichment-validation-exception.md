# Two-Pass AI Enrichment — Validation Exception

## Status

`ACCEPTED PRE-EXISTING VALIDATION EXCEPTION`

Checkpoint baseline: `5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`

## Evidence

The following failures were observed in the broader Studio/shared typecheck and are unchanged from the checkpoint baseline. `git diff 5712b51d..HEAD` contains no changes to these files, and the approved AI-enrichment delta does not own them:

- `apps/studio/electron/ipc/import/pngValidator.ts:289` — `PersistedArtworkUpscalePassCount` is not assignable to `0 | 1 | undefined`.
- `apps/studio/electron/services/export/composeContinuousCustomerGroupedGangSheetSheets.test.ts:127,143,176,209` — fixtures omit required `printWidthInches` and `printHeightInches`.
- `apps/studio/src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts:554-555` — nullable `design` access.
- `apps/studio/src/renderer/src/features/designs/utils/companionSetHelpers.ts:96` — missing `CompanionSetStatusLabel`.
- `apps/studio/src/renderer/src/features/print-requests/services/enhancePrintRequestArtworkService.ts:14` and `setPrintRequestItemArtworkEnhanceModeService.ts:17` — unsupported `feature` trace metadata property.
- `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx:160` — unused `current`.
- `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxAlertDeliveryService.ts:2` and `staffInboxSuppressionService.ts:5` — unused imports.
- Existing shared tests contain unrelated fixture/type mismatches in `explicitContentAutomation.test.ts`, `manualArtworkEnhance.test.ts`, `printRequestItemSource.test.ts`, `showProductionRecovery*.test.ts`, and related files.

## Scope decision

These failures are not repaired in the two-pass AI enrichment workstream. Scoped Functions builds/tests and AI-enrichment shared tests remain required and are reported separately in the Implementation Review.
