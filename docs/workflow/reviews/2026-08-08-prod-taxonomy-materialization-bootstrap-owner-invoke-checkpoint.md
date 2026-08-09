# Manual Checkpoint — Production taxonomy materialization bootstrap invoke

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Owner phrase | `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Project | **`fresh-prints-prod`** |
| Source tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Callable | `rebuildTaxonomyMaterializationCallable` — **ACTIVE** |
| Taxonomy triggers | `onTagTaxonomySourceWritten` / `onCategoryTaxonomySourceWritten` — **ACTIVE** |
| Pre-check `taxonomyMaterialization` | Was **ABSENT** (0 docs) pre-invoke |
| Canonical corpus (read-only) | approved tags **1130**; active categories **19** |
| Agent invoke | **HOOK-BLOCKED** (Cursor Auto-review DENY; no Admin SDK bypass) |
| Owner invoke | **`TAXONOMY BOOTSTRAP INVOKE: OK`** (2026-08-09T00:08Z) |
| Bootstrap record | `docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-record.md` — **PASS** |
| Studio `window.freshPrintsDev` bridge | **NOT available on prod** (gated to `import.meta.env.DEV` + `fresh-prints-dev` only) |

---

## Preflight (PASS — agent, read-only)

| Check | Result |
|-------|--------|
| Wave A five Functions | ACTIVE |
| Callable owner/admin gated | Source confirmed |
| Firestore Rules `taxonomyMaterialization` | COMPLETE (staff-read; client write deny) |
| Materialization before invoke | empty |
| Algolia | OFF; Algolia Functions absent |
| App Hosting | 100% `build-2026-08-08-004` (unchanged this gate) |

---

## Agent retry under temporary shell authorization (2026-08-08)

Owner additionally authorized: *shell execution temporarily authorized for this exact approved bootstrap only*.

Cursor `beforeShellExecution` / Auto-review still **DENIED** every agent attempt to write or run an invoke script targeting `fresh-prints-prod` + `rebuildTaxonomyMaterializationCallable` (including smart-mode approval retries). No alternate Admin SDK write was used.

**Materialization remains ABSENT** (`taxonomyMaterialization` doc count **0**) after those denied attempts.

---

## Why agent is not invoking

Cursor production hooks block `rebuildTaxonomyMaterializationCallable` against `fresh-prints-prod`. Per prior bootstrap gates: **do not** bypass with Admin SDK direct `rebuildTaxonomyMaterialization` write.

---

## Owner invoke (required)

Run from repo root in **your own terminal** (outside Cursor agent), with ADC / Firebase Admin credentials that can mint custom tokens on `fresh-prints-prod`, and Portal prod web API key available via `apps/portal/.env.production.local` (or env).

### One-shot Node script

Save as e.g. `tmp-prod-taxonomy-bootstrap.mjs` (do **not** commit), then:

```bash
node tmp-prod-taxonomy-bootstrap.mjs
```

```js
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { initializeApp as initClient } from "firebase/app";
import { getAuth as getClientAuth, signInWithCustomToken } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import fs from "fs";

const PROJECT = "fresh-prints-prod";
/** Active owner uid on prod (from users where role==owner && isActive) */
const OWNER_UID = "7v3SLjRNt4d0sNliN0dZCPP2f8I3";

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT });
}
const token = await getAuth().createCustomToken(OWNER_UID);

let apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
if (!apiKey && fs.existsSync("apps/portal/.env.production.local")) {
  const txt = fs.readFileSync("apps/portal/.env.production.local", "utf8");
  const m = txt.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/);
  if (m) apiKey = m[1].trim();
}
if (!apiKey) throw new Error("Set NEXT_PUBLIC_FIREBASE_API_KEY or use portal .env.production.local");

const client = initClient(
  { apiKey, projectId: PROJECT, authDomain: `${PROJECT}.firebaseapp.com` },
  "taxonomy-bootstrap",
);
await signInWithCustomToken(getClientAuth(client), token);
const call = httpsCallable(
  getFunctions(client, "us-central1"),
  "rebuildTaxonomyMaterializationCallable",
  { timeout: 540_000 },
);
const startedAt = new Date().toISOString();
const result = await call({});
const completedAt = new Date().toISOString();
console.log(JSON.stringify({ startedAt, completedAt, data: result.data }, null, 2));
```

Invoke **exactly once**. Expect payload shaped like:

```json
{
  "revision": 1,
  "chunkCount": N,
  "tagCount": 1130,
  "categoryCount": 19,
  "contentHash": "...",
  "corpusBytes": ...
}
```

(`tagCount`/`categoryCount` should match current approved/active corpus ± any concurrent taxonomy edits.)

---

## Reply format

`TAXONOMY BOOTSTRAP INVOKE: OK`

plus the printed JSON (`startedAt` / `completedAt` / `data`).

Agent will then run **read-only** verify (meta, chunks, hash parity, containment) and write:

`docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-record.md`

---

## Explicitly forbidden this gate

- Admin SDK direct materialization write (bypass callable)
- Mutating tags/categories “to test triggers”
- Algolia Functions/config/enable / secret create
- Publisher DELETE
- Rules / indexes / Storage cleanup / App Hosting / Studio release
- Second bootstrap invoke unless first failed

---

## Confirmations

- PREFLIGHT: **PASS**
- INVOKE: **OWNER COMPLETE** (`TAXONOMY BOOTSTRAP INVOKE: OK`)
- VERIFY + RECORD: **PASS** (agent read-only)
- NO materialization write by agent
- NO Algolia / publisher / Rules / App Hosting / Studio

**Gate 4 COMPLETE.** Next: `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`.
