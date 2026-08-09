# Investigation — Studio stale-revision refresh trace inconclusive

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner | `STUDIO STALE-REVISION REFRESH TRACE: INCONCLUSIVE — INVESTIGATE READ-ONLY` |
| Scope | **Read-only** — no Implement |
| Server re-QA | PASS (revision 2) |
| Classification | **Combination: expected lifecycle + tracer visibility limitation** (not a proven revision defect) |

---

## Owner observed trace

After Tag Management close → Debug Reset → `/imports` → `/designs`:

- `/tags` 0, `/categories` 0 → **read-spike PASS**
- `taxonomyMaterialization/meta` 0, `chunk-0` 0 → **stale-refresh NOT proven in Debug**

---

## Source answers

### 1. Should alias update call `clearStudioTaxonomyCaches`?

**No (current source).** `useCatalogTags.updateTag` → `catalogTagService.updateTag` only calls `invalidateCatalogTagListCache()`.  
`clearStudioTaxonomyCaches()` runs on: guarded **archive** success, category archive wiring, and **auth scope** change — not ordinary tag edit.

### 2. What does `clearStudioTaxonomyCaches` clear?

- Tag list memory cache  
- Category list memory cache  
- Electron userData disk cache (`taxonomy-cache/v1.json`) via IPC  

It does **not** clear React state inside `useGeneratedDesignLibraryTaxonomy`.

### 3. Does `/designs` → `/imports` → `/designs` remount the taxonomy hook?

**Yes.** `AppRoutes` mounts `DesignLibraryPage` only on `/designs` and `ImportsPage` on `/imports`. Leaving `/designs` unmounts the page; returning remounts it and re-runs the hook `useEffect` (deps: `[user]`).

### 4. If it remounts, why no meta/chunk in Debug?

**Primary: tracer blind spot.**  
`taxonomyMaterializationService.ts` uses raw `getDoc(...)` with **no** `traceFirestoreOneShotStart` / `Complete`. Firebase Debug only counts **instrumented** traces (e.g. `designService`). Untraced materialization reads are invisible even when they occur.

So zero Debug meta/chunk counts **do not prove** zero materialization reads.

### 5. Intended revision revalidation event

Next call to `loadStudioTaxonomyPreferringMaterialization()` (hook remount / consumer mount):

1. `getDoc(meta)` always  
2. If disk `revision` + `contentHash` match meta → disk short-circuit (no chunks)  
3. Else fetch chunks, validate, rewrite disk  

### 6. React memory after Tag Management edit

While staying on `/designs`, hook state is **not** invalidated by `updateTag` (effect only depends on `user`). Tag Management UI refreshes via `listTags`, but Design Library `displayTaxonomy` state can remain pre-edit until remount. Route remount is the intended refresh for that React state.

### 7–8. Same contentHash + revision identity

Short-circuit requires **both** `local.revision === meta.revision` **and** `local.contentHash === meta.contentHash`.  
Revision **is** part of cache identity. Same hash with 1→2 **forces** chunk refresh if disk still has revision 1.

### 9. Classification

| Option | Verdict |
|--------|---------|
| A expected lifecycle / wrong remount action | **Partial** — remount action is valid; Debug cannot prove it |
| B tracer blind spot | **Yes — primary** |
| C actual cache/revision defect | **Not proven** from this trace |
| D other | Post-edit disk clear is intentionally absent for `updateTag` (by design today) |

---

## Recommended ONE manual QA action

**Hard-reload the Studio renderer (Ctrl+R), open Design Library once, then confirm Electron userData file:**

`{Studio userData}/taxonomy-cache/v1.json`

contains:

- `"revision": 2`
- `"contentHash": "38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59"`

Do **not** use Firebase Debug meta/chunk counts as pass/fail for this path until those `getDoc`s are instrumented (future Implement — not authorized here).

Do **not** mutate taxonomy. Do **not** manually delete the cache file unless the file is still `revision: 1` after reload (then report — that would suggest the load path did not run).

### Pass evidence for this re-QA

- Disk cache shows revision **2** after reload + Design Library open  
- Still **0** `/tags` / `/categories` list hydrates in Debug (spike still PASS)  
- Optional note: Debug meta/chunk may remain 0 due to missing instrumentation  

---

## Implementation required?

**Not for this inconclusive trace.** Optional future (separate approve): instrument materialization `getDoc`s with Firestore usage traces so Debug can see meta/chunk. Not required to claim server corrective PASS.

---

## Confirmations

- NO implementation  
- NO taxonomy mutation  
- NO deploy  
- NO production  
- NO PR merge  

**STOP.**
