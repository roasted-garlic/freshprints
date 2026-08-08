# Investigation — Taxonomy bootstrap owner invoke path (DevTools import failed)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner | `TAXONOMY BOOTSTRAP INVOKE CORRECTIVE — DEVTOOLS IMPORT FAILED` |
| Project | fresh-prints-dev |
| Result | **NO EXISTING OWNER-INVOKABLE PATH** for `rebuildTaxonomyMaterializationCallable` |
| Mutation / deploy this pass | **None** |

---

## 1. Why DevTools `import("firebase/functions")` failed

Electron renderer DevTools is **not** a bare Node/ESM environment with package resolution.
Studio bundles Firebase via Vite; bare specifier `firebase/functions` only resolves inside the
bundler graph. DevTools `await import("firebase/functions")` has no import map / node_modules
resolver → `TypeError: Failed to resolve module specifier 'firebase/functions'`.

The earlier inventory checkpoint snippet assumed that would work; it is **not** valid in this
Electron renderer DevTools surface.

---

## 2. Studio Firebase initialization

| Piece | Path |
|-------|------|
| Config | `apps/studio/src/renderer/src/config/env.ts` → `firebaseConfig` |
| Init | `apps/studio/src/renderer/src/config/firebase.ts` |
| App | `initializeApp(firebaseConfig)` (or existing `getApp()`) |
| Auth | `export const auth = getAuth(app)` — signed-in owner session |
| Functions | `export const functions = getFunctions(app)` — **default region** (no `us-central1` override at init) |

Callable helper:

`apps/studio/src/renderer/src/config/tracedCallable.ts` → `callTracedFunction(name, metadata, functionsInstance?, options?)`
wraps `httpsCallable(functionsInstance, name, options)` using the shared `functions` export.

---

## 3. Existing Functions / callable helper

- **Canonical:** `callTracedFunction` from `config/tracedCallable.ts` + `functions` from `config/firebase.ts`
- Some services still import `httpsCallable` + `functions` directly (e.g. inventory / wipe)

---

## 4. Does an existing owner-invokable mechanism exist?

| Candidate | Present for taxonomy bootstrap? |
|-----------|----------------------------------|
| Client wrapper for `rebuildTaxonomyMaterializationCallable` | **No** (repo grep: zero hits under `apps/studio`) |
| `window.freshPrintsDev.*` for this callable | **No** — only queue-tab backfill + Algolia reconcile installed in `AppShell` |
| Arbitrary “call any callable” helper on window | **No** |
| Owner UI button / Settings action | **No** |
| `window.freshPrints` (preload IPC) | Electron IPC only — **not** Firebase Functions |

**Outcome: D — NO EXISTING OWNER-INVOKABLE PATH.**

Existing `window.freshPrintsDev` surface (for reference only):

- `backfillPrintRequestQueueTab`
- `reconcilePortalCatalogAlgoliaIndex`

Installed in `AppShell.tsx` via `installPrintRequestQueueTabBackfillAdminConsole` /
`installPortalCatalogAlgoliaReconcileAdminConsole`, gated by `isFirebaseDebugPanelEnabled`
(dev build + `fresh-prints-dev`).

---

## 5. Minimal source corrective (propose only — do not implement)

Mirror the Algolia reconcile / queue-tab backfill **dev console bridge**:

| File | Change |
|------|--------|
| `apps/studio/src/renderer/src/features/designs/services/taxonomyMaterializationBootstrapAdminService.ts` | **new** — `callTracedFunction("rebuildTaxonomyMaterializationCallable", …, undefined, { timeout: 540_000 })` + `installTaxonomyMaterializationBootstrapAdminConsole()` |
| `apps/studio/src/renderer/src/features/designs/services/freshPrintsDevConsole.types.ts` | Add optional `rebuildTaxonomyMaterialization` (or similar) to `window.freshPrintsDev` |
| `apps/studio/src/renderer/src/shared/components/AppShell.tsx` | Install/uninstall alongside existing bridges |

**Dev-only gates (same as existing bridges):**

- `import.meta.env.DEV`
- `isFirebaseDebugPanelEnabled({ projectId: fresh-prints-dev })`

**Owner command after corrective + Studio reload:**

```js
await window.freshPrintsDev.rebuildTaxonomyMaterialization()
```

No Functions/Rules deploy required for this client bridge. Callable already live on
`fresh-prints-dev`. Triggers remain undeployed.

---

## Confirmations

- NO callable invocation
- NO Firebase mutation
- NO deploy
- NO production
- NO PR merge

**STOP** — await owner approval to implement the minimal Studio dev console bridge.
