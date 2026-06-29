# 03 — Code Patterns

Annotated excerpts from the Fresh Prints repo. Copy **patterns**, adapt names and domain fields.

Each section is labeled **Portable** or **Fresh Prints–specific**.

---

## 1. Environment validation — Portable

**Path:** `src/renderer/src/config/env.ts`

```ts
const requiredFirebaseEnvKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

function getRequiredEnvValue(key: keyof FirebaseEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required Firebase environment variable: ${key}`);
  }
  return value;
}

export const firebaseConfig: FirebaseOptions = { /* mapped from env */ };
```

**Notes:**

- Runs at import time — misconfiguration surfaces immediately.
- Vite exposes only `VITE_*` prefixed vars to the client.

---

## 2. Single Firebase init — Portable

**Path:** `src/renderer/src/config/firebase.ts`

```ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./env";

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

**Fresh Prints–specific** line (omit unless needed):

```ts
export const functions = getFunctions(app);  // Callable Functions
```

---

## 3. authService — Portable

**Path:** `src/renderer/src/features/auth/services/authService.ts`

Responsibilities:

- Map `FirebaseError` codes to user-safe messages (`getAuthErrorMessage`)
- `configurePersistence` / `login` with `browserLocalPersistence` vs `browserSessionPersistence`
- `logout` via `signOut(auth)`
- `subscribeToAuthState` wrapping `onAuthStateChanged(auth, observer)`

Never import `authService` from components — use `useAuth()` or `AuthProvider`.

---

## 4. AuthProvider bootstrap — Portable

**Path:** `src/renderer/src/features/auth/context/AuthProvider.tsx`

State machine summary:

| `bootstrapStatus` | Meaning |
|-------------------|---------|
| `initializing` | Waiting for first `onAuthStateChanged` |
| `loading-profile` | Auth user exists; fetching `users/{uid}` |
| `ready` | Active profile loaded; `isAuthenticated: true` |
| `unauthenticated` | No auth user |
| `missing-profile` | Auth ok, no Firestore user doc |
| `inactive` | Profile exists, `isActive: false` |
| `error` | Profile load failed |

Key flow:

```ts
authService.subscribeToAuthState((firebaseUser) => {
  if (!firebaseUser) { /* clear session, unauthenticated */ return; }

  const cachedProfile = authSessionService.getCachedProfile(firebaseUser.uid);
  if (cachedProfile) {
    setAuthState(getAuthenticatedState(firebaseUser, cachedProfile));
    return;
  }

  setAuthState(getLoadingProfileState(currentState, firebaseUser));
  void authSessionService.loadUserProfile(firebaseUser.uid)
    .then((user) => setAuthState(getAuthenticatedState(firebaseUser, user)))
    .catch((error) => setAuthState(getProfileErrorState(firebaseUser, message)));
});
```

`getAuthenticatedState` rejects inactive users even when Auth session is valid.

---

## 5. authSessionService — Portable

**Path:** `src/renderer/src/features/auth/services/authSessionService.ts`

- In-memory cache via `authProfileCacheService`
- Dedupes concurrent `getUserById` calls with `inFlightProfileLoads` Map
- `clearSession()` on logout

---

## 6. userService — Portable

**Path:** `src/renderer/src/features/users/services/userService.ts`

```ts
function mapUserDocument(userId: string, data: UserDocumentData): User {
  if (
    typeof data.email !== "string" ||
    typeof data.displayName !== "string" ||
    !isUserRole(data.role) ||
    typeof data.isActive !== "boolean" ||
    !data.createdAt ||
    !data.updatedAt
  ) {
    throw new Error("A user profile is incomplete.");
  }
  return { id: userId, /* ... */ };
}

export const userService = {
  async getUserById(userId: string): Promise<User> {
    const snap = await getDoc(doc(firestoreCollectionService.getUsersCollection(), userId));
    if (!snap.exists()) {
      throw new Error("No Fresh Prints user profile exists for this account.");
    }
    return mapUserDocument(snap.id, snap.data());
  },
};
```

**Pattern:** Validate at read boundary; never trust raw Firestore data.

---

## 7. firestoreCollectionService — Portable

**Path:** `src/renderer/src/features/firebase/services/firestoreCollectionService.ts`

```ts
export const firestoreCollectionService = {
  getCollectionReference(collectionKey: FirestoreCollectionKey) {
    return collection(db, FIRESTORE_COLLECTIONS[collectionKey]);
  },
  getUsersCollection() {
    return this.getCollectionReference("users");
  },
  // Fresh Prints–specific: getDesignsCollection(), etc.
};
```

**Path:** `src/renderer/src/features/firebase/constants/firestoreCollections.ts` — single source of collection names.

---

## 8. Entity service CRUD — Portable template

**Exemplar path:** `src/renderer/src/features/designs/services/designService.ts`

### Permission gate (every mutating method)

```ts
async createDesign(caller: User, input: CreateDesignInput): Promise<Design> {
  if (!permissionService.canCreateDesigns(caller)) {
    throw new Error("You do not have permission to create designs.");
  }
  // ...
}
```

### Create with server timestamps

```ts
const designRecord = withoutUndefinedFields({
  id: designId,
  title,
  uploadedBy: caller.id,
  createdBy: caller.id,
  updatedBy: caller.id,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

await setDoc(designRef, designRecord);
const createdSnapshot = await getDoc(designRef);
return mapDesignDocument(createdSnapshot.id, createdSnapshot.data());
```

### Update pattern

```ts
const updatePayload: Record<string, unknown> = {
  updatedAt: serverTimestamp(),
  updatedBy: caller.id,
};
// optional: deleteField() to clear optional strings
await updateDoc(designRef, updatePayload);
```

### Error handling

```ts
} catch (error) {
  throw new Error(getFirestoreErrorMessage(error, "Unable to create the design. Please try again."));
}
```

### Generic template (new app)

Replace `Design` / `designs` with your entity:

```ts
export const itemService = {
  async createItem(caller: User, input: CreateItemInput): Promise<Item> {
    if (!permissionService.canCreateItems(caller)) {
      throw new Error("You do not have permission to create items.");
    }
    const col = firestoreCollectionService.getItemsCollection();
    const ref = input.id ? doc(col, input.id) : doc(col);
    const record = withoutUndefinedFields({
      id: ref.id,
      name: input.name.trim(),
      filePath: input.filePath ?? "",
      createdBy: caller.id,
      updatedBy: caller.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await setDoc(ref, record);
    const snap = await getDoc(ref);
    return mapItemDocument(snap.id, snap.data());
  },
};
```

---

## 9. Firestore document utilities — Portable

**Paths:**

- `src/renderer/src/features/firebase/utils/firestoreDocument.ts` — `withoutUndefinedFields`, `assertNoUndefinedFirestoreFields`
- `src/renderer/src/features/firebase/utils/firestoreTimestamp.ts` — `mapFirestoreTimestamp`, `resolveDesignDocumentTimestamps`
- `src/renderer/src/features/firebase/utils/firestoreErrorMessage.ts` — `getFirestoreErrorMessage`

Firestore rejects `undefined` field values. Optional fields must be omitted on create or cleared with `deleteField()` on update.

---

## 10. Storage upload service — Portable

**Path:** `src/renderer/src/features/imports/services/importUploadService.ts`

```ts
function toFirebaseStorageRefPath(catalogPath: string): string {
  return catalogPath.replace(/^\//, "");
}

async uploadOriginalPng(designId: string, bytes: Uint8Array) {
  const originalPath = getOriginalStoragePath(designId);
  const storageRef = ref(storage, toFirebaseStorageRefPath(originalPath));
  await uploadBytes(storageRef, bytes, { contentType: "image/png" });
  return { designId, originalPath, status: "uploaded" as const };
}
```

**Path builders:** `shared/constants/design/designStoragePaths.ts` (**Fresh Prints–specific** paths; **portable** pattern)

```ts
export function getOriginalStoragePath(designId: string): string {
  return `/originals/${designId}.png`;
}
```

**Derivative uploads:** `src/renderer/src/features/designs/services/designDerivativeStorageService.ts` — same pattern for thumbnails/previews.

**Orchestration:** Upload to Storage first (or create Firestore stub first with empty path — Fresh Prints creates design doc then uploads). Always persist **path** in Firestore after successful upload.

---

## 11. Storage URL resolution — Portable

**Path:** `src/renderer/src/features/designs/services/designDerivativeUrlService.ts`

```ts
async function fetchDownloadUrlForCatalogPath(catalogPath: string): Promise<string | null> {
  const storageRef = ref(storage, toFirebaseStorageRefPath(catalogPath));
  return await getDownloadURL(storageRef);
}
```

- URLs are **not** stored in Firestore.
- Session cache (`DesignDerivativeUrlCache`) avoids repeated `getDownloadURL` calls.
- Missing objects return `null` (UI shows placeholder).

---

## 12. permissionService — Portable pattern, Fresh Prints–specific matrix

**Path:** `src/renderer/src/features/permissions/services/permissionService.ts`

Core helpers to replicate:

```ts
function hasActiveRole(user: UserLike, roles: UserRole[]) {
  return Boolean(user?.isActive && roles.includes(user.role));
}

hasPermission(user, permission, context) {
  switch (permission) {
    case "viewUsers":
      return this.canViewUsers(user);
    // ...
  }
}
```

Copy the **structure**; trim domain permissions (designs, AI review, etc.) in a new app.

---

## 13. UI gates — Portable

**ProtectedRoute** — `src/renderer/src/features/auth/components/ProtectedRoute.tsx`

```tsx
if (permission && !permissionService.hasPermission(user, permission, permissionContext)) {
  return <ErrorState title="You do not have access" />;
}
return <>{children}</>;
```

**RoleGate** — `src/renderer/src/features/permissions/components/RoleGate.tsx`

Uses `hasAnyPermission`; supports `fallback` and `showUnauthorized`.

---

## 14. App wiring — Partially Fresh Prints–specific

**Path:** `src/App.tsx`

```tsx
<AuthProvider>
  <HashRouter>   {/* BrowserRouter on web — see 06-adaptation-notes.md */}
    <AppRoutes />
  </HashRouter>
</AuthProvider>
```

**Path:** `src/renderer/src/routes/AppRoutes.tsx` — `AuthBootstrapGate` wraps all routes; each staff page wrapped in `ProtectedRoute`.

---

## 15. Optional: createTeamUser Cloud Function — Fresh Prints–specific

**Path:** `functions/src/createTeamUser.ts`

Pattern for atomic provisioning:

1. Verify caller via `loadCallerProfile(request.auth.uid)`
2. `adminAuth.createUser({ email, password, displayName })`
3. `adminDb.collection("users").doc(authUser.uid).set({ ... })`
4. On Firestore failure: `adminAuth.deleteUser` rollback
5. Send invitation email (optional)

Clients never write `users` directly.

---

## File Index (this document)

| Pattern | Path |
|---------|------|
| Env | `src/renderer/src/config/env.ts` |
| Init | `src/renderer/src/config/firebase.ts` |
| Auth SDK | `src/renderer/src/features/auth/services/authService.ts` |
| Auth bootstrap | `src/renderer/src/features/auth/context/AuthProvider.tsx` |
| Session | `src/renderer/src/features/auth/services/authSessionService.ts` |
| Users | `src/renderer/src/features/users/services/userService.ts` |
| Collections | `src/renderer/src/features/firebase/services/firestoreCollectionService.ts` |
| CRUD exemplar | `src/renderer/src/features/designs/services/designService.ts` |
| Storage upload | `src/renderer/src/features/imports/services/importUploadService.ts` |
| Storage URLs | `src/renderer/src/features/designs/services/designDerivativeUrlService.ts` |
| Permissions | `src/renderer/src/features/permissions/services/permissionService.ts` |
