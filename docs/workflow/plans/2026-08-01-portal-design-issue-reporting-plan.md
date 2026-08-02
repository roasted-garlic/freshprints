# Plan: Portal design issue reporting

Date: 2026-08-01  
Managed sub-goal: `portal-design-issue-reporting`  
Parent goal: `production-release` Goal #13  
Phase: planning only; implementation prohibited pending owner decisions

## Outcome

An authenticated active Portal customer can report a problem from the currently open catalog design-details modal. A trusted callable creates a durable, customer-safe report. Open reports appear as bounded actionable items in the existing Studio Inbox, staff can open the exact Design Library design and resolve the report, and resolved reports remain in bounded on-demand history. Reporting or resolving never mutates the design.

## Repository findings

### Source and branch state

- Current branch and production HEAD: `production` at `fe8c4f05675d1f47e532982089dc744b75b44786`.
- `origin/development`: `ed47e00b73df1779782d126f7c764db51b51f817`.
- Production contains the clean final-Studio-remediation merge; development has divergent historical release documentation. Do not merge all development into production for this feature.
- The workspace already contains narrow post-installer documentation edits from the preceding workflow. They are preserved and are not feature implementation.
- Recommended implementation branch: create `feature/portal-design-issue-reporting` directly from `origin/production` after the owner decisions are approved. Development Firebase deployment may be performed from that reviewed feature branch with explicit `--project fresh-prints-dev`; later promote only that branch to `production` through a protected merge-commit PR.

### Portal design modal

- Exact component: `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`.
- Owners/call sites: `apps/portal/features/catalog/pages/CatalogPageContent.tsx` and `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`; shared-link presentation also uses `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx` and must be audited before implementation.
- Current supporting hook/service: `useCatalogDesignDeepLink.ts`, `useCatalogDerivativeUrl.ts`, `catalogService.ts`, and `catalogDesignByIdCache.ts`. There is no report hook or service today.
- The catalog and modal are available to signed-out visitors. `CatalogDesignDetailsModal` already uses `useAuth`, `redirectToPortalLogin`, and the `design` deep-link return parameter for guest Add-to-request continuation.
- Exact modal model is `CatalogDesign`: `id`, title, optional description/category, tags, thumbnail/preview paths, artwork background, dimensions/print dimensions, timestamps, and aggregate metrics. The catalog service admits only `status == ready` records into this model.
- Portal auth context exposes Firebase user, user profile, linked customer, bootstrap state, and `isAuthenticated`. Backend `requirePortalCustomer(uid)` is the established active-customer authority.

### Studio Inbox

- Route: `/inbox` in `routes/AppRoutes.tsx`, currently gated by `viewPrintRequests`.
- Provider: `features/staff-inbox/components/StaffInboxProvider.tsx`; context: `context/staffInboxContext.ts`.
- Subscription: `services/staffInboxSubscriptionService.ts`.
- Page/card/bell: `pages/StaffInboxPage.tsx`, `components/StaffInboxItemRow.tsx`, `components/StaffInboxBell.tsx`.
- Types/derivation/counts: `packages/shared/src/staffInbox/staffInbox.types.ts` and `deriveStaffInboxItems.ts`.
- Navigation: `utils/staffInboxNavigation.ts`.
- Done/history persistence: `staffInboxAckService.ts`, per-user `staffInboxAcks` documents.
- Existing item kinds are exactly `portal_queued` and `show_queue_full`. Open items are derived, not stored as generic Inbox entities. “Done” means a per-staff acknowledgment and may be restored; it is not a global operational resolution.
- Existing provider attaches one bounded listener each to Portal print requests (200), allocations (400), and shows (100), plus per-user acknowledgment/delivery listeners. It deduplicates attachment at provider scope and emits badge counts from derived items.
- All active staff roles can access the Inbox through `viewPrintRequests`. No design-report permission keys exist.
- There is no exact Studio Design Library design-ID deep link. `getDesignLibraryPath` supports filters only; `DesignLibraryPage` does not parse/open a design ID. This feature must add a validated `designId` query parameter and one explicit detail read, not a listener.

### Backend, Rules, and indexes

- Portal callables use `onCall`, `requireAuth`, and `requirePortalCustomer`; error helpers live in `functions/src/lib/errors.ts`.
- Staff authorization uses `loadCallerProfile` plus centralized role checks. Customer-upload quota helpers demonstrate transactional rate-limit documents and Chicago-day keys.
- No existing callable sets `enforceAppCheck`; App Check enforcement is not an established callable policy in this production source. Introducing mandatory App Check only for this feature would require separate infrastructure/rollout approval.
- Firestore Rules allow staff-owned Inbox acknowledgments but there is no report collection.
- The existing Inbox cannot represent a global report lifecycle safely: acknowledgments are user-specific, lack report text/snapshots, and are directly staff-authored.
- A new collection and indexes are required for durable global resolution and bounded open/history queries.

## Proposed architecture

### Shared contract and entity

Add `designIssueReports` as a top-level collection, following plural domain collection naming. This is a new operational entity, not a field on `designs` and not a generic acknowledgment.

`DesignIssueReport` fields:

- `id` (document ID, not duplicated unless mapping conventions require it)
- `designId`
- `customerUid` (server-authored)
- `customerId` (server-authored linked customer document ID)
- `customerDisplayNameSnapshot` and/or `customerUsernameSnapshot` (safe server snapshot; no email)
- `description` (trim outer whitespace, normalize CRLF to LF; preserve wording)
- `descriptionFingerprint` (server hash for idempotency/repeated-identical checks; never log text)
- `status: "open" | "resolved"`
- `designTitleSnapshot`
- `designThumbnailPathSnapshot` or `designPreviewPathSnapshot` only when it is a validated catalog derivative path
- `createdAt`, `updatedAt`
- `resolvedAt`, `resolvedByUid` only while resolved
- no internal resolution note in version 1

Do not copy artwork or email. Snapshots keep reports understandable after design/customer changes.

Shared strong types and callable request/response types live under a new `packages/shared/src/designIssueReports/` domain and are consumed by Portal, Functions, and Studio.

### Portal flow

Maintain Component → Hook → Service → Callable:

1. Add a secondary text action labeled **Report an Issue** in the details toolbar, grouped with Share/Background and visually subordinate to Add to request.
2. Show it for guests; guest click calls the existing login continuation with the current `design` query parameter.
3. Authenticated click opens a new accessible `CatalogDesignIssueReportModal` nested above the details modal using existing Portal modal/focus conventions.
4. Read-only Design ID comes solely from the currently selected `CatalogDesign` object.
5. Required description is 10–1,000 characters after outer trim, with a counter and inline errors.
6. Hook owns state/submission; service invokes `submitPortalDesignIssueReport({ designId, description, idempotencyKey })`.
7. One idempotency key is generated per modal submission intent and reused on retry. Disable submit in flight.
8. Success is announced and confirmed in-app; only confirmed success or deliberate cancel closes the report modal. Cancel/Escape makes no call.
9. The callable treats `designId` as an untrusted reference and revalidates it. The UI never offers an editable/arbitrary ID.

### Trusted creation callable

Add `submitPortalDesignIssueReport`:

- require authenticated, non-anonymous user and `requirePortalCustomer(uid)`; deny inactive/missing customers;
- validate payload shape, design ID syntax, 10–1,000 normalized description, and bounded idempotency key;
- read `designs/{designId}` and require `status == "ready"`, valid title, and a Portal-eligible derivative path consistent with catalog mapping;
- ignore all client identity/snapshot/status/timestamp fields;
- in a transaction, enforce daily customer quota and same-customer/design policy, then create the server-authored report;
- use deterministic idempotency ownership (a server document keyed by UID + hashed idempotency token, or a deterministic report ID derived with a server-safe hash) so retry returns the original success without duplication;
- store rate-limit state in a dedicated server-owned subcollection/collection; never query unbounded report history to count quota;
- log report ID/design ID/status/error class only; never log description, display name, email, or UID in plaintext when a hashed actor key suffices.

Recommended abuse policy pending owner approval: 10 reports per active customer per America/Chicago calendar day; at most one open report per customer/design; identical resolved text may be resubmitted only after resolution and still counts toward the daily quota. App Check remains monitor/optional because enforcement is not currently established; authentication, active-customer checks, transactional quotas, and idempotency are mandatory.

### Staff resolution callable

Add `resolveDesignIssueReport` rather than direct Studio writes:

- authenticate and load active staff profile;
- authorize through new centralized `canViewDesignIssueReports` and `canResolveDesignIssueReports` permission methods;
- transactionally require the report exists and is open, then set only status/resolution audit fields and timestamps;
- idempotently return resolved when already resolved by the same operation semantics;
- never update/read-modify-write the design;
- version 1 has no reopen callable. Reopen can be a later managed amendment.

Studio may read reports directly under Rules but all status mutation remains callable-only.

### Studio Inbox integration

- Extend shared Inbox union with `design_issue_report`, carrying report ID, design ID, snapshots, exact report text, status, and timestamps.
- Add exactly one listener to `designIssueReports` constrained by `status == "open"`, ordered `createdAt desc`, `limit(100)`; map snapshots without customer/design lookups.
- Merge these items into the existing provider/open list and badge count. Add a distinct `designReports` badge field while total/bell includes all open items.
- Render thumbnail, title, Design ID, safe customer snapshot, full report text, submitted time, `View Design`, and `Mark Resolved` in an Inbox-specific row/card branch. Do not build an editor.
- `View Design` navigates to `/designs?designId=<encoded id>&archived=true|false` using a new shared Design Library path builder. `DesignLibraryPage` performs one `getDesignById` through service/cache and opens the existing details/edit modal. If ready lookup fails, retry archived; if missing/purged, show a safe unavailable message while the report snapshot remains usable.
- `Mark Resolved` uses Component → Hook → Service → callable and centralized permissions. Resolution removes the listener item naturally.
- Add a **Resolved reports** bounded, paged/on-demand view inside the existing Inbox Done/history surface, not a live listener and not `staffInboxAcks`. Query `status == resolved`, order `resolvedAt desc`, page size 50.
- Existing queue-item acknowledgment and restore behavior remains unchanged. Report resolution is global and must not be represented by per-user Done acknowledgments.

### Read containment

- One additional provider-scoped bounded open listener: maximum 100 report documents.
- No per-card listeners; no live resolved-history listener; no customer/design enrichment queries.
- One explicit cached design read only when staff chooses View Design.
- Resolved history is `getDocs` pagination, 50 per page, invoked only when that history view opens.
- Provider retains a single attachment across route changes. Add trace metadata and tests asserting one attach/unsubscribe lifecycle, bounds, and no reattachment multiplication.
- Development QA uses `FP_FIRESTORE_TRACE=1` to record listener attach count, query constraints, emission sizes, explicit deep-link reads, and teardown.

## Rules and indexes

Rules change is required:

- `designIssueReports`: active staff may read; all client create/update/delete denied. Portal creation and staff resolution use Admin SDK callables.
- rate-limit/idempotency documents: deny all client access.
- no change to `designs` write permissions.

Indexes required:

1. `designIssueReports`: `status ASC, createdAt DESC` for actionable listener.
2. `designIssueReports`: `status ASC, resolvedAt DESC` for paged history.

Both Rules and index deployment require explicit human checkpoints in development and production. Emulator tests must prove Portal cannot author reports/status directly and staff cannot directly mutate resolution fields.

## Permissions recommendation

Add permission keys/methods rather than component role comparisons:

- Owner/admin/helper: view reports, open design, view history, resolve.
- No reopen in version 1.
- Customers and inactive staff: no Studio read or resolution.

This matches the existing operational Inbox, which is visible to all active staff. Owner approval remains required.

## Files to touch during implementation

Existing files:

- `apps/portal/features/catalog/components/CatalogDesignDetailsModal.tsx`
- Portal modal styles in `apps/portal/styles/catalog.css` and existing shared modal styles only as needed
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/features/catalog/pages/ShareDesignPortalPageContent.tsx` (audit/action consistency)
- `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxProvider.tsx`
- `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxItemRow.tsx`
- `apps/studio/src/renderer/src/features/staff-inbox/components/StaffInboxBell.tsx`
- `apps/studio/src/renderer/src/features/staff-inbox/pages/StaffInboxPage.tsx`
- `apps/studio/src/renderer/src/features/staff-inbox/services/staffInboxSubscriptionService.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/context/staffInboxContext.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/utils/staffInboxNavigation.ts`
- `apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts`
- `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
- `apps/studio/src/renderer/src/features/permissions/types/permission.types.ts`
- `apps/studio/src/renderer/src/features/permissions/services/permissionService.ts`
- `apps/studio/src/renderer/src/features/firebase/constants/firestoreCollections.ts`
- `apps/studio/src/renderer/src/features/firebase/services/firestoreCollectionService.ts`
- `packages/shared/src/staffInbox/staffInbox.types.ts`
- `packages/shared/src/staffInbox/deriveStaffInboxItems.ts`
- `functions/src/index.ts`
- `firestore.rules`
- `firestore.indexes.json`
- relevant architecture/data/security/testing/roadmap/state docs

New planned files (names may be mechanically adjusted to existing casing conventions, not behavior):

- `packages/shared/src/designIssueReports/designIssueReport.types.ts`
- `packages/shared/src/designIssueReports/designIssueReport.constants.ts`
- `apps/portal/features/catalog/components/CatalogDesignIssueReportModal.tsx`
- `apps/portal/features/catalog/hooks/useCatalogDesignIssueReport.ts`
- `apps/portal/features/catalog/services/catalogDesignIssueReportService.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/hooks/useResolveDesignIssueReport.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/services/designIssueReportService.ts`
- `apps/studio/src/renderer/src/features/staff-inbox/components/DesignIssueReportInboxItem.tsx`
- `functions/src/submitPortalDesignIssueReport.ts`
- `functions/src/resolveDesignIssueReport.ts`
- `functions/src/lib/designIssueReportValidation.ts`
- `functions/src/lib/designIssueReportRateLimit.ts`
- focused colocated `.test.ts`/contract tests for all changed domains

## Data migration and integrity

- No migration or backfill: collection starts empty.
- No `designs` document fields/statuses change.
- No existing Inbox acknowledgment conversion.
- Reports retain snapshots and remain readable if design/customer later changes.
- Rollback: remove Portal action and Studio integration, undeploy only the two new callables if approved, and leave report records retained/read-only for audit. Rules may remain deny-by-default; indexes may remain harmless. Never delete reports as rollback.

## Test plan

Add failing-before then passing-after coverage for all 49 requested cases:

- Portal action, trusted current ID/read-only field, validation boundaries, no-write Cancel/Escape, loading/idempotency/success, guest continuation, mobile/focus/accessibility, no native dialogs.
- Backend unauthenticated/non-customer/inactive/missing/non-visible rejection; ignored client identity; server timestamps/snapshots; 10/day quota; one-open-per-customer/design; text validation; idempotent retry; safe logs.
- Studio open item/count/render/deep-link/resolve/history/permissions; no design mutation; archived/missing design; existing kinds unchanged.
- Listener tests prove one bounded 100-report listener, no per-card read, no multiplied attach on navigation, teardown, and on-demand 50-row history.
- Rules emulator proves direct report creation and protected-field mutation denied while staff bounded reads succeed.
- Index duplicate validator and query-shape contract cover both new composites.
- Commands: focused `npx tsx --test ...`; `npm run test:rules`; `npm run build --prefix functions`; Portal typecheck/build; Studio TypeScript/build/package; `npm run lint`; `git diff --check`.

## Development deployment and QA

After implementation review approval:

1. Deploy only `submitPortalDesignIssueReport` and `resolveDesignIssueReport` to `fresh-prints-dev` with explicit allowlist/project.
2. Deploy reviewed Rules and two indexes only after separate approval; wait for indexes Enabled.
3. Restart/redeploy development Portal from the reviewed feature source and build a development Studio installer or run approved dev Studio.
4. QA guest continuation, authenticated submission, duplicate/rate boundaries using minimal fixtures, actionable count/item, exact design navigation, all staff permissions, global resolution/history, missing/archived design, accessibility/mobile, and `FP_FIRESTORE_TRACE` containment.
5. Record owner signoff before production promotion.

## Production sequencing

Use the requested 19-step sequence exactly: decisions → implementation/review/tests → dev backend/Portal/Studio QA → owner signoff → clean protected production promotion → separately deploy the three pending Customer Upload Functions → separately deploy report callables/Rules/indexes → Portal App Hosting rollout → new combined production Studio installer/QA → affected and remaining Stage 2 hosted.app smoke → readiness → explicit domain-cutover approval → domain smoke → final tag only after full PASS.

The current final-remediations installer is intermediate and must not be distributed as the final launch build.

## Owner decisions required

1. **Submission identity:** authenticated active customers only (recommended); no anonymous reports.
2. **Guest action:** show `Report an Issue`; redirect through existing login continuation and reopen the same design (recommended).
3. **Description length:** 10–1,000 normalized characters (recommended).
4. **Rate limit:** 10 reports per active customer per America/Chicago calendar day (recommended).
5. **Duplicate policy:** one open report per customer/design; idempotent retry returns existing result (recommended).
6. **Resolve roles:** owner, admin, and helper may resolve (recommended; matches operational Inbox).
7. **Reopen:** no reopen in version 1 (recommended).
8. **Resolved history:** bounded paged view under existing Inbox Done/history UI (recommended).
9. **Customer acknowledgment:** submission success only; no later notification/thread (recommended).
10. **Customer prior reports:** no customer history page in version 1 (recommended).
11. **Retention:** retain resolved reports indefinitely until a separate retention policy is approved (recommended).
12. **Portal label:** `Report an Issue` (recommended).
13. **Studio labels:** `View Design` and `Mark Resolved`; history action `View Report` if needed (recommended).
14. **App Check:** do not enforce uniquely in v1; use existing auth, active-customer validation, quotas, and idempotency, while recording App Check as a later platform-wide decision (recommended).
15. **Deploy gates:** require separate explicit approvals for Rules and indexes in both dev and production (recommended).

Implementation must not start until the owner resolves all 15 decisions.
