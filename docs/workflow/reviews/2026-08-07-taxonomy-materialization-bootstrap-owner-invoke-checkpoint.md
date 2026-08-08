# Manual Checkpoint — Taxonomy materialization bootstrap invoke (Studio Dev Console)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Project | **fresh-prints-dev** |
| Pre-check | `taxonomyMaterialization/meta` **still absent**; collection empty |
| Callable | `rebuildTaxonomyMaterializationCallable` deployed |
| Bridge | `window.freshPrintsDev.rebuildTaxonomyMaterialization` (source APPROVED) |
| Agent invoke | Not used (prior shell hook block; no Admin bypass) |

---

## Why agent is not invoking

- Cursor shell hook previously blocked `httpsCallable` invoke of this Function.
- Admin SDK direct rebuild is forbidden for this gate.
- Approved path is the Studio Dev Console bridge after reload.

---

## Owner steps

1. Ensure Studio is running against **fresh-prints-dev** (`npm run dev:studio`) and has been **reloaded** after the bridge Implement.
2. Sign in as **owner** or **admin**.
3. Open Electron DevTools → Console.
4. Confirm the bridge exists:
   ```js
   typeof window.freshPrintsDev?.rebuildTaxonomyMaterialization
   ```
   Expected: `"function"`
5. Invoke **exactly once**:
   ```js
   await window.freshPrintsDev.rebuildTaxonomyMaterialization()
   ```
6. Reply here with the returned object, e.g.:

   `TAXONOMY BOOTSTRAP INVOKE: OK`

   plus JSON like:
   ```json
   {
     "revision": 1,
     "chunkCount": 1,
     "tagCount": 1121,
     "categoryCount": 18,
     "contentHash": "...",
     "corpusBytes": 123456
   }
   ```

Agent will then run **read-only** verify (meta, chunks, corpus parity, containment) and write:

`docs/workflow/reviews/2026-08-07-taxonomy-materialization-bootstrap-dev-record.md`

---

## If `typeof` is not `"function"`

- Hard-reload Studio / restart `npm run dev:studio`
- Confirm `import.meta.env.DEV` and project id are `fresh-prints-dev`
- Do not use `import("firebase/functions")` in DevTools (invalid in Electron)

---

## Confirmations (this agent pass)

- NO callable invocation by agent
- NO Firebase mutation by agent
- NO deploy
- NO production
- NO PR merge

**STOP** pending owner Studio invoke + payload.
