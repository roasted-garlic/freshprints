# 02 — Implementation Guide

Ordered replication checklist for a **greenfield** app adopting the Fresh Prints Firebase foundation. Execute steps in sequence.

Labels: **Portable** unless noted **Fresh Prints–specific**.

---

## Prerequisites

- Node.js project with a bundler that supports `import.meta.env` (Vite) or equivalent
- Firebase CLI installed (`npm install -g firebase-tools`)
- Google account for Firebase Console

---

## Replication Checklist

### 1. Create Firebase project + web app

**Portable.**

1. Firebase Console → **Add project** → record project ID.
2. **Project settings** → **Your apps** → **Web** (`</>`) → register app.
3. Copy SDK config fields (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

**Reference:** `docs/workflow/setup/firebase-project-setup.md`

`[NEEDS HUMAN INPUT]` — actual project ID and console project name are environment-specific; do not commit them.

---

### 2. Add env vars and init module

**Portable.**

1. Create `.env.local` (gitignored) at project root:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

2. Copy pattern from:
   - `src/renderer/src/config/env.ts` — `validateFirebaseEnv()`, `firebaseConfig`
   - `src/renderer/src/config/firebase.ts` — single init

3. Add `.env.example` with empty placeholders (no real values).

4. **Omit `getFunctions`** in `firebase.ts` unless you need Callable Functions (**Fresh Prints–specific** export).

**Verify:** App starts without "Missing required Firebase environment variable" error.

---

### 3. Enable Email/Password auth

**Portable.**

1. Console → **Authentication** → **Sign-in method** → enable **Email/Password**.
2. Disable passwordless email link unless required.

**Reference:** `docs/workflow/setup/auth-testing-guide.md` (Step 1)

---

### 4. Create `users` collection contract + first admin bootstrap

**Portable.**

**Contract** (mirror `src/renderer/src/features/users/types/user.types.ts`):

```ts
// Adapt UserRole enum to your app
type UserRole = "owner" | "admin" | "helper" | "customer";

interface User {
  id: string;           // == Auth uid
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

**First admin bootstrap (development):**

1. Console → **Authentication** → **Users** → **Add user** (email + password).
2. Copy the new user's **UID**.
3. Console → **Firestore** → create document `users/{uid}` with all required fields.
4. Set `role` to your highest privilege (e.g. `owner`), `isActive: true`.

**Production / team provisioning (optional):**

Deploy `createTeamUser` pattern from `functions/src/createTeamUser.ts` — creates Auth user + Firestore doc atomically.

**Rules:** Deploy deny-client-write on `users` (step 10).

---

### 5. Implement auth service + AuthProvider bootstrap

**Portable.** Copy patterns from:

| File | Copy |
|------|------|
| `src/renderer/src/features/auth/services/authService.ts` | Login, logout, persistence, `onAuthStateChanged` |
| `src/renderer/src/features/auth/services/authPreferencesService.ts` | Remember-me (optional) |
| `src/renderer/src/features/auth/context/AuthProvider.tsx` | Auth → profile bootstrap state machine |
| `src/renderer/src/features/auth/context/AuthContext.ts` | Context definition |
| `src/renderer/src/features/auth/hooks/useAuth.ts` | Context consumer |
| `src/renderer/src/features/auth/types/auth.types.ts` | `AuthBootstrapStatus`, `AuthState` |
| `src/renderer/src/features/auth/components/AuthBootstrapGate.tsx` | Loading/error gates |
| `src/renderer/src/features/auth/pages/LoginPage.tsx` | Login UI (adapt styling) |

**Wire at app root** (see `src/App.tsx`):

```tsx
<AuthProvider>
  <Router>
    <AuthBootstrapGate>
      <Routes>...</Routes>
    </AuthBootstrapGate>
  </Router>
</AuthProvider>
```

**Verify:** Login with bootstrapped admin → `bootstrapStatus: "ready"`, `isAuthenticated: true`.

---

### 6. Implement userService profile load

**Portable.**

1. `src/renderer/src/features/users/types/user.types.ts` — types + `isUserRole()`
2. `src/renderer/src/features/users/services/userService.ts` — `getUserById(uid)`
3. `src/renderer/src/features/auth/services/authSessionService.ts` — cache + dedupe loads
4. `src/renderer/src/features/auth/services/authProfileCacheService.ts` — in-memory cache

**Error contract:** Missing doc throws `"No Fresh Prints user profile exists for this account."` — adapt message string; `AuthProvider` maps to `missing-profile`.

**Verify:** Auth user without Firestore doc → missing-profile screen.

---

### 7. Implement permissionService + route gates

**Portable** pattern; **adapt** roles and permissions.

1. `src/renderer/src/features/permissions/types/permission.types.ts` — `PermissionKey` union
2. `src/renderer/src/features/permissions/services/permissionService.ts` — start with:
   - `hasPermission(user, key)`
   - `canAccessDesktopApp` / dashboard gate
   - User management helpers as needed
3. `src/renderer/src/features/auth/components/ProtectedRoute.tsx`
4. `src/renderer/src/features/permissions/components/RoleGate.tsx`
5. `src/renderer/src/routes/AuthenticatedLayout.tsx` — auth redirect
6. `src/renderer/src/routes/LoginRoute.tsx` — redirect if already authenticated

**Fresh Prints–specific:** Full permission matrix includes designs, AI review, etc. — omit in minimal app.

**Verify:** User with `helper` role cannot access `viewUsers` route (or your equivalent).

---

### 8. Add firestoreCollectionService pattern

**Portable.**

1. `src/renderer/src/features/firebase/constants/firestoreCollections.ts`:

```ts
export const FIRESTORE_COLLECTIONS = {
  users: "users",
  // add your entities
} as const;
```

2. `src/renderer/src/features/firebase/services/firestoreCollectionService.ts` — `getCollectionReference`, `getUsersCollection()`

3. Utilities:
   - `src/renderer/src/features/firebase/utils/firestoreDocument.ts`
   - `src/renderer/src/features/firebase/utils/firestoreTimestamp.ts`
   - `src/renderer/src/features/firebase/utils/firestoreErrorMessage.ts`

**Verify:** `getDoc` on `users/{uid}` via service succeeds for signed-in user.

---

### 9. Add one exemplar entity service

**Portable** template derived from `designService.ts` — **do not copy designs domain**.

Create `features/items/services/itemService.ts` (rename freely):

1. Accept `caller: User` on every method.
2. Call `permissionService` before read/write.
3. Use `firestoreCollectionService.getItemsCollection()`.
4. On create: `setDoc` with `serverTimestamp()`, `createdBy`/`updatedBy` = `caller.id`.
5. On update: `updateDoc` with `updatedAt: serverTimestamp()`, `updatedBy`.
6. Map documents with strict validation (throw on incomplete data).
7. Use `withoutUndefinedFields` before writes.
8. Use `getFirestoreErrorMessage` in catch blocks.

See [03-code-patterns.md](./03-code-patterns.md) for annotated excerpts.

**Verify:** CRUD works for staff role; denied for unauthorized role (rules + service).

---

### 10. Deploy Firestore rules + indexes

**Portable** (users + your exemplar collection).

1. Initialize Firebase in repo root: `firebase init firestore` (if not present).
2. Port helpers from `firestore.rules`:
   - `isSignedIn()`, `callerUser()`, `callerIsActive()`, role helpers
   - `match /users/{userId}` — read rules + `allow create, update, delete: if false`
3. Add rules for your exemplar collection.
4. Copy `firebase.json` firestore section from Fresh Prints.
5. Add composite indexes only when queries require them (`firestore.indexes.json`).

**Deploy:**

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

**Reference:** `docs/workflow/setup/firestore-setup.md`, `docs/standards/DEPLOYMENT.md`

**Verify:** Unauthorized write returns `permission-denied`; user can read own `users/{uid}`.

---

### 11. Configure Storage paths + rules

**Portable** pattern; **customize** paths.

1. Enable Storage in Console — record bucket name → `VITE_FIREBASE_STORAGE_BUCKET`.
2. Define path builders (e.g. `shared/constants/storagePaths.ts`):

```ts
export function getFileStoragePath(entityId: string): string {
  return `/uploads/${entityId}.bin`;
}
```

3. Implement upload service using `importUploadService.ts` pattern (`uploadBytes`, error mapping).
4. Store returned path in Firestore entity document — not download URL.
5. Port `storage.rules` helpers:
   - `callerUser()` via `firestore.get(/databases/(default)/documents/users/$(request.auth.uid))`
   - Role-based `allow read/write`
   - Default deny: `match /{allPaths=**} { allow read, write: if false; }`

**Deploy:**

```bash
firebase deploy --only storage
```

**Reference:** `docs/workflow/setup/firebase-storage-setup.md`

**Verify:** Staff can upload to canonical path; customer cannot; wrong content type rejected.

---

### 12. Verify with manual test script

**Portable.** Adapt from `docs/workflow/setup/auth-testing-guide.md`:

| # | Test | Expected |
|---|------|----------|
| 1 | Login valid admin | Dashboard loads, `isAuthenticated` true |
| 2 | Logout | Redirect to login, session cleared |
| 3 | Remember me on/off | Persistence across browser restart (local vs session) |
| 4 | Wrong password | User-safe error message |
| 5 | Auth user, no Firestore profile | Missing-profile screen |
| 6 | `isActive: false` profile | Inactive screen |
| 7 | Route without permission | Unauthorized page |
| 8 | Firestore write as client to `users` | Denied by rules |
| 9 | Storage upload + Firestore path | File in bucket; path in doc; URL resolves |
| 10 | Connection check (optional) | `firebaseConnectionService` pattern |

---

## firebase.json Baseline

**Portable** (from `firebase.json`):

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

Add `functions` section only if using Cloud Functions (**Fresh Prints–specific** predeploy build).

---

## Suggested Folder Structure (New App)

```
src/
  config/
    env.ts
    firebase.ts
  features/
    auth/
      services/
      context/
      components/
      hooks/
      types/
    users/
      services/
      types/
    permissions/
      services/
      components/
      types/
    firebase/
      constants/
      services/
      utils/
    <your-entity>/
      services/
      types/
  routes/
    AppRoutes.tsx
    AuthenticatedLayout.tsx
    LoginRoute.tsx
firestore.rules
storage.rules
firestore.indexes.json
firebase.json
.env.example
```

---

## What Not to Copy

**Fresh Prints–specific** — skip unless your app needs them:

- `designService`, import pipeline, AI enrichment
- Design-specific Firestore rules (`designRequiredFieldsValid`, etc.)
- `getFunctions` / AI Callable Functions
- Full `firestoreCollectionService` domain collections (customers, showQueues, …)
- `HashRouter` (use `BrowserRouter` on web — see [06-adaptation-notes.md](./06-adaptation-notes.md))

---

## Next Steps After Foundation

- Add Cloud Functions for user admin (`createTeamUser` pattern)
- Add Firebase Emulators for offline dev ([06-adaptation-notes.md](./06-adaptation-notes.md))
- Add automated tests for `permissionService` (see `permissionService.aiReview.test.ts` as example)
