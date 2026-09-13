# Customer Upload Follow-up Catalog Permission — Implementation Plan

| Field | Value |
|---|---|
| Goal | `customer-upload-follow-up-catalog-permission` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Phase | Plan → Formal Review only |
| Date | 2026-09-10 |
| Current candidate | `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d` (provisional; do not freeze) |
| Production | Not authorized; no production deployment, migration, backfill, or data operation |

## 1. Goal and release boundary

Add a second-chance catalog-permission workflow for an authenticated customer upload that was
originally denied Design Library permission. The upload remains usable in the customer's own
Print Request throughout. Only an explicit customer follow-up approval may return its catalog
lifecycle to `pending_staff_review`.

This artifact is the requested Plan. It intentionally stops before implementation. The parent
candidate must be reassembled after child Signoff; the current SHA is not a freeze candidate.

## 2. Repository architecture found

The repository is the documented two-application architecture:

* Fresh Prints Studio is the staff-only Electron/Vite renderer. Customer Uploads is an operational
  intake queue, separate from the three catalog workspaces.
* Fresh Prints Portal is the customer-only Next.js application. `/requests/artwork` owns the
  request-artwork upload flow and the Portal app shell already mounts the private Alerts provider.
* Firebase Auth, Firestore, Storage, and callable Cloud Functions are the shared backend. UI code
  follows Component → Hook → Service → Firebase/callable; business authorization remains in
  Functions and Rules.
* `customerUploads` stores metadata and Storage paths. `technicalStatus` is independent from
  `catalogReviewStatus`; a `printRequestItems` row with `sourceType: "customer_upload"` keeps
  request/production use independent from catalog promotion.
* Existing Portal Alerts use the `customerNotifications` collection, the shared notification-kind
  type/helpers, `createCustomerNotification` (Admin SDK, idempotent by notification document ID),
  the Portal notification subscription/history/deep-link provider, and optional web push. No new
  notification transport is needed.

Evidence inspected: `docs/architecture/ARCHITECTURE.md`, `docs/architecture/FIREBASE.md`,
`docs/architecture/DATA_MODEL.md`, `docs/standards/SECURITY.md`, `docs/WORKFLOWS.md`,
`docs/project/DECISIONS.md` (ADR-FP-073/074), the customer-upload Functions and Studio intake
services, and the Portal Alerts/customer-upload source.

## 3. Exact current behavior and the defect this phase addresses

Current source behavior is not yet the requested behavior:

1. `buildCatalogIntakeConfirmationPatch` in `functions/src/lib/customerUploadCatalogConfirmation.ts`
   writes `catalogUseAcknowledged` and sets `catalogReviewStatus` to `not_eligible` for a
   print-request attach or Assisted proof attach, regardless of whether the value is `true` or
   `false`. Donation confirmation uses the same helper with `submitForStaffReview: true` and
   requires `true` consent.
2. `shouldAdvanceCustomerUploadToStaffReview` first calls
   `isCustomerUploadEligibleForCatalogIntake`; explicit `false` therefore prevents the existing
   `not_eligible → pending_staff_review` transition on allocation or queueing. This protects
   promotion but leaves an initially denied upload outside both Studio Pending and Excluded tabs.
3. `excludeCustomerUploadFromCatalog` only allows a pending row to be excluded and currently
   writes only `catalogReviewStatus: "excluded_from_catalog"`; it does not persist a reason.
4. `restoreCustomerUploadCatalogEligibility` currently restores every non-promoted,
   non-purged excluded row to `pending_staff_review` without examining customer permission.
   Hiding a button in Studio alone would therefore be insufficient.
5. `promoteCustomerUploadToAiReview` already fails closed for
   `catalogUseAcknowledged === false`, but the shared eligibility helper currently treats only
   the original boolean (`false` = ineligible; `true`/missing = eligible). It cannot represent a
   later approved follow-up without an additive state model.
6. Print Request attachment and production asset resolution use the upload independently of
   catalog status. The existing resolver explicitly ignores `catalogReviewStatus`, so the
   requested catalog restriction can preserve the customer's own request.

This is an implementation/source mismatch, not a reason to mutate existing data in Plan/Review.
No migration or backfill is proposed in this child.

## 4. ADR-FP-074 conflict and amendment proposal

ADR-FP-074 currently says library permission is optional, persists
`catalogUseAcknowledged`, permits staff promotion when it is `false`, and requires Studio to show
the decline. The implemented promotion guard already contradicts the promotion sentence, and this
goal intentionally tightens the policy further.

Before implementation, amend ADR-FP-074 (and the customer-upload portion of ADR-FP-073/data-model
documentation) as follows:

1. Ownership remains required for Print Request attachment. `catalogUseAcknowledged` is the
   immutable-origins field for the original customer answer; it is never changed from `false` by
   the follow-up workflow.
2. For authenticated print-request uploads, original `false` means request-use is allowed but
   catalog intake is `excluded_from_catalog` with reason `customer_permission_denied`.
3. A single staff-requested follow-up may create one actionable Portal Alert. A customer response
   is the only path from that reason back to Pending. A second decline is terminal for v1; there is
   no third prompt.
4. Staff-excluded rows with another reason retain the existing restore behavior. Staff restore
   cannot bypass customer permission.
5. Promotion requires a current valid catalog permission: original `true`/legacy-missing consent,
   or original `false` plus a recorded follow-up approval. It never auto-creates a Design, starts
   AI, or publishes the catalog.
6. Anonymous/guest catalog donations are outside this follow-up contract.

The amendment must be accepted before Implement. Historical ADR text remains audit history; the
amended rule is the active source of truth.

## 5. Proposed strongly typed state model

Keep the model additive and local to `customerUploads`; do not create a generic consent subsystem.
All new timestamps and actors are server-authored. Missing new fields on legacy documents resolve
to the compatibility value `not_requested`.

```ts
type CustomerUploadCatalogExclusionReason =
  | "staff_review"
  | "customer_permission_denied";

type CustomerUploadCatalogPermissionFollowUpStatus =
  | "not_requested"
  | "requested"
  | "approved"
  | "declined";
```

Add optional fields to the shared `CustomerUpload` type and its Studio row projection:

* `catalogExclusionReason?: CustomerUploadCatalogExclusionReason | null` — server-authored reason;
  initial denial is `customer_permission_denied`, ordinary staff exclusion is `staff_review`.
* `catalogPermissionFollowUpStatus?: CustomerUploadCatalogPermissionFollowUpStatus | null` —
  missing/null reads as `not_requested`.
* `catalogPermissionOriginalDeniedAt?: Timestamp | null` — written once when an authenticated
  print-request confirmation first records `false`; it is never overwritten by follow-up.
* `catalogPermissionFollowUpRequestToken?: string | null` — cryptographically random opaque token,
  written once for the follow-up and retained after resolution; it is not an upload ID. Only this
  opaque token may appear in the authenticated Alert deep link; no public route carries an upload ID
  or Storage path. It lets the trusted customer callable resolve the row and lets stale Alerts render
  an already-handled state.
* `catalogPermissionFollowUpRequestedAt?: Timestamp | null` and
  `catalogPermissionFollowUpRequestedBy?: string | null` — staff audit.
* `catalogPermissionFollowUpRespondedAt?: Timestamp | null` and
  `catalogPermissionFollowUpRespondedBy?: string | null` — customer audit; status records the
  decision (`approved` or `declined`).

The original `catalogUseAcknowledged: false`, original `termsVersion`, and original confirmation
evidence remain intact. The response callable must not write `catalogUseAcknowledged`,
`termsVersion`, or `confirmedAt`.

The token is an opaque lookup handle, not authorization. Every trusted callable re-checks the
authenticated owner, upload state, purpose, request linkage, and one-time status in a Firestore
transaction. The Portal DTO and URL contain no upload ID or Storage path.

## 6. State-transition table

| Entry / actor | Preconditions | Atomic writes | Result / forbidden effects |
|---|---|---|---|
| Initial authenticated print-request confirmation, permission **YES** | ownership confirmed; technically ready; normal print-request flow | Preserve existing confirmation; `catalogReviewStatus: "not_eligible"`, no denial reason; follow-up status remains `not_requested` | Existing allocation/queue transition later moves to Pending. No behavior change. |
| Initial authenticated print-request confirmation, permission **NO** | ownership confirmed; technically ready; valid print-request attachment | `catalogUseAcknowledged: false`; set `catalogReviewStatus: "excluded_from_catalog"`; set reason `customer_permission_denied`; set original-denial timestamp once. A never-confirmed row starts follow-up status `not_requested`; an existing approved/declined follow-up is never reset. | Request item remains usable. No Pending row, Design, AI, publication, or notification is created automatically. |
| Existing allocation/queue transition, permission **NO** | upload is excluded or legacy `not_eligible` with explicit false | No catalog transition; request allocation remains independent | Cannot smuggle a denied row into Pending. |
| Staff excludes an eligible Pending row | staff intake permission; status Pending; no promoted design | Set status Excluded and reason `staff_review`; preserve original consent/follow-up fields | Existing staff exclusion behavior remains. |
| Staff asks again | owner/admin/helper with existing intake permission; `purpose` resolves to `print_request`; linked request/customer UID valid; status Excluded; reason `customer_permission_denied`; original consent false; follow-up status `not_requested` | In one transaction set status `requested`, token, requester/time. Then create one Alert with deterministic ID derived from the opaque token. Retries reuse the stored token and idempotent Alert write. | Exactly one actionable Alert. No upload or request mutation beyond audit fields. `approved`/`declined` rows reject the action. |
| Customer opens Alert | authenticated Portal customer; token resolves to an owned open request | Read callable returns safe context: filename, dimensions/print-request display context, server-generated preview URL or equivalent, current state | No upload ID, Storage path, or private raw record is returned. Resolved/invalid tokens render a safe already-handled/unavailable state. |
| Customer chooses **Allow** | maintenance guard permits mutation; Auth UID matches stored customer UID; token open; upload still Excluded for permission denial; not promoted/purged | Transaction sets follow-up status `approved`, response actor/time, keeps original false/reason, sets `catalogReviewStatus: "pending_staff_review"`, marks request token resolved | Studio shows Approved on follow-up. No Design, AI enqueue, or catalog publication. |
| Customer chooses **Decline** | same owner/state/maintenance checks | Transaction sets follow-up status `declined`, response actor/time, keeps status Excluded/reason and resolves token | Studio shows Permission declined twice. Staff cannot create a third prompt in v1. |
| Staff generic Restore | staff intake permission; status Excluded; no promoted design; not purged | If reason `staff_review`, retain existing transition to Pending. If reason `customer_permission_denied`, reject unless follow-up status is already `approved` (and normally return idempotent Pending rather than bypassing the customer response). | Backend, not UI, enforces no consent bypass. |
| Staff promotes to AI Review | technically ready; ownership; Pending; no promoted design; current permission valid (`catalogUseAcknowledged !== false` or follow-up approved) | Existing Design creation/copy/status transition only | Invalid/declined permission fails closed. No auto-promotion occurs from Allow. |
| Own Print Request use | customer owns the request/upload and passes existing request guards | Existing item/production behavior | Catalog exclusion/follow-up state never blocks the customer's own request. |

Concurrency rules: follow-up request creation and response are transactionally one-time; stale or
duplicate requests are no-ops/rejected; Alert creation is idempotent after the transaction. A
response after a staff-side state change never reopens or promotes an upload.

## 7. Portal Alerts reuse design

Extend the existing shared notification kind with
`customer_upload_catalog_permission_follow_up` and add its fixed title/body/deep-link helper.
Extend `CustomerNotificationRecord` and `PortalCustomerNotification` with an optional
`actionToken` (opaque only). Keep `requestId` as the linked Print Request ID; the v1 callable
requires a non-empty linked request, which is why donations are excluded.

`createCustomerNotification` remains the write boundary and remains idempotent. It accepts the
opaque token, builds an href such as:

`/requests/artwork?permissionRequest=<opaque-token>`

The href must never contain `uploadId`, Storage paths, or customer-private artwork identifiers.
The existing subscription, history, unread/read behavior, unrelated notification kinds, and
optional push path continue unchanged. The Firestore notification update rule still permits only
`readAt`/`updatedAt`; clients cannot create or edit an actionable alert.

Add three narrow Function boundaries:

* `requestCustomerUploadCatalogPermissionFollowUp` — staff-only mutation; transaction + idempotent
  Alert creation.
* `getCustomerUploadCatalogPermissionFollowUp` — customer-authenticated read by opaque token;
  returns safe artwork context and a short-lived preview URL (or the existing trusted preview
  mechanism) without upload ID/path.
* `respondToCustomerUploadCatalogPermissionFollowUp` — customer-authenticated mutation by opaque
  token and `allow | decline`; owner check, maintenance guard, transaction, and safe response DTO.

The Portal service calls these Functions. The `/requests/artwork` page (or the smallest shared
Portal modal host if routing makes that more consistent) consumes the query token and opens a
focus-managed modal. Closing/settling the modal removes or neutralizes the token from the visible
route; the Alert is marked read through the existing notification service only.

## 8. Studio UX design

Update the existing Customer Uploads intake row/detail, not a new workspace:

* Excluded permission-denied rows show a reason badge such as **Customer declined Design Library
  permission** and a follow-up state (`Permission requested`, `Approved on follow-up`, or
  `Permission declined twice`).
* Show **Ask for permission again** only for `customer_permission_denied` + `not_requested`.
  Disable/hide it for requested, approved, and declined states.
* Do not show the generic **Restore to Pending** action for a permission-denied row. The callable
  remains the authority and rejects any forged/direct call. Approved follow-up moves the row into
  Pending through the customer response, where the existing Send to AI Review action appears.
* Keep ordinary staff-excluded rows' Restore to Pending, existing Exclude, technical details,
  preview, linked-request navigation, and metadata controls unchanged.
* Studio uses its existing service/hook/callable pattern; no direct component Firebase writes.

## 9. Trusted server enforcement and Rules

All consent transitions are Admin SDK transactions. Staff callables reuse existing
`loadCallerProfile`, `assertStaffCaller`, and customer-upload intake permissions. Customer read and
response callables require a Portal customer/Auth UID and verify the token's stored UID and the
current upload linkage. A token is not accepted merely because it appears in a URL.

The new customer response callable must call `assertPortalMaintenanceAllowsCustomerMutation` before
any mutation. Its name and source must be added to the maintenance guard inventory and parent
Function closure. The read callable is non-mutating but still returns only safe, owner-scoped data.

Firestore Rules currently deny all direct `customerUploads` writes and allow a customer to read
their own upload; `customerNotifications` allows customer read and only read-state updates. Keep
those write boundaries. If Rules field validation is added for the new notification token or
upload fields, it must be a narrow additive allowlist and all new server-authored fields must be
client-immutable. The proposed opaque-token lookup does not require a new composite index. No
Storage Rules change is expected if preview delivery uses the existing owner-scoped path/trusted
signed-URL mechanism; verify this during Implement.

## 10. Donation scope finding

Donations use `purpose: "catalog_donation"`, require listing consent (`true`) at confirmation, and
may be submitted by the anonymous catalog-donation uploader path. They have `printRequestId: null`
and are not guaranteed to have a Portal customer identity capable of receiving a private Alert.
There is therefore no safe, proven recipient/linkage for this v1 follow-up. Keep donations out of
the new workflow and preserve their existing immediate Pending behavior. Adding registered-donor
follow-up or identity conversion requires a separate reviewed goal.

## 11. Expected implementation/documentation paths

These are expected paths, subject to exact source confirmation during Implement:

**Shared contracts and helpers**

* `packages/shared/src/types/customerUpload/customerUpload.enums.ts`
* `packages/shared/src/types/customerUpload/customerUpload.types.ts`
* `packages/shared/src/utils/customerUploadCatalogIntakeEligibility.ts` and its tests
* `packages/shared/src/types/customerNotifications/customerNotifications.types.ts`
* `packages/shared/src/utils/customerNotifications.ts` and its tests
* customer-upload staff-action DTOs and any customer follow-up DTO module

**Functions**

* `functions/src/lib/customerUploadCatalogConfirmation.ts` and focused tests
* `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`
* `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` (shared confirmation parity)
* `functions/src/excludeCustomerUploadFromCatalog.ts`
* `functions/src/restoreCustomerUploadCatalogEligibility.ts`
* `functions/src/promoteCustomerUploadToAiReview.ts`
* new request/get/respond follow-up callables plus `functions/src/index.ts`
* `functions/src/lib/customerNotifications/createCustomerNotification.ts`
* `firestore.rules` only if the reviewed field validation requires a narrow update

**Studio**

* `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`
* `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`
* `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`
* the smallest new/reused request dialog component and focused contracts
* `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadIntakeQueries.ts`
  only if status/reason compatibility requires a query adjustment

**Portal**

* `apps/portal/features/notifications/services/customerNotificationsService.ts`
* existing notification provider/deep-link utility only as needed for the new token
* `apps/portal/features/customer-uploads/services/customerUploadService.ts`
* `apps/portal/app/(app)/requests/artwork/page.tsx`
* a focused `CustomerUploadCatalogPermissionFollowUpModal` under the customer-upload feature,
  reusing the existing Portal modal primitives and styles

**Durable docs**

* amend ADR-FP-074 and the relevant ADR-FP-073/data-model/workflow text after implementation
* add Plan, Formal Review, Implementation/Test evidence, and Signoff artifacts under
  `docs/workflow/`

No migration, backfill, email/push dependency, production deploy, or unrelated notification
redesign is expected.

## 12. Testing strategy

Focused tests must prove both the new behavior and preservation of existing behavior:

* Shared utility/contract tests for original consent, follow-up statuses, current-valid-permission
  resolution, legacy missing fields, transition table, token/deep-link construction, and fixed
  notification mapping.
* Functions tests for initial YES/NO confirmation, request idempotency, wrong-customer rejection,
  Allow/Decline transaction behavior, duplicate/stale response, second-denial no-repeat, generic
  restore vs permission-denied restore, promotion fail-closed/current-approved cases, no Design/AI
  side effect, and Print Request independence.
* Maintenance guard tests for the new response callable when state is OFF, ON for ordinary
  customers, ON for the configured tester, and unreadable.
* Firestore Rules regression if `firestore.rules` changes: direct upload/notification writes remain
  denied; customer read/read-state behavior remains correct; any new fields are immutable to the
  client. Confirm no index is needed.
* Portal tests for Alert mapping/history compatibility, token route handling, safe context display,
  artwork preview, explanatory copy, Allow/Decline calls, loading/error/already-resolved states,
  and no upload ID/path in route or DTO.
* Studio tests for reason/state labels, Ask action visibility/idempotency, generic Restore retained
  for staff exclusions, Restore hidden for permission denial, and existing metadata/reversible
  actions unchanged.
* Run Functions build, Portal validation, Studio focused validation, targeted lint, and
  `git diff --check`; document the existing unrelated Studio typecheck baseline separately if it
  remains.

Acceptance must explicitly cover all 13 requested criteria, including unrelated Portal Alerts and
maintenance behavior.

## 13. Parent candidate impact

This child changes runtime behavior and therefore invalidates the freeze-readiness of
`04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`. After child Signoff, the parent must:

1. add the reviewed paths and new customer mutation callable(s) to M0 scope;
2. rerun Function export/transitive closure and maintenance-guard inventory (the exact new
   customer response callable is included; no unrelated Functions);
3. rerun Firestore Rules/index, Portal, Studio, config/data, and maintenance manifests;
4. run the read-only exclusion audit and confirm no production deploy/publish/activation occurred;
5. assemble, commit, and push a **new** reviewed `development` SHA only after the separate owner
   authorization checkpoint; and
6. present the new exact SHA for M1 freeze approval. Do not reuse or freeze the current SHA.

## 14. Plan gate

Implementation is not authorized by this Plan. Required next gate is Formal Review of this Plan,
including acceptance of the ADR-FP-074 amendment, the additive state model, opaque-token Alert
design, donation exclusion, and the exact server transition rules.
