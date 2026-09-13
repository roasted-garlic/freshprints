# Customer Upload Follow-up Catalog Permission — Implementation Review

| Field | Value |
|---|---|
| Goal | `customer-upload-follow-up-catalog-permission` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Plan / Formal Review | accepted `approved_with_changes` |
| Implementation date | 2026-09-10 |
| Production / deploy | none; not authorized |

## Implemented contract

The reviewed additive state model is implemented on `customerUploads`. An authenticated
print-request denial now remains usable by the customer's Print Request but is
`excluded_from_catalog` with reason `customer_permission_denied`; the original
`catalogUseAcknowledged: false`, terms, and confirmation evidence are preserved. Missing follow-up
state reads as `not_requested`. A previous follow-up approval survives re-attachment.

The shared eligibility helper accepts original true/legacy-missing consent or original false with
follow-up status `approved`. Allocation/queue behavior remains independent and no automatic Design,
AI, publish, or request mutation is added.

## Trusted boundaries

* `requestCustomerUploadCatalogPermissionFollowUp` is active-staff-only, transactionally records one
  cryptographically random base64url token, and creates one idempotent `customerNotifications` Alert.
* `getCustomerUploadCatalogPermissionFollowUp` requires the authenticated owning Portal customer and
  returns only filename, request display context, and a short-lived signed preview URL.
* `respondToCustomerUploadCatalogPermissionFollowUp` requires the owning customer, calls
  `assertPortalMaintenanceAllowsCustomerMutation` before mutation, and transactionally applies one
  Allow or Decline. Replay with the same decision is idempotent; conflicting or wrong-customer
  responses fail closed. Allow sets Pending; Decline remains Excluded; neither creates catalog work.
* Generic staff Restore is rejected for permission-denied exclusions unless the customer has already
  approved. Ordinary `staff_review` exclusions retain Restore. Promotion uses the shared current-
  permission guard.

No Firestore or Storage Rules change and no new index/collection is required. Existing notification
  read/update restrictions remain authoritative.

## Client implementation

Portal Alerts gained the additive kind/action token and `/requests/artwork?permissionRequest=<token>`
deep link. The request-artwork page mounts a styled loading/error/already-resolved/Allow/Decline
modal; closing removes the token from the visible route. Studio Excluded permission-denied rows show
the reason and follow-up state, expose **Ask for permission again** only for `not_requested`, and do
not show generic Restore. Ordinary staff exclusions and existing reversible/technical actions are
unchanged.

## Documentation

ADR-FP-074 is amended (historical promotion sentence retained as history), and the durable customer
upload data model and backend callable inventory now describe the follow-up state and boundaries.

## Scope confirmation

No production project, deployment, publication, maintenance setting, customer/account mutation,
migration, backfill, commit, push, or candidate freeze was performed. Pre-existing maintenance
public-read work remains uncommitted and was not absorbed into this child disposition.
