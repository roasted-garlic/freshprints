# User Account Status Management Plan

> **Status (Phase 1 cleanup):** User edits use the canonical `updateTeamUser` callable. The separate `updateTeamUserStatus` callable described below was removed; status and role changes share `teamUserUpdateService`.

## Goal

Finish Phase 1 user management permissions and account status controls so owners and admins can safely activate and deactivate team users through Cloud Functions, while helpers and customers remain blocked from user administration.

---

## Current Behavior

### Desktop app

* Owners and admins can open **Users** and create admin/helper accounts through `createTeamUser`.
* `permissionService.canManageUsers` gates the route and sidebar.
* `userService.listTeamUsers` returns:
  * Owner → `owner`, `admin`, `helper`
  * Admin → `admin`, `helper`
  * Helper → empty list
* Team user list shows name, email, role, and status badges.
* No activate/deactivate actions exist in the UI.
* Helpers do not see the Users sidebar item, but route protection must remain server-backed.

### Cloud Functions

* `createTeamUser` creates Firebase Auth users and Firestore `users/{uid}` profiles.
* No callable exists for account status changes.

### Firestore rules

* Clients can read allowed user profiles only.
* Clients cannot write `users/{uid}` documents.

### Firebase Auth

* New users are created enabled.
* No automated disable/enable flow exists from the desktop app.

---

## Desired Role Rules

| Actor | View user list | Create users | Edit status |
| --- | --- | --- | --- |
| Owner | `owner`, `admin`, `helper` | `admin`, `helper` | `owner`, `admin`, `helper` except self |
| Admin | `admin`, `helper` | `helper` only | `helper` only |
| Helper | No access | No | No |
| Customer | No desktop access | No | No |

### Editing rules

* Owner can activate/deactivate admins and helpers.
* Owner can activate/deactivate other owners, but cannot deactivate themselves.
* Owner cannot deactivate the last active owner.
* Admin can activate/deactivate helpers only.
* Admin cannot edit owners or other admins.
* Helper cannot edit any user.
* Role changes remain out of scope for this phase (`canChangeUserRole` reserved for future use).

---

## Cloud Function Changes

### New callable: `updateTeamUserStatus`

**Input**

```ts
{
  targetUserId: string;
  isActive: boolean;
}
```

**Server workflow**

1. Require authenticated caller.
2. Load caller `users/{callerUid}`.
3. Reject inactive callers.
4. Load target `users/{targetUserId}`.
5. Enforce role rules server-side.
6. Reject self-status changes.
7. Reject deactivating the last active owner.
8. Update Firebase Auth `disabled` to `!isActive`.
9. Update Firestore `users/{targetUserId}`:
   * `isActive`
   * `updatedAt`
   * `updatedBy`
10. Return updated status.

**Failure handling**

* If Firestore update fails after Auth update, attempt to restore previous Auth disabled state.
* Return meaningful callable errors for permission, validation, and sole-owner protection.

### Shared function utilities

* Extract caller profile loading into shared function library code.
* Add target profile loader and status permission helpers.

---

## Firestore Changes

No schema changes required.

Existing fields used:

* `users/{uid}.isActive`
* `users/{uid}.updatedAt`
* `users/{uid}.updatedBy`

Firestore rules remain client read-only for `users`. Status changes happen only through Cloud Functions.

---

## Firebase Auth Disabled/Enabled Handling

The callable uses Admin SDK:

```ts
adminAuth.updateUser(targetUserId, { disabled: !isActive })
```

Rules:

* `isActive: true` → Auth `disabled: false`
* `isActive: false` → Auth `disabled: true`

Firestore `isActive` and Auth `disabled` must remain synchronized when the function succeeds.

---

## Permission Service Changes

Add centralized helpers in `permissionService`:

| Helper | Purpose |
| --- | --- |
| `canViewUsers` | Owner/admin can view user list |
| `canManageUsers` | Owner/admin can access user management |
| `canEditUser` | Caller can change a specific target user |
| `canCreateAdmin` | Owner only |
| `canCreateHelper` | Owner/admin |
| `canDeactivateUser` | Caller can deactivate target |
| `canReactivateUser` | Caller can reactivate target |
| `canChangeUserRole` | Reserved for future role editing |

UI uses these helpers for visibility only. Cloud Functions enforce the real rules.

---

## UI Changes

### Route and navigation

* Users route remains protected by `manageUsers`.
* Helpers receive in-shell unauthorized state if they navigate directly to `#/users`.

### User list

* Show active/inactive badges (existing).
* Add action column with **Deactivate** / **Activate** where permitted.
* Hide actions when caller cannot edit the target user.
* Never show self-status actions for the signed-in user.

### Confirmation

* Require confirmation before deactivating a user.
* Show success and error messages after callable completion.

### Create user form

* Unchanged business logic.
* Remains visible only to callers with create permissions.

---

## Edge Cases

| Case | Handling |
| --- | --- |
| Owner deactivates self | Blocked server-side and hidden in UI |
| Owner deactivates last active owner | Blocked server-side |
| Admin targets owner/admin | Blocked server-side; no actions in UI |
| Admin targets helper | Allowed |
| Inactive caller | Blocked server-side |
| Missing target profile | `not-found` style error |
| Auth update succeeds, Firestore fails | Attempt Auth rollback and return error |
| Customer signs in | Desktop access blocked by existing auth/profile rules |
| Helper opens `#/users` | In-shell unauthorized state |

---

## Testing Checklist

- [ ] Owner sees owner/admin/helper users
- [ ] Owner can deactivate and reactivate admin/helper
- [ ] Owner cannot deactivate self
- [ ] Owner cannot deactivate last active owner
- [ ] Admin sees admin/helper users
- [ ] Admin can deactivate/reactivate helper only
- [ ] Admin cannot act on other admins
- [ ] Helper does not see Users navigation
- [ ] Helper direct route shows unauthorized in shell
- [ ] Customer cannot access desktop app
- [ ] Firestore `isActive` matches expected value after update
- [ ] Firebase Auth `disabled` matches expected value after update
- [ ] Firestore client writes remain blocked

---

## Out Of Scope

* Role editing UI
* Customer website user management
* Design library, imports, queue, or request workflows
* Firestore rule weakening
