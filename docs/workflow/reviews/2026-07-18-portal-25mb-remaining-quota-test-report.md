# Test Report: Portal 25 MB + remaining daily quota

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-25mb-remaining-quota-plan.md |
| Status | **passed** — automated + owner manual QA **PASS** 2026-07-18 |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Storage alignment + format util | `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts apps/portal/features/customer-uploads/utils/formatCustomerUploadDailyQuota.test.ts` | 0 | pass (4 tests) |
| Daily quota helpers | `npx tsx --test functions/src/lib/customerUploadDailyQuota.test.ts functions/src/lib/customerUploadRateLimit.test.ts` | 0 | pass (9 tests) |
| Functions build | `npm --prefix functions run build` | 0 | pass |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |

Skipped: full lint / full portal build (not required for this narrow change; typecheck covers Portal TS).

---

## Deploy (fresh-prints-dev only)

```bash
firebase deploy --only storage,functions:createCustomerUploadBatch,functions:finalizeCustomerUpload,functions:finalizeCustomerUploadZip,functions:retryCustomerUploadProcessing,functions:getCustomerUploadDailyQuota --project fresh-prints-dev
```

Exit 0. Storage rules released; `getCustomerUploadDailyQuota` created; create/finalize/retry updated. **No production.**

---

## Manual

**PASS** (owner 2026-07-18) — see `docs/workflow/reviews/2026-07-18-portal-25mb-remaining-quota-manual-qa.md`.
