# Production maintenance-mode prerequisite — corrective amendment

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Goal | `production-maintenance-mode-prerequisite` |
| Workflow | Managed Phase — corrective Plan Amendment |
| Base Plan | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-plan.md` |
| Prior amendment | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-amendment-plan.md` |
| Status | Formal Review recorded separately; implementation is not authorized |
| Environment | DEV source and `fresh-prints-dev` only; production untouched |

## 1. Goal and stop boundary

Owner DEV QA found three bounded defects before accepting the maintenance prerequisite:

1. Studio and Portal do not use one source of truth for customer-facing maintenance copy.
2. The Studio maintenance form does not use the established Settings form styling.
3. The tester selector presents an ineligible merged/inactive account and the save is rejected.

The owner additionally clarified that disabled and merged customer accounts must not appear as
ordinary maintenance-test choices. This amendment corrects those defects without changing the
maintenance product contract, customer identity model, or parent production rollout.

This pass is Plan Amendment → Formal Review only. It performs no implementation, DEV deployment,
settings mutation, Owner DEV QA, Signoff, commit, push, production action, candidate freeze, or
parent rollout. Implementation requires owner acceptance of this reviewed amendment followed by
`Continue FreshForge`.

## 2. Evidence-backed findings

### 2.1 Proven copy divergence

The current source has two independent customer-copy sources:

| Surface | Evidence | Current behavior |
|---|---|---|
| Shared/private contract | `packages/shared/src/constants/portal/portalMaintenance.constants.ts` defines only `message`, with `PORTAL_MAINTENANCE_DEFAULT_MESSAGE` set to `Fresh Prints Portal is temporarily in read-only maintenance mode. Please try again soon.` | There is no heading field. Missing state resolves to the older message. |
| Studio | `apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.tsx` binds one `Customer message` textarea to `draft.message`; `portalMaintenanceSettingsService.ts` sends that same field to `updatePortalMaintenanceState`. | Studio edits the old body field only. |
| Portal | `apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx` hard-codes `We’re making a few improvements!` and `The Fresh Prints Portal is taking a quick maintenance break. We’ll be back shortly. Thanks for hanging tight!` in its enabled branch. It does not render `usePortalMaintenance().message`. | Portal ignores the saved body and maintains a second fixed copy source. |
| Public state | `getPortalMaintenanceState` uses `loadPortalMaintenancePublicState`, which projects `enabled`, `message`, and `maintenanceTestAccessGranted`. | A heading cannot reach the Portal. |
| DEV read-only evidence | The current `fresh-prints-dev/settings/portalMaintenance` document is present and ON; its saved message is the older string and no heading field is present. The document was read only and not changed. | This matches the Owner QA observation. |

The divergence is therefore a source/contract defect, not a cache or Portal rebuild problem.

### 2.2 Proven Studio styling defect

The maintenance section uses the normal `card settings-section`, `settings-section-header`,
`settings-form-grid`, `settings-control-item`, `settings-field-hint`, `settings-form-actions`,
`Toggle`, `Select`, and `Button` primitives, but the message control is a bare `<textarea>` inside
`.settings-control-item`. It lacks both `settings-field-label` and `settings-textarea-input`.
The established styles in
`apps/studio/src/renderer/src/styles/components/settings.css` therefore do not apply, producing
the browser-default white textarea observed by the owner. Neighboring Portal Help and Social Meta
sections use `settings-field-label`, `settings-text-input`, and `settings-textarea-input`.

The shared `Select` at
`apps/studio/src/renderer/src/shared/components/Select.tsx` already supports searchable options,
keyboard interaction, `aria-disabled`, and `SelectOption.disabled`; no second visual system is
needed.

### 2.3 Proven selected-customer rejection chain

The rejected option was traced from the current Studio source and read-only DEV records:

1. `useCustomersDirectory` calls `customerService.listCustomers`.
2. `customerService.listCustomers` maps the entire `customers` collection, including `userId`,
   `isGuest`, `isDeleted`, `isDisabled`, `isMerged`, and `mergedIntoCustomerId`.
3. `PortalMaintenanceSettingsSection` currently filters only for a truthy `userId`, not guest,
   deleted, or disabled flags. It does **not** exclude `isMerged` or a non-empty
   `mergedIntoCustomerId`, and it has no trusted user-status information. It maps
   `value: customer.userId`.
4. `Select` emits that value unchanged; `portalMaintenanceSettingsService.update` sends it as
   `maintenanceTestCustomerUid` to `updatePortalMaintenanceState`.
5. `savePortalMaintenanceState` calls `validateConfiguredTester`, whose `isActiveLinkedCustomer`
   lookup requires `users/{uid}` to exist, have role `customer`, have `isActive === true`, and not
   be deleted, then requires a linked customer that is not deleted, disabled, or guest.

The matching DEV record (the owner’s `Chris hawkins · @merged-src-*` option) is:

| Record | Read-only DEV evidence |
|---|---|
| Customer document | `EfsIkDIf48a2uHk5OzwM` (`Chris hawkins`, username `merged-src-efsikdif`), `userId` `9w2eIfbTGde0kdImEj5wbT1ibFJ3`, `isGuest: false`, `isMerged: true`, `mergedIntoCustomerId: clv0GIjfRp1Gf7GO7yqs`, no deleted/disabled flag. |
| Linked user document | Same UID exists with `role: customer`, `isActive: false`; this fails the server’s active-user check. |
| Survivor record | `clv0GIjfRp1Gf7GO7yqs` is a separate active customer with a different user UID. |

The exact mapping is therefore not a customer-document-ID/Firebase-UID mismatch: Studio sends the
Firebase UID the callable expects. The rejection is correct for this record because the linked user
is inactive, and the selector is incorrect because it presents a merged source as selectable. The
current server helper also fails to check the customer’s merged flags, so a pre-existing stale
configuration could outlive a merge; that is a defense-in-depth gap to close in the shared guard.

## 3. Corrective shared copy contract

### 3.1 Additive data-model change

Keep `settings/portalMaintenance` as the only source of truth. Preserve `message` as the body to
avoid a migration and add one optional `heading` field:

```text
heading?: string
message?: string
```

Add shared constants and bounded normalization:

- `PORTAL_MAINTENANCE_DEFAULT_HEADING = "We’re making a few improvements!"`.
- `PORTAL_MAINTENANCE_DEFAULT_MESSAGE = "The Fresh Prints Portal is taking a quick maintenance break. We’ll be back shortly. Thanks for hanging tight!"` for missing/empty client-safe body values.
- Keep the existing message bound (240 characters) and introduce a small heading bound (implementation may use 120 characters, subject to the existing shared validation convention).
- Trim and collapse whitespace as the current message normalizer does. Missing heading/message uses the friendly defaults. A malformed present document remains a trusted read/shape failure for backend mutation/public-state semantics; client normalization remains safe and non-throwing.

Existing documents with the old `message` are preserved as explicit saved body copy; no migration,
initialization write, or production data mutation is required. The owner can replace it from Studio.
The fixed `Check again` label remains application UI copy.

### 3.2 Private and public responses

- `PortalMaintenanceSettings` and `PortalMaintenanceSettingsInput` include optional `heading`.
- The owner/admin Studio subscription and update callable return editable `heading`, `message`, and
  the existing private `maintenanceTestCustomerUid` plus audit fields.
- `PortalMaintenancePublicState` becomes `{ enabled, heading, message, maintenanceTestAccessGranted }`.
- `toPortalMaintenancePublicState` exposes only the customer-safe heading/body and existing caller-
  specific boolean. It never exposes `maintenanceTestCustomerUid`, audit fields, or security data.
- `PortalMaintenanceContext` carries `heading` and `message`. The enabled Portal maintenance
  replacement renders those saved values. Loading/unknown/read-error copy may remain fixed friendly
  application copy and must not render raw errors.
- The existing mount/focus/visibility/20-second refresh path remains the runtime propagation
  mechanism. Saving copy in Studio must converge through that callable without a Portal rebuild.

No general content-management system, multiple headings/messages, scheduled copy, or separate
Portal copy store is introduced.

## 4. Corrective tester eligibility and mapping design

### 4.1 One authoritative eligibility predicate

Extend the trusted maintenance tester resolver in `functions/src/lib/portalMaintenance.ts` so one
server-side eligibility helper is used by listing, save validation, public tester access, and the
mutation guard. An eligible candidate must satisfy all of:

- linked `users/{uid}` exists;
- user `role === "customer"` and `isActive === true` and is not deleted;
- exactly one usable linked customer record is available with a non-empty `userId`;
- customer is not guest, deleted, disabled, or merged;
- `mergedIntoCustomerId` is absent/blank (it is treated as merged by the existing Studio identity
  classifier even when a legacy record omitted `isMerged: true`).

The helper must preserve all existing authentication, ownership, quota, lifecycle, content, upload,
and business-rule checks. A tester bypasses only the maintenance prohibition. If an account becomes
inactive, disabled, deleted, guest, orphaned, or merged after configuration, the guard must no
longer grant the bypass on its next trusted read.

### 4.2 Safe owner/admin candidate list

The current client-readable customer directory cannot prove linked user status: Firestore Rules
permit owner/admin reads of customer documents but do not permit a directory query of customer-role
`users` documents. Therefore, filtering only the existing directory cannot establish the required
shared contract.

Add one narrow owner/admin callable, `listPortalMaintenanceTestCustomers`, that uses the same trusted
eligibility helper and returns only safe option metadata to an authorized Studio Settings session:

```text
{ uid: string, displayName: string, username?: string }
```

The UID is private owner/admin control-plane data, never public Portal state. The callable is
read-only, has no settings/data mutation, and is denied to unauthenticated callers, customers, and
helpers. It is not a customer-management endpoint.

Studio’s maintenance section will use this candidate list for its searchable `Select`; the general
customer directory remains unchanged for its other workflows. Option values are the exact Firebase
UID returned by the trusted list and passed unchanged to `updatePortalMaintenanceState`.

If a saved UID is no longer in the eligible list, Studio renders a disabled unavailable-selection
row plus a clear action; it is never shown as an ordinary selectable tester. Merged, disabled,
deleted, guest, orphaned, and inactive-user records do not appear as ordinary options. The callable
revalidates the exact UID at save time, so a stale Studio list cannot create a bypass.

### 4.3 No weakening of backend validation

The save callable continues to reject invalid targets with the stable
`Choose an active, linked customer account for maintenance testing.` error. The correction removes
ineligible options from the UI and adds merged-state checks to the trusted helper/guard; it does not
make merged, disabled, deleted, guest, inactive, or orphaned records eligible.

The existing 28-source/34-customer-callable guard inventory remains mandatory. If the shared guard
changes, all affected deployed callable exports must be included in the explicit DEV allowlist after
the frozen-source inventory is rerun; no broad Functions deploy is permitted.

## 5. Studio form correction

Keep the current section/card organization and reuse the exact existing primitives:

```text
Portal maintenance
[short explanatory text]

Maintenance status
[Toggle]

Maintenance heading
[settings-field-label + settings-text-input]
[short settings-field-hint]

Maintenance message
[settings-field-label + settings-textarea-input]
[character/help text]

Maintenance test customer
[existing searchable Select]
[short settings-field-hint]

[Save maintenance settings Button]
```

The two copy controls use `settings-field-label`, `settings-text-input`,
`settings-textarea-input`, `settings-field-hint`, normal max-length validation, focus-visible
outlines, disabled states, and dark-theme tokens from
`apps/studio/src/renderer/src/styles/components/settings.css`. The status uses the existing
`Toggle`; the tester uses the existing searchable `Select`; errors/statuses retain the existing
Settings presentation. No new CSS or Settings-page redesign is proposed.

## 6. Files and modules to touch during the later Implement phase

### Shared/backend

- `packages/shared/src/constants/portal/portalMaintenance.constants.ts` and its tests — heading,
  friendly defaults, input/private/public types, normalization, and public UID non-disclosure.
- `functions/src/lib/portalMaintenance.ts` — shared heading/body contract, merged-aware active-linked
  tester eligibility, public projection, and guard revalidation.
- `functions/src/getPortalMaintenanceState.ts` and `functions/src/updatePortalMaintenanceState.ts`
  — updated public/private copy contract and validation messages.
- New `functions/src/listPortalMaintenanceTestCustomers.ts` plus `functions/src/index.ts` export —
  owner/admin-only safe candidate list.
- Existing `functions/src/lib/portalMaintenance.test.ts` and integration tests — target eligibility,
  merged/inactive handling, save/clear, public projection, and guard behavior.
- `tests/portalMaintenance.contract.test.ts` — export/private/public and frozen 28-source/34-callable
  guard contracts.

### Portal

- `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx` — heading state and
  refresh normalization.
- `apps/portal/features/maintenance/services/portalMaintenanceService.ts` — public response type.
- `apps/portal/features/maintenance/components/PortalMaintenanceExperience.tsx` — render saved
  enabled heading/body while retaining fixed friendly loading/error copy and `Check again`.
- Existing maintenance contract tests (or `tests/portalMaintenance.contract.test.ts`) — saved-copy,
  defaults, runtime convergence/no-rebuild, and no raw error/UID checks.

### Studio

- `apps/studio/src/renderer/src/features/settings/components/PortalMaintenanceSettingsSection.tsx`
  — separate heading/body fields, candidate-list selector, unavailable/clear behavior, and exact
  existing form classes.
- `apps/studio/src/renderer/src/features/settings/hooks/usePortalMaintenanceSettings.ts` — heading
  draft/state.
- `apps/studio/src/renderer/src/features/settings/services/portalMaintenanceSettingsService.ts` —
  heading payload and owner/admin candidate-list callable.
- Add focused Settings maintenance contract tests under the existing Settings test locations.
- Reuse only (no redesign): `Select.tsx`, `Toggle`, `Button`, `settings.css`,
  `useCustomersDirectory`/customer identity types as needed for labels and unavailable-state
  compatibility. The general customer directory is not changed to hide records from its other
  workflows.

### Rules and documentation

- `firestore.rules` and `storage.rules` are expected to require no semantic change for copy or the
  owner/admin callable, but the full existing Rules suites must be rerun. If an implementation
  change touches a Rules predicate, it must remain within the reviewed maintenance paths and pass
  the access-call/expression budgets.
- Update `docs/architecture/BACKEND.md` or the appropriate maintenance contract documentation only
  if the new private candidate-list callable is introduced there by repository convention.

## 7. Focused Test Plan

### Copy/settings contract

- Friendly default heading and message for absent/missing values.
- Owner/admin can save custom heading and body; private response returns both.
- Public state returns only customer-safe heading/body plus the caller-specific boolean.
- Portal enabled experience renders saved heading/body; a runtime state refresh changes copy without
  a rebuild or hard-coded enabled copy source.
- Malformed heading/body is normalized or fails closed according to the established trusted-reader
  contract; raw errors never reach customer UI.
- `maintenanceTestCustomerUid` remains absent from public responses and Portal state.

### Studio styling/accessibility

- Separate labels and controls use `settings-field-label`, `settings-text-input`, and
  `settings-textarea-input` plus existing hints/actions.
- Heading/body controls preserve normal focus-visible, error, disabled, character-count, and dark
  token behavior.
- Existing searchable `Select` remains keyboard accessible and supports disabled unavailable state.

### Tester eligibility/mapping

- Candidate list is owner/admin-only and returns exact UID values.
- Active, linked, non-guest, non-deleted, non-disabled, non-merged customer appears.
- Chris’s merged source, disabled, deleted, guest, orphaned, and inactive-user fixtures do not appear
  as ordinary options.
- Exact UID survives candidate list → Select → Studio draft → callable payload.
- Save revalidates the same UID; inactive, disabled, deleted, guest, merged, orphaned, and ambiguous
  targets reject.
- Clearing tester removes the bypass immediately.
- Tester bypass security tests remain green for ordinary/different customers, stale clients, quotas,
  ownership, lifecycle, and business rules.

### Regression gates to preserve

- Existing 28-source/34-customer-callable guard contract.
- Full Firestore and Storage Rules emulator suites, including tester vs ordinary customer, pending
  Assisted Creation paths, and UID nondisclosure.
- Full-screen maintenance replacement, yellow tester banner, and centered Admin Show Queue denial.
- Portal typecheck, Functions build, changed-source lint, and Studio baseline documentation.

No test or deployment is performed in this planning/review pass.

## 8. Revised short Owner DEV QA journey

After owner acceptance, implementation, automated Test, and reviewed narrow DEV redeployment, the
owner needs only:

1. Confirm the Studio Portal maintenance section visually matches neighboring Settings sections.
2. Confirm separate `Maintenance heading` and `Maintenance message` fields are present and styled.
3. Save custom copy and confirm an already-open Portal converges to exactly that heading/body without
   a Portal rebuild.
4. Confirm the tester selector does not show merged or disabled accounts; select a known-valid active
   linked customer and save successfully.
5. With maintenance ON, confirm an ordinary customer gets the full-screen maintenance state, the
   configured tester gets normal Portal plus the yellow banner, and the tester completes one safe
   mutation.
6. Confirm unauthorized `/admin/show-queue` still shows the centered styled denial.
7. Turn maintenance OFF and confirm normal Portal behavior and no tester banner.

Codex must not perform this Owner DEV QA or advance to Signoff on the owner’s behalf.

## 9. Deployment and rollback boundary for the later phase

After owner acceptance and passing Test, deploy only the exact maintenance dependencies to
`fresh-prints-dev`: the new owner/admin candidate-list callable, updated `getPortalMaintenanceState`
and `updatePortalMaintenanceState`, and every existing guard-bearing callable required by the
shared eligibility/guard change. Firestore/Storage Rules are deployed only if implementation
actually changes them; no indexes, hosting, Studio publish, production, parent candidate, broad
`functions` target, `--force`, or data operation is allowed.

Record the exact allowlist, ACTIVE revisions, Rules results, and post-deploy copy/eligibility checks.
If a stale configured tester is no longer eligible, the owner must clear it through the existing
owner/admin control; Codex must not mutate the setting during implementation/deployment without a
separate explicit owner instruction. Rollback is the recorded prior DEV Functions/Rules revision,
not a destructive data operation.

## 10. Acceptance criteria and plan exit

- One shared copy contract drives Studio private settings, public callable state, Portal context, and
  the enabled customer presentation.
- Missing state remains OFF; missing heading/body use the friendly defaults; old saved message data
  is preserved without migration.
- Studio uses native Settings primitives and shows separate heading/body fields.
- Merged and disabled accounts never appear as ordinary tester options; stale/ineligible selections
  cannot create a bypass.
- The exact Firebase UID mapping is tested end-to-end and the trusted server predicate remains the
  final authority.
- Public responses never disclose the private UID or audit fields.
- Existing maintenance security, Rules, full-screen shell, tester banner, and Admin denial tests stay
  green.
- Owner DEV QA remains short and human-performed.

This corrective amendment is complete for Formal Review. No implementation or deployment may begin
until the owner accepts this reviewed amendment and explicitly advances FreshForge into Implement.
