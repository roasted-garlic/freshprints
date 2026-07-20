# Test Report: Print request & show design caps

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-print-request-show-caps-plan.md |
| Review | docs/workflow/reviews/2026-07-18-print-request-show-caps-review.md |
| Status | **partial** — automated PASS; Cap A print-count + refunds shipped to `fresh-prints-dev`; awaiting owner re-test |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (Cap A print-count/refund/copy, Cap B, settings, rules, wipe) | `npx tsx --test packages/shared/src/utils/printRequestDailyDesignLimit.test.ts packages/shared/src/utils/printRequestPerShowCustomerCap.test.ts packages/shared/src/constants/printRequest/printRequestLimitSettings.constants.test.ts packages/shared/src/constants/printRequest/printRequestLimitSettingsRulesAlignment.test.ts packages/shared/src/utils/operationalWipeTargets.test.ts` | 0 | **36/36 PASS** |
| Functions build | `npm --prefix functions run build` (predeploy) | 0 | PASS |

### Notes

- Cap A now charges/refunds by `item.quantity` (print copies). Refund floors at 0.
- Banner/help copy uses “prints”; warning tone when remaining ≤ max(5, 20% of limit).
- Rules: customers cannot change quantity or delete `printRequestItems` (callables only).
- Chicago day-key fixture covers CDT midnight boundary.

### Skipped (this phase)

- Full monorepo lint / Portal+Studio typecheck (not blocking soft deploy; Functions build + focused unit tests run)
- E2E / integration against live Firebase (covered by manual QA)

---

## Deploy (`fresh-prints-dev`)

```text
firebase deploy --only functions:addPortalCatalogDesignToPrintRequest,functions:duplicatePortalPrintRequestItem,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:updatePortalPrintRequestItemQuantity,functions:removePortalPrintRequestItem,functions:clearPortalWorkingPrintRequest,functions:getPrintRequestDailyDesignQuota,firestore:rules --project fresh-prints-dev
```

Result: **success** (new qty + remove callables created; others updated; rules released). No production.

---

## Manual

See `docs/workflow/reviews/2026-07-18-print-request-show-caps-manual-qa.md`. Soft-reload Studio + Portal. Wipe Cap A once after this deploy.
