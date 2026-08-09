# Prod Bootstrap Record — Taxonomy materialization (`fresh-prints-prod`)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 (invoke 2026-08-09T00:08Z) |
| Owner phrase | `APPROVE PROD TAXONOMY MATERIALIZATION BOOTSTRAP` |
| Owner report | `TAXONOMY BOOTSTRAP INVOKE: OK` |
| Project | **`fresh-prints-prod`** |
| Verdict | **TAXONOMY MATERIALIZATION BOOTSTRAP: PASS** |
| Source tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Parent gate | PR #40 remaining production gates — Gate 4 |
| Invoke checkpoint | `docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-owner-invoke-checkpoint.md` |
| Wave A record | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-deploy-record.md` |

---

## Invocation

| Item | Value |
|------|--------|
| Mechanism | Owner one-shot Node: Admin custom token + client `httpsCallable` (outside Cursor agent) |
| Callable | `rebuildTaxonomyMaterializationCallable` (ACTIVE; Wave A) |
| Invoker UID | `7v3SLjRNt4d0sNliN0dZCPP2f8I3` (active owner) |
| Agent invoke | **None** — Cursor hooks blocked agent; no Admin SDK materialization write |
| Second invoke | **None** |

### Owner-reported payload

```json
{
  "startedAt": "2026-08-09T00:08:26.293Z",
  "completedAt": "2026-08-09T00:08:35.439Z",
  "data": {
    "revision": 1,
    "chunkCount": 1,
    "tagCount": 1130,
    "categoryCount": 19,
    "contentHash": "88b122bc27247ff5d4f15aa755aa8bb623c4cbc114f3c99c6cca124d267feff7",
    "corpusBytes": 295379
  }
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
| tagCount | **1130** | yes |
| categoryCount | **19** | yes |
| contentHash | `88b122bc27247ff5d4f15aa755aa8bb623c4cbc114f3c99c6cca124d267feff7` | yes |
| updatedBy | `7v3SLjRNt4d0sNliN0dZCPP2f8I3` | — |
| updatedAtMs | `1786234110730` | — |
| `corpusBytes` on meta doc | **undefined** (not persisted; return-only on callable) | — |

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
| Serialized chunk-0 size | **295,521 bytes** (~288.6 KiB) |
| Payload `corpusBytes` | **295,379** (canonical corpus JSON estimate via `estimateCorpusBytes`; chunk doc includes fence fields) |

---

## Integrity / SHA-256

| Check | Result |
|-------|--------|
| Structural validation (`validateTaxonomyMaterializationStructure`) | **PASS** |
| Recomputed via `hashTaxonomyCorpusSha256` (canonical) | `88b122bc27247ff5d4f15aa755aa8bb623c4cbc114f3c99c6cca124d267feff7` |
| Matches meta / payload | **PASS** |
| `estimateCorpusBytes` | **295379** (= payload `corpusBytes`) |

---

## Corpus parity (canonical Firestore ↔ materialization)

| Metric | Canonical FS | Materialization |
|--------|--------------|-----------------|
| Approved tags (`status == approved`) | **1130** | **1130** |
| Active categories (`isActive == true`) | **19** | **19** |
| Field mismatches (name/aliases/preferredWhen/status; cat id/name/description) | — | **0** |
| ID set equality | — | **PASS** |

### Semantic spot checks

| Check | Result |
|-------|--------|
| `halftone` present | **PASS** (14 aliases, preferredWhen set) |
| Archived tags excluded | **PASS** — none leaked into materialization samples |
| Inactive categories excluded | **PASS** — none leaked |
| Non-approved status in materialization | **0** |

---

## Containment

| Check | Result |
|-------|--------|
| `taxonomyMaterialization/**` docs | `meta` + `chunk-0` only |
| `onTagTaxonomySourceWritten` | **ACTIVE** (Wave A — unlike early-dev bootstrap) |
| `onCategoryTaxonomySourceWritten` | **ACTIVE** |
| `rebuildTaxonomyMaterializationCallable` | **ACTIVE** |
| Algolia Functions | **ABSENT** |
| Publishers (5) | **Still ACTIVE** (not deleted this gate) |
| Rules / Storage / App Hosting / Studio this pass | **No mutations** |
| Second bootstrap | **No** |

---

## Production identity (unchanged this gate)

| Item | Value |
|------|--------|
| `origin/production` | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| App Hosting | **100%** `build-2026-08-08-004`; auto-rollout disabled |
| Algolia | **OFF** |
| Firestore Rules | COMPLETE `2c0578a0-…` |
| Storage Rules | COMPLETE `ccb8e2ea-…` |

---

## Confirmations

- NO second bootstrap invoke
- NO Admin SDK materialization write by agent
- NO Algolia Functions / config / enable / secret create
- NO publisher DELETE
- NO Rules / indexes / Storage cleanup / App Hosting / Studio release

---

## Gate status

**Gate 4 (Taxonomy materialization bootstrap) — COMPLETE**

Next production-parity checkpoint (separate phrase): **`APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`**

**STOP** before publisher delete.
