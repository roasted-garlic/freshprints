# Test report: Cap B one request ↔ one show + auto remainder

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-19-cap-b-one-request-per-show-remainder-plan.md |
| Review | docs/workflow/reviews/2026-07-19-cap-b-one-request-per-show-remainder-review.md |
| Status | pending_manual |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit | `npx tsx --test packages/shared/src/utils/portalCapBRemainderSplit.test.ts packages/shared/src/utils/portalShowQueueFit.test.ts packages/shared/src/utils/printRequestWorkingRequestMax.test.ts packages/shared/src/utils/printRequestDailyDesignLimit.test.ts functions/src/lib/queuePortalPrintRequestToShowValidation.test.ts` | **pass** (36/36) |
| Functions build | `cd functions && npm run build` | **pass** |
| Deploy | `firebase deploy --only functions:queuePortalPrintRequestToShow,functions:addPortalCatalogDesignToPrintRequest,functions:updatePortalPrintRequestItemQuantity,functions:duplicatePortalPrintRequestItem,functions:confirmCustomerUploadsAndAttachToRequest,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev` | **pass** |

### Unit coverage notes

- `planPortalCapBRemainderSplit`: 50 → choose 12+13 = 25 queued / 25 remainder; full-line move; over-budget clamp.
- Validation accepts selections; rejects empty / non-positive.
- Help + request-full copy updated for Cap A max + per-show auto remainder.

---

## Deploy

- Project: `fresh-prints-dev`
- Callables updated successfully (queue + add/qty/duplicate/upload/assisted for Cap A working max).
- Production: **not** deployed.

---

## Manual QA

See `docs/workflow/reviews/2026-07-19-cap-b-one-request-per-show-remainder-manual-qa.md`.

Awaiting owner: soft-reload Portal → Cap B 25+25 → choose 12+13 for show 1 → land on request 2.
