# Test report: Smart contextual print-request quota errors + Cap A create gate

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-smart-contextual-print-request-quota-errors-plan.md |
| Review | docs/workflow/reviews/2026-07-18-smart-contextual-print-request-quota-errors-review.md |
| Environment | local Portal + fresh-prints-dev Functions |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (A1/A2/A3 + Cap B copy + Cap A helpers) | `npx tsx --test packages/shared/src/utils/printRequestQuotaUserCopy.test.ts packages/shared/src/utils/printRequestDailyDesignLimit.test.ts packages/shared/src/utils/printRequestPerShowCustomerCap.test.ts` | 0 | **21/21 PASS** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | **PASS** |
| Functions build | `npm run build` (functions) | 0 | **PASS** |

---

## Deploy (fresh-prints-dev only)

```text
firebase deploy --only functions:createPortalPrintRequest,functions:addPortalCatalogDesignToPrintRequest,functions:updatePortalPrintRequestItemQuantity,functions:duplicatePortalPrintRequestItem,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest,functions:queuePortalPrintRequestToShow,functions:removePortalPrintRequestItem,functions:clearPortalWorkingPrintRequest --project fresh-prints-dev
```

Exit **0** — all listed Functions updated successfully.

---

## Soft-reload

- Portal `dev:portal` restarted on port **3100** after UI/CSS changes.

---

## Manual

See owner matrix: `docs/workflow/reviews/2026-07-18-smart-contextual-print-request-quota-errors-manual-qa.md`

---

## Notes

- No Firestore rules change in this phase.
- Production deploy out of scope.
- Cap A situation heuristic: `used > workingPrintCount` ⇒ partially queued (A2).
