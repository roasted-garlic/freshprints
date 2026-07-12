# Test Report: Portal upload limits, speed, confirmations, DPI (r7)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Plan | docs/workflow/plans/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-plan.md |
| Status | **passed_with_notes** — automated green; manual UI checkpoint required |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| Shared unit | `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts packages/shared/src/utils/customerUploadTransparency.test.ts` | 0 | 9/9 pass |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Dev deploy | `firebase deploy --only storage,functions:createCustomerUploadBatch,finalizeCustomerUpload,finalizeCustomerUploadZip,confirmCustomerUploadsAndAttachToRequest,retryCustomerUploadProcessing,promoteCustomerUploadToAiReview --project fresh-prints-dev` | 0 | Storage rules + 6 functions updated |

## Skipped / Notes

- Full monorepo lint / Studio tsc / Portal build not re-run (narrow remediations; portal typecheck + functions build cover primary surfaces).
- Live smoke scripts (c–f) not re-run this session — TERMS bumped to v2; recommend owner manual Portal/Studio check instead of full smoke suite unless regressions appear.

## Manual Checkpoint

See `docs/workflow/reviews/2026-07-12-portal-upload-limits-speed-confirmations-dpi-r7-manual-checkpoint.md`
