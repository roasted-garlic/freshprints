# Test Report: Local Gang Sheet Generate → Preview → Export

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Plan | docs/workflow/plans/2026-07-10-gang-sheet-local-generate-plan.md |
| Status | **passed_with_notes** — automated PASS; manual UI QA outstanding |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit tests (filename + fingerprint) | `npx tsx --test packages/shared/src/utils/showExportFilename.test.ts packages/shared/src/utils/gangSheetCacheFingerprint.test.ts` | **PASS** 27/27 |
| Lint | `npm run lint` | **PASS** (0 findings in changed files) |
| Studio typecheck | `npx tsc --noEmit` (apps/studio) | **PASS for this change** — no errors in gang-sheet/export files. Pre-existing unrelated errors remain in staff-inbox / userAuditTrail files |

## Manual (required before signoff)

- [ ] Generate on a show with **2+ sheets**; confirm count + lengths in modal
- [ ] Filenames include length; Download one / Export all produce correct files
- [ ] Change allocation or settings → cache stale → must regenerate
- [ ] Past show clears cache / Export disabled appropriately
- [ ] Warnings still surface; cancel save dialogs leave cache intact

## Notes

- Generated PNGs live under Electron `userData/gang-sheet-cache/` only (ADR-FP-070).
- Show Queue button label switches between **Generate Gang Sheet** and **Export Gang Sheets** when a valid cache exists for the current fingerprint.
