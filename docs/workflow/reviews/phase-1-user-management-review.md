# Phase 1 User Management Review

## Purpose

This review evaluates Phase 1 user management, Cloud Functions, Auth/Firestore sync, permissions, and the desktop shell now that auth, roles, and team user administration are largely implemented.

Reviewed areas:

- Auth flow and role loading
- Owner / admin / helper permissions
- User list visibility
- Add user modal
- Edit user modal
- Activate / deactivate behavior
- Firebase Auth `disabled` sync
- Firestore `isActive` sync
- Cloud Function security
- Sidebar / header shell layout
- Loading behavior during navigation
- Oversized files
- Architecture violations

No application code was changed as part of this review.

---

## Review Summary

Phase 1 user management is **functionally complete** for desktop team administration. The implementation follows the intended architecture: the renderer calls Cloud Functions, Cloud Functions use the Firebase Admin SDK, Firestore user writes are blocked in security rules, and UI permission helpers mirror server rules without replacing them.

The Users page is a usable admin directory with modal-based create/edit flows, client-side search, role/status badges, and a persistent shell. Auth bootstrap, profile caching, and route protection remain sound from the earlier auth review.

Remaining work is mostly **cleanup, hardening, and operational verification** before Phase 2: duplicate callable consolidation, header transition polish, audit logging, deployment verification, and permission-matrix documentation/tests.

---

## What Is Working

### Auth Flow

The auth pipeline remains correct and matches `docs/SECURITY.md` and `docs/WORKFLOWS.md`.

```txt
Login
  ↓
Firebase Auth
  ↓
Load users/{uid}
  ↓
Validate isActive
  ↓
Expose role through AuthProvider / useAuth
  ↓
Enforce permissions through ProtectedRoute / permissionService
```

What is correct:

- `AuthProvider` separates Firebase Auth state from Firestore profile loading.
- `AuthBootstrapGate` blocks the app only during initial bootstrap or hard auth failures.
- Inactive accounts and missing profiles are rejected before dashboard access.
- `authSessionService` deduplicates profile loads and caches profiles locally.
- Remember-me persistence is handled in `authService` / `authPreferencesService`.
- `App.tsx` remains a thin provider/router shell.

### Role Loading

- Roles are loaded from Firestore `users/{uid}.role`, not inferred from Firebase Auth custom claims.
- `userService.getUserById()` validates required profile fields before use.
- Cached profiles avoid repeat Firestore reads during the same session.
- Auth state exposes `user.role` and `user.isActive` to the rest of the app.

This matches `docs/DATA_MODEL.md`.

### Owner / Admin / Helper Permissions

Client-side permissions are centralized in `permissionService.ts`.

| Capability | Owner | Admin | Helper |
| --- | --- | --- | --- |
| View Users page | Yes | Yes | No |
| Create admin | Yes | No | No |
| Create helper | Yes | Yes | No |
| Edit helper status/role | Yes | Status only | No |
| Edit admin | Yes | No | No |
| Edit owner | UI blocked | No | No |
| Edit self | No | No | No |

Server-side permissions in `functions/src/lib/permissions.ts` enforce the same boundaries for callable functions.

What is correct:

- Helpers and customers cannot reach user management UI (`viewUsers` permission).
- Admins cannot create admins.
- Admins can only update helpers.
- Owners can create admin/helper accounts.
- Owners can change admin/helper roles server-side.
- Self-editing is blocked in UI and server rules.
- Last active owner deactivation is blocked server-side via `assertCanDeactivateTarget()`.

### User List Visibility

`userService.listTeamUsers()` and Firestore rules align:

| Caller role | Readable roles |
| --- | --- |
| Owner | owner, admin, helper |
| Admin | admin, helper |
| Helper | none |

What is correct:

- List query uses `where("role", "in", readableRoles)`.
- Firestore rules prevent admins from reading owner profiles.
- Users cannot write `users/{uid}` directly (`allow create, update, delete: if false`).
- Table presentation is compact and searchable.

### Add User Modal

`AddUserModal` follows architecture rules:

- UI only collects role, display name, and email in the required order.
- Creation goes through `userManagementService.createTeamUser()`.
- Cloud Function `createTeamUser` validates input, checks caller permissions, creates Auth user + Firestore profile atomically, and sends invitation email through Resend.
- Rollback deletes Auth user if Firestore profile creation fails.
- Success/failure messaging distinguishes invitation email delivery outcome.

### Edit User Modal

`EditUserModal` follows architecture rules:

- Read-only name and email.
- Role editing only when `permissionService.canChangeUserRole()` allows it.
- Status editing for permitted targets.
- Deactivation confirmation dialog before inactive save.
- Updates go through `userManagementService.updateTeamUser()`.
- Page-level hook owns success/error state.

### Activate / Deactivate Behavior

- Active = `isActive: true` and Auth `disabled: false`
- Inactive = `isActive: false` and Auth `disabled: true`
- Status changes require confirmation when deactivating.
- Owner rows show a lock icon instead of edit in the directory table.

### Firebase Auth Disabled Sync

`functions/src/lib/teamUserUpdateService.ts` is the single write path for status changes.

What is correct:

- Auth `disabled` is updated before Firestore when status changes.
- If Firestore update fails, Auth is rolled back to the previous disabled state.
- `authDisabled` is returned in callable responses for verification.

### Firestore `isActive` Sync

- `isActive` is updated in the same Cloud Function workflow as Auth status.
- `updatedAt` and `updatedBy` are written on updates.
- Clients cannot mutate protected user fields directly.

### Cloud Function Security

Callable functions reviewed:

| Function | Auth check | Caller profile | Active caller | Permission checks | Input validation |
| --- | --- | --- | --- | --- | --- |
| `createTeamUser` | Yes | Yes | Yes | Yes | Yes |
| `updateTeamUser` | Yes | Yes | Yes | Yes | Yes |

What is correct:

- Unauthenticated callers are rejected.
- Inactive callers are rejected.
- Caller profile must exist in Firestore.
- Target profile must exist for updates.
- Role creation/update rules are enforced server-side.
- Sensitive operations use Admin SDK only in Cloud Functions.

### Sidebar / Header Shell Layout

The desktop shell matches the Phase 1 SaaS layout direction in `docs/STYLE_GUIDE.md`.

What is correct:

- Persistent `AppShell` wraps authenticated routes through `AuthenticatedLayout`.
- Sidebar stays mounted during navigation.
- `AppHeader` stays mounted and receives per-page config through `useShellHeaderConfig()`.
- Sidebar footer contains user identity, sign out, and collapse control.
- Users page uses header search + Add user action.
- User count chip sits above the directory table.
- Branding uses the FP logo and “Fresh Prints” naming.
- Light/dark theme support remains intact.

### Loading Behavior During Navigation

What is correct:

- Full-app bootstrap loading is limited to initial auth/profile verification.
- Route changes do not remount the shell.
- Users page loading is localized to `useTeamUsers()` / `UserDirectoryTable`.
- No full-page route transition gate was introduced for Dashboard ↔ Users navigation.

### File Size And Architecture

No major architecture violations were found in the user management feature.

| Area | Status |
| --- | --- |
| Firebase calls in components | Pass — user management uses services |
| Business logic in `App.tsx` | Pass |
| Filesystem access in renderer | Pass |
| Feature folder organization | Pass |
| Cloud Function separation | Pass |
| Types for Firestore documents | Pass |

File size review:

| File | Lines | Status |
| --- | ---: | --- |
| `AuthProvider.tsx` | ~205 | Acceptable |
| `Sidebar.tsx` | ~171 | Good |
| `EditUserModal.tsx` | ~187 | Good |
| `UserManagementPage.tsx` | ~110 | Good |
| `createTeamUser.ts` | ~160 | Good |
| `teamUserUpdateService.ts` | ~93 | Good |
| `navigation.css` | ~400 | Large CSS module; acceptable for shell styling, but consider splitting later |

No renderer business files exceed the 400-line review threshold. No files exceed the 600-line hard concern threshold.

---

## What Needs Cleanup

### Duplicate Callable Functions — Resolved

`updateTeamUser` is the canonical callable. `updateTeamUserStatus` was removed from `functions/src` and documentation.

### Duplicate Permission Matrices — Partially resolved

Client-side role/list/edit/create checks now flow through `permissionService`. Cloud Functions and Firestore rules remain authoritative.

**Remaining:** Add a permission matrix doc or shared constants test that verifies owner/admin/helper rules stay aligned across layers.

### UI vs Server Owner Editing

There is a deliberate UI restriction:

- UI shows a lock for all `role === "owner"` rows.
- Server-side `canUpdateTeamUserStatus()` still allows an owner to update another owner’s status, subject to last-owner protection.

This is not a security bug, but it is an intentional product mismatch.

**Recommendation:** Either document “owners are protected in UI only” or align server rules if owner-to-owner status edits should be fully disallowed.

### Header Reset Between Routes — Resolved

`useShellHeaderConfig()` no longer resets header config on unmount. `AppHeader` stays mounted and keeps the previous title until the next page replaces it.

### Admin / Helper Sidebar Role Presentation — Resolved

Sidebar footer uses the same role badge variants as the user directory table via `teamUserRoleDisplay.ts`.

### Legacy / Unused Styles And Components — Resolved

Removed `PageHeader` and unused user-management layout CSS from `layout.css`.

### Operational Dependencies

User management depends on deployed Cloud Functions and Resend configuration.

**Recommendation:** Verify production deployment checklist before calling Phase 1 complete:

```bash
cd functions && npm run build && cd .. && firebase deploy --only functions
```

Confirm `RESEND_API_KEY` and invitation sender configuration per `docs/setup/resend-email-setup.md`.

---

## Security Risks

### Low Risk

| Risk | Notes |
| --- | --- |
| UI-only permission hiding | Expected. Server rules are the real boundary and are implemented. |
| Client-side search/filter | Acceptable. Does not expose extra data beyond Firestore read rules. |
| Placeholder header search on non-Users pages | Low risk today because only Users page wires search behavior. |

### Medium Risk

| Risk | Notes |
| --- | --- |
| Permission drift between client and functions | Maintain a matrix test or doc sync process. |
| No audit log for user management actions | Owner/admin status and role changes are not recorded in an audit collection. |
| `countActiveOwners()` race window | Two simultaneous owner deactivations could theoretically pass individually before either write completes. Low probability, but possible in multi-admin operations. |
| Role stored only in Firestore | Firebase Auth custom claims are not used. Any future claim-based rule logic would be out of sync unless added deliberately. |
| Invitation email failure leaves created account | Account exists even if Resend fails. This is handled in UI, but operations need a manual recovery process. |

### High Risk

No high-risk vulnerabilities were identified in the reviewed user management code paths, assuming:

- Firestore rules remain deployed as committed
- Cloud Functions are deployed and not publicly misconfigured
- Resend/API secrets stay in Functions secrets, not the renderer
- Production Firebase project rules are not left in permissive dev mode

### Previously Identified Auth Review Items Still Relevant

From `docs/reviews/phase-1-auth-review.md`, these remain important for overall Phase 1 security even though they are outside user management UI:

- Preload IPC surface should remain minimal
- Production Firestore/Storage rules must be verified in the live project
- Customer role must not access the desktop app

---

## UX Issues

| Issue | Severity | Notes |
| --- | --- | --- |
| Header flash on route change | Minor | Caused by header config reset on unmount |
| Users table reloads on every visit | Minor | `useTeamUsers()` refetches on mount; acceptable now, may feel slow with large teams |
| Success/error messages appear above table | Minor | Works, but toast pattern may be better later |
| Global search only useful on Users page | Minor | Expected for now; other pages omit search config |
| Owner lock icon with no tooltip on inactive non-editable rows | Minor | Admin/helper rows without permission show `—` instead of explanation |
| Collapsed sidebar hides user identity entirely | Minor | Acceptable, but sign-out becomes icon-only |
| Dashboard still uses foundation placeholder content | Expected | Not a user-management bug, but shell contrast makes Users page feel more production-ready than Dashboard |

Overall, the Users page UX is materially improved and aligned with the mockup direction.

---

## Required Fixes Before Phase 2

These are recommended before starting design-library / import work.

### Must Fix

1. **Deploy and verify Cloud Functions in the target Firebase project**
   - `createTeamUser`
   - `updateTeamUser` (canonical edit callable; `updateTeamUserStatus` removed)

2. **Run manual permission verification**
   - Owner:create admin/helper
   - Admin:create helper only
   - Admin:edit helper only
   - Helper: no Users access
   - Self-edit blocked
   - Last active owner deactivation blocked
   - Auth `disabled` and Firestore `isActive` remain synchronized

3. **Confirm Firestore rules are deployed**
   - `users/{uid}` writes remain `false`
   - Owner/admin read visibility matches app expectations

### Should Fix

4. **Add user-management audit logging plan** (even if implementation lands early Phase 2)

### Nice To Have

8. Permission matrix regression test between renderer and functions
10. Toast-based feedback for create/edit success

---

## Phase 1 Completion Checklist

Use this checklist to decide whether Phase 1 is ready to close.

### Foundation

- [x] Firebase Auth login/logout works
- [x] Firestore user profile required before access
- [x] Inactive users blocked at auth bootstrap
- [x] Role system implemented (`owner`, `admin`, `helper`, `customer`)
- [x] `permissionService` centralized
- [x] Protected routes enforced
- [x] HashRouter client-side navigation
- [x] Persistent application shell
- [x] Light/dark theme support

### User Management

- [x] Users directory page for owner/admin
- [x] Search by name, email, role, status
- [x] Add user modal via `createTeamUser`
- [x] Edit user modal via `updateTeamUser`
- [x] Deactivate confirmation flow
- [x] Owner rows visually protected in UI
- [x] Auth `disabled` synced with Firestore `isActive`
- [x] Server-side permission enforcement in Cloud Functions
- [x] Firestore direct writes blocked for `users/{uid}`
- [x] Invitation email workflow via Resend
- [ ] Cloud Functions deployed to target environment
- [ ] Manual permission test pass recorded
- [ ] Resend production sender verified

### Architecture / Quality

- [x] User management logic in services, not components
- [x] No oversized feature files identified
- [x] `App.tsx` remains thin
- [ ] Duplicate callable cleanup decision made
- [ ] Unused layout/CSS cleanup completed
- [ ] Audit logging plan documented

### Documentation

- [x] `SECURITY.md` updated for user status management
- [x] `DATA_MODEL.md` updated for `isActive` sync
- [x] `FIREBASE.md` updated for Phase 1 callables
- [x] `WORKFLOWS.md` updated for team user workflow
- [x] Setup docs exist for functions and Resend

---

## Recommended Verification Steps

### Owner

1. Sign in as owner.
2. Open Users.
3. Create admin and helper accounts.
4. Search directory.
5. Edit helper/admin role and status.
6. Confirm owner row shows lock, not edit.
7. Attempt to deactivate the only active owner and confirm rejection.
8. Verify Firebase Console Auth `disabled` and Firestore `users/{uid}.isActive`.

### Admin

1. Sign in as admin.
2. Confirm Users page is visible.
3. Create helper only.
4. Edit helpers only.
5. Confirm no edit affordance on admin/owner rows.

### Helper

1. Sign in as helper.
2. Confirm Users nav item is hidden.
3. Navigate to `#/users` and confirm unauthorized state.

### Shell / Navigation

1. Navigate Dashboard ↔ Users repeatedly.
2. Confirm sidebar and header do not remount.
3. Confirm only page content changes.
4. Confirm no full-screen bootstrap loader appears after initial login.

---

## Conclusion

Phase 1 user management is **implementation-complete for desktop team administration** and architecturally aligned with `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, and `docs/SECURITY.md`.

The feature set is suitable to build on in Phase 2 once:

- Cloud Functions are deployed and verified
- Permission behavior is manually validated in the real Firebase project
- Minor cleanup items (duplicate callable, header flicker, dead CSS) are addressed or explicitly deferred

No code changes were made during this review.
