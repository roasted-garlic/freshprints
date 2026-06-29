# 06 — Adaptation Notes

How to adapt the Fresh Prints Firebase foundation for different platforms, bundlers, and repo layouts.

---

## Electron vs Web vs Mobile

### Fresh Prints default: Electron + HashRouter

**Fresh Prints–specific.**

| Aspect | Fresh Prints | Web SPA adaptation |
|--------|--------------|-------------------|
| Router | `HashRouter` in `src/App.tsx` | `BrowserRouter` |
| Reason | `file://` protocol in packaged Electron | Clean URLs on HTTPS host |
| Firebase SDK | Same Web SDK in renderer | Same |
| Env vars | `VITE_FIREBASE_*` via Vite | Same with Vite; or bundler equivalent |

**Portable:** Auth, Firestore, Storage service layer unchanged when moving Electron → web.

### Electron main process

Fresh Prints Firebase calls run in the **renderer** only. Main process does not initialize Firebase.

If your Electron app needs secure token bridging, that is outside this handoff — Fresh Prints does not implement it.

### React Native / Expo

Not implemented in Fresh Prints. For replication:

- Use `firebase/auth`, `@react-native-firebase/*` or Firebase JS SDK per Expo guidance
- Keep the same **Auth → users/{uid} → permissionService** flow
- Replace `browserLocalPersistence` with platform persistence APIs
- `import.meta.env` → Expo `EXPO_PUBLIC_*` or env config plugin

`[NEEDS HUMAN INPUT]` — choose Firebase SDK flavor per React Native vs Expo managed workflow.

---

## Bundler Differences

### Vite (Fresh Prints)

- Env prefix: `VITE_`
- Access: `import.meta.env.VITE_FIREBASE_API_KEY`
- Config: `src/renderer/src/config/env.ts`

### Create React App

- Prefix: `REACT_APP_`
- Access: `process.env.REACT_APP_FIREBASE_API_KEY`
- Rename keys in `env.ts`; keep validation pattern

### Next.js (App Router)

- Prefix: `NEXT_PUBLIC_`
- Client components only for Firebase init
- Consider lazy init to avoid SSR accessing `window`

### Electron + Vite (this repo)

Renderer path: `src/renderer/src/`. Init modules live under renderer, not main.

---

## Monorepo Layout

Fresh Prints structure:

```
fresh-prints/
  src/renderer/src/     # React app + Firebase services
  shared/               # Shared constants (storage paths, validation)
  functions/            # Cloud Functions (Admin SDK)
  firestore.rules
  storage.rules
  firebase.json
```

### Replication options

| Layout | Guidance |
|--------|----------|
| Single package | Flatten `src/renderer/src` → `src/` |
| Monorepo (pnpm/turbo) | Put `firebase.json` + rules at repo root; `packages/app` imports `packages/shared` |
| Shared types | Fresh Prints uses `shared/constants/` for storage paths — keep path builders shared between renderer and rules comments |

**Portable:** `firestoreCollectionService` and rules files should stay co-located at repo root for `firebase deploy`.

### Path alias

Fresh Prints uses relative imports (`../../../config/firebase`). New apps may use `@/config/firebase` — update all service imports consistently.

---

## Firebase Emulators

Fresh Prints production path uses live Firebase projects in development (`.env.local` → real project). Emulators are **not** wired in the inspected codebase.

### Optional emulator setup (new app)

```bash
firebase init emulators
```

Select Auth, Firestore, Storage.

Connect in `firebase.ts`:

```ts
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectStorageEmulator } from "firebase/storage";

if (import.meta.env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
```

**Caveats:**

- Seed `users` documents in emulator Firestore after creating Auth users
- Storage rules still apply in emulator
- Callable Functions need separate emulator port

`[NEEDS HUMAN INPUT]` — team policy on emulator vs shared dev project.

---

## Functions vs Client-Only

| Capability | Client-only | Cloud Functions |
|------------|-------------|-----------------|
| Email/password login | ✅ | — |
| Load `users/{uid}` | ✅ | — |
| Create team users | Console manual | ✅ `createTeamUser` |
| Disable accounts | Console manual | ✅ `updateTeamUser` |
| AI / webhooks | ❌ | Fresh Prints domain |

Minimal replication: **client + console bootstrap** is sufficient.

---

## Role Model Simplification

Fresh Prints roles: `owner`, `admin`, `helper`, `customer`.

Minimal app adaptation:

```ts
type UserRole = "admin" | "member";
```

Update in sync:

1. `user.types.ts`
2. `permissionService.ts`
3. `firestore.rules` helper functions
4. `storage.rules` role checks

---

## Storage Path Adaptation

Fresh Prints uses design-centric paths (`/originals/{id}.png`). Generic app:

```ts
export function getUploadPath(tenantId: string, fileId: string, ext: string): string {
  return `/tenants/${tenantId}/files/${fileId}.${ext}`;
}
```

Update `storage.rules` `match` blocks and filename validators accordingly.

**Rule:** Keep path builders in one shared module; reference max size constants in rules comments (Fresh Prints syncs 150 MB with `shared/constants/importValidation.constants.ts`).

---

## Testing Adaptations

| Fresh Prints | New app |
|--------------|---------|
| `permissionService.aiReview.test.ts` | Unit-test your trimmed permission matrix |
| Manual `auth-testing-guide.md` | Copy checklist structure |
| No Firestore emulator tests in repo | Add emulator integration tests if desired |

---

## Multi-App / Single Firebase Project

Fresh Prints strategy (from `docs/architecture/FIREBASE.md`):

- One Firebase project shared by Studio + Portal
- Same Auth, Firestore, Storage

**Portable** if your products share users. Use **separate projects** for dev/staging/prod split.

`[NEEDS HUMAN INPUT]` — environment strategy per organization.

---

## Checklist: Adaptation Decision Log

When starting a target app, record:

- [ ] Platform: Electron / Web / Mobile
- [ ] Router: Hash vs Browser
- [ ] Env prefix: `VITE_` / `NEXT_PUBLIC_` / other
- [ ] Roles: copied vs simplified
- [ ] User provisioning: console vs Functions
- [ ] Emulators: yes/no
- [ ] Storage path scheme
- [ ] Firebase project: new vs shared
