# Production maintenance-mode prerequisite — owner DEV-QA amendment

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Goal | `production-maintenance-mode-prerequisite` |
| Workflow | Managed Phase — Plan Amendment |
| Base Plan | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-plan.md` |
| Status | Amendment complete; Formal Review recorded separately; implementation is not authorized |
| Environment | DEV source only; production untouched |

## 1. Decision and boundary

Owner DEV-QA confirmed the narrow DEV dependency deployment is working, but requested three
refinements before Signoff:

1. Center and polish the unauthorized Portal `/admin/show-queue` state.
2. Replace the customer maintenance presentation with a friendly, full-viewport replacement that
   does not mount or expose the customer shell while blocked.
3. Add exactly one nullable, server-authoritative maintenance-test customer with a persistent
   yellow tester banner while maintenance is ON.

This document amends the existing prerequisite only. It does not authorize implementation,
deployment, setting mutation, owner QA, Signoff, commit, push, production activity, or parent
coordinated-rollout work. Existing 28-source/34-deployed-callable guard coverage remains a hard
mechanical gate.

## 2. Source-grounded findings

| Concern | Existing source | Amendment consequence |
|---|---|---|
| Customer shell | `apps/portal/features/navigation/components/PortalAppShell.tsx` currently mounts Sidebar, header, nav, drawer, providers, and children, then swaps only page content for `PortalMaintenanceExperience` | Branch before customer providers/shell are mounted when state is unknown or ON for a non-tester; render only maintenance content. Render the existing shell for OFF and the authorized tester. |
| Maintenance state | `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx` and `services/portalMaintenanceService.ts` expose enabled/message/status/error only | Add a caller-specific boolean, never a UID; retain bounded refresh and fail-closed mutation semantics. |
| Maintenance copy | `apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx` renders technical headings, the runtime message, and raw `error` | Use friendly ON copy and nontechnical unknown/read-failure copy; keep the retry action and do not render raw errors. |
| Customer auth identity | `apps/portal/features/auth/types/auth.types.ts` exposes `firebaseUser.uid`, `user`, `customer`, and bootstrap status; `AuthProvider` keeps active customer sessions current | The client may consume only the server-returned boolean. Ordinary auth, active-account, and ownership checks remain authoritative. |
| Admin isolation | `apps/portal/app/(admin)/layout.tsx` uses `PortalAdminAuthGate` + `PortalAdminShell`; `PortalRouteProviders` deliberately omits customer providers for `/admin` | The customer maintenance branch cannot affect owner/admin recovery routes. |
| Admin denial state | `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx` has the correct redirect/`portal-admin` authorization logic but returns an unstyled `.portal-admin-state` and interpolates `error` | Keep all authorization and redirect branches; use static customer-safe copy, a card wrapper, and token-based responsive styling in `admin-show-queue.css`. |
| Admin contract | `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts` freezes separate shell, auth gate, and stylesheet contracts | Extend the contract for the centered denial presentation without changing the auth assertions. |
| Private control plane | `functions/src/lib/portalMaintenance.ts`, `getPortalMaintenanceState.ts`, `updatePortalMaintenanceState.ts`, and `packages/shared/src/constants/portal/portalMaintenance.constants.ts` own the private settings document, public projection, parser, and callable write | Add one optional `maintenanceTestCustomerUid`; private reads/updates may return it to authorized Studio only, while the public projection strips it and adds only a boolean. |
| Callable guard | The existing 34 customer callable revisions import `assertPortalMaintenanceAllowsCustomerMutation` and the inventory contract pins the 28 source files | Change the shared guard once to accept the authenticated UID and permit only the configured active customer after existing customer validation. Do not duplicate per-callable bypass logic or reorder the guard after quota/external effects. |
| Firestore Rules | `firestore.rules` uses `portalMaintenanceAllowsCustomerMutation()` on direct customer profile, favorite, request, item, and notification-marker writes; `/settings/portalMaintenance` is owner/admin read-only | Keep ownership/field/role predicates unchanged. The maintenance predicate may allow only ON + `request.auth.uid` equal to the configured UID; missing/OFF remains allowed and malformed state fails closed. Measure every affected access-call/expression budget. |
| Storage Rules | `storage.rules` guards customer source/ZIP writes and assisted pending deletes; `apps/portal/features/assisted-creation/services/assistedCreationService.ts` directly uploads pending reference files, while current pending create/update Rules lack the maintenance predicate | Add the same tester predicate to pending create/update as well as the already guarded source/ZIP/delete paths, because the source confirms these are client-reachable customer Storage mutations. Staff paths remain unchanged. Re-run the Storage emulator suite and budgets. |
| Studio settings | `PortalMaintenanceSettingsSection.tsx`, `usePortalMaintenanceSettings.ts`, and `portalMaintenanceSettingsService.ts` already provide owner/admin toggle/message/save; `SettingsPage.tsx` exposes the administrative tab | Extend the existing draft/service section with a single customer selector and clear action. No new route or customer-management surface. |
| Studio customer lookup | `useCustomersDirectory` → `customerService.listCustomers` is owner/admin-gated; `filterCustomers` provides existing directory matching; shared `Select` supports an accessible searchable menu | Reuse these primitives, map active customers with a linked `userId` to labels, and never make raw UID the primary operator display. |

## 3. Amended architecture and contracts

### 3.1 Private state

Keep `settings/portalMaintenance` as the only source of truth. Extend the shared private settings
shape with:

```text
maintenanceTestCustomerUid?: string | null
```

The field is omitted or `null` when no tester is configured. The server parser accepts at most one
UID, trims it, validates the Firebase UID length/type, and rejects malformed input. The update
callable additionally verifies that the UID is linked to an active, non-deleted, non-disabled
customer account before saving. Clearing sends `null` and removes the bypass immediately. Audit
fields remain server-authored.

`updatePortalMaintenanceState` remains reachable only to active owners/admins. Helpers, customers,
and direct client writes cannot configure the field. The private Studio response may include the
field for an already-authorized owner/admin settings session; it is never part of a public Portal
response.

### 3.2 Caller-specific public state

`getPortalMaintenanceState` continues to be callable by guests. Its response is:

```text
{ enabled: boolean, message: string, maintenanceTestAccessGranted: boolean }
```

The boolean is computed by trusted Functions state plus the authenticated caller UID, and is false
for unauthenticated callers, staff callers, inactive/non-customer callers, different customers,
and absent/null tester configuration. The configured UID is never returned, logged to the client,
or placed in Portal state. The public callable remains uncached/no-store as established by the
original review.

### 3.3 Trusted callable decision

Amend the one shared guard to receive the authenticated UID (or the already validated
`PortalCustomerContext`) and evaluate:

```text
OFF                              → allow existing behavior
ON + active configured customer  → allow only the maintenance prohibition to be bypassed
ON + everyone else               → existing failed-precondition block
unreadable/malformed state       → fail closed for customer mutations
```

Each call site keeps its existing authentication/basic validation, customer ownership, account
active/deleted/disabled, quota, content, lifecycle, upload, and business-rule checks. The guard
still runs before quota consumption, external calls, transactions, or business writes. Registration
and account-setup paths without an existing validated customer cannot gain the tester exception.
The existing mechanical source manifest and all 34 deployed callable names must remain covered.

### 3.4 Portal shell and tester banner

`PortalAppShell` computes `blocked = status !== 'ready' || (enabled && !maintenanceTestAccessGranted)`
and, when blocked, returns only `PortalMaintenanceExperience` before mounting the customer drawer,
navigation, mutation contexts, or page children. This makes the maintenance UI a replacement,
not a translucent overlay: no background controls exist in the DOM, cannot receive pointer input,
and cannot enter tab order. Admin routes do not use this shell.

When `enabled && maintenanceTestAccessGranted`, the normal shell renders and a new maintenance
tester banner component is mounted at the top of the existing `.portal-app-top` stack:

```text
Maintenance mode is active. You have temporary testing access.
```

The banner is a persistent, responsive, accessible `role="status"` strip using existing warning
tokens. It has no controls and disappears when the state is OFF or the caller-specific boolean is
false.

`PortalMaintenanceExperience` uses the preferred friendly ON copy:

```text
We’re making a few improvements!
The Fresh Prints Portal is taking a quick maintenance break. We’ll be back shortly. Thanks for
hanging tight!
Check again
```

Unknown/loading/read-failure states retain conservative blocking but use a separate friendly,
nontechnical message and never display `error`, `internal`, permission text, stack details, or
configuration terms. Focus, landmark, keyboard, reduced-motion, mobile, and color-contrast
behavior are covered by the Portal shell styles and component contract.

### 3.5 Admin Show Queue denial polish

Keep `PortalAdminAuthGate`'s existing redirect for guests and its `bootstrapStatus === 'portal-admin'`
success path. For the unauthorized branch, render a centered full-viewport state with a semantic
heading `Access denied`, static copy such as “You don’t have permission to view the Show Queue. If
you need access, contact a Fresh Prints administrator.”, and the existing `Sign out` button. Do
not expose the underlying `error` string. Add a small card/container rule to
`apps/portal/styles/admin-show-queue.css` using existing Portal tokens, responsive padding, and
visible focus styles. Do not redesign the admin shell or add an authentication path.

## 4. Studio tester-selection approach

Extend the existing `PortalMaintenanceSettingsSection` draft and maintenance service contract with
the nullable UID. Reuse `useCustomersDirectory` (owner/admin gate), `customerService.listCustomers`,
and the shared searchable `Select`; options are active, non-deleted, non-disabled customers with a
linked `userId`, labeled with display name plus existing safe directory identifiers. Add an explicit
“No maintenance test customer” option and a clear action. The saved value is the UID required by
the server contract, but it is not presented as the primary label or copied into public state.

The callable revalidates the selected account, so stale/deactivated selections cannot create a
bypass. Helpers never mount this administrative section. Do not reuse the destructive
`CustomerDirectoryTable` actions or build a customer-management page. If a selected account is no
longer in the active directory, show a safe unavailable/clear state and require clearing or a new
valid selection; do not silently substitute another account.

## 5. Firestore/Storage implications and budget gate

- Shared constants/parser/type tests cover the nullable field, bounded UID, absent/null semantics,
  public projection, and no-UID guarantee.
- Functions tests cover owner/admin set/clear, helper/customer denial, invalid/inactive target
  rejection, tester/ordinary/different/guest decisions, removal immediacy, OFF equivalence, and
  ordinary business-rule enforcement.
- Firestore Rules retain all existing ownership/field/role predicates. Refactor the maintenance
  helper so one settings document read feeds the OFF or ON+matching-UID decision; do not add a
  second settings lookup on a path. Re-measure access-call and expression budgets for profile,
  favorites, print requests, items, notification markers, and any newly guarded customer path.
- Storage Rules apply the same one-document decision to source/ZIP and assisted pending customer
  create/update/delete mutations. Staff reads/writes retain their current gates. Re-run the
  complete Storage emulator suite, including tester allowed and ordinary denied cases.
- No indexes, migrations, initialization document, production settings mutation, or hard-coded
  account is introduced. An absent settings document remains OFF.

## 6. Exact implementation areas

Portal:

- `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx`
- `apps/portal/features/maintenance/services/portalMaintenanceService.ts`
- `apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx`
- new `apps/portal/features/maintenance/components/PortalMaintenanceTestBanner.tsx`
- `apps/portal/features/navigation/components/PortalAppShell.tsx`
- `apps/portal/styles/shell.css` and, if needed for the document landmark, `apps/portal/app/globals.css`
- `apps/portal/features/admin-show-queue/components/PortalAdminAuthGate.tsx`
- `apps/portal/styles/admin-show-queue.css`
- `apps/portal/features/admin-show-queue/adminShowQueue.contract.test.ts`

Studio:

- `apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.tsx`
- `apps/studio/src/renderer/src/features/settings/hooks/usePortalMaintenanceSettings.ts`
- `apps/studio/src/renderer/src/features/settings/services/portalMaintenanceSettingsService.ts`
- `apps/studio/src/renderer/src/features/settings/pages/SettingsPage.tsx` only if tab wiring/types
  require it
- existing `features/customers/hooks/useCustomersDirectory.ts`,
  `features/customers/services/customerService.ts`, `features/users/utils/customerDirectorySearch.ts`,
  and shared `Select.tsx` as reused infrastructure (not redesigned)

Backend/shared/rules:

- `packages/shared/src/constants/portal/portalMaintenance.constants.ts`
- `functions/src/lib/portalMaintenance.ts`
- `functions/src/getPortalMaintenanceState.ts`
- `functions/src/updatePortalMaintenanceState.ts`
- `functions/src/index.ts` only if a new export is required (no new public bypass callable is planned)
- the existing 28 guarded customer callable source files and their contract test
- `firestore.rules` and `storage.rules`
- maintenance/shared, callable, Rules, Portal, Studio, and admin contract tests in their existing
  locations

## 7. Updated automated test scope

Add targeted cases for:

- OFF normal behavior with and without configured tester;
- ON normal customer blocked, configured active tester allowed, different customer blocked, guest
  blocked, and removing the tester immediately removing bypass;
- stale normal client cannot mutate through any guarded callable, direct Firestore write, or direct
  Storage write;
- tester cannot bypass authentication, customer ownership, account active/deleted/disabled,
  quotas, DPI/sizing, lifecycle, upload validation, content validation, or other business rules;
- public state never contains the UID and caller-specific boolean is correct for tester/ordinary/
  guest/staff callers;
- owner/admin can set and clear; helper/customer/direct client cannot configure;
- Firestore tester allowed/ordinary denied and Storage tester allowed/ordinary denied on every
  affected path, with access-call/expression budget assertions;
- yellow banner appears only for the authorized tester while ON and disappears OFF;
- blocked maintenance replacement has no mounted background shell, no pointer/keyboard exposure,
  accessible landmark/focus/retry behavior, friendly ON/unknown copy, and no raw errors;
- Admin Show Queue denial remains authorization-correct and is centered/card-styled;
- the frozen 28-source/34-deployed-callable guard coverage remains green.

Existing Portal typecheck, Functions build, changed-source lint, full Firestore/Storage Rules
regression, and Studio baseline-blocker documentation remain required at Test. No test is run in
this planning/review pass.

## 8. Revised short Owner DEV-QA journey

After implementation and Test, owner QA should perform only this DEV journey:

1. With maintenance OFF, verify the Portal works normally.
2. Turn ON in Studio; verify a normal customer sees the centered, full-screen friendly block.
3. Confirm an already-loaded normal customer cannot use stale controls to mutate.
4. Configure one active customer as the maintenance tester; sign in and verify normal Portal access
   plus the persistent yellow tester banner.
5. Complete one representative safe customer mutation as the tester.
6. Sign in as a different customer and verify the full-screen block remains.
7. Verify owner/admin `/admin/show-queue` recovery remains available.
8. Verify an unauthorized customer sees the centered styled Access denied state and existing Sign out.
9. Turn OFF; verify normal behavior returns and the tester banner disappears.

Automated coverage supplies mutation breadth. Codex must not perform this owner QA on the owner's
behalf.

## 9. Risks and explicit non-goals

Primary risks are Rules budget pressure from the additional UID predicate, a stale/deactivated
selection in Studio, and accidental public disclosure of the private UID. The one-document Rules
read, server-side target validation, public projection test, and full source/Rules contracts are
mandatory mitigations.

Out of scope: multiple testers/groups, feature flags, impersonation, support access, scheduled
maintenance, notifications/status pages, unrelated visual redesign, parent rollout, production
activation, data operations, new routes, and any broad Function deployment.

## 10. Plan exit

This amendment is complete for Formal Review. No implementation or deployment may begin until the
owner accepts the reviewed amendment and explicitly advances FreshForge into Implement.
