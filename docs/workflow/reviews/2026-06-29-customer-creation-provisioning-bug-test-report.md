# Customer Creation / Provisioning Bug Test Report

## Goal

Verify the managed bug implementation for `customer-creation-provisioning-bug`.

## QA Failure Recorded

Authenticated manual QA found a UX failure in the first implementation:

* the inline customer creation form inside the Print Request create modal made the modal too long
* the Print Request modal could run off-screen
* customer creation should not live inside the Print Request modal

Result: FAIL / needs implementation correction.

## Corrected Scope

The corrected product decision is:

* customer records are created from `/users`
* Print Requests only select existing registered customer records
* customer record creation still writes `customers` with `isGuest: false`
* customer record creation still does not create Firebase Auth accounts
* customer record creation still does not create `users` documents
* customer record creation still does not grant Studio access
* no Portal, checkout, shipping, ecommerce, Whatnot, Phase 7, Firestore rules, or index work is added

## Files Changed By This Bug

* `src/renderer/src/features/customers/services/customerService.ts`
* `src/renderer/src/features/customers/hooks/useCreateCustomerRecord.ts`
* `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
* `src/renderer/src/features/users/components/AddUserModal.tsx`
* `src/renderer/src/features/users/pages/UserManagementPage.tsx`
* `src/renderer/src/styles/components/print-requests.css`
* `src/renderer/src/styles/layout.css`
* `docs/WORKFLOWS.md`
* `docs/project/ROADMAP.md`
* `docs/project/TECH_DEBT.md`
* `.cursor/workflow/state.md`

## Automated Checks

| Command | Exit code | Result |
| --- | ---: | --- |
| `npx eslint src/renderer/src/features/customers/services/customerService.ts src/renderer/src/features/customers/hooks/useCreateCustomerRecord.ts src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx --max-warnings 0` | 0 | PASS |
| `npx tsc --noEmit` | 0 | PASS |
| `npm run lint` | 0 | PASS |
| `npx tsc --noEmit` | 0 | PASS |
| `npm run build` | 0 | PASS |
| `git diff --check` | 0 | PASS |

Build warnings observed:

* Electron Builder reported missing app icons and used default/fallback icon sources.
* Vite reported an existing circular manual chunk warning: `vendor -> react-vendor -> vendor`.

These warnings did not fail the build.

## Corrected Implementation Update

The `/users` flow now follows the standard page success pattern:

* customer create success closes the modal first
* `/users` shows the standard dismissible page-level success alert with countdown/progress line
* `/users` loads customers and shows them in a distinct Customers section
* staff user copy and customer copy remain clearly separated
* staff-facing UI now says `Customer` instead of `Customer record`

## Manual QA Status

Authenticated owner/admin manual QA has now completed successfully.

Passed:

* `/users` loads Staff and Customers sections.
* Customers appear on the `/users` page.
* Customer creation works from `/users`.
* Customer creation uses page-level success alert/toast behavior.
* Customer-facing UI says `Customer`, not `Customer record`.
* Customer rows have edit actions.
* Customer edits work and persist.
* Customer notes no longer show as raw text in the Customers table.
* Customer notes use an indicator icon instead.
* Duplicate email prevention works across staff users and customers.
* Creating a customer with an existing staff/customer email is blocked.
* Creating a staff user with an existing customer email is blocked.
* Editing a customer to use an existing staff/customer email is blocked.
* Request type labels are now `Internal` and `Customer`.
* `Registered customer` is no longer visible in user-facing UI.
* `Guest customer` is no longer available in the new Print Request create flow.
* Customer request creation works.
* Internal request creation works.
* Switching Request type from Customer to Internal clears the selected customer.
* Switching Request type from Customer to Internal clears the customer-generated request name.
* Switching Request type from Customer to Internal leaves the internal request name input reset and editable.
* Customer requests can add approved catalog designs.
* Quantity selection works.
* Requests and request items persist after reload.
* Design Library request-selection mode still works.
* Source designs remain `status: ready`.
* No queued, printed, pending, done, or production/request lifecycle status is written to design records.
* No Firebase Auth account is created for customers.
* No `users/{uid}` document is created for customers.
* Customers do not gain Studio access.
* No Portal work was added.
* No Phase 7 work was added.
* No checkout, shipping, payment, Whatnot, ecommerce, or fulfillment work was added.

## Result

Current status: PASS

Signoff recommendation: PASS. The corrected `/users`-based customer creation path passed authenticated owner/admin manual QA, final automated checks passed, customer records remain customer records only, and design lifecycle status remains clean.
