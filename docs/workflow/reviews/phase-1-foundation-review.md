# Phase 1 Foundation Review

## Purpose

This review checks the current Phase 1 implementation against the Fresh Prints architecture, coding, Firebase, security, roadmap, and styling rules.

Reviewed areas:

- App structure
- Firebase foundation
- Authentication foundation
- User role loading
- Permission foundation
- Protected routing
- App shell and dashboard
- Theme foundation
- Electron boundary
- File organization
- File size and duplication risks

No application code was changed as part of this review.

## Review Summary

The Phase 1 foundation is mostly aligned with the project direction. The app has a small `App.tsx`, Firebase initialization is centralized, auth and user loading are service-based, permissions are centralized, and the shell/theme foundation is in place with light and dark mode support.

The main issue to fix before calling the foundation complete is the Electron preload bridge. It still exposes a generic `ipcRenderer` object to the renderer and the renderer subscribes to a test IPC message from `src/main.tsx`. That conflicts with the security guidance to expose only narrow, safe APIs.

There are also a few medium and low priority cleanup items around routing, stale starter assets, shared component placement, and hardcoded dashboard role text.

## What Is Correct

### App.tsx Is Small

`src/App.tsx` only composes providers and routes:

```txt
ThemeProvider
AuthProvider
AppRoutes
```

This matches the rule that `App.tsx` should contain providers, routes, and layout wrappers only.

### Firebase Initialization Is Centralized

Firebase app initialization is isolated in:

```txt
src/renderer/src/config/firebase.ts
```

The file initializes and exports:

- `app`
- `auth`
- `db`
- `storage`

Environment values are read through:

```txt
src/renderer/src/config/env.ts
```

No Firebase secrets are hardcoded in source.

### Firebase Logic Is Kept Out Of Components

Firebase Auth calls are isolated in:

```txt
src/renderer/src/features/auth/services/authService.ts
```

Firestore user loading is isolated in:

```txt
src/renderer/src/features/users/services/userService.ts
```

Components use hooks and services rather than calling Firebase directly.

### Electron Filesystem Logic Is Not Used In React Components

The React renderer does not import Node filesystem APIs.

Window state persistence uses filesystem access only in:

```txt
electron/main.ts
```

That is the correct process boundary for local machine persistence.

### Auth Service Structure Is Correct

Authentication is split into:

- `authService.ts` for Firebase Auth operations.
- `userService.ts` for Firestore profile loading.
- `AuthProvider.tsx` for auth state coordination.
- `useAuth.ts` for context access.
- `LoginForm.tsx` and `LoginPage.tsx` for UI.
- `ProtectedRoute.tsx` for protected route handling.

This generally follows the planned Phase 1 auth architecture.

### Role Loading Is Present

After Firebase Auth state changes, `AuthProvider` loads:

```txt
users/{uid}
```

The Firestore user document is required before `isAuthenticated` becomes true.

The provider handles:

- Initializing
- Unauthenticated
- Loading profile
- Missing profile
- Inactive user
- Authenticated
- Error

This matches the required auth flow.

### Permission Service Is Centralized

Permission logic lives in:

```txt
src/renderer/src/features/permissions/services/permissionService.ts
```

`ProtectedRoute`, `RoleGate`, `Sidebar`, and `DashboardPage` use the service instead of duplicating direct role checks.

This is aligned with the security and architecture docs.

### Light And Dark Theme Support Exists

Theme support includes:

- `ThemeProvider`
- `useTheme`
- `themeService`
- `ThemeToggle`
- `tokens.css`
- `themes.css`
- `layout.css`
- `globals.css`
- `utilities.css`

The app supports:

- Light theme
- Dark theme
- System preference
- Persisted theme mode

CSS uses variables and semantic theme tokens.

### Inline Styling Is Not A Problem

No inline style usage was found in the renderer.

The UI uses CSS classes and shared components.

### File Sizes Are Acceptable

No implementation file exceeds the project review thresholds.

Largest files observed:

- `src/renderer/src/styles/layout.css`: 260 lines
- `electron/main.ts`: 169 lines
- `src/renderer/src/styles/utilities.css`: 140 lines
- `src/renderer/src/features/auth/context/AuthProvider.tsx`: 139 lines
- `src/renderer/src/features/permissions/services/permissionService.ts`: 101 lines

No file is over 400 lines.

### Phase Scope Is Mostly Respected

The implementation does not build:

- ZIP import
- DPI validation
- Thumbnail generation workflow
- AI categorization
- Design library features
- Queue workflows
- Customer request workflows

The current work stays focused on foundation, auth, permissions, theme, shell, and setup documentation.

## What Needs Fixing

### 1. Generic IPC Bridge Is Exposed To The Renderer

Severity: High

Current preload exposes a broad `ipcRenderer` wrapper:

```txt
electron/preload.ts
```

It exposes:

- `on`
- `off`
- `send`
- `invoke`

This conflicts with the security requirement to expose minimal, safe APIs only. The docs explicitly warn against exposing unrestricted Electron or Node-like capabilities to the renderer.

Why this matters:

- Any renderer code can send or invoke arbitrary IPC channel names.
- Future IPC handlers could become reachable without a typed, reviewed preload API.
- This weakens Electron context isolation benefits.

### 2. Renderer Subscribes To A Starter Test IPC Message

Severity: Medium

`src/main.tsx` subscribes to:

```txt
window.ipcRenderer.on("main-process-message", ...)
```

and logs the message.

This appears to be leftover Electron/Vite starter code. It is not part of Fresh Prints functionality and depends on the broad preload bridge above.

Why this matters:

- It introduces renderer dependency on generic IPC.
- It leaves temporary logging in application code.
- It makes the insecure preload bridge appear necessary when it is not.

### 3. App Routing Uses `window.location.pathname` Directly

Severity: Medium

`src/renderer/src/routes/AppRoutes.tsx` reads:

```txt
window.location.pathname
```

This works for the current minimal app, but it is not a scalable routing foundation.

Why this matters:

- The app will need more routes as Phase 1 and Phase 2 continue.
- Direct path checks become hard to protect consistently.
- Future route authorization will be easier with an explicit route configuration or a router library.

This is not a current blocker, but it should be addressed before adding more pages.

### 4. Preload API Naming Does Not Match Project Convention

Severity: Medium

The architecture docs show safe APIs exposed under a Fresh Prints namespace, for example:

```txt
window.freshPrints.files.selectZip()
```

Current code exposes:

```txt
window.ipcRenderer
```

Why this matters:

- It keeps starter template naming.
- It does not communicate Fresh Prints ownership.
- It encourages direct IPC use instead of feature-specific safe APIs.

### 5. Shared Components Live In A Global Shared Folder

Severity: Low

Shared components currently live under:

```txt
src/renderer/src/shared/components/
```

This is reasonable for the current repository shape and matches the style guide example. However, `AGENTS.md` also says feature code belongs in `features/`, and shared code belongs in `shared/`.

This is not a blocker. It is consistent enough for Phase 1.

Recommended future direction:

- Keep shared UI in `src/renderer/src/shared/components/`.
- Keep feature-specific UI in `src/renderer/src/features/{feature}/components/`.
- Do not move current shared UI without a larger structure decision.

### 6. Dashboard Contains Some Role Display Text

Severity: Low

`DashboardPage` displays:

```txt
Your current role is {user?.role}
```

This is display-only and not authorization logic. It is acceptable.

However, future pages should avoid turning role display into role enforcement. Enforcement should remain in:

```txt
permissionService.ts
```

### 7. Starter Assets Remain In The Project

Severity: Low

Starter assets still exist:

```txt
src/assets/react.svg
public/vite.svg
public/electron-vite.svg
public/electron-vite.animate.svg
```

They are not currently central to Phase 1. They should be removed later if unused.

### 8. Main Process File Location Differs From Documented Target

Severity: Low

The docs describe Electron main process code under:

```txt
src/main/
```

The current Electron/Vite template uses:

```txt
electron/main.ts
electron/preload.ts
```

This appears to be the existing repository convention. It is acceptable short term, but the discrepancy should be documented or resolved before the Electron layer grows.

## Recommended Fixes

### Fix 1: Replace Generic IPC Exposure With A Narrow Fresh Prints API

Recommended change:

- Remove `window.ipcRenderer` exposure.
- Expose only approved APIs under:

```txt
window.freshPrints
```

For the current Phase 1 app, there may be no renderer-accessible Electron APIs needed yet.

Acceptable Phase 1 result:

```txt
electron/preload.ts exposes no operational IPC APIs
```

or:

```txt
window.freshPrints.app.getVersion()
```

only if a specific UI need exists.

### Fix 2: Remove Starter IPC Test Code

Recommended change:

- Remove the `main-process-message` send from `electron/main.ts`.
- Remove `window.ipcRenderer.on(...)` and `console.log(...)` from `src/main.tsx`.
- Remove or update `electron/electron-env.d.ts` so it does not type a broad `ipcRenderer` global.

### Fix 3: Introduce A Small Route Configuration Before More Pages

Recommended change before adding more protected pages:

- Create a small route list with path, component, and permission key.
- Keep `AppRoutes` as the routing owner.
- Avoid putting route permission checks inside pages.

If a router dependency is considered later, justify it against project dependency rules.

### Fix 4: Keep Permission Checks Centralized

Recommended rule for future work:

- Use `permissionService` for all authorization decisions in UI.
- Use `RoleGate` for render visibility.
- Use `ProtectedRoute` for page-level access.
- Do not add direct role checks to components.

### Fix 5: Remove Starter Assets When They Are Confirmed Unused

Recommended change:

- Remove unused Vite/React/Electron starter assets after confirming no references remain.
- Keep Fresh Prints icon assets.

### Fix 6: Decide Whether To Keep Or Migrate Electron Folder Layout

Recommended decision:

- Either document that this project uses the Electron/Vite `electron/` folder convention, or
- Plan a later migration to `src/main/` and `src/preload/`.

Do not migrate casually as part of unrelated feature work.

## Risks

### Broad IPC Exposure Risk

The generic preload bridge is the most important risk. It is not currently paired with dangerous IPC handlers, but it creates an unsafe pattern for future work.

Risk level: High until fixed.

### Future Route Sprawl Risk

Direct `window.location.pathname` checks are acceptable for one page, but they will become fragile as the app adds design library, queue, settings, and request pages.

Risk level: Medium before more pages are added.

### Client-Side Permission Risk

The app has centralized UI permissions, but Firebase security rules still need to enforce the same model.

Risk level: Medium until Firestore and Storage production rules are implemented.

### Incomplete Phase 1 Exit Criteria

The app foundation exists, but full Phase 1 exit criteria still depend on:

- Real Firebase project configuration
- Seeded users
- Firestore profile loading in a live environment
- Firebase rules validation
- Storage rules validation

Risk level: Medium.

### Starter Template Drift Risk

Remaining starter assets, starter IPC, and folder layout differences can create confusion if not cleaned up or documented.

Risk level: Low to Medium.

## Completion Checklist

### Architecture

- [x] `App.tsx` stays small.
- [x] Firebase initialization is centralized.
- [x] Firebase calls are kept out of React components.
- [x] Firestore user loading happens through a service.
- [x] Auth state is coordinated through `AuthProvider`.
- [x] Feature folders are used for auth, users, permissions, theme, and dashboard.
- [x] Shared UI components are reused.
- [ ] Generic `ipcRenderer` preload exposure is removed.
- [ ] Starter IPC message and renderer console logging are removed.
- [ ] Electron folder convention is documented or future migration is planned.

### Authentication

- [x] Email/password login uses `authService`.
- [x] Logout uses `authService`.
- [x] Firebase Auth state subscription is centralized.
- [x] Firestore `users/{uid}` record is loaded after auth.
- [x] Missing profile state is handled.
- [x] Inactive user state is handled.
- [x] Loading and error states are handled.

### Permissions

- [x] `permissionService.ts` exists.
- [x] `RoleGate` uses centralized permission logic.
- [x] `ProtectedRoute` uses centralized permission logic.
- [x] Sidebar visibility uses centralized permission logic.
- [x] Dashboard visibility uses centralized permission logic.
- [ ] Production Firebase rules mirror the permission model.

### Styling

- [x] Global CSS structure exists.
- [x] Light theme exists.
- [x] Dark theme exists.
- [x] System theme mode exists.
- [x] Theme preference is persisted.
- [x] CSS variables are used.
- [x] No inline styles found.
- [x] Shared UI components exist for current shell needs.

### Code Quality

- [x] No oversized implementation files found.
- [x] No duplicate Firebase initialization found.
- [x] No duplicate auth service found.
- [x] No duplicate permission service found.
- [x] TypeScript check passes.
- [x] ESLint passes.
- [ ] Starter assets are removed when confirmed unused.

### Phase 1 Readiness

- [x] Firebase client configuration foundation exists.
- [x] Authentication foundation exists.
- [x] User profile loading foundation exists.
- [x] Permission foundation exists.
- [x] Theme and shell foundation exists.
- [x] Dashboard placeholder exists.
- [ ] Firestore rules are implemented and verified against live project.
- [ ] Storage rules are implemented and verified against live project.
- [ ] Seeded owner/admin/helper/customer users are verified in a live Firebase project.
- [ ] Broad preload IPC exposure is fixed before adding filesystem or import workflows.
