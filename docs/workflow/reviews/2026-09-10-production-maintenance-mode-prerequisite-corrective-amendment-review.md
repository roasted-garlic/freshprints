# Production maintenance-mode prerequisite — corrective amendment Formal Review

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Goal | `production-maintenance-mode-prerequisite` |
| Review type | Formal Review of corrective Plan Amendment only |
| Plan | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-corrective-amendment-plan.md` |
| Evidence | Original Plan/amendment, prior reviews/implementation/test/deployment records, current source, read-only DEV data |
| Verdict | **approved_with_changes** — implementation-ready after owner acceptance; no implementation authorization |
| Environment | DEV source and `fresh-prints-dev` only; production untouched |

## Review boundary

The owner’s DEV-QA feedback and the additional clarification that merged/disabled accounts must
not be selectable were checked against the existing maintenance Plan, prior amendment, all prior
reviews and deployment evidence, current Portal/Studio/Functions/shared/identity source, Rules,
and read-only DEV records. No app file, Rules file, setting, database, Storage object, deployment,
QA journey, Signoff, commit, push, or production action occurred in this review.

## 1. Proven cause of Studio/Portal copy divergence

The divergence is confirmed in source, not inferred from a cache:

- Shared state has only `message`, with the older default string, in
  `packages/shared/src/constants/portal/portalMaintenance.constants.ts`.
- Studio exposes one `Customer message` textarea and sends `message` through
  `portalMaintenanceSettingsService.update`.
- `PortalMaintenanceExperience.tsx` hard-codes the friendly heading and body in its enabled
  branch and does not consume the context’s saved `message`.
- `getPortalMaintenanceState` cannot return a heading because the public projection has no heading
  field.
- A read-only DEV inspection found the live maintenance document ON with the older saved message
  and no heading field. The document was not changed.

This is a contract/source-of-truth defect. A Portal rebuild is not required to correct it.

## 2. Reviewed shared copy contract

The amendment preserves `message` as the body and adds one optional `heading` field to the existing
private settings/input/public contracts. The reviewed defaults are:

```text
heading: “We’re making a few improvements!”
message: “The Fresh Prints Portal is taking a quick maintenance break. We’ll be back shortly. Thanks for hanging tight!”
```

Missing state remains OFF. Missing heading/body values use those friendly defaults. Existing
documents with an explicit older `message` remain valid saved copy and are not migrated or mutated;
Studio can replace the body. Present malformed values retain the trusted reader’s fail-closed
behavior and the client’s safe normalization. The public projection contains only `enabled`,
customer-safe `heading`/`message`, and `maintenanceTestAccessGranted`; no UID or audit/security
fields become public. The fixed `Check again` label remains UI copy.

The Portal context will render the saved heading/body for the known ON state. Loading/unknown/read-
error copy remains fixed friendly application copy and never exposes raw errors. Existing callable,
focus/visibility, and bounded polling refreshes provide runtime convergence without rebuilding the
Portal.

## 3. Reviewed Studio form primitives and styling

The exact existing primitives to reuse are:

- `card settings-section`, `settings-section-header`, `settings-section-title`, and
  `settings-section-description`;
- `settings-form-grid`, `settings-control-item`, `settings-form-actions`, and
  `settings-field-hint`;
- `settings-field-label` with `settings-text-input` for the single-line heading;
- `settings-field-label` with `settings-textarea-input` for the multiline body;
- existing `Toggle`, searchable `Select`, and `Button` components.

These classes and controls are defined/used by neighboring Settings sections in
`apps/studio/src/renderer/src/styles/components/settings.css` and Portal Help/Social Meta. The
current bare `<textarea>` lacks the label/input classes, which proves the browser-default white
appearance. The shared `Select` already supports search, keyboard interaction, `aria-disabled`, and
`SelectOption.disabled`; no new CSS or visual system is needed.

## 4. Proven root cause of the selected-customer rejection

The rejected option was traced end-to-end:

| Stage | Finding |
|---|---|
| Directory | `customerService.listCustomers` maps customer identity flags and `userId`; it does not join customer-role user status. |
| Selector filter | `PortalMaintenanceSettingsSection` requires a truthy `userId`, non-guest, non-deleted, and non-disabled, but omits `isMerged`/`mergedIntoCustomerId` and cannot see user `isActive`. |
| Value/payload | The selector maps `value: customer.userId`; `Select` emits it unchanged; the service sends it as `maintenanceTestCustomerUid`. This is the Firebase UID expected by the callable, not a customer-document-ID mapping bug. |
| Server validation | `savePortalMaintenanceState` → `validateConfiguredTester` → `isActiveLinkedCustomer` requires an existing customer user with role `customer`, `isActive === true`, not deleted, and a linked customer not deleted/disabled/guest. The current helper does not reject merged customer flags. |

Read-only DEV data identifies the owner’s `Chris hawkins · @merged-src-*` option as customer
document `EfsIkDIf48a2uHk5OzwM` with `isMerged: true`,
`mergedIntoCustomerId: clv0GIjfRp1Gf7GO7yqs`, `isGuest: false`, and no deleted/disabled flag. Its
linked user is a customer with `isActive: false`. The survivor document is separate and linked to a
different active UID. Thus the server rejection is correct because the selected linked user is
inactive, while the UI is wrong to offer a merged source. The `merged-src-*` label is corroborated
by the identity flags but is not treated as the rule itself.

## 5. Reviewed corrective tester eligibility/mapping design

The review requires one trusted eligibility helper in `functions/src/lib/portalMaintenance.ts` to be
used by candidate listing, save validation, caller-specific public access, and the mutation guard.
Eligibility requires a linked user with role `customer`, `isActive === true`, not deleted, and one
linked customer record that is non-guest, non-deleted, non-disabled, non-merged, and has no nonblank
`mergedIntoCustomerId`. A post-configuration status/merge change must remove bypass access on the
next trusted read. Existing auth, ownership, quota, lifecycle, upload, and business checks remain
unchanged; the tester bypasses only the maintenance prohibition.

Because Firestore Rules do not permit an owner/admin directory query of customer-role `users` (the
existing `/users` read rule is limited to self/team profiles), the current client directory cannot
establish this contract by filtering customer documents alone. The bounded corrective therefore
adds an owner/admin-only read callable, `listPortalMaintenanceTestCustomers`, returning only safe
option metadata `{ uid, displayName, username? }`. It is read-only, denied to guests/customers/
helpers, and is not a customer-management endpoint. Studio’s maintenance selector uses these
options and passes the UID unchanged to the existing update callable. Merged, disabled, deleted,
guest, orphaned, and inactive-user records do not appear as ordinary options. A configured UID that
falls out of the list is shown only as a disabled unavailable row with a clear action.

The existing update callable still revalidates the UID and retains the stable invalid-target error;
the corrective does not weaken backend checks. The shared guard must revalidate the trusted
eligibility for an ON tester, preventing a stale pre-merge/inactive configuration from becoming a
bypass. The existing 28-source/34-customer-callable guard manifest remains a hard gate; any shared
guard change requires an explicit narrow redeployment allowlist after inventory regeneration.

This is a narrow read-only control-plane addition required to make the UI and Functions use the
same eligibility definition. It does not redesign customer identity, add multiple testers, or
change Rules authorization.

## 6. Files to touch in the later Implement phase

### Shared/backend

- `packages/shared/src/constants/portal/portalMaintenance.constants.ts` and tests — heading/body
  defaults, bounds, contracts, normalization, public projection.
- `functions/src/lib/portalMaintenance.ts`, `getPortalMaintenanceState.ts`, and
  `updatePortalMaintenanceState.ts` — shared eligibility, merged-aware guard, and copy responses.
- New `functions/src/listPortalMaintenanceTestCustomers.ts` and `functions/src/index.ts` export —
  owner/admin-only candidate list.
- Existing maintenance unit/integration tests and `tests/portalMaintenance.contract.test.ts` —
  exact mapping, eligibility, guard/export, and nondisclosure.

### Portal

- `apps/portal/features/maintenance/context/PortalMaintenanceContext.tsx`;
  `services/portalMaintenanceService.ts`; `components/PortalMaintenanceExperience.tsx`; and the
  existing maintenance contract tests — saved heading/body, defaults, runtime convergence, and
  no raw error/UID behavior.

### Studio

- `PortalMaintenanceSettingsSection.tsx`, `usePortalMaintenanceSettings.ts`, and
  `portalMaintenanceSettingsService.ts` — separate copy fields, candidate-list service, exact UID
  draft/payload, and unavailable/clear behavior.
- New focused Settings contract tests. Reuse `Select.tsx`, `Toggle`, `Button`, existing settings
  classes, and identity field types only; do not redesign the general customer directory.

Rules are expected to require no semantic change for this copy/list correction. If implementation
touches a Rules predicate, it must remain within reviewed maintenance paths and pass the existing
access-call/expression budgets and full emulator suites.

## 7. Required test changes and gates

Focused coverage must prove:

- friendly heading/body defaults, custom owner/admin save, private response, public projection,
  Portal saved-copy rendering, runtime copy convergence without rebuild, malformed-copy safety, and
  UID nondisclosure;
- native Studio classes/primitives, labels, focus/error/disabled/character behavior, searchable
  accessible Select, disabled unavailable row, and clear action;
- owner/admin-only candidate list, active linked candidate inclusion, and exclusion of merged,
  disabled, deleted, guest, orphaned, and inactive-user records;
- exact UID preservation from trusted candidate list → Select → draft → callable;
- server rejection of inactive/disabled/deleted/guest/merged/orphaned targets and immediate clear;
- trusted tester/different/ordinary/guest decisions, stale configured-account behavior, and all
  existing customer business-rule restrictions;
- the prior 28-source/34-callable guard contract, Firestore/Storage Rules suites, full-screen shell,
  tester banner, and centered Admin Show Queue denial.

Required repository checks remain Portal typecheck, Functions build, changed-source lint,
`git diff --check`, and the full Firestore/Storage Rules emulator regression. The prior documented
Studio baseline diagnostics and Windows Portal `.next/trace` EPERM condition remain environment
constraints unless independently changed. No test is run in this planning/review pass.

## 8. Revised short Owner DEV QA

After owner acceptance, implementation, Test, and reviewed narrow DEV redeployment, owner QA is:

1. Confirm the maintenance section matches neighboring Studio Settings visually.
2. Confirm separate styled `Maintenance heading` and `Maintenance message` fields.
3. Save custom values and confirm Portal shows exactly those values after runtime refresh, without a
   Portal rebuild.
4. Confirm merged and disabled accounts are absent from the tester selector; select a known-valid
   active linked customer and save successfully.
5. With ON, confirm an ordinary customer receives the full-screen maintenance state, the configured
   tester receives normal Portal plus the yellow banner and completes one safe mutation, and a
   different customer remains blocked.
6. Confirm unauthorized `/admin/show-queue` retains the centered styled denial.
7. Turn OFF and confirm normal Portal behavior and banner removal.

Codex must not perform this QA or advance to Signoff for the owner.

## 9. Formal review gates and risks

The amendment is accepted for implementation only if the later Implement/Test evidence proves the
single trusted eligibility helper is used by list/save/public/guard paths; private UID non-disclosure;
merged/disabled exclusion; exact UID mapping; no auth or business-rule weakening; native Studio
styling; no unsafe copy fallback; and preserved prior security/Rules contracts. A Rules budget
failure, ordinary-rule regression, public UID leak, stale merged/inactive bypass, or inability to
keep the candidate list owner/admin-only blocks implementation review and DEV deployment.

The new candidate-list callable is the only scope expansion beyond the prior amendment, and it is
justified by the documented Rules boundary: Studio cannot read customer-role user status directly.
No index, migration, initialization document, production setting mutation, hosting, Studio publish,
parent candidate, or broad Functions deployment is part of this amendment.

## 10. Verdict and next command

**Verdict: APPROVED WITH CHANGES.** The corrective Plan is bounded, source-backed, security-
preserving, and implementation-ready after owner acceptance. “With changes” records the mandatory
shared-eligibility, merged/disabled exclusion, copy-contract, focused-test, and exact-allowlist
gates; it is not implementation or deployment authorization.

The owner must explicitly accept this corrective amendment, then run **`Continue FreshForge`** to
enter Implement. Until that happens, remain stopped: no code, DEV or production deployment,
settings mutation, Owner DEV QA, Signoff, commit, push, or parent rollout.
