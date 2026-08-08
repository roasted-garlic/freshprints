# 45-Design Server Taxonomy Validation — Log Attribution

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner | `45-DESIGN PERFORMANCE VALIDATION: INSPECT SERVER TAXONOMY LOGS` |
| Project | **fresh-prints-dev** |
| Scope | **READ-ONLY** Cloud Logging |
| Verdict | **45-DESIGN SERVER TAXONOMY VALIDATION: PASS WITH NOTES** |
| Client evidence | Studio Debug already PASS (0 tags/cats; ~139 billable; peak Console minute 222) |

---

## UTC log window

`2026-08-08T03:58:00Z` – `2026-08-08T04:12:00Z`  
(covers owner CT ~11:00–11:10 PM with buffer)

Cold load observed at **`2026-08-08T04:05:29Z`** (~11:05:29 PM CT), during import/enqueue.

---

## Taxonomy telemetry summary

| Metric | Count |
|--------|------:|
| AI Function runtime instances (taxonomy path) | **1** (`722c082e-ef0c-40fe-ad64-58f295238b4d`) |
| `taxonomy-cache-miss` | **1** (`coldStart: true`) |
| `taxonomy-materialization-hit` | **1** (revision **2**, chunkCount **1**, reason `healthy_materialization`) |
| `taxonomy-load-success` | **1** (`source: "materialization"`, revision **2**, elapsedMs **207**) |
| `taxonomy-cache-hit` | **89** (same instance, revision **2**) |
| `taxonomy-cache-join-inflight` | **0** |
| `taxonomy-fallback-fs` | **0** |
| `taxonomy-load-failure` | **0** |
| `taxonomy-fallback-circuit-open` | **0** |
| Retired catalog publisher / snapshot publication logs | **0** |

---

## Cold load sequence (authoritative)

| Time (UTC) | Event | Detail |
|------------|-------|--------|
| 04:05:29.026 | `taxonomy-cache-miss` | `coldStart: true`, instance `722c082e-…` |
| 04:05:29.232 | `taxonomy-materialization-hit` | revision **2**, chunkCount **1**, tags 1121, cats 18 |
| 04:05:29.233 | `taxonomy-load-success` | `source: materialization`, revision **2**, elapsedMs **207**, publishedToCache true |
| 04:05:29.233+ | `taxonomy-cache-hit` | subsequent designs on same instance |

---

## About `documentCount: 1139` on load-success (binding note)

`taxonomy-load-success` logs:

```ts
documentCount: categoryCount + tagCount  // corpus entity count
source: loaded.revision === "fs-fallback" ? "firestore" : "materialization"
```

So **`documentCount: 1139` with `source: "materialization"` is NOT a 1,139 Firestore document hydrate.**  
It is the size of the assembled AI snapshot after reading compact materialization (**meta + chunk-0** → O(chunks)=**1**).

Old failure mode was FS queries totaling **~1,139 Firestore reads**. That path would log `source: "firestore"` / `taxonomy-fallback-fs`. **Neither occurred.**

---

## Console peak attribution (not taxonomy towers)

Owner Console minutes (CT) align with import/enqueue/enrichment I/O, not ~1.1K taxonomy towers:

| CT minute | Reads / writes | Likely cause |
|-----------|----------------|--------------|
| 11:05–11:06 | 83 / 64 | early import writes + reads |
| 11:06–11:07 | **222** / 184 | peak import + enqueue + enrichment |
| 11:07–11:08 | 210 / 156 | continued enrichment |
| 11:08–11:09 | 165 / 1 | AI Review / settle |
| 11:09–11:10 | 1 / 0 | idle |

Cold materialization load (~207 ms at 04:05:29Z) is tiny vs these write-heavy minutes. Studio Debug already showed **0** `/tags` / `/categories`.

---

## Pass criteria mapping

| Criterion | Result |
|-----------|--------|
| No canonical 1139 FS hydrate | **PASS** (`source: materialization`; 0 fallback) |
| Cold load O(chunks) | **PASS** (chunkCount **1**, revision **2**) |
| Warm process cache | **PASS** (89 hits, 1 instance) |
| No fallback/error/circuit | **PASS** |
| Publishers absent | **PASS** |
| Console no ~1.1K–1.4K towers | **PASS** (owner capture; peak 222) |

---

## Confirmations

- NO taxonomy mutation  
- NO design approval/rejection  
- NO callable/manual rebuild  
- NO deploy  
- NO production  
- NO PR merge  

**STOP.**
