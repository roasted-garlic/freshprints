# Test Report: Portal Customer Artwork Upload — Sub-phase A

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Plan | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-subphase-a-plan.md` |
| Status | **passed_with_notes** |

---

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Unit | `npx tsx --test packages/shared/src/utils/customerUploadTransparency.test.ts packages/shared/src/utils/printRequestItemSource.test.ts packages/shared/src/constants/customerUpload/customerUploadStoragePaths.test.ts` | **PASS** 13/13 |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **PASS** |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | **FAIL** — pre-existing errors in `StaffInboxBell.tsx` and `userAuditTrailActivityService.ts` (unrelated to Sub-phase A files) |

---

## Notes

- No Functions/rules/Portal UI changes in this sub-phase.
- Studio typecheck failures are outside A scope; do not block A shared-contracts land. Track separately if needed.
