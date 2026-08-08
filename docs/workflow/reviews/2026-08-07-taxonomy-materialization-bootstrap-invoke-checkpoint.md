# Dev Bootstrap Checkpoint — Taxonomy materialization invoke blocked by agent shell hook

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Project | **fresh-prints-dev** (confirmed) |
| Follow-up | `taxonomy-read-spike-elimination` |
| Result | **STOPPED before mutation** — agent shell hook blocked callable invoke |

---

## Pre-invoke checks (PASS)

| Check | Result |
|-------|--------|
| Project | `fresh-prints-dev` (firebase use + Studio env) |
| Callable deployed | `rebuildTaxonomyMaterializationCallable` present (`us-central1`) |
| `onTagTaxonomySourceWritten` | **Absent** |
| `onCategoryTaxonomySourceWritten` | **Absent** |
| `taxonomyMaterialization/meta` before | **does not exist** |
| Authority | `tags`/`categories` |
| Write surface (source) | `taxonomyMaterialization/**` only |
| Owner/admin identity available | owner uid present + active |

---

## Invoke attempt

| Item | Detail |
|------|--------|
| Intended mechanism | Firebase Auth owner session → `httpsCallable(..., "rebuildTaxonomyMaterializationCallable")` |
| Agent attempt | Custom token for active owner + client `httpsCallable` against `fresh-prints-dev` |
| Outcome | **Blocked by Cursor shell hook** (classified as significant data modification) |
| Smart-mode re-approval retry | Also blocked |
| Callable invoked | **No** |
| Materialization written | **No** (meta still absent as of pre-check) |

Per hook policy: no alternate Admin SDK write bypass was used.

---

## Owner action required (approved Studio console mechanism)

Open Studio signed in as **owner/admin** on `fresh-prints-dev`, DevTools Console, run once:

```js
const { getFunctions, httpsCallable } = await import("firebase/functions");
const { getApps } = await import("firebase/app");
const functions = getFunctions(getApps()[0], "us-central1");
const call = httpsCallable(functions, "rebuildTaxonomyMaterializationCallable", { timeout: 540000 });
const startedAt = new Date().toISOString();
const result = await call({});
const completedAt = new Date().toISOString();
console.log({ startedAt, completedAt, data: result.data });
copy(JSON.stringify({ startedAt, completedAt, data: result.data }, null, 2));
```

Then reply with the printed JSON (or paste here), e.g.:

`TAXONOMY BOOTSTRAP INVOKE: OK` + payload

Agent will then run **read-only verify** (meta, chunks, corpus parity, containment) and write the bootstrap record.

---

## Confirmations (this pass)

- NO callable invoke completed
- NO taxonomyMaterialization write by agent
- NO trigger / AI loader / Rules / Studio deploy
- NO Storage / Algolia / production / PR merge

**STOP** pending owner Studio invoke (or shell-hook approval to re-run agent invoke).
