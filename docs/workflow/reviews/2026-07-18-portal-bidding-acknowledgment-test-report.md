# Test Report: Portal bidding acknowledgment

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-bidding-acknowledgment-plan.md |
| Status | passed_with_notes |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit (copy + validations) | `npx tsx --test packages/shared/src/utils/portalBiddingAcknowledgmentCopy.test.ts functions/src/lib/queuePortalPrintRequestToShowValidation.test.ts functions/src/lib/registerCustomerValidation.test.ts` | PASS (13/13) — re-run after v2 copy 2026-07-18 |
| Functions build | `npm --prefix functions run build` | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | PASS |

## Deploy

| Target | Command | Result |
|--------|---------|--------|
| fresh-prints-dev | `firebase deploy --only functions:registerCustomer,functions:queuePortalPrintRequestToShow --project fresh-prints-dev` | PASS |

## Notes

- No production deploy.
- Manual UI QA required (see manual QA doc).
- Firestore rules unchanged (Admin writes only to `users` / `printRequests` ack fields).
