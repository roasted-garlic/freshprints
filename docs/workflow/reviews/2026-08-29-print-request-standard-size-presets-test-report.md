# Test Report — Print Request Standard Size Presets

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `print-request-standard-size-presets` |
| Status | **passed_with_notes** |

---

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Shared preset apply | `npx tsx --test packages/shared/src/utils/applyStandardPrintSizePreset.test.ts` | **pass** (3 tests) |
| Settings parse/resolve | `npx tsx --test packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts packages/shared/src/constants/printSize/standardPrintSizesSettingsRulesAlignment.test.ts` | **pass** (10 tests) |
| Manual sizing regression | `npx tsx --test packages/shared/src/utils/printRequestItemSizing.test.ts apps/studio/src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts functions/src/lib/assertQueuePrintRequestItemSize.test.ts` | **pass** (28 tests) |
| Diff whitespace | `git diff --check` | **pass** |
| Rules emulator | `tests/firebase/printRequestItemResize.rules.test.ts` | **pass** (9/9, 2026-08-29 pre-deploy; Java 21 portable JRE) |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | **failed_documented** — pre-existing errors in unrelated features (ai-review, customer-uploads, upcoming-shows, etc.) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **failed_documented** — pre-existing errors in `portalShowDiscoveryContent.ts`; fixed `portalStandardPrintSizesService.ts` trace arg order in this pass |
| Repo lint | `npm run lint` | **not run** — full-repo lint not executed in this session |

---

## Totals (executed)

- **41 tests passed**, 0 failed across 4 command groups.

---

## Notes

- Added `validateRawStandardPrintSizesSettingsInput` so `parseStandardPrintSizesSettingsInput` rejects structural edits (empty groups).
- Firestore rules emulator extension for `standardSizePresetKey` is in source; run locally with emulator before DEV deploy signoff.
- Manual UI QA (Standard Sizes modal, Settings tab, title truncation) still required before production.

---

## DEV Firebase deploy scope (checkpoint — **deployed 2026-08-29**)

Deployed to **fresh-prints-dev** only (see `2026-08-29-print-request-standard-size-presets-dev-deploy-record.md`):

1. Firestore Rules ✓
2. `updateStandardPrintSizesSettings` ✓ (created)
3. `duplicatePortalPrintRequestItem` ✓ (updated)

**Next:** Owner manual QA — production still NOT authorized.
