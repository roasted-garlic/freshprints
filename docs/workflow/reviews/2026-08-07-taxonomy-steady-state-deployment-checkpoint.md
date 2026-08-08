# Pre-Deploy Checkpoint — Taxonomy steady-state (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `PREPARE DEV TAXONOMY STEADY-STATE DEPLOYMENT CHECKPOINT` |
| Follow-up | `taxonomy-read-spike-elimination` |
| Project | **fresh-prints-dev** only |
| Deploy this pass | **None** |
| Bootstrap prerequisite | **PASS** — `docs/workflow/reviews/2026-08-07-taxonomy-materialization-bootstrap-dev-record.md` |

---

## 1. Bootstrap health (read-only recheck)

| Field | Live | Expected | Result |
|-------|------|----------|--------|
| ready | `true` | `true` | **PASS** |
| revision | `1` | `1` | **PASS** |
| chunkCount | `1` | `1` | **PASS** |
| tagCount | `1121` | `1121` | **PASS** |
| categoryCount | `18` | `18` | **PASS** |
| contentHash | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` | unchanged | **PASS** |

No rebuild / callable invoke performed this pass.

---

## 2. Workstream A — Functions allowlist (current source)

### Import trace (AI materialization-prefer loader)

```
loadAiCatalogReferenceSnapshot.ts
  ↑ aiEnrichmentRuntimeCache.ts (loadCachedActiveCategories / loadCachedApprovedTags)
    ↑ aiEnrichmentPipeline.ts → enqueueAiEnrichment (Cloud Function)
    ↑ aiEnrichmentPlayground.ts
        → testAiEnrichmentPlayground (Cloud Function)
        → testAiEnrichmentTagRerank (Cloud Function)
```

`updateAiEnrichmentSettings` imports only `clearAiEnrichmentRuntimeCache` (no taxonomy hydrate).
`resetAiEnrichmentForProcessing` does not load taxonomy.
Plain export `rebuildTaxonomyMaterialization` is **not** a Cloud Function.

### Affected AI Functions (must redeploy for loader flip)

| Function | Why |
|----------|-----|
| `enqueueAiEnrichment` | Production AI pipeline taxonomy hydrate |
| `testAiEnrichmentPlayground` | Playground loads approved tags/categories |
| `testAiEnrichmentTagRerank` | Same runtime-cache path |

### Taxonomy triggers (not yet live)

| Function | Why |
|----------|-----|
| `onTagTaxonomySourceWritten` | Coalesced server rebuild on tag writes |
| `onCategoryTaxonomySourceWritten` | Coalesced server rebuild on category writes |

### Bootstrap callable redeploy?

**No.** `rebuildTaxonomyMaterializationCallable` already live and successfully bootstrapped revision 1. No post-bootstrap source drift requiring redeploy for steady-state flip.

---

## 3. Proposed Functions deploy command

```bash
firebase deploy --only \
  functions:onTagTaxonomySourceWritten,\
  functions:onCategoryTaxonomySourceWritten,\
  functions:enqueueAiEnrichment,\
  functions:testAiEnrichmentPlayground,\
  functions:testAiEnrichmentTagRerank \
  --project fresh-prints-dev
```

Do **not** include `rebuildTaxonomyMaterializationCallable` unless a later drift check requires it.

---

## 4. Rules test gate (Workstream C)

### Environment

| Item | Value |
|------|--------|
| JDK | Portable Temurin **21.0.11+10** at `%USERPROFILE%\.local-jdk\jdk-21.0.11+10` |
| Convention | `docs/standards/TESTING.md` user-scoped portable JDK |
| Shell | `JAVA_HOME` + `PATH` prepend for current shell only |
| Command | `npm run test:rules` |

### Result

| Metric | Value |
|--------|-------|
| Java | `openjdk version "21.0.11" 2026-04-21 LTS` |
| Exit | **0** |
| Tests | **59** |
| Pass | **59** |
| Fail | **0** |

Includes `taxonomyMaterialization (RC7)` staff read allow / unauth+customer deny / all client writes deny, plus Stage 5 generated portal-catalog / catalog-reference remain dead.

**Rules deploy authorization: ready** (pending owner phrase).

---

## 5. Proposed Rules deploy command

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```

Notes:
- Source match: `taxonomyMaterialization/{docId}` — `allow read: if isStaff();` / client writes `false`.
- **Do not** redeploy Storage in this taxonomy gate (no Storage Rules change for materialization; Stage 5 Storage already live).
- Live Firestore Rules today lack `taxonomyMaterialization` (Stage 5 deploy preceded this match) — Studio client chunk/meta reads need this Rules deploy.

---

## 6. Recommended deployment order

Aligned with owner expected sequence + RC4 bootstrap-before-flip:

1. ~~Bootstrap materialization healthy~~ — **DONE**
2. **Deploy Functions** (triggers + AI allowlist above)
3. Verify Functions ACTIVE; confirm no unexpected rebuild storm (idle taxonomy)
4. **Deploy Firestore Rules** (`taxonomyMaterialization` staff read)
5. Reload Studio (HMR/full) so staff client can read meta/chunks under new Rules
6. Verify Studio staff can `getDoc` meta (+ warm disk short-circuit path)
7. Taxonomy mutation smoke (tag/category write → trigger rebuild → revision bump)
8. Warm AI process-cache / Studio disk-cache check
9. Controlled 45-design validation

Do **not** deploy Rules before Functions if Studio starts preferring materialization while AI loader is still old FS path — either order can work for AI (Admin SDK), but Studio **client** reads require Rules. Prefer Functions first so AI flip and writers land before Studio relies on staff Rules.

---

## 7. Diff containment (Workstream E)

| Risk | Result |
|------|--------|
| Revive `generated/portal-catalog/**` in Storage Rules | **No** (no match in `storage.rules`) |
| Revive `generated/catalog-reference/**` | **No** |
| Storage Rules taxonomy change | **No** |
| Algolia sync imports rebuild | **No** |
| Public materialization read | **No** (`isStaff()` only) |
| Client write materialization | **No** (`if false`) |
| Production config | **No** (dev-only target) |
| Design write → taxonomy rebuild | **No** (triggers only on tags/categories) |
| `enqueueAiEnrichment` → rebuild | **No** |
| Algolia sync → rebuild | **No** |

---

## 8. Blockers

**None** for proceeding to owner-authorized Functions then Rules deploys.

---

## 9. Proposed next owner phrases

1. `APPROVE DEV TAXONOMY STEADY-STATE FUNCTIONS DEPLOY`  
   → run the Functions command in §3

2. `APPROVE DEV TAXONOMY STEADY-STATE RULES DEPLOY`  
   → run the Rules command in §5 (after Functions verify)

3. Then validation / mutation smoke / 45-design (separate phrases as needed)

---

## Confirmations (this pass)

- NO Functions deploy
- NO Rules deploy
- NO Firebase mutation
- NO callable invoke
- NO production
- NO PR merge

**STOP.**
