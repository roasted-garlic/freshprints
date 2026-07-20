# Signoff: Portal bidding acknowledgment

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-18-portal-bidding-acknowledgment-plan.md |
| Review | docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-review.md |
| Test report | docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-test-report.md |
| Manual QA | docs/workflow/reviews/2026-07-18-portal-bidding-acknowledgment-manual-qa.md |
| Status | **approved** |

---

## Delivered

### Modal location

- Shared: `apps/portal/features/shared/components/PortalBiddingAcknowledgmentModal.tsx`
- Signup: `RegisterForm.tsx` (email) + `CompleteProfileForm.tsx` (Google) — **after form submit, before Auth/Firestore create / registerCustomer**
- Queue: `PortalQueueToShowModal.tsx` — after show selected + **Add to show**, before `queuePortalPrintRequestToShow`

### Fields stored

| Where | Fields |
|-------|--------|
| `users/{uid}.portalBiddingAcknowledgments.signup` | `acceptedAt`, `version`, `source: "signup"` |
| `users/{uid}.portalBiddingAcknowledgments.lastQueueToShow` | `acceptedAt`, `version`, `source: "queue_to_show"`, `printRequestId`, `upcomingShowId` |
| `printRequests/{id}.showQueueBiddingAcknowledgment` | `accepted: true`, `acceptedAt`, `acceptedByUid`, `version`, `upcomingShowId` |

Version constant: `portal-bidding-ack-v3` (owner copy revision: exclusive gang-sheet paragraph + funkyfreshprints.com link).

### Deploy

- `registerCustomer` + `queuePortalPrintRequestToShow` → **fresh-prints-dev** (redeployed for v3)
- Portal soft-reload on port 3100
- No production; no rules deploy (Admin-only writes)

### Automated tests

- Shared unit tests for bidding ack copy/version (`portal-bidding-ack-v3`); prior Functions build / Portal typecheck as recorded in test report

---

## Manual tests

- Requested: see manual QA doc  
- Completed: **2026-07-19**  
- Result: **PASS** (owner) — Request Portal Acknowledgment + Add to Show Print Run v3

## Human approvals

- Dev Functions deploy: per owner ask  
- Production: not requested  
- Design / UX: owner PASS 2026-07-19

## Open follow-ups

- None for bidding acknowledgment  
- Cap B allotment bug remains a separate active managed phase
