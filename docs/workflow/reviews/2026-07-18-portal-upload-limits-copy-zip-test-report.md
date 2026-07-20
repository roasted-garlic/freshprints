# Test Report: Portal upload limits layout / copy / ZIP alignment

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-upload-limits-copy-zip-plan.md |
| Status | **passed** — automated + owner manual QA **PASS** 2026-07-18 |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Limits + format + storage alignment + quota helpers | `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts packages/shared/src/constants/customerUpload/customerUploadLimits.constants.test.ts apps/portal/features/customer-uploads/utils/formatCustomerUploadDailyQuota.test.ts functions/src/lib/customerUploadDailyQuota.test.ts` | 0 | pass (13 tests) |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |

Skipped: full lint / full portal build; storage rules unchanged (2 GB ceiling) so storage deploy not required.

---

## Deploy (fresh-prints-dev only)

```bash
firebase deploy --only functions:createCustomerUploadBatch,functions:finalizeCustomerUploadZip,functions:getCustomerUploadDailyQuota --project fresh-prints-dev
```

Exit 0. Updated create/finalize ZIP + daily quota callable. **No storage redeploy** (ceiling unchanged). **No production.**

---

## Manual

**PASS** (owner 2026-07-18) — see `docs/workflow/reviews/2026-07-18-portal-upload-limits-copy-zip-manual-qa.md`. Includes Choose files title removal residual.
