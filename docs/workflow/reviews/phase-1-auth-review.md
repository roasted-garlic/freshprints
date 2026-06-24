# Phase 1 Auth Review

## Purpose

This review evaluates the Phase 1 authentication and authorization implementation now that auth is working in development.

Reviewed areas:

- Firebase config structure
- `AuthProvider`
- `useAuth`
- Login flow
- Logout flow
- Role loading
- `ProtectedRoute`
- `RoleGate`
- Permission service
- Firestore `users/{uid}` document usage
- Light and dark styling on auth UI
- File organization
- `App.tsx` size
- Architecture violations

No application code was changed as part of this review.

## Review Summary

Phase 1 auth is working and architecturally sound. Firebase initialization is centralized, authentication and authorization are correctly separated, Firestore user profiles are required before access is granted, and permission checks are centralized in `permissionService`.

The implementation matches the planned auth flow:

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
Enforce permissions through ProtectedRoute / RoleGate
```

Remaining work is mostly cleanup, documentation gaps, routing foundation, and security hardening outside the auth feature itself (preload IPC, production Firebase rules).

---

## What Is Working

### Firebase Config Structure

Firebase configuration is correctly split and initialized once.

| File | Responsibility |
| --- | --- |
| `src/renderer/src/config/env.ts` | Reads and validates `VITE_FIREBASE_*` environment variables |
| `src/renderer/src/config/firebase.ts` | Initializes and exports `app`, `auth`, `db`, `storage` |

What is correct:

- No hardcoded Firebase credentials in source.
- Missing environment variables fail clearly at startup.
- Firebase is initialized only once using `getApps()` guard.
- Auth, Firestore, and Storage share the same app instance.
- Variable naming matches `docs/FIREBASE.md`.

### AuthProvider

`src/renderer/src/features/auth/context/AuthProvider.tsx` correctly owns session state.

What is correct:

- Subscribes once to Firebase Auth state through `authService`.
- Loads Firestore profile after Auth user is known.
- Distinguishes auth states: `initializing`, `unauthenticated`, `loading-profile`, `authenticated`, `missing-profile`, `inactive`, `error`.
- Sets `isAuthenticated: true` only for active profiles.
- Cleans up subscription on unmount with `isCurrentSubscription` guard.
- Exposes `login` and `logout` without rendering UI.
- Does not call Firebase directly; uses services.

Inactive handling is correct:

- `isActive: false` blocks authenticated app access.
- User sees a clear inactive message.

### useAuth

`src/renderer/src/features/auth/hooks/useAuth.ts` is a thin context consumer.

What is correct:

- Throws a clear error when used outside `AuthProvider`.
- Returns typed `AuthContextValue`.
- Does not duplicate business logic.

### Login Flow

Login flow follows the correct layer boundaries.

```txt
LoginForm
  → useAuth.login()
  → authService.login()
  → signInWithEmailAndPassword()
  → onAuthStateChanged()
  → userService.getUserById(uid)
  → AuthProvider state update
  → ProtectedRoute renders dashboard
```

What is correct:

- `LoginForm` does not call Firebase directly.
- Email is trimmed before sign-in.
- Firebase Auth errors are normalized in `authService`.
- Inline error display uses `role="alert"`.
- Loading state disables submit button and shows **Signing in...**.
- Password visibility toggle is accessible.
- `LoginPage` includes `ThemeToggle` for light/dark testing on the auth screen.

User-facing auth error messages are implemented for:

- Invalid credentials
- Invalid email
- Disabled account
- Rate limiting
- Network failure

### Logout Flow

Logout flow is correct and available from multiple UI entry points.

```txt
AppShell / ProtectedRoute
  → useAuth.logout()
  → authService.logout()
  → signOut()
  → onAuthStateChanged(null)
  → unauthenticated state
  → LoginPage
```

What is correct:

- Logout is available in the app shell top bar.
- Logout is available on blocked-account screens.
- Button shows **Signing out...** while in progress.
- Auth listener resets state after sign-out.
- Session does not remain authenticated after logout.

### Role Loading

Role loading happens only after Firebase Auth succeeds.

What is correct:

- `userService.getUserById()` reads `users/{uid}`.
- Document ID is the Firebase Auth UID.
- `role` must be one of: `owner`, `admin`, `helper`, `customer`.
- Required profile fields are validated before mapping.
- `AuthProvider` exposes `user.role` to the app tree.
- Components read role through `useAuth()`, not Firestore directly.

This matches `docs/DATA_MODEL.md` and `docs/SECURITY.md`.

### ProtectedRoute

`src/renderer/src/features/auth/components/ProtectedRoute.tsx` handles route protection correctly.

What is correct:

- Shows session-check loading UI for initializing and profile-loading states.
- Shows account-blocked UI for missing profile, inactive, and generic profile errors.
- Renders `LoginPage` when unauthenticated.
- Checks permissions through `permissionService`, not inline role checks.
- Shows unauthorized page with sign-out option when permission fails.
- Uses shared UI components (`Button`, `ErrorState`, `LoadingSpinner`).

Current app usage:

```txt
<ProtectedRoute permission="accessDashboard">
```

All active roles can pass `accessDashboard`, which is appropriate for the current single-route shell.

### RoleGate

`src/renderer/src/features/permissions/components/RoleGate.tsx` provides component-level authorization.

What is correct:

- Uses `permissionService.hasAnyPermission()`.
- Supports single or multiple permission keys.
- Supports optional `fallback` content for unauthorized users.
- Dashboard uses `RoleGate` to demonstrate owner/admin, staff, and customer visibility without duplicating role logic.

Observed behavior on dashboard:

| Role | Owner/admin message | Staff card | Audit card | Customer card |
| --- | --- | --- | --- | --- |
| `owner` | Visible | Visible | Visible | Hidden |
| `admin` | Visible | Visible | Visible | Hidden |
| `helper` | Hidden | Visible | Hidden | Hidden |
| `customer` | Hidden | Hidden | Hidden | Visible |

### Permission Service

`src/renderer/src/features/permissions/services/permissionService.ts` is the authorization source of truth in the renderer.

What is correct:

- Centralizes role helpers (`isOwner`, `isAdmin`, `isHelper`, `isCustomer`, `isStaff`).
- Exposes capability methods aligned with `docs/SECURITY.md`.
- Provides `hasPermission()` and `hasAnyPermission()` APIs.
- Requires `isActive` for all permission checks.
- Used by `ProtectedRoute`, `RoleGate`, `Sidebar`, and `DashboardPage`.

No scattered `if (user.role === "admin")` checks were found in feature UI.

### Firestore User Document Usage

`src/renderer/src/features/users/services/userService.ts` correctly enforces the Firestore profile contract.

Required fields validated:

- `email` (string)
- `displayName` (string)
- `role` (valid `UserRole`)
- `isActive` (boolean)
- `createdAt`
- `updatedAt`

What is correct:

- Missing document throws: `No Fresh Prints user profile exists for this account.`
- Invalid/incomplete document throws: `Your user profile is incomplete. Contact an administrator.`
- Optional `id`, `createdBy`, `updatedBy` are handled safely.
- `User` type matches `docs/DATA_MODEL.md`.
- Firestore access is isolated in the users feature service.

The app correctly does not auto-create user profiles during login.

### Light And Dark Styling

Auth UI follows the global styling architecture.

What is correct:

- No inline styles in auth components.
- Login page uses semantic CSS classes (`login-page`, `login-panel`, `login-form`).
- Auth messages use utility classes (`auth-message`, `auth-message-error`, `auth-message-success`).
- Status screens (`status-page`, `status-panel`) support blocked-account states.
- Theme tokens are defined in `tokens.css` and `themes.css`.
- Light and dark themes are supported through `ThemeProvider`.
- `LoginPage` and authenticated shell both expose `ThemeToggle`.

Auth screens are usable in both themes.

### File Organization

Auth-related code is organized by feature and layer.

```txt
src/renderer/src/
├── config/
│   ├── env.ts
│   └── firebase.ts
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   └── types/
│   ├── users/
│   │   ├── services/
│   │   └── types/
│   └── permissions/
│       ├── components/
│       ├── services/
│       └── types/
├── routes/
│   └── AppRoutes.tsx
└── shared/
    └── components/
```

What is correct:

- Auth UI lives in `features/auth/`.
- User profile loading lives in `features/users/`.
- Permission logic lives in `features/permissions/`.
- Shared shell components live in `shared/components/`.
- No business logic in `App.tsx`.

File sizes are within project targets:

| File | Lines |
| --- | ---: |
| `App.tsx` | 16 |
| `AuthProvider.tsx` | 160 |
| `authService.ts` | 57 |
| `userService.ts` | 53 |
| `ProtectedRoute.tsx` | 70 |
| `permissionService.ts` | 125 |
| `RoleGate.tsx` | 45 |
| `LoginForm.tsx` | 68 |

No auth-related file exceeds review thresholds.

### App.tsx Size

`src/App.tsx` contains only providers and routes:

```tsx
ThemeProvider
  AuthProvider
    AppRoutes
```

This matches project rules. `App.tsx` does not contain Firebase logic, auth workflows, or business logic.

---

## What Needs Cleanup

### 1. Missing-Profile Detection Uses String Matching

Severity: Low

`AuthProvider` determines `missing-profile` status with:

```ts
message.includes("No Fresh Prints user profile")
```

Why this matters:

- Status logic depends on exact error message text.
- Changing the message in `userService` could silently break status handling.

Recommended direction:

- Throw or return a typed auth/profile error from `userService`.
- Map typed errors to `AuthStatus` in `AuthProvider`.

### 2. RoleGate Has Redundant Unauthorized Branch

Severity: Low

In `RoleGate`, when permission is denied:

- If `fallback` exists, it renders fallback.
- If `showUnauthorized` is true, it renders `ErrorState`.
- Otherwise it falls through to `return <>{fallback}</>` again.

The final branch is redundant and slightly confusing.

Recommended direction:

- Return `null` explicitly when unauthorized content should be hidden.
- Remove duplicate fallback branch.

### 3. AppRoutes Login Handling Overlaps ProtectedRoute

Severity: Low

`AppRoutes.tsx` renders `LoginPage` for `/login` when unauthenticated, while `ProtectedRoute` also renders `LoginPage` for unauthenticated users on other paths.

Why this matters:

- Two entry points render the same screen.
- `/login` special case is easy to forget when adding routes.

Recommended direction:

- Let `ProtectedRoute` own unauthenticated rendering.
- Or introduce a small route table before more pages are added.

### 4. Routing Uses `window.location.pathname` Directly

Severity: Medium (future growth)

`AppRoutes` reads `window.location.pathname` without a router.

Why this matters:

- Adding protected pages will require more manual path checks.
- Route-level permission mapping will become harder to maintain.

This is not blocking current auth functionality, but it should be addressed before Phase 2 screens are added.

### 5. userService Bypasses firestoreCollectionService

Severity: Low

`userService` uses `doc(db, "users", userId)` directly, while the firebase feature exposes `firestoreCollectionService.getUsersCollection()`.

Why this matters:

- Collection naming is duplicated in two places.
- Future collection renames would require multiple edits.

Recommended direction:

- Use `firestoreCollectionService` inside `userService` for consistency.

### 6. Planned Typed Auth Error Mapping Is Not Implemented

Severity: Low

`docs/plans/authentication-implementation-plan.md` mentions `AuthErrorCode` or equivalent typed auth error mapping.

Current implementation uses plain `Error` messages only.

This is acceptable for Phase 1, but typed errors would improve maintainability.

### 7. No Password Reset Or Registration Flow

Severity: Informational (out of scope)

The implementation plan explicitly excludes:

- User registration UI
- Password reset flow

This is correct for Phase 1, but should be tracked for a later milestone.

### 8. Production Firebase Rules Are Not Yet Verified Against Auth

Severity: Medium (security)

Auth works in development with starter Firestore rules, but production-grade rules that enforce roles server-side are not yet verified.

Why this matters:

- UI permission checks are not enforcement.
- Auth success still depends on Firestore being readable for `users/{uid}`.

This is outside the auth feature code, but it blocks calling Phase 1 fully production-ready.

---

## Architecture Violations

### None Found Inside The Auth Feature

The auth, users, and permissions features follow project architecture rules:

- No Firebase calls in React components.
- No business logic in `App.tsx`.
- No filesystem access in React components.
- Services own Firebase and validation logic.
- Hooks coordinate state only.
- Components focus on rendering and user actions.

### Related Violations Outside Auth (Still Relevant To Phase 1)

These are not auth bugs, but they affect the overall Phase 1 security posture:

| Issue | Location | Severity |
| --- | --- | --- |
| Broad `ipcRenderer` exposed to renderer | `electron/preload.ts` | High |
| Starter IPC subscription in renderer | `src/main.tsx` | Medium |
| Starter IPC message sent from main process | `electron/main.ts` | Medium |
| Generic `window.ipcRenderer` typing | `electron/electron-env.d.ts` | Medium |

Auth does not depend on these IPC paths. They should still be cleaned up before filesystem or import workflows begin.

### Acceptable Phase 1 Deviations

| Item | Notes |
| --- | --- |
| `ProtectedRoute` lives under `features/auth/` | Acceptable; plan allows shared route components under `shared/` later if reused broadly |
| `customer` role can access admin dashboard route | Intentional for Phase 1; `accessDashboard` includes all active roles |
| Electron code under `electron/` instead of `src/main/` | Existing repo convention; document or align later |

---

## Recommended Fixes

### Fix 1: Introduce Typed Profile Load Errors

Priority: Low

- Add a small error type or error code enum in the users or auth feature.
- Throw typed errors from `userService` for: missing document, incomplete document, permission denied.
- Map typed errors to `AuthStatus` in `AuthProvider`.

### Fix 2: Simplify RoleGate Unauthorized Rendering

Priority: Low

- Replace redundant final branch with explicit `return null`.
- Keep `fallback` and `showUnauthorized` behavior unchanged.

### Fix 3: Consolidate Login Route Ownership

Priority: Low

- Choose one owner for unauthenticated rendering (`ProtectedRoute` recommended).
- Remove duplicate `/login` handling from `AppRoutes` or document why both exist.

### Fix 4: Add A Small Route Configuration

Priority: Medium (before more pages)

- Create a route config with `path`, `component`, and `permission`.
- Keep permission checks out of page components.
- Avoid direct `window.location.pathname` checks scattered across the app.

### Fix 5: Align userService With firestoreCollectionService

Priority: Low

- Read users collection through `firestoreCollectionService.getUsersCollection()`.
- Keep collection names in one place.

### Fix 6: Complete Firebase Security Documentation And Rules

Priority: Medium

- Verify starter Firestore rules against live login/profile load behavior.
- Add production rule guidance before real data is used.
- Track Storage rules separately.

### Fix 7: Clean Up Electron IPC Starter Code

Priority: High (before Phase 2 filesystem work)

- Remove generic `window.ipcRenderer` exposure.
- Remove starter IPC logging from `src/main.tsx` and `electron/main.ts`.
- Expose only narrow `window.freshPrints` APIs when actually needed.

---

## Missing Docs

### Existing Auth-Related Docs

| Document | Status |
| --- | --- |
| `docs/plans/authentication-implementation-plan.md` | Exists |
| `docs/setup/auth-testing-guide.md` | Exists |
| `docs/setup/firebase-project-setup.md` | Exists |
| `docs/setup/firestore-setup.md` | Exists |

### Missing Setup Docs Referenced By Project Rules

| Document | Why it is needed |
| --- | --- |
| `docs/setup/firebase-auth-setup.md` | Referenced in `docs/AI_RULES.md`; should document enabling Email/Password in Firebase Console |
| `docs/setup/environment-variables.md` | Referenced in `docs/AI_RULES.md`; env mapping currently only inside firebase project setup |
| `docs/setup/electron-security-setup.md` | Referenced in `docs/AI_RULES.md`; should document preload hardening and IPC rules |

### Recommended Additional Auth Docs

| Document | Purpose |
| --- | --- |
| `docs/setup/firestore-production-rules.md` | Role-enforcing rules for `users` and future collections |
| `docs/setup/seed-users-guide.md` | Standard process for creating owner/admin/helper/customer test users in console |

---

## Phase 1 Completion Checklist

### Authentication

- [x] Email/password login uses `authService`
- [x] Logout uses `authService`
- [x] Firebase Auth state subscription is centralized in `AuthProvider`
- [x] Firestore `users/{uid}` record is loaded after auth
- [x] Missing profile state is handled
- [x] Inactive user state is handled
- [x] Loading and error states are handled
- [x] Login page is styled and supports light/dark mode
- [x] Session persistence works through Firebase Auth
- [x] Manual auth testing guide exists
- [ ] Typed profile/auth errors replace string matching
- [ ] Password reset flow (deferred, not Phase 1)

### Authorization

- [x] `permissionService.ts` exists and is centralized
- [x] `RoleGate` uses permission service
- [x] `ProtectedRoute` uses permission service
- [x] `Sidebar` visibility uses permission service
- [x] `DashboardPage` demonstrates role-based UI visibility
- [ ] Additional protected routes verified as pages are added
- [ ] Production Firebase rules mirror permission model

### Architecture

- [x] `App.tsx` stays small (16 lines)
- [x] Firebase initialization is centralized
- [x] Firebase calls are kept out of React components
- [x] Auth state is coordinated through `AuthProvider`
- [x] Feature folders used for auth, users, permissions
- [x] No duplicate auth or permission services
- [ ] Route configuration introduced before Phase 2 pages
- [ ] Generic preload IPC exposure removed

### Data Model

- [x] `User` type matches `docs/DATA_MODEL.md`
- [x] `UserRole` values match canonical model
- [x] Required Firestore fields are validated in `userService`
- [x] Auth UID matches `users/{uid}` document ID

### Documentation

- [x] `docs/setup/auth-testing-guide.md`
- [x] `docs/plans/authentication-implementation-plan.md`
- [ ] `docs/setup/firebase-auth-setup.md`
- [ ] `docs/setup/environment-variables.md`
- [ ] `docs/setup/electron-security-setup.md`
- [ ] Production Firestore rules setup doc

### Roadmap Exit Criteria (Auth-Related)

- [x] Login works
- [x] Roles work
- [x] Permissions work
- [x] Dashboard exists for authenticated users
- [x] Firestore connects successfully (profile load + connection card)
- [ ] Firestore rules verified against live project beyond starter dev rules
- [ ] Storage rules verified (connection only; not auth-blocking for Phase 1 shell)

---

## Conclusion

Phase 1 auth is working and well-structured. The core design — Firebase Auth for identity, Firestore `users/{uid}` for role, `permissionService` for authorization — is implemented correctly and matches project documentation.

The auth feature itself does not contain significant architecture violations. Remaining work is primarily:

1. Small maintainability cleanup inside auth/permissions (`typed errors`, `RoleGate`, route ownership).
2. Routing foundation before more protected pages are added.
3. Missing setup documentation referenced by `docs/AI_RULES.md`.
4. Electron IPC and production Firebase rules hardening before Phase 2 workflows.

Auth can be considered functionally complete for Phase 1 development. Production readiness still depends on Firebase rules verification and Electron security cleanup.
