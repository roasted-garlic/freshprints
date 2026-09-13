# Production maintenance-mode prerequisite

**FreshForge phase:** Managed Phase — Plan
**Goal:** `production-maintenance-mode-prerequisite`
**Parent goal:** `coordinated-production-promotion-release-readiness`
**Plan date:** 2026-09-10
**Status:** Plan ready for Formal Review; implementation and promotion are not authorized

## 1. Decision and stop boundary

This is a separately gated prerequisite for the approved coordinated production-promotion
Plan. It defines a small, runtime-controlled emergency brake for the Portal. It is not an
implementation authorization, DEV deployment authorization, production deployment authorization,
candidate freeze, setting mutation, Rules/Storage Rules mutation, commit, or push. The workflow
must stop after Formal Review. Implement only after the owner accepts the reviewed Plan and
FreshForge advances to Implement.

The control is deliberately narrow:

- OFF is the compatibility default. Existing Portal browse and customer behavior remains unchanged.
- ON gives guests and customers a clear read-only/maintenance experience and blocks customer
  mutations at trusted backend boundaries.
- Existing owner/admin authentication and staff operational access remain authoritative; there is
  no secret URL, client-only bypass, or blanket role bypass.
- The control is a runtime setting, so enabling/disabling it does not require a Portal App Hosting
  rebuild when the existing callable/provider architecture can be used safely.
- Scheduled windows, notifications, status pages, a general feature-flag framework, unrelated
  security/technical-debt fixes, Node/sharp work, hard-delete production support, and the parent
  accumulated rollout remain out of scope.

## 2. Evidence and established architecture

The investigation read the parent Plan and Formal Review, FreshForge state and handoff, the
architecture/backend/data-model/security/testing/deployment/workflow standards, and the relevant
source. The following are established by source rather than invented:

| Area | Evidence | Consequence for this Plan |
|---|---|---|
| Portal root | `apps/portal/app/providers.tsx`, `apps/portal/app/(app)/layout.tsx`, `apps/portal/app/(admin)/layout.tsx`, `AuthGate`, `PortalAdminAuthGate`, `PortalAppShell` | A client provider can show maintenance state for guests/customers while the existing admin route remains role-gated. Next `revalidate = 3600` in `app/layout.tsx` is metadata-only and cannot be the brake. |
| Public reads | `listPortalPublicShows`, `listPortalShowCatalogDesigns`, public catalog/show/help/share routes and their read caches | Safe public browse may remain visible, with a maintenance/read-only banner; no public read path may write. |
| Auth | `apps/portal/features/auth/context/AuthProvider.tsx`; owner/admin/customer roles and `PortalAdminAuthGate` | Sign-in, sign-out, and recovery remain available. Customer registration is a mutation and is blocked ON; admin recovery still uses existing active-role checks. |
| Runtime settings | `functions/src/updatePortalHelpSettings.ts`, `updatePortalSocialMetaSettings.ts`, `updatePrintRequestLimitSettings.ts`, `functions/src/lib/loadPortalQueueCutoffHours.ts`, `loadPrintRequestLimitSettings.ts`, and Studio Settings services | Use the existing Firestore `settings/*` control-plane convention and callable write pattern. Exact new resolver/service filenames are `[NEEDS REPO CHECK]` during implementation design. |
| Function auth | `functions/src/lib/admin.ts`, `functions/src/lib/errors.ts`, `requirePortalCustomer`, `loadCallerProfile`, `assertStaffCaller`, `assertPortalAdminQueueCaller` | A reusable trusted guard must run after the existing identity/role checks and must not weaken them. |
| Rules | `firestore.rules` customer ownership/allowlist helpers and `storage.rules` customer-upload/assisted-pending matches | Direct Firestore and Storage writes bypass callable guards; Rules reinforcement is required for every customer direct-write path that remains client reachable, subject to measured access-call/expression budgets. |
| Studio control surface | `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx`, `permissionService.canManageSettings`, `manageSettings`/`accessSettingsPage` | Owner/admin Settings is the preferred toggle surface. Exact section/service wiring is `[NEEDS REPO CHECK]`; helpers must not receive the toggle. |
| Caching | Portal public shows/catalog caches, server social-meta cache, and AI-only 60-second cache | No existing cache is safe for an emergency brake. Mutation guards read the setting per invocation; Portal state refresh is bounded and no-store. |

## 3. Recommended maintenance architecture

### 3.1 Source of truth and contract

Use one private Firestore document in the existing settings collection: `settings/portalMaintenance`
(`[NEEDS REPO CHECK]` exact document ID is new and must be confirmed before implementation).
The document is not directly readable or writable by Portal customers. Its canonical fields are:

- `enabled: boolean` (required; default `false` when the document is absent).
- `message: string` (optional, bounded, non-sensitive customer copy; implementation must use an
  existing shared validation convention or mark the exact limit `[NEEDS REPO CHECK]`).
- `updatedAt: Timestamp` and `updatedBy: string` (server-authored audit fields).
- `revision: string` or equivalent monotonic/server identifier only if an existing settings audit
  convention requires it; do not add it solely for decoration.

The trusted reader normalizes a missing document to OFF for backward compatibility. A malformed
document or Admin SDK read failure is not treated as OFF for customer mutations: it fails closed
with a stable, documented maintenance/configuration error. Toggle writes always validate a
canonical boolean and may replace a malformed document so the owner can recover the control plane.
No secrets or credentials are stored in this document.

### 3.2 Trusted enforcement

Add one shared Functions-side maintenance resolver/guard (`[NEEDS REPO CHECK]` exact module path)
that reads the private document with the existing Admin SDK and uses the existing
`failedPrecondition`/`permissionDenied` error helpers. The guard must be applied to every
customer-accessible callable in Section 4 after the callable's existing auth, ownership, quota,
  and basic input validation gates, but before quota consumption, external calls, or any business
  write. A stale client therefore receives the same stable maintenance error even if it never
  refreshed its UI. The guard must not run for staff-only/owner-admin operational
callables unless explicitly listed as blocked in the reviewed implementation plan.

Direct client Firestore writes require a Rules helper that checks the same state document. Missing
state evaluates OFF; malformed state or an unavailable read denies the customer write. Existing
ownership, field allowlists, and staff paths remain intact. Before implementation, measure every
affected match against Firestore Rules per-request access-call and expression budgets; if a new
`get()` would exceed a budget, stop and return a revised reviewed design rather than removing an
authorization check.

Direct client Storage writes require the analogous state check in `storage.rules` for customer
upload source/ZIP and assisted-creation pending paths. Storage already uses `firestore.exists/get`
for identity/design checks, but the additional access call and expression cost must be measured in
the emulator. Staff/owner/admin asset paths remain governed by their current role checks.

### 3.3 Toggle and public state APIs

Use the existing callable export/index and traced-callable conventions. Proposed names are
placeholders until implementation confirms naming (`[NEEDS REPO CHECK]`):

- owner/admin callable to set `{ enabled, message? }`, server-authored audit fields, and return the
  canonical state;
- unauthenticated/public-safe callable returning only `{ enabled, message?, updatedAt? }` (no
  private settings fields or role data).

The toggle callable authorizes active owner/admin using the established profile helpers. The public
state callable is read-only, has no CDN/public HTTP cache, and returns OFF only when the document is
absent; read/shape failures are surfaced so the Portal can enter its conservative read-only state.
If implementation proves that a callable cannot provide the needed no-store semantics, stop for a
reviewed alternative using an existing server runtime path; do not expose the settings document.

### 3.4 Portal experience

Add a small provider/banner using the existing provider composition in `apps/portal/app/providers.tsx`
(`[NEEDS REPO CHECK]` exact component names). It should refresh on initial load, `visibilitychange`
and focus, plus a short bounded poll (target 15–30 seconds; exact value is an implementation
decision to be tested). It must not rely on Next static caching or the existing public catalog
read caches. A retry control is available when the state read fails.

- Guests: retain safe public catalog/show/help/share reads, show a prominent accessible maintenance
  banner, and make mutation CTAs unavailable. Donation/upload and other write journeys display a
  branded read-only panel rather than an interactive upload flow.
- Authenticated customers: retain safe reads needed to understand existing requests and notices;
  replace or disable customer mutation controls for requests, uploads, assisted creation, Etsy,
  profile/deletion, favorites, and reports. Callable failures still win if a stale control is
  clicked. Registration shows maintenance copy and the stable error; existing customers can still
  sign in and use recovery.
- Owner/admin: the existing `/admin/show-queue` route and role gate remain outside the customer
  maintenance presentation. No customer-visible toggle or hidden bypass is added.
- Accessibility/mobile: use the existing design tokens and responsive shell, a `role="status"` or
  `role="alert"` with concise copy, keyboard-focusable retry, preserved focus order, and no overlay
  that traps or obscures the admin route.

## 4. Authoritative customer-mutation inventory

The inventory was mechanically derived from Portal service callables/direct writes and the Function
exports/Rules. Every row is a customer mutation unless marked otherwise. Implementation must rerun
the inventory from the frozen source and fail review if a new customer write is absent.

| Boundary | Customer-accessible operations | Maintenance ON | Enforcement |
|---|---|---|---|
| Print Request create/edit | `createPortalPrintRequest`; `addPortalCatalogDesignToPrintRequest`; `duplicatePortalPrintRequestItem`; `removePortalPrintRequestItem`; `updatePortalPrintRequestItemQuantity`; `clearPortalWorkingPrintRequest`; `setPrintRequestItemArtworkEnhanceMode`; `queuePortalPrintRequestToShow`; `unqueuePortalPrintRequestFromShow`; direct `printRequests` notes/item sizing writes in `portalPrintRequestService` | Block | Shared callable guard plus Rules guard on `/printRequests` and `/printRequestItems`; preserve ownership, status, parking, and field allowlists. |
| Uploads/donation | `createCustomerUploadBatch`; `finalizeCustomerUpload`; `finalizeCustomerUploadZip`; `confirmCustomerUploadsAndAttachToRequest`; `confirmCustomerUploadsForDonation`; `recordCustomerUploadHalftoneResponse`; `deletePortalCustomerUpload`; direct customer source/ZIP Storage writes; include legacy anonymous donation finalize/halftone paths as defense even though current donation authorization rejects guests | Block | Callable guard plus Storage Rules for `/customer-uploads`; Admin SDK writes are guarded in their customer callables. |
| Assisted Creation | `submitAssistedCreationRequest`; `cancelAssistedCreationRequest`; `customerUpdateAssistedCreationRequest`; `customerSendAssistedCreationMessage`; `customerRespondToAssistedCreationProof`; `customerAddAssistedApprovedProofToPrintRequest`; direct pending reference upload/delete | Block | Shared callable guard plus Storage Rules for `/assisted-creation/{uid}/pending`; proof/final staff writes retain current role gates. |
| Etsy/recommendations | `submitEtsyRecommendationRequest`; `completeEtsyRecommendationRequest`; `cancelEtsyRecommendationRequest`; `submitEtsySuggestionRequest`; `searchEtsyRecommendations` (quota/search snapshot/external side effects) | Block | Shared callable guard; existing staff suggestion/search operations retain staff authorization. |
| Account/identity | `registerCustomer`; `updatePortalCustomerProfile`; `syncPortalAccountEmail`; `requestPortalAccountDeletion`; `cancelPortalAccountDeletionRequest`; `registerWebPushSubscription`; direct notification-preference update; direct favorites create/delete | Block | Shared callable guard plus Rules guards on `/customers/{id}`, `/customers/{id}/favorites`, and any direct customer write. Sign-in, sign-out, password reset, and owner/admin recovery remain available. |
| Reports | `submitPortalDesignIssueReport` | Block | Shared callable guard and existing report validation/quota checks. |
| Notifications | `customerNotifications` `readAt`/`updatedAt` direct updates | Block for a strict read-only contract. Customers can still read existing notices; clearing a marker is deferred until maintenance is OFF. | Add the maintenance state check to the existing Rules field/identity allowlist; preserve all existing ownership checks. |
| Reads/quota/preview | `listPortalPublicShows`; `listPortalShowCatalogDesigns`; `getPortalPrintRequestShowSchedules`; `getPortalShowPrintProgress`; `getCustomerUploadDailyQuota`; `getEtsyRecommendationSearchQuota`; upload-deletion preview; assisted proof download/read | Remain available | Existing read/auth rules. Public state read is the new safe maintenance callable, not a settings-document read. |
| Staff/owner/admin | Portal admin Show Queue reads; Studio staff processing/recovery; existing owner/admin settings and operational callables | Remain available unless a separate reviewed operation says otherwise | Existing `loadCallerProfile`, `assertStaffCaller`, `assertPortalAdminQueueCaller`, `isStaff`, and `isOwnerOrAdmin` checks remain authoritative. Customer claims cannot satisfy these checks. |

The notification read-marker decision is intentionally strict: ON means no customer writes. Reopening
that exception would change the product contract and requires a separate owner-approved review.

## 5. Owner/admin recovery and operations

1. Owner/admin signs in through the existing Auth flow and opens the existing Studio Settings page,
   which already uses `manageSettings` and owner/admin role checks. A new maintenance section is
   `[NEEDS REPO CHECK]` but must be visible to owner/admin only; helpers see their existing limited
   Settings page.
2. The toggle writes the canonical state and returns a visible audit timestamp/actor. A failed
   write leaves the prior state unchanged and is surfaced to the operator.
3. During ON, owner/admin can verify the Portal through the existing authenticated
   `/admin/show-queue` route and current Studio operational paths. The maintenance provider must
   not intercept or hide that admin route.
4. Disabling writes `enabled:false`; the Portal refresh/focus path and backend per-invocation guard
   restore normal customer behavior without a Portal rebuild. The owner confirms one read and one
   safe write after OFF.

No secret URL, query parameter, custom header, impersonation, or client-only role override is
allowed. Any staff operation intentionally usable during maintenance must remain protected by its
existing role and ownership checks and be listed in the implementation review.

## 6. Runtime propagation, caching, and failure contract

| Situation | Contract and rationale |
|---|---|
| Missing document | OFF. This preserves existing production behavior on first rollout and makes the prerequisite safe to deploy disabled. |
| Valid ON/OFF document | Callable mutation guard reads current Admin SDK state for each customer mutation invocation; no 60-second AI-style cache. |
| Toggle propagation | Firestore write completes before success is shown; Portal fetches on mount/focus/visibility and bounded polling. Expected UI convergence is the poll interval plus network time, not an indefinite cache. |
| Public read cache | The state callable must be non-cacheable (`no-store` semantics where the existing callable stack permits). Do not route it through `getPortalGlobalOpenGraph` or public catalog caches. |
| Portal read failure | Show conservative read-only/maintenance chrome and a retry; safe public reads may continue only if the provider can distinguish a read failure from a known OFF state. Never enable customer mutation controls based on an unknown state. |
| Customer mutation state read failure/malformed state | Fail closed with a stable `failed-precondition`-class maintenance/configuration error. Log structured event name, state outcome (`on`, `missing/off`, `malformed`, `read_error`), function, request/correlation ID, and actor class; never log secrets or customer payloads. |
| Toggle read/shape failure | Owner/admin can overwrite a malformed document with a canonical value; surface errors rather than silently claiming OFF. |
| OFF after ON | Provider clears the maintenance panel after a successful fresh read; callable guard immediately permits normal writes. No stale success is accepted from an old client. |
| App Hosting/CDN | No Portal rebuild is part of toggling. Verify the state response and maintenance shell are not statically or CDN cached during implementation/DEV QA. |

## 7. Test strategy (existing conventions)

Tests are planned, not run in this Plan phase. Use `docs/standards/TESTING.md` conventions and the
existing `npx tsx --test`, Portal typecheck/lint, Functions build, and Firebase Rules emulator
commands.

### Unit and callable contract tests

- Shared state resolver: missing→OFF; valid ON/OFF normalization; bounded message validation;
  malformed/read error→explicit failure; no stale cache.
- Toggle authorization: unauthenticated, customer, helper, inactive owner/admin denied; active
  owner/admin can set/read canonical state; audit fields are server-authored.
- Representative customer callable succeeds OFF and returns the stable maintenance error ON;
  invoke through a stale-client-shaped request to prove the guard is server-side.
- Contract enumeration asserts every Section 4 blocked callable invokes the common guard, while
  staff/admin/read operations are not accidentally made customer-accessible.

### Firestore and Storage Rules emulator tests

- Rules state fixture absent/OFF/ON/malformed for representative direct writes: customer profile
  preference, favorite create/delete, print-request note, print-request-item size, and notification
  read marker (the explicit exception).
- Verify customer ownership/field allowlists and all staff/owner/admin reads/writes remain intact;
  prove a customer cannot satisfy an owner/admin path.
- Storage customer source, ZIP, and assisted pending create/update/delete denied ON and allowed OFF;
  staff proof/final/original paths retain existing role behavior.
- Measure affected-rule access calls/expressions and keep a regression fixture for the known
  print-request-item expression-budget pattern. If emulator behavior cannot represent read errors,
  document the limitation and cover malformed state plus trusted-reader failure in unit tests.

### Portal behavior and cache tests

- Guest/public safe reads render with maintenance copy while mutation CTAs are unavailable.
- Authenticated customer mutation routes render the read-only panel; `/admin/show-queue` remains
  reachable only to owner/admin.
- Mount/focus/visibility/poll refresh, retry, ON→OFF clearing, and unknown/read-error conservative
  behavior; assert no indefinite cache and no Next metadata-cache dependency.
- Existing Auth sign-in/logout/recovery and permission matrix tests remain green.

### Required verification commands at implementation

Run the repository-required lint, Portal typecheck, Functions build, targeted `npx tsx --test`
contracts, and `npm run test:rules` (including Storage coverage if the repo exposes a separate
command). Record exact pass/fail counts and environment constraints; do not claim unrun tests.

## 8. Lean owner DEV QA journey

One short journey, after automated tests and a reviewed DEV deployment:

1. With maintenance absent/OFF, browse Portal and complete one representative customer mutation.
2. As owner, enable maintenance in Studio Settings and confirm the audit result.
3. Open a guest/public window and an already-loaded customer window; confirm banner/read-only
   behavior and attempt the representative mutation again, verifying the stable maintenance error.
4. Verify owner/admin can still sign in and reach Portal `/admin/show-queue` and the Studio recovery
   path needed for release verification.
5. Disable maintenance, refresh/focus the Portal, and confirm the same safe mutation works again.

Automated breadth covers the full inventory; the owner does not manually repeat every callable.

## 9. Production-disabled prerequisite promotion (plan only)

After implementation review, tests, and owner DEV QA:

1. Capture the current production rollback baseline (live Portal build-003, Studio v1.0.9,
   Functions/Rules/Storage Rules/index identifiers, Auth/secret names only) using the parent
   Plan's read-only snapshot procedure.
2. Freeze and review an exact candidate allowlist: maintenance resolver/guard, toggle/public-state
   callable(s), Portal provider/read-only UI, Studio owner/admin Settings section, and measured Rules/
   Storage changes only. Do not deploy the accumulated parent candidate in this prerequisite.
3. Deploy the reviewed backend/Rules/Storage/UI capability through owner-approved commands with
   the setting absent or explicitly OFF. No production data mutation or extended ON window.
4. Verify production behavior is unchanged while OFF, the owner toggle/read path is role-safe,
   public state is not cached incorrectly, and one customer read/write smoke path remains normal.
5. Record exact release identifiers and rollback instructions, then close this prerequisite. Any
   brief production ON test requires a separate owner approval with minimized customer impact.

## 10. Rollback

If the disabled capability changes behavior or blocks staff recovery, first set the canonical state
OFF through the owner/admin callable when safe. If the control plane or callable is unhealthy,
restore the prior Functions revision, Firestore/Storage Rules release, and Portal revision using
the recorded baseline; do not use a broad Functions deploy or `--force` Rules/index action. Restore
the prior Studio release only if the Settings/UI candidate was published. Re-run the OFF smoke and
record any forward repair. Rollback must not remove existing customer ownership/auth checks or
overwrite unrelated settings.

## 11. Risks, open checks, and acceptance criteria

Open items are intentionally explicit rather than guessed:

- `[NEEDS REPO CHECK]` exact new shared resolver/constants module, callable names, Studio section/
  service filenames, and Portal provider/component names.
- `[NEEDS REPO CHECK]` callable framework support for no-store public state responses and the
  smallest safe polling interval under current Portal data-fetching conventions.
- `[NEEDS REPO CHECK]` Firestore/Storage Rules emulator access-call and expression budgets after
  the maintenance `get()` is added to every affected match.
- `[NEEDS REPO CHECK]` complete frozen-source mutation manifest, including any newly added Portal
  service or direct SDK write not present in this Plan inventory.
- Read failure semantics can produce conservative read-only UX without hiding owner/admin recovery;
  this needs an integration test in the actual provider tree.

Formal Review must confirm:

- [ ] Source-backed architecture and settings control surface
- [ ] Complete customer mutation inventory, including notification read markers as blocked
- [ ] Trusted callable, Firestore Rules, and Storage Rules enforcement without auth weakening
- [ ] Guest/customer maintenance UX and admin-route isolation
- [ ] Owner/admin toggle, recovery, audit, and no-rebuild behavior
- [ ] Bounded propagation, no unsafe stale cache, and fail-closed mutation semantics
- [ ] Targeted automated tests plus one short DEV QA journey
- [ ] Production-disabled promotion and reversible rollback
- [ ] All `[NEEDS REPO CHECK]` items assigned to implementation/review gates
- [ ] No implementation, deployment, data mutation, commit, or push performed in this phase
