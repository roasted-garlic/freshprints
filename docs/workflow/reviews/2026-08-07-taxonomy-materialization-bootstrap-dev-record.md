# Dev Bootstrap Record — Taxonomy materialization (`fresh-prints-dev`)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner phrase | `APPROVE DEV TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Project | **fresh-prints-dev** |
| Verdict | **TAXONOMY MATERIALIZATION BOOTSTRAP: PASS** |
| Follow-up | `taxonomy-read-spike-elimination` |

---

## Invocation

| Item | Value |
|------|--------|
| Mechanism | Studio Dev Console bridge `window.freshPrintsDev.rebuildTaxonomyMaterialization()` |
| Callable | `rebuildTaxonomyMaterializationCallable` (already deployed) |
| Invoker | Owner (signed-in Studio session) |
| Agent invoke | None (read-only verify only this pass) |

### Owner-reported payload

```json
{
  "revision": 1,
  "chunkCount": 1,
  "tagCount": 1121,
  "categoryCount": 18,
  "contentHash": "38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59",
  "corpusBytes": 298367
}
```

---

## Meta verification

| Field | Live value | Match payload? |
|-------|------------|----------------|
| exists | yes | — |
| ready | **true** | — |
| revision | **1** | yes |
| schemaVersion | **1** | — |
| chunkCount | **1** | yes |
| tagCount | **1121** | yes |
| categoryCount | **18** | yes |
| contentHash | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` | yes |
| updatedBy | `4gxOZTsGmxfZIA28mxNF2Hh46fY2` (owner) | — |
| updatedAtMs | `1786154932285` | — |

Collection docs present: `meta`, `chunk-0` only.

---

## Chunk verification

| Check | Result |
|-------|--------|
| Referenced chunks exist | **PASS** (`chunk-0`) |
| Chunk revision = 1 | **PASS** |
| Chunk contentHash = meta | **PASS** |
| Chunk chunkCount = 1 | **PASS** |
| Soft max ≤ 900 KiB | **PASS** |
| Serialized chunk-0 size | **298,509 bytes** (~291.5 KiB) |
| Largest chunk size | **298,509 bytes** |
| Payload corpusBytes | 298,367 (canonical corpus JSON estimate; chunk doc includes fence fields) |

---

## Integrity / SHA-256

| Check | Result |
|-------|--------|
| Recomputed from assembled chunks | `38e69b3851688e963470b1dc17c879a3e947a481c6d111a0d2a4fe74bdd33e59` |
| Matches expected / meta | **PASS** |
| Matches hash of live approved+active Firestore corpus | **PASS** |

---

## Corpus parity (canonical Firestore ↔ materialization)

| Metric | Canonical FS | Materialization |
|--------|--------------|-----------------|
| Approved tags (`status == approved`) | **1121** | **1121** |
| Active categories (`isActive == true`) | **18** | **18** |
| Field mismatches (name/aliases/preferredWhen/status; cat id/name/description) | — | **0** |
| ID set equality | — | **PASS** |

### Semantic spot checks

| Check | Result |
|-------|--------|
| `halftone` present | **PASS** (id `halftone`, 14 aliases, preferredWhen set) |
| Alias-heavy tags present | **PASS** (e.g. addamsfamily, adventuretime — 4 aliases each) |
| preferredWhen populated | **PASS** (sample preferredWhen length 175) |
| Archived tags excluded | **PASS** — sampled 3 archived tag ids; **0** leaks into materialization |
| Inactive categories excluded | **PASS** — no inactive categories found in sample query; **0** leaks |
| Non-approved status in materialization | **0** |

---

## Containment

| Check | Result |
|-------|--------|
| `taxonomyMaterialization/**` docs | `meta` + `chunk-0` only (expected) |
| `onTagTaxonomySourceWritten` deployed | **No** |
| `onCategoryTaxonomySourceWritten` deployed | **No** |
| `rebuildTaxonomyMaterializationCallable` | Present (bootstrap only) |
| AI loader / taxonomy triggers deploy this pass | **No** |
| Rules deploy this pass | **No** |
| Storage / Algolia / production / PR merge | **No** |

Unrelated write proof is limited to: materialization collection contains only the two expected docs; taxonomy triggers remain absent from `functions:list`. Canonical `tags`/`categories` were read-only during verify.

---

## Confirmations

- NO steady-state trigger deploy
- NO AI loader deploy
- NO Rules deploy
- NO Studio deploy this verify pass
- NO Storage mutation
- NO Algolia mutation
- NO production
- NO PR merge

---

## Next (separate owner phrases)

1. Deploy taxonomy source triggers (± AI loader Functions) to `fresh-prints-dev`
2. Deploy Firestore Rules for `taxonomyMaterialization` staff read (if not already live from an earlier Rules revision — confirm before relying on Studio client chunk reads in packaged flows)
3. Warm-cache / 45-design validation

**STOP.**
