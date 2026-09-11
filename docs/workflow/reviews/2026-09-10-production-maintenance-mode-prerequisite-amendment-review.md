# Production maintenance-mode prerequisite — owner DEV-QA amendment Formal Review

| Field | Value |
|---|---|
| Date | 2026-09-10 |
| Goal | `production-maintenance-mode-prerequisite` |
| Review type | Formal Review of Plan Amendment only |
| Plan | `docs/workflow/plans/2026-09-10-production-maintenance-mode-prerequisite-amendment-plan.md` |
| Evidence | Original Plan/Review/Inventory/Test/DEV deployment records and current source |
| Verdict | **approved_with_changes** — amendment is implementation-ready after owner acceptance; no implementation authorization |
| Production | untouched |

## Review boundary

The owner requested three refinements before Signoff. This review validates the bounded amendment
and its source evidence only. No app code, Rules, settings, database, Storage object, deployment,
QA journey, Signoff, commit, push, or production action occurred in this pass.

## 1. Amended architecture

The amendment keeps the existing `settings/portalMaintenance` control plane, shared constants,
trusted Functions resolver, callable guard, Firestore/Storage Rules predicates, Portal maintenance
provider, and separate admin shell. It adds one optional private field,
`maintenanceTestCustomerUid`, and one public-safe caller boolean,
`maintenanceTestAccessGranted`. The UID is stripped from the public projection. The Portal shell
will return the maintenance replacement before mounting customer providers/navigation/drawer/page
children, while the separate `/admin` layout remains outside that branch.

This is an additive change to the reviewed design, not a new routing, feature-flag, impersonation,
or admin-bypass architecture.

## 2. Test-customer bypass design

- Exactly one optional UID is stored; omitted/null means no bypass.
- Only the active owner/admin callable can set or clear it; direct client writes, helpers, and
  customers remain denied.
- The callable validates the UID against an active, non-deleted, non-disabled linked customer.
- The shared callable guard receives the authenticated UID (after existing customer validation) and
  skips only the maintenance prohibition for that one account. It still enforces authentication,
  ownership, active-account status, quotas, sizing/DPI, lifecycle, upload/content validation, and
  every existing business rule.
- Firestore and Storage Rules compare `request.auth.uid` to the private field only inside the
  existing customer/ownership predicates. Missing/OFF remains allowed; ON ordinary/different/guest
  writes remain denied; malformed state fails closed.
- The public state callable returns a boolean only. It never returns, logs, or embeds the UID.
- Clearing the field removes the bypass on the next trusted read; OFF is identical with or without a
  configured tester.

## 3. Exact source areas identified

The plan names every existing owner of the change:

- Portal maintenance context/service/experience, `PortalAppShell`, shell styles, and a new tester
  banner component;
- `PortalAdminAuthGate`, `admin-show-queue.css`, and the existing admin contract test;
- shared maintenance constants;
- `functions/src/lib/portalMaintenance.ts`, both existing maintenance callables, and the existing
  guarded customer callables/contract;
- `firestore.rules` and `storage.rules` (including confirmed direct pending uploads from
  `assistedCreationService.ts`);
- Studio maintenance section/hook/service and existing settings tab wiring;
- reusable Studio `useCustomersDirectory`, `customerService.listCustomers`, `filterCustomers`, and
  searchable shared `Select`.

The source confirms the currently unguarded assisted pending create/update uploads are direct
customer Storage mutations; the amendment correctly brings them under the maintenance predicate.

## 4. Studio tester-selection review

The proposed selector is appropriately narrow. `useCustomersDirectory` is already owner/admin
gated, `customerService.listCustomers` already maps customer `userId`, the directory search helper
already handles safe labels, and shared `Select` already provides keyboard-searchable options.
The maintenance section can therefore show active linked customers and a clear option without
reusing destructive customer-management actions or introducing a new route/service. The saved UID
is an implementation value, not the primary operator display. Server-side validation handles stale
or deactivated selections.

## 5. Full-screen maintenance UX review

The shell-level early return is the correct isolation mechanism: blocked customers have no mounted
Sidebar, header, bottom nav, drawer, mutation providers, or page children to click or tab into.
Loading and state-read failures remain fail-closed but use friendly, nontechnical copy. Known ON
uses the requested “We’re making a few improvements!” message and “Check again” action. No raw
`internal`, permission, stack, or configuration error is rendered. The authorized tester alone
receives the normal shell plus a persistent yellow `role="status"` banner; OFF removes it.

The plan retains existing bounded refresh/focus/visibility behavior and backend guards, so stale
clients cannot rely on UI state.

## 6. Admin Show Queue denial review

`PortalAdminAuthGate` already has the correct redirect and `portal-admin` success predicates. The
amendment changes only presentation: static customer-safe copy, a centered full-viewport card,
responsive token-based styling, visible focus, and the existing Sign out action. It deliberately
does not add a login path, alter roles, or expose technical `error` text. The admin contract will
assert both authorization correctness and the new presentation hooks.

## 7. Rules/Storage and budget review

The Rules exception is limited to the maintenance-specific predicate; all ownership, field, role,
path, size, and staff checks remain in place. The plan requires a single settings-document read per
path and explicit access-call/expression budget measurements for every affected Firestore and
Storage match. It also requires full emulator regression, tester-allowed/ordinary-denied fixtures,
and the existing 28-source/34-deployed-callable mechanical coverage. No index is proposed.

## 8. Formal questions

| Question | Finding |
|---|---|
| 1. Can one tester become an authorization bypass? | No by design: one nullable UID, active linked-customer validation, existing customer guard first, and no client-controlled comparison. |
| 2. Do Firestore and Storage obey the same exception? | Yes: the same trusted settings UID predicate is added to all customer direct-write paths, including assisted pending uploads. |
| 3. Is the UID ever public? | No: public state exposes only `maintenanceTestAccessGranted`; private UID is limited to owner/admin control-plane reads and trusted Functions. |
| 4. Does the tester keep ordinary restrictions? | Yes: only the maintenance prohibition is skipped; auth, ownership, account status, quotas, validation, lifecycle, uploads, and business rules remain. |
| 5. Does full-screen state isolate interaction? | Yes: shell replacement occurs before interactive customer providers and children mount; no background DOM remains. |
| 6. Is owner/admin recovery unaffected? | Yes: `/admin` uses its separate layout/gate/shell and remains outside the customer branch. |
| 7. Is Studio scope minimal? | Yes: existing directory/search/Select primitives are reused; no new customer-management UI. |
| 8. Are Rules budgets viable? | Plausibly yes with one settings read, but implementation must re-measure and stop if any affected path exceeds its budget. |
| 9. Can the current DEV implementation be amended without rearchitecting? | Yes: all changes fit the existing provider, callable, settings, Rules, and separate-admin boundaries. |

## 9. Required implementation gates

Before any Implement phase may close, the implementation must prove: public UID non-disclosure;
owner/admin-only set/clear; active-customer validation; tester/different/guest/OFF decisions;
full callable/Firestore/Storage ordinary-rule preservation; pending Storage coverage; full-screen
keyboard/pointer isolation; friendly copy; tester banner behavior; centered admin denial; Rules
budgets; and the frozen 28-source/34-deployed-callable guard contract. Any budget failure,
ordinary-rule regression, public UID leak, or inability to reuse the bounded Studio selector blocks
implementation review.

## 10. Remaining `[NEEDS REPO CHECK]`

**None.** The original placeholders are resolved from source inspection and the amendment makes the
new field/API names explicit. Implementation must still validate the names/types against the shared
contracts as a normal compile/test gate, not as an open design question.

## Review decision and next action

**Approved with changes.** The amendment is bounded, evidence-based, security-preserving, and fits
the existing DEV implementation. “With changes” records the required implementation/test gates
above; it is not an authorization to implement or deploy. The owner must accept this amended Plan,
then run **`Continue FreshForge`** to enter Implement. Until then, remain stopped: no code, DEV or
production deployment, settings mutation, Owner QA, Signoff, commit, push, or parent rollout.
