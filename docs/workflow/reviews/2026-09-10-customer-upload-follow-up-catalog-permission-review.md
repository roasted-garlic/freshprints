# Customer Upload Follow-up Catalog Permission — Formal Review

| Field | Value |
|---|---|
| Goal | `customer-upload-follow-up-catalog-permission` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Reviewed Plan | `docs/workflow/plans/2026-09-10-customer-upload-follow-up-catalog-permission-plan.md` |
| Review date | 2026-09-10 |
| Review phase | Formal Review (no implementation authorized) |
| Verdict | **`approved_with_changes` — owner acceptance required before Implement** |
| Candidate disposition | `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` remains provisional and must not be frozen |

## Review basis

The reviewed design was reconciled against the actual source, not only the handoff text:

* `customerUploadCatalogConfirmation.ts` currently writes `not_eligible` for both true and false
  print-request/Assisted confirmation values.
* `shouldAdvanceCustomerUploadToStaffReview` and
  `isCustomerUploadEligibleForCatalogIntake` prevent explicit false from entering Pending.
* `excludeCustomerUploadFromCatalog` writes no reason, while
  `restoreCustomerUploadCatalogEligibility` currently restores any eligible excluded row without
  a permission check.
* `promoteCustomerUploadToAiReview` already rejects explicit false, but has no representation of a
  later approved follow-up.
* Request artwork and catalog lifecycles are separate; existing print-request asset resolution
  ignores catalog review status.
* Portal Alerts are private to `customerUid` through `customerNotifications`; their current
  shared kind/DTO requires an additive kind and a token-capable deep link for this action.
* Firestore Rules deny direct `customerUploads` writes and customer notification creation; customer
  notification updates are limited to read-state fields. This is the correct server-authoritative
  boundary to preserve.

## Review verdict and required changes

The narrow feature is architecturally suitable for the parent pre-freeze window, but the Plan is
approved only with the following changes locked into implementation:

1. **Amend ADR-FP-074 before code is signed off.** The active rule becomes original false =
   print-only + `excluded_from_catalog` for authenticated print-request uploads; only one explicit
   customer follow-up approval can return the upload to Pending. The old “staff may promote false”
   sentence is historical and must be superseded, not silently ignored.
2. **Persist origin and follow-up state additively.** Do not overwrite
   `catalogUseAcknowledged=false`, `termsVersion`, or original confirmation evidence. Use the
   typed exclusion reason, follow-up status, original-denial timestamp, opaque request token, and
   server actor/time fields in the reviewed Plan. Missing fields on legacy docs must be handled
   safely as `not_requested`.
3. **Use an opaque token, never an upload ID, in the Alert URL/DTO.** The token is stored on the
   upload only as a lookup handle; every customer callable must verify Auth UID, customer/request
   linkage, current state, and one-time status in a transaction. Return only safe artwork context
   and a server-generated/approved preview mechanism.
4. **Use the existing `customerNotifications` path.** Add one notification kind and optional
   `actionToken`; retain existing subscription/history/read behavior and optional push. Alert
   creation must remain idempotent and must not become a second notification subsystem.
5. **Keep donations out of v1.** The anonymous catalog-donation path uses `printRequestId: null`
   and has no proven authenticated Portal recipient. Do not invent identity linkage or change
   donation confirmation semantics.
6. **Enforce restore and promotion server-side.** Permission-denied exclusions cannot be restored
   by generic staff restore. A follow-up Allow transaction itself sets Pending; generic restore may
   only retain its existing path for `staff_review`. Promotion must accept original true/legacy
   missing consent or follow-up approved, and must reject false/unrequested/declined.
7. **No automatic catalog side effects.** Allow changes only the upload state/audit and does not
   create a Design, enqueue AI, publish, or alter the customer's Print Request.
8. **Maintenance inventory is mandatory.** The new customer response callable must call
   `assertPortalMaintenanceAllowsCustomerMutation` before mutation and be included in the parent
   guard-bearing source/export/closure manifests. A read-only context callable must not leak
   private identifiers.
9. **No migration/backfill in this child.** Newly confirmed denials become Excluded. Legacy rows
   with `not_eligible` + false remain safely blocked from Pending/promotion; any historical
   reconciliation requires a separately reviewed data operation.

## Approved transition contract

The following is the implementation contract. Any deviation returns to Review:

| Event | Required result |
|---|---|
| Initial YES | Existing `not_eligible` → Pending timing and request behavior remain unchanged. |
| Initial NO | Request remains usable; catalog status becomes Excluded with reason `customer_permission_denied`; original false remains. |
| Allocation/queue after NO | No catalog transition. |
| Staff exclusion for another reason | Excluded + `staff_review`; existing generic Restore remains available. |
| Ask again | Only permission-denied + not-requested + linked authenticated print request; one transactionally recorded token and one idempotent Alert. |
| Open Alert | Owner-only safe context by token; no upload ID/path in URL/DTO. |
| Allow | Owner + maintenance check; preserve original denial; mark follow-up approved; set Excluded → Pending; no Design/AI/publish. |
| Decline | Owner + maintenance check; preserve Excluded/reason; mark follow-up declined; no third request in v1. |
| Generic Restore on permission denial | Rejected unless the customer already approved; it cannot itself grant consent. |
| Promote | Current permission required; unapproved false remains fail-closed. |
| Own Print Request | Unaffected by all catalog-consent states. |

## Function/API review

The expected trusted boundaries are:

* `requestCustomerUploadCatalogPermissionFollowUp` (staff mutation, idempotent transaction + Alert)
* `getCustomerUploadCatalogPermissionFollowUp` (customer read, safe context only)
* `respondToCustomerUploadCatalogPermissionFollowUp` (customer Allow/Decline mutation, maintenance
  guarded transaction)

Names are provisional until exact implementation naming is confirmed, but the authority and
semantics are not. The existing exclude/restore/promote/confirmation functions must be amended in
place so there is one eligibility rule, not parallel consent logic.

## UI review

**Studio:** Customer Uploads Excluded rows must display the denial reason and follow-up state; show
**Ask for permission again** only while the request is openable; remove/disable generic Restore for
permission-denied rows. Ordinary staff-excluded restore and all reversible/technical actions remain.

**Portal:** The existing `/requests/artwork` deep-link surface (or the smallest shared modal host
consistent with the current routing) opens a focus-managed modal with artwork context, the message
that the existing Print Request is unaffected, and explicit Allow/Decline actions. The modal must
handle loading, stale/resolved token, maintenance refusal, and retry states using existing Portal
modal/accessibility primitives and styling.

## Security and Rules review

The proposal preserves the current strongest boundaries:

* no client creates or edits `customerUploads` or creates notifications;
* clients can only mark their own notification read state;
* Functions verify staff permission or the exact authenticated customer UID;
* the opaque token is not an authorization grant and is useless to another customer;
* Firestore transaction rechecks state to prevent replay/race promotion;
* no public route or DTO contains upload IDs, Storage paths, or private artwork metadata beyond the
  safe modal context;
* maintenance ON/unknown blocks customer mutation before the Allow/Decline write.

If implementation adds a Firestore Rules field allowlist, it must be narrow and client-immutable.
No new composite index or Storage Rules deployment is expected; prove this during Test rather than
assuming it.

## Test gate required after owner acceptance

Implementation/Test must provide evidence for all 13 acceptance criteria in the Plan, including:

* shared state/eligibility and notification token contracts;
* Functions transaction/idempotency, wrong-customer, replay, restore, promotion, maintenance,
  and Print Request-independence tests;
* Portal Alert/history/modal and no-private-ID DTO tests;
* Studio reason/state/action visibility tests;
* Rules regression if Rules change;
* Functions build, Portal validation, Studio focused validation, targeted lint, and
  `git diff --check`;
* the existing unrelated Studio typecheck baseline documented separately if still present.

No Owner QA is performed by this review. No deploy, publish, data mutation, commit, push, or
candidate freeze is authorized.

## Parent release-candidate disposition

The current assembled SHA is explicitly provisional. After this child reaches Signoff, parent M0
must include the new runtime paths, regenerate the Function closure/maintenance inventory and all
affected manifests, and assemble a new reviewed development SHA before presenting an M1 freeze
proposal. If runtime scope or rules/index behavior differs materially from this review, stop and
return to Review.

## Exact next owner decision

`OWNER ACCEPT PLAN AND FORMAL REVIEW FOR customer-upload-follow-up-catalog-permission — AUTHORIZE IMPLEMENT → TEST; DO NOT FREEZE CANDIDATE`

Until that exact decision (or an equivalent explicit approval) is received, the managed phase is
blocked at the Formal Review gate.
