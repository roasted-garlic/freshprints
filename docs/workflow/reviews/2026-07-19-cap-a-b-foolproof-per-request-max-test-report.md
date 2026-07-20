# Test report: Cap A / Cap B foolproof per-request max

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-19-cap-a-b-foolproof-per-request-max-plan.md |
| Status | **partial** — automated PASS; manual QA pending |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Unit (working max + Cap A copy + help) | `npx tsx --test packages/shared/src/utils/printRequestWorkingRequestMax.test.ts packages/shared/src/utils/printRequestQuotaUserCopy.test.ts packages/shared/src/utils/printRequestDailyDesignLimit.test.ts` | 0 | **21/21 PASS** |
| Functions build | `npm run build` (functions) | 0 | **PASS** |

## Deploy (`fresh-prints-dev` only)

Deployed:

- `addPortalCatalogDesignToPrintRequest`
- `updatePortalPrintRequestItemQuantity`
- `duplicatePortalPrintRequestItem`
- `confirmCustomerUploadsAndAttachToRequest`
- `customerAddAssistedApprovedProofToPrintRequest`
- `getPrintRequestDailyDesignQuota`

Reject marker: `per-request-max-v1`

## Manual

See `docs/workflow/reviews/2026-07-19-cap-a-b-foolproof-per-request-max-manual-qa.md`.

**Soft-reload Portal** before QA.

## Skipped

| Check | Why |
|-------|-----|
| Full portal typecheck / lint / e2e | Not required for this scoped fix; unit + Functions build + owner manual UI |
| Production deploy | Out of scope |

## Notes

- False "Daily print limit" at 26: Cap A optimistic baseline hydrate race + missing per-request max.
- Clear still refunds Cap A (unchanged).
