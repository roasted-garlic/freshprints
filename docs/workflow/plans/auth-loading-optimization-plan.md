# Auth Loading Optimization Plan

## Goal

Eliminate the full-screen **Checking your session** loader during in-app navigation while preserving secure startup behavior for cold launches.

The desktop app should feel like a persistent shell: sidebar, header, and theme remain visible after the first successful authentication.

---

## Current Behavior

### What users see today

1. User signs in and lands on the dashboard inside `AppShell` (sidebar + top bar visible).
2. User clicks **Users** or **Dashboard** in the sidebar.
3. The entire UI is replaced by a full-screen status page:

```txt
Checking your session
Fresh Prints is verifying your account access.
```

4. Sidebar and header disappear during this state.
5. After Firebase Auth restores the session and Firestore loads `users/{uid}`, the shell reappears.

This happens on every sidebar navigation between `/` and `/users`.

### Current render flow

```txt
App.tsx
└── ThemeProvider
    └── AuthProvider
        └── AppRoutes
            └── ProtectedRoute          ← full-screen gate
                └── AppShell            ← only renders after auth completes
                    ├── Sidebar         ← uses <a href="...">
                    ├── Topbar
                    └── Page content
```

### Current auth lifecycle (`AuthProvider`)

On every application mount:

| Step | Auth status | `isLoading` | Firestore read |
| --- | --- | --- | --- |
| 1 | `initializing` | `true` | none |
| 2 | Firebase persistence configured | `true` | none |
| 3 | `onAuthStateChanged` fires with signed-in user | `true` | none |
| 4 | `loading-profile` | `true` | `getUserById(uid)` |
| 5 | `authenticated` | `false` | none |

`ProtectedRoute` treats steps 1, 4, and any `isLoading: true` state as a full-screen blocking condition.

### Current routing (`AppRoutes`)

`AppRoutes` reads `window.location.pathname` and chooses a page manually. There is no client-side router.

Sidebar navigation uses native anchor tags:

```tsx
<a href="/users">Users</a>
```

Native anchors trigger a **full document navigation**. In Electron + Vite, that reloads the renderer process HTML document and remounts the entire React tree.

---

## Root Cause

The loading screen during navigation is caused by **two architectural issues working together**.

### Primary root cause: full page reload on navigation

Sidebar links use `<a href="...">` instead of client-side navigation.

Each click:

1. Reloads the renderer document.
2. Remounts `ThemeProvider`, `AuthProvider`, and all feature state.
3. Re-runs the full cold-start auth bootstrap (`initializing` → `loading-profile` → Firestore profile read).
4. Forces `ProtectedRoute` to show the full-screen session loader again.

This is not a React re-render bug. It is a **navigation model mismatch**: the UI looks like a desktop shell, but routing behaves like separate web pages.

### Secondary root cause: app-level auth gate wraps the shell

`ProtectedRoute` wraps `AppShell` and returns a full-screen loader for:

```ts
isLoading || status === "initializing" || status === "loading-profile"
```

That design is appropriate for cold startup, but it is too coarse once the app is already authenticated because:

- The shell is unmounted during any bootstrap loading state.
- `isLoading` is also set during `login()` and `logout()`, which can affect unrelated UI (for example sign-out button state and potentially route output depending on timing).

### Contributing factor: profile fetch repeats on every mount

`AuthProvider` does not cache the loaded profile across remounts. On every document reload it:

1. Clears `user` to `null`.
2. Sets `isAuthenticated` to `false` during profile load.
3. Calls `userService.getUserById(firebaseUser.uid)` again.

Firebase Auth session restoration is fast, but the Firestore read adds visible delay and unnecessary reads.

### What is not the root cause

| Suspected cause | Finding |
| --- | --- |
| `onAuthStateChanged` re-firing during SPA navigation | Not observed as primary issue because navigation currently reloads the document |
| Role validation re-running | Permission checks are synchronous and cheap; they are not causing the loader |
| Theme reset | Theme preference survives via `localStorage`, but the shell still disappears during reload |
| Firestore rules | Rules are unrelated to the loading UX |

---

## Recommended Architecture

### Target render flow

```txt
App.tsx
└── ThemeProvider
    └── AuthProvider
        └── AuthBootstrapGate        ← full-screen only on cold start
            └── AppRoutes            ← client-side route switching
                ├── /login → LoginPage
                └── authenticated layout (shell always mounted)
                    └── AppShell
                        ├── Sidebar
                        ├── Topbar
                        └── RouteOutlet
                            └── RoutePermissionGate (per route)
                                └── Page
```

### Responsibility split

| Layer | Responsibility |
| --- | --- |
| `AuthProvider` | Own session state, profile cache, login/logout actions |
| `AuthBootstrapGate` | Full-screen loader only while app has not completed first auth resolution |
| `AppShell` | Persistent authenticated chrome |
| `RoutePermissionGate` | Page-level unauthorized state inside shell |
| Feature pages/hooks | Page-level loading for feature data (users list, diagnostics, etc.) |

### Auth state model (proposed)

Separate bootstrap loading from action loading.

```ts
type AuthBootstrapStatus =
  | "initializing"
  | "loading-profile"
  | "ready"
  | "unauthenticated"
  | "missing-profile"
  | "inactive"
  | "error";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  bootstrapStatus: AuthBootstrapStatus;
  isAuthActionLoading: boolean; // login/logout only
  isAuthenticated: boolean;
  error: string | null;
}
```

Rules:

- Full-screen loader uses `bootstrapStatus` only.
- `isAuthActionLoading` affects buttons/forms only.
- Once `bootstrapStatus === "ready"`, do not return to full-screen during normal navigation.

### Profile cache rules (proposed)

Inside `AuthProvider` auth subscription:

- If `firebaseUser.uid` matches the already-loaded `user.id`, keep the current profile and skip Firestore.
- Re-fetch profile only when:
  - UID changes
  - Explicit `refreshProfile()` is called (future admin action)
  - Optional TTL later if needed (not required for Phase 1 fix)

This avoids unnecessary reads even if auth state events fire again.

### Routing approach (proposed)

Introduce client-side routing so sidebar navigation does not reload the document.

Preferred option: **`react-router-dom`**

Justification:

- The app already has multiple protected routes and will add more in Phase 2.
- Existing reviews flagged manual `window.location.pathname` checks as a maintainability risk.
- Client-side routing is the standard fix for SPA shell persistence.
- One well-known dependency is simpler than maintaining custom history synchronization.

Alternative if dependency must be avoided:

- Small internal router using `history.pushState`, `popstate`, and `useSyncExternalStore`.
- Higher maintenance cost; only choose this if dependency approval is denied.

Either way, sidebar links must stop using full document `<a href>` navigation for in-app routes.

---

## Proposed Solution

### Phase A — Client-side routing (highest impact)

**Files**

- `src/renderer/src/routes/AppRoutes.tsx`
- `src/renderer/src/shared/components/Sidebar.tsx`
- `src/App.tsx` (wrap routes with router provider only; keep small)
- `package.json` (if `react-router-dom` approved)

**Changes**

1. Add a router provider at the app root.
2. Replace manual pathname branching with route definitions.
3. Replace sidebar `<a href>` with router `NavLink` or internal navigation helper.
4. Keep `App.tsx` limited to providers + route entry.

**Expected result**

Navigation between `/` and `/users` no longer remounts `AuthProvider`.

### Phase B — Split bootstrap gate from route guard

**Files**

- `src/renderer/src/features/auth/components/AuthBootstrapGate.tsx` (new)
- `src/renderer/src/features/auth/components/ProtectedRoute.tsx` (refocus or rename)
- `src/renderer/src/features/auth/context/AuthProvider.tsx`
- `src/renderer/src/features/auth/types/auth.types.ts`

**Changes**

1. Create `AuthBootstrapGate` for cold-start full-screen loading only.
2. Refactor `ProtectedRoute` into a page-level permission guard that does not own bootstrap loading.
3. Mount `AppShell` outside per-page guards once bootstrap is `ready` and user is authenticated.
4. Replace global `isLoading` with `bootstrapStatus` + `isAuthActionLoading`.

**Expected result**

Even if auth re-checks occur, the shell remains mounted after first successful bootstrap.

### Phase C — Profile load optimization

**Files**

- `src/renderer/src/features/auth/context/AuthProvider.tsx`
- Optional: `src/renderer/src/features/auth/services/authSessionService.ts` (if logic grows)

**Changes**

1. Skip `getUserById` when cached profile matches current UID.
2. Do not clear `user` before confirming UID changed.
3. Keep Firestore access in services, not components.

**Expected result**

Fewer Firestore reads and faster recovery if auth events repeat.

### Phase D — Page-level loading only

**Files**

- Feature pages/hooks already using page loaders (`useTeamUsers`, `useFirebaseConnectionStatus`)
- Unauthorized route state inside shell using `ErrorState`

**Changes**

1. Keep list/diagnostic loading inside page content areas.
2. Unauthorized page access shows an in-shell `ErrorState`, not a full-screen page.
3. Preserve sidebar/header/theme during page fetch states.

---

## Desired Behavior Mapping

| Scenario | Expected UX |
| --- | --- |
| Cold app launch, signed-in user | Full-screen bootstrap loader once, then shell |
| Cold app launch, signed-out user | Login page without shell |
| Navigate Dashboard ↔ Users | Shell stays mounted; only page content changes |
| Users page loading team list | Inline/page spinner inside content area |
| User lacks page permission | In-shell unauthorized message; sidebar remains |
| Login submit | Login form/button loading only |
| Logout | Shell remains until auth state becomes unauthenticated, then route to login |
| Theme toggle | Unchanged; no remount on navigation |

---

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Adding `react-router-dom` | New dependency | Justify against custom router maintenance; keep route table small |
| Stale cached profile after role change | User sees old permissions until refresh | Add explicit `refreshProfile()` hook for admin workflows later; optional focus/reconnect refresh in Phase 2 |
| Splitting auth gates incorrectly | Auth bypass or double loaders | Keep bootstrap gate above shell; permission gate below shell; add manual test checklist |
| Electron deep-link / refresh on `/users` | Route must resolve on direct load | Configure router basename/history correctly for Vite + Electron |
| StrictMode double effects in dev | Extra auth/profile calls on mount | Acceptable in dev; profile cache reduces duplicate reads |
| Over-coupling routes and permissions | Hard-to-maintain route table | Central route config mapping `path → page → permission` |

---

## Out Of Scope

This plan does not change:

- Firestore security rules
- Storage security rules
- Cloud Functions
- User management behavior
- Auth provider business rules for inactive/missing profile handling

---

## Verification Checklist (post-implementation)

### Navigation

- [ ] Dashboard → Users does not show full-screen session loader
- [ ] Users → Dashboard does not show full-screen session loader
- [ ] Sidebar remains visible during navigation
- [ ] Top bar remains visible during navigation
- [ ] Theme selection remains unchanged after navigation

### Startup

- [ ] Cold launch while signed in shows full-screen loader once
- [ ] Cold launch while signed out shows login page
- [ ] After first authenticated bootstrap, navigation does not repeat full-screen loader

### Data loading

- [ ] `users/{uid}` is read once per session under normal navigation
- [ ] Users list loading appears only inside Users page content
- [ ] Firebase connection card loading appears only inside dashboard card

### Security

- [ ] Signed-out users cannot access protected routes
- [ ] Helper cannot access `/users`
- [ ] Missing/inactive profile still blocks access with clear messaging

---

## Implementation Order

1. **Phase A** — Client-side routing (fixes the primary root cause)
2. **Phase B** — Bootstrap vs route guard split (prevents shell unmount regression)
3. **Phase C** — Profile cache (reduces Firestore reads)
4. **Phase D** — Polish page-level unauthorized and loading states

Phases A + B deliver the user-visible fix. Phases C + D improve performance and consistency.

---

## Summary

The full-screen **Checking your session** loader appears during navigation because sidebar links perform **full document reloads**, which remounts `AuthProvider` and repeats the cold-start auth/profile bootstrap. `ProtectedRoute` then hides the entire `AppShell` whenever bootstrap loading is active.

The fix is not to weaken security. The fix is to:

1. Navigate client-side inside the authenticated shell.
2. Reserve the full-screen loader for true application startup.
3. Use page-level loading states for feature data.
4. Cache the authenticated profile for the current session to avoid redundant Firestore reads.
