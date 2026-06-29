# Firebase Auth, Firestore & Storage — Handoff Package

Portable documentation derived from the **Fresh Prints** codebase (`C:\coding\fresh-prints`). Use this package to replicate the same Firebase foundation in another application.

**Source of truth:** application code in this repo. Existing docs (`docs/architecture/FIREBASE.md`, etc.) are cross-referenced where accurate; mismatches are flagged in individual sections.

---

## 5-Minute Summary

Fresh Prints uses **one Firebase project** for Authentication, Firestore metadata, and file Storage.

| Principle | What it means |
|-----------|----------------|
| Single init | `firebase.ts` exports `app`, `auth`, `db`, `storage` once — never re-initialize |
| Auth identifies | Firebase Auth proves *who* signed in (`request.auth.uid`) |
| Firestore authorizes | `users/{uid}` holds `role` and `isActive`; app and rules read this for access |
| Services only | UI/hooks call services; services call Firebase SDK |
| Metadata vs files | Firestore stores paths (`originalPath`, `thumbnailPath`); Storage holds bytes |
| Rules enforce security | UI gates (`ProtectedRoute`, `RoleGate`) are UX only; rules are the boundary |
| Env fails fast | `env.ts` throws if any `VITE_FIREBASE_*` var is missing |

**Minimal bootstrap:** Create Firebase Auth user → create matching `users/{uid}` document in Firestore (console or Admin SDK) → deploy rules → sign in.

**Optional advanced:** `createTeamUser` / `updateTeamUser` Cloud Functions provision team accounts without client writes to `users`.

---

## Read Order

| # | Document | Purpose |
|---|----------|---------|
| 1 | [01-architecture.md](./01-architecture.md) | System design, layers, auth→profile→permissions flow, diagrams |
| 2 | [02-implementation-guide.md](./02-implementation-guide.md) | Ordered replication checklist for a greenfield app |
| 3 | [03-code-patterns.md](./03-code-patterns.md) | Annotated code excerpts with repo paths |
| 4 | [04-security-rules.md](./04-security-rules.md) | Firestore & Storage rules — what to copy vs customize |
| 5 | [05-environment-and-setup.md](./05-environment-and-setup.md) | Console setup, env vars, `firebase.json`, deploy |
| 6 | [06-adaptation-notes.md](./06-adaptation-notes.md) | Electron vs web, bundlers, monorepos, emulators |

---

## File Map

| Concern | Source path | Responsibility |
|---------|-------------|----------------|
| Env validation | `src/renderer/src/config/env.ts` | Read `VITE_FIREBASE_*`, fail fast, export `firebaseConfig` |
| Firebase init | `src/renderer/src/config/firebase.ts` | Single `initializeApp`; export `auth`, `db`, `storage`, `functions` |
| Auth SDK wrapper | `src/renderer/src/features/auth/services/authService.ts` | Login, logout, persistence, `onAuthStateChanged` |
| Auth preferences | `src/renderer/src/features/auth/services/authPreferencesService.ts` | Remember-me and email in `localStorage` |
| Session + profile load | `src/renderer/src/features/auth/services/authSessionService.ts` | Cache, dedupe in-flight `users/{uid}` loads |
| Profile cache | `src/renderer/src/features/auth/services/authProfileCacheService.ts` | In-memory session profile |
| Auth context | `src/renderer/src/features/auth/context/AuthProvider.tsx` | Bootstrap: Auth → Firestore profile → `isAuthenticated` |
| Bootstrap UI gate | `src/renderer/src/features/auth/components/AuthBootstrapGate.tsx` | Loading / missing profile / inactive screens |
| Route auth | `src/renderer/src/routes/AuthenticatedLayout.tsx` | Redirect unauthenticated users to `/login` |
| Route permissions | `src/renderer/src/features/auth/components/ProtectedRoute.tsx` | Page-level permission check |
| Component permissions | `src/renderer/src/features/permissions/components/RoleGate.tsx` | Hide/show UI by permission |
| Permission logic | `src/renderer/src/features/permissions/services/permissionService.ts` | Role → capability mapping |
| User types | `src/renderer/src/features/users/types/user.types.ts` | `User`, `UserRole`, validators |
| User Firestore access | `src/renderer/src/features/users/services/userService.ts` | `getUserById`, `listTeamUsers` |
| Collection registry | `src/renderer/src/features/firebase/constants/firestoreCollections.ts` | Collection name constants |
| Collection refs | `src/renderer/src/features/firebase/services/firestoreCollectionService.ts` | Typed `collection(db, …)` accessors |
| Document helpers | `src/renderer/src/features/firebase/utils/firestoreDocument.ts` | Strip `undefined`; guard before writes |
| Timestamp helpers | `src/renderer/src/features/firebase/utils/firestoreTimestamp.ts` | Map `serverTimestamp` sentinels on read |
| Error mapping | `src/renderer/src/features/firebase/utils/firestoreErrorMessage.ts` | User-safe Firestore errors |
| CRUD exemplar | `src/renderer/src/features/designs/services/designService.ts` | Permission check → validate → `setDoc`/`updateDoc` |
| Storage upload (original) | `src/renderer/src/features/imports/services/importUploadService.ts` | `uploadBytes` to canonical path |
| Storage upload (derivative) | `src/renderer/src/features/designs/services/designDerivativeStorageService.ts` | WebP upload/delete at canonical paths |
| Storage URL resolution | `src/renderer/src/features/designs/services/designDerivativeUrlService.ts` | `getDownloadURL` with session cache |
| Storage path builders | `shared/constants/design/designStoragePaths.ts` | `getOriginalStoragePath(designId)` etc. |
| App wiring | `src/App.tsx` | `AuthProvider` wraps router |
| Routes | `src/renderer/src/routes/AppRoutes.tsx` | `AuthBootstrapGate`, `ProtectedRoute` per page |
| Firestore rules | `firestore.rules` | Role helpers; `users` deny client writes |
| Storage rules | `storage.rules` | Staff checks via Firestore `users` lookup |
| Firebase config | `firebase.json` | Rules, indexes, functions predeploy |
| Indexes | `firestore.indexes.json` | Composite indexes for queries |
| Team user create (optional) | `functions/src/createTeamUser.ts` | Admin Auth + `users` doc + invite email |
| Team user update (optional) | `functions/src/updateTeamUser.ts` | Role/status changes via Admin SDK |
| Auth manual tests | `docs/workflow/setup/auth-testing-guide.md` | Console user + profile setup |
| Project setup | `docs/workflow/setup/firebase-project-setup.md` | Web app + env vars |
| Firestore setup | `docs/workflow/setup/firestore-setup.md` | Enable Firestore, collections |
| Storage setup | `docs/workflow/setup/firebase-storage-setup.md` | Enable Storage, bucket |

---

## Replication Checklist (Overview)

Full steps with commands: [02-implementation-guide.md](./02-implementation-guide.md).

1. Create Firebase project + register web app
2. Add `VITE_FIREBASE_*` env vars and init module (`env.ts` + `firebase.ts`)
3. Enable Email/Password authentication
4. Define `users` collection contract + first admin bootstrap (console or Function)
5. Implement `authService` + `AuthProvider` bootstrap flow
6. Implement `userService.getUserById` profile load
7. Implement `permissionService` + `ProtectedRoute` / `RoleGate`
8. Add `firestoreCollectionService` + collection constants
9. Add one generic entity service (CRUD template from `designService` pattern)
10. Deploy Firestore rules + indexes
11. Configure Storage paths + deploy Storage rules
12. Run manual auth test script (`auth-testing-guide.md`)

---

## Doc vs Code Notes

| Topic | Status |
|-------|--------|
| `docs/architecture/FIREBASE.md` | Largely accurate; handoff adds repo paths and replication focus |
| `docs/architecture/DATA_MODEL.md` users section | Matches `user.types.ts` and `firestore.rules` |
| `firebase.ts` exports `functions` | **Fresh Prints–specific** — omit in minimal replication unless using Callable Functions |
| `HashRouter` in `App.tsx` | **Fresh Prints–specific** (Electron file URLs) — use `BrowserRouter` on web |
| Domain collections in `firestoreCollectionService` | **Fresh Prints–specific** — keep only `users` (+ your entities) in a new app |

---

## Prompt for Target App

Paste the block below into the **destination** repository when you want an AI to implement Firebase using this handoff:

```markdown
Implement Firebase Authentication, Firestore, and Storage using the Fresh Prints handoff package.

Read in order:
1. docs/handoffs/firebase-auth-storage/README.md
2. 01-architecture.md
3. 02-implementation-guide.md (follow the Replication Checklist in order)
4. 03-code-patterns.md (copy patterns, adapt paths/names)
5. 04-security-rules.md (portable user/auth/storage rules first)
6. 05-environment-and-setup.md
7. 06-adaptation-notes.md (apply web/mobile/Electron adjustments)

Constraints:
- Single Firebase init module; components never import firebase/* directly
- Firebase Auth for identity; Firestore users/{uid} for role and isActive
- Services own all Firebase SDK calls; hooks coordinate UI state
- Firestore stores metadata and storage paths; Storage stores files
- Deploy firestore.rules and storage.rules before manual testing
- Do not copy Fresh Prints domain collections (designs, categories, etc.) unless this app needs them
- Use [NEEDS HUMAN INPUT] for Firebase project ID and console steps I must perform
- Never commit real API keys

Deliverables:
- config/env.ts + config/firebase.ts
- features/auth (authService, AuthProvider, ProtectedRoute)
- features/users (userService, user.types)
- features/permissions (permissionService, RoleGate) with roles adapted to this app
- features/firebase (firestoreCollectionService, document/timestamp helpers)
- One exemplar entity service demonstrating create/read/update
- firestore.rules (users + exemplar collection), storage.rules (your file paths)
- firebase.json, .env.example with VITE_FIREBASE_* placeholders
- Manual test steps from auth-testing-guide pattern
```

---

## Labels Used in This Package

- **Portable** — safe to copy with renaming into another app
- **Fresh Prints–specific** — illustrates the pattern but tied to this product; adapt or omit
