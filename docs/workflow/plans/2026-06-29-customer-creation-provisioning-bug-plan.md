# Customer Creation / Provisioning Bug Plan

## Goal

Resolve the Phase 6 blocker where registered customer Print Request testing cannot be completed because Studio currently has no working way for owner/admin staff to create or provision customer records from User Management.

## Managed Bug

`customer-creation-provisioning-bug`

## Current Finding

The existing User Management implementation is team-user-only by design:

* `createTeamUser` is scoped to `admin` and `helper` accounts.
* `permissionService.getCreatableTeamUserRoles` returns only team roles.
* `AddUserModal` copy says it creates admin or helper accounts.
* The prior User Management Cloud Functions plan explicitly marks customer account creation from desktop as out of scope.

That means the observed blocker is not a broken customer option in the current team-user modal. It is a missing Phase 6 customer provisioning path.

## Recommended Scope

Implement a narrow Studio path for owner/admin staff to create registered customer records in `customers`.

This supports Phase 6 Print Requests without creating customer Auth accounts, Portal login, checkout, shipping, ecommerce, or Phase 7 Print Runs.

## Scope Clarification

For this bug, "registered customer" should mean a non-guest `customers/{customerId}` document:

```txt
isGuest: false
userId: omitted unless a future Portal/Auth account exists
```

Customer Firebase Auth user creation is not required for Phase 6 Print Requests. Auth-backed customer accounts belong to Fresh Prints Portal planning unless separately approved.

## In Scope

* Add a staff-visible registered customer creation path in Studio.
* Keep the existing Add User / team-user flow scoped to owner/admin/helper accounts.
* Create `customers` records with:
  * `displayName`
  * optional `email`
  * optional `notes`
  * `isGuest: false`
  * `totalPrintRequests: 0`
  * `createdAt`
  * `updatedAt`
* Reuse centralized permission checks through `permissionService.canManageCustomers`.
* Keep Firebase access in a service layer, not components.
* Ensure created customer records appear in Print Request customer selection.
* Add UI copy that distinguishes staff users from customer records.
* Preserve Phase 6 Print Request behavior for internal and guest requests.
* Update docs if the implemented workflow changes behavior.

## Out Of Scope

* Customer Auth account creation.
* Customer password reset, invite email, or Portal login.
* Fresh Prints Portal implementation.
* Giving customer-role users access to Fresh Prints Studio.
* Firestore rules changes unless a later review proves the existing rules are insufficient.
* Firestore index changes.
* Cloud Functions changes unless the approved implementation explicitly expands into Auth provisioning.
* Phase 7 Print Runs.
* Checkout, shipping, payments, ecommerce, Whatnot, analytics dashboard, or production deploys.

## Architecture Impact

Use the existing layer rules:

```txt
Component
  -> Hook
  -> Service
  -> Firebase
```

Expected implementation shape:

| Layer | Responsibility |
| --- | --- |
| Components | Render customer creation UI and messages only |
| Hooks | Own modal/form state and request wiring |
| Service | Validate input, enforce permission helper, write `customers` document |
| Firestore | Store customer metadata only |

Recommended service ownership:

* Create a customer-focused service if one does not already exist.
* Avoid growing `printRequestService` into a general customer management service.
* Keep `printRequestService` responsible for Print Request creation and item workflows.

## Data Model Impact

Use the existing `Customer` model in `shared/types/customer/customer.types.ts`.

No schema expansion is required for Phase 6. `userId` remains optional and should not be fabricated.

Registered customer records created by this bug should differ from guest customers only by:

```txt
isGuest: false
```

## Firebase Impact

Existing rules already allow active staff to create and update `customers`. The first implementation pass should not change Firestore rules or indexes.

If implementation discovers that production rules differ from repository rules, stop and report instead of weakening rules.

## Security Considerations

* Customers must not gain Studio access.
* Do not create `users/{uid}` documents for customers in this bug unless the plan is revised and approved.
* Do not create Firebase Auth users in the renderer.
* Do not expose Admin SDK credentials.
* Do not weaken Firestore rules.
* Use `permissionService.canManageCustomers` in the renderer/service layer.
* Treat owner/admin customer creation as UI/service policy even if Firestore rules currently allow all active staff.

## UI Considerations

Recommended UX:

* Keep Print Request create modal focused on request creation only.
* Create customer records from `/users` through the Add User modal/path, with a clear create-type distinction between staff users and customer records.
* Use copy such as "Create a customer record for Print Requests. Portal login comes later."
* Ensure Print Request creation can select existing customer records only.
* Avoid implying a customer account, invite, or password is created.

## Implementation Correction Note

Manual QA rejected the first implementation that embedded customer record creation inside the Print Request create modal. The corrected product decision is:

* customer records are created from `/users`
* Print Requests only select existing registered customer records
* inline customer creation inside Print Requests is out of scope for this bug

## Files To Inspect Before Implementation

* `src/renderer/src/features/users/pages/UserManagementPage.tsx`
* `src/renderer/src/features/users/components/AddUserModal.tsx`
* `src/renderer/src/features/users/services/userManagementService.ts`
* `src/renderer/src/features/permissions/services/permissionService.ts`
* `src/renderer/src/features/print-requests/services/printRequestService.ts`
* `src/renderer/src/features/print-requests/hooks/useCustomers.ts`
* `src/renderer/src/features/print-requests/components/PrintRequestModal.tsx`
* `src/renderer/src/styles/components/user-management.css`
* `shared/types/customer/customer.types.ts`
* `firestore.rules`

Use `[NEEDS REPO CHECK]` for any path that differs.

## Acceptance Criteria

* Owner/admin staff can create a registered customer record from Studio.
* Created customer records have `isGuest: false`.
* Created customer records do not create or require Firebase Auth users.
* Created customer records appear in Print Request registered customer selection.
* Internal and guest Print Request flows still work.
* Existing team-user creation still creates only admin/helper accounts.
* Customer-role users still cannot access Studio.
* No production/request lifecycle statuses are written to design documents.
* No Portal, checkout, shipping, ecommerce, Whatnot, or Phase 7 work is added.
* Firestore rules and indexes are unchanged unless separately approved.

## Required Checks After Implementation

Run and report exact commands and exit codes:

* `npm run lint`
* `npx tsc --noEmit`
* `npm run build`
* `git diff --check`

## Manual QA After Implementation

1. Sign in as owner.
2. Open User Management.
3. Confirm Add User remains team-user-only.
4. Create a customer record with display name and optional email.
5. Confirm success message does not mention Portal login or invite email.
6. Open Print Requests.
7. Create a registered customer Print Request using the new customer.
8. Add approved catalog designs to the request.
9. Confirm request items persist after reload.
10. Confirm source designs remain `status: ready`.
11. Confirm guest and internal request flows still pass.

## Risks

| Risk | Mitigation |
| --- | --- |
| Staff confuse customer records with customer login accounts | UI copy must say Portal login comes later |
| Service ownership drifts into Print Request service | Add or isolate customer management service |
| Customer Auth provisioning sneaks into Phase 6 | Keep Auth/Portal explicitly out of scope |
| Firestore rules mismatch local assumptions | Stop and report; do not weaken rules |

## Review Gate

Implementation must not begin until this plan is reviewed and approved. If review decides that customer Auth account provisioning is required instead of customer records, revise the plan before coding because that changes security, Firebase Functions, and deployment scope.
