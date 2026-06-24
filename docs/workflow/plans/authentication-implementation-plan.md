# Authentication Implementation Plan

## Goal

Implement the Phase 1 authentication foundation for Fresh Prints using Firebase Email/Password Auth and Firestore user profiles.

Authentication must identify the user through Firebase Auth. Authorization must come from the Firestore `users/{userId}` document and centralized role/permission handling.

This plan covers:

- Firebase email/password auth
- `AuthProvider`
- `useAuth` hook
- `authService`
- `userService`
- Firestore `users/{userId}` document
- Role loading
- `ProtectedRoute`
- `RoleGate`
- Login page
- Logout flow
- Error handling
- Loading states
- Security considerations
- Files to create or modify

This plan does not implement design library features, ZIP import, AI workflows, customer requests, or production downloads.

## Scope

### In Scope

- Build authentication inside the React Renderer layer.
- Use existing Firebase foundation exports from `src/renderer/src/config/firebase.ts`.
- Use Firebase Email/Password sign-in and sign-out.
- Load the Firestore user record after Firebase Auth state is known.
- Block access for unauthenticated users, missing profiles, inactive users, and unauthorized roles.
- Add reusable auth state through `AuthProvider` and `useAuth`.
- Add route protection through `ProtectedRoute`.
- Add role-based rendering through `RoleGate`.
- Add a styled login page following `docs/STYLE_GUIDE.md`.

### Out Of Scope

- User registration UI.
- Password reset flow unless explicitly requested later.
- Role management UI.
- Firebase Admin SDK.
- Cloud Functions.
- Design CRUD.
- Customer-facing website auth.
- Anonymous, Google, Apple, or phone auth providers.

## Architecture Impact

### Roadmap Phase

This belongs to:

```txt
Phase 1
Foundation
```

It directly supports Phase 1 exit criteria:

- Login works.
- Roles work.
- Permissions work.
- Firestore connects successfully.

### Layers

Affected layers:

- React Renderer
- Firebase Service
- Feature Service
- Feature Hook
- Feature Component
- Feature Page
- Shared Type
- Security Rules

No Electron main process, preload, filesystem, or IPC work is required.

### Feature Ownership

Primary feature folder:

```txt
src/renderer/src/features/auth/
```

User profile access belongs in:

```txt
src/renderer/src/features/users/
```

Role and permission gating belongs in:

```txt
src/renderer/src/features/permissions/
```

Shared route/layout components may live under:

```txt
src/renderer/src/shared/
```

## Data Model Impact

Authentication requires every Firebase Auth user to have a matching Firestore document:

```txt
users/{userId}
```

The `User` type must match `docs/DATA_MODEL.md`:

```ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}
```

Role values must be:

```ts
export type UserRole =
  | "owner"
  | "admin"
  | "helper"
  | "customer";
```

The app must not rely on `auth.currentUser` alone. Firestore user profile loading is required before protected routes can render.

## Implementation Plan

### Shared Types

Create shared auth/user types before services consume them.

Planned types:

- `UserRole`
- `User`
- `AuthState`
- `AuthErrorCode` or equivalent typed auth error mapping if useful
- `RequiredRole` or role array type for route gates

Types should be reusable by desktop, future website, and future mobile app.

### `authService`

Create a focused Firebase Auth service.

Responsibilities:

- Sign in with email/password.
- Sign out.
- Subscribe to Firebase Auth state changes.
- Normalize Firebase Auth errors into user-safe messages.

Rules:

- Use `auth` from `src/renderer/src/config/firebase.ts`.
- Do not access Firestore in `authService`.
- Do not render UI.
- Do not store secrets or credentials.
- Do not log passwords, tokens, or sensitive user details.

### `userService`

Create a focused Firestore user profile service.

Responsibilities:

- Load `users/{userId}` by Firebase Auth UID.
- Validate that the user document exists.
- Validate required fields are present.
- Return the typed `User` profile.

Rules:

- Use `db` from `src/renderer/src/config/firebase.ts`.
- Do not create users automatically during login unless explicitly approved.
- Do not place role decisions in React components.
- Missing profile must be treated as an authentication failure state for app access.
- `isActive: false` must block protected app access.

### `AuthProvider`

Create an auth context provider that owns auth session state.

Responsibilities:

- Subscribe to Firebase Auth state once.
- Load the Firestore user profile when an Auth user exists.
- Expose auth state to the app tree.
- Expose `login` and `logout` actions.
- Track loading and error states.

State shape should distinguish:

- Auth initializing
- Unauthenticated
- Authenticated but loading Firestore profile
- Authenticated with active Firestore user profile
- Authenticated with missing Firestore profile
- Authenticated with inactive profile
- Error

Rules:

- `AuthProvider` may coordinate services and state.
- Large workflow details belong in services.
- `App.tsx` should only wrap routes/providers and must not contain Firebase logic.

### `useAuth`

Create a hook for consuming the auth context.

Responsibilities:

- Return the current Firebase Auth user when needed.
- Return the loaded Firestore `User` profile.
- Return role and auth status.
- Return loading and error state.
- Expose `login` and `logout` actions.
- Throw a clear error if used outside `AuthProvider`.

Rules:

- Components should use `useAuth` instead of calling services or Firebase directly.
- The hook should not duplicate business logic from services.

### Role Loading

Role loading occurs only after the Firestore user document is loaded.

Flow:

```txt
Firebase Auth user
  ↓
Load users/{uid}
  ↓
Validate isActive
  ↓
Read role
  ↓
Expose user and role through AuthProvider/useAuth
```

If the role is missing or invalid, treat the session as an access error and do not render protected content.

### `ProtectedRoute`

Create a reusable route guard for authenticated pages.

Responsibilities:

- Show loading UI while auth/profile state is initializing.
- Redirect unauthenticated users to the login page.
- Block users with missing Firestore profiles.
- Block inactive users.
- Render protected children only after an active profile is loaded.

Rules:

- Must not call Firebase directly.
- Must use `useAuth`.
- Must expose meaningful blocked states.
- Must support future route layouts without adding business logic to `App.tsx`.

### `RoleGate`

Create a reusable role-based rendering guard.

Responsibilities:

- Accept allowed roles.
- Read the current user role through `useAuth`.
- Render children only when the current user role is allowed.
- Render an optional fallback when not allowed.

Rules:

- Use role data loaded from Firestore.
- Do not replace Firebase security rules.
- Use for UI visibility only, not backend enforcement.

### Login Page

Create a Phase 1 login page.

Responsibilities:

- Render email and password fields.
- Submit through `useAuth().login`.
- Show loading state while signing in.
- Show user-safe error messages.
- Disable duplicate submit while loading.
- Redirect authenticated active users away from login.

Style requirements:

- Follow `docs/STYLE_GUIDE.md`.
- Use shared UI components where available.
- Support light and dark themes.
- Use accessible labels.
- Avoid inline styles.
- Do not create unstyled prototype UI.

### Logout Flow

Logout should:

- Call `authService.signOut`.
- Clear local auth provider state through Firebase Auth state change.
- Redirect to login or unauthenticated route.
- Show a loading/disabled state while logout is in progress if triggered from UI.

Logout must not delete Firestore user data or clear Firebase configuration.

## Security Considerations

- Email/password is the only approved provider for Phase 1.
- Firebase Auth proves identity only; it does not grant authorization.
- Every protected route requires a loaded, active Firestore user document.
- Role checks must be centralized through route guards, `RoleGate`, and the future permission service.
- UI guards are not security boundaries. Firestore and Storage rules must enforce access.
- Customers must not gain admin, helper, settings, queue, audit log, or original file access through UI-only checks.
- Missing or invalid roles must default to denied access.
- Inactive users must be blocked.
- Passwords, tokens, and sensitive customer information must never be logged.
- Firebase Admin SDK must not be used in the renderer.
- Auth errors should be normalized so raw backend details are not shown unnecessarily.

## Error Handling

Handle these cases explicitly:

- Invalid email/password.
- Disabled Firebase Auth account.
- Network failure.
- Firebase Auth unavailable or misconfigured.
- Missing `users/{userId}` document.
- Invalid user role.
- Inactive user profile.
- Firestore permission denied.
- Unknown failure with a safe fallback message.

Errors should be visible to users where action is possible and should not be swallowed.

## Loading States

Required loading states:

- Initial auth state loading.
- Login request in progress.
- Firestore user profile loading.
- Logout request in progress.
- Protected route waiting for auth/profile state.

Loading UI should be accessible and visually consistent with the shared design system.

## Files To Create Or Modify

### Create

```txt
src/renderer/src/features/auth/components/ProtectedRoute.tsx
src/renderer/src/features/auth/context/AuthProvider.tsx
src/renderer/src/features/auth/hooks/useAuth.ts
src/renderer/src/features/auth/pages/LoginPage.tsx
src/renderer/src/features/auth/services/authService.ts
src/renderer/src/features/auth/types/auth.types.ts
src/renderer/src/features/users/services/userService.ts
src/renderer/src/features/users/types/user.types.ts
src/renderer/src/features/permissions/components/RoleGate.tsx
```

If shared UI components do not already exist when implementation begins, create the minimum required shared components in the correct shared component folder before using one-off UI.

### Modify

```txt
src/renderer/src/App.tsx
```

Allowed `App.tsx` changes:

- Wrap routes with `AuthProvider`.
- Add routes.
- Add layout wrappers.
- Add `ProtectedRoute` around protected app routes.

Forbidden `App.tsx` changes:

- Firebase calls.
- Firestore calls.
- Login workflow logic.
- Role checking logic.
- Business workflows.

Potentially modify routing/style entry files only if needed by the existing app structure.

## Testing Plan

### Service Tests Or Manual Verification

- Email/password login calls Firebase Auth successfully.
- Logout signs out the current user.
- User profile loads from `users/{uid}` after Auth login.
- Missing Firestore profile blocks access.
- `isActive: false` blocks access.
- Invalid or missing role blocks access.
- Auth errors return user-safe messages.

### Route Verification

- Unauthenticated users are redirected to login.
- Authenticated active users can access protected routes.
- Protected routes show loading while auth/profile state is resolving.
- Login page redirects away when already authenticated.
- `RoleGate` renders children for allowed roles and fallback for denied roles.

### Security Verification

- Components do not call Firebase directly.
- Firebase access exists only in services.
- `App.tsx` contains only providers, routes, and layout wrappers.
- No passwords, tokens, secrets, or Firebase Admin credentials are logged or committed.
- Firestore rules still enforce access independently of UI route guards.

## Risks

- Treating Firebase Auth as authorization would allow role bypass in UI.
- Skipping Firestore user profile loading would break role-based access.
- Creating user documents automatically during login could assign unsafe defaults.
- Scattered role checks would cause permission drift.
- Unstyled login UI would violate the style guide.
- Raw Firebase errors could leak implementation details or confuse users.

## Future Expansion Considerations

- Add password reset after core login/logout is stable.
- Add role management UI after owner/admin permissions are implemented.
- Add customer website auth later using the same backend and shared user model.
- Add additional providers only after approval.
- Add audit logging for role changes when role management exists.

## Completion Checklist

- Firebase Email/Password Auth used.
- Firestore `users/{userId}` profile required.
- Role loaded from Firestore.
- Missing profile blocks access.
- Inactive user blocks access.
- `AuthProvider` owns session state.
- `useAuth` exposes session state and actions.
- `authService` owns Firebase Auth calls.
- `userService` owns Firestore user profile calls.
- `ProtectedRoute` guards protected pages.
- `RoleGate` handles role-based rendering.
- Login page has loading, success, and error states.
- Logout flow clears session through Firebase Auth.
- No Firebase calls in components.
- No business logic in `App.tsx`.
- No secrets or Admin SDK in renderer.
- Security rules remain the backend enforcement layer.
