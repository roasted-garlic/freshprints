# Amendment 9 P0 — Server Read Attribution (post-P0 45-image window)

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Project | `fresh-prints-dev` |
| UTC window | `2026-08-06T16:54:30Z` → `2026-08-06T17:02:00Z` |
| Access | **Read-only** Cloud Logging via `gcloud logging read` |
| Mutations | **None** (no publishers, rebuilds, deploys, or Console writes) |

## Binding constraints

- Do **not** subtract client Debug ≈1,375 from Console ≈7.7K as exact billing reconciliation unless Console bucket and Debug interval are proven aligned.
- P0 client budgets met (owner Debug summary). Do **not** revert P0.
- Do **not** implement P3/P4 in this pass.

## Post-P0 client Debug (owner summary)

Attached post-P0 JSON with session start `2026-08-06T16:53:20.612Z` was **not** present on disk at investigation time (`Downloads/output.txt` and `firebase-debug-analysis-2026-08-06.md` remain the **pre-P0** Run B at `15:29:47Z`). Owner-reported post-P0 totals used below:

| Metric | Owner post-P0 | Pre-P0 Run B |
|---|---:|---:|
| Approx client reads | **1,375** | 2,495 |
| Designs | **236** | 1,356 |
| Tags | **1,121** | 1,121 |
| Categories | **18** | 18 |
| Listeners | **0** | 0 |
| Callables (`enqueueAiEnrichment`) | **45** | 45 |
| Writes | **225** | 225 |

Owner-confirmed client patterns:

- Only initial AI Review list queries (no triangular post-action reload)
- No post-action triple-count refresh
- Design reads reduced by exactly **1,120** (1,356 → 236)

## Cloud Logging evidence (this pass)

### Portal catalog snapshot publications

Filter: `jsonPayload.message="catalog-snapshot-publication" AND jsonPayload.outcome="success"` in window.

| Metric | Value |
|---|---:|
| Successful full publications | **25** |
| Scheduling events | **180** (`joined-existing-debounce-window` **166**, `claimed-debounce-waiter` **14**) |
| Scheduling reason | All sampled: `design-write` |
| Per publication scan | `categoriesRead=18` + `tagsRead=1121` + `readyDesignsRead` (0…44) |
| Sum (C+T+R) over 25 pubs | **28,710** |
| + coordination (~2/doc per full accounting row) | ≈ **+50** → ~**28.8K** document reads attributed to full publications |

Many early publications ran with `readyDesignsRead=0` during import churn; later publications climbed toward R=44 as approvals created ready designs. Debounce **joined** often but still produced **14 claimed** waiters and **25** completed full publications across the paced batch — **not** coalesced to a handful of publishes.

### AI enrichment taxonomy loads

Filter: `jsonPayload.message="ai-pipeline" AND jsonPayload.event=~reference_`

| Metric | Value |
|---|---:|
| `enqueue.completed_direct` | **45** (45 unique designIds) |
| Function runtime instances (`runtimeInstanceId`) | **1** (`319151f3-2076-4666-a8c6-d91966c907b1`) |
| Cold-start miss | **1** (settings, first load) |
| Full taxonomy query completions | **3** sets of tags(1121)+categories(18)+settings(1) |
| Cache hits | **126** (42 each tags/categories/settings) |
| Estimated taxonomy document reads | **3 × 1,140 = 3,420** |

**TTL note:** Code TTL is `CACHE_TTL_MS = 60_000` (60s) in `functions/src/ai/aiEnrichmentRuntimeCache.ts`, not a 5-minute TTL. Miss timestamps (~16:55:15, 16:56:20, 16:57:21) match ~60s expiry on one warm instance.

### Client vs Console

| Layer | Estimated reads (investigation window) | Confidence |
|---|---:|---|
| Portal snapshot full publications | ~**28.8K** | **High** (accounting logs) |
| AI taxonomy loads | ~**3.4K** | **High** (reference_query.completed) |
| Client SDK (owner Debug) | ~**1.4K** | **High** (owner report; file missing on disk) |
| Owner Console observation | ~**7.7K** | **Medium** (5-minute bucket; not full window) |

Do **not** expect Console 7.7K ≈ full-window snapshot sum. Sampled 5-minute publication-only windows in this UTC range are **~10K–22K**, so Console’s 7.7K is best treated as a **partial bucket / different aggregation**, not a contradiction of snapshot dominance over the full test.

### Query Insights / index-entry

**Not retrieved** from this environment (no Query Insights CLI export available). Owner checklist below.

## Contributor table

| Contributor | Occurrences | Reads per occurrence | Estimated subtotal | Runtime evidence | Confidence |
|---|---:|---:|---:|---|---|
| Portal catalog full publication | 25 | ~1,141–1,185 (+coord) | ~**28.8K** | `catalog-snapshot-publication` / `portal-catalog-publication-accounting` | High |
| AI taxonomy full load | 3 | ~1,140 | ~**3.4K** | `reference_query.completed` × tags/categories/settings | High |
| Client Studio SDK (post-P0) | 1 session | — | ~**1.4K** | Owner Debug summary | High |
| Index-entry / other queries | unknown | unknown | unknown | Query Insights not retrieved | Low |

## Classification

**2. Snapshot publication dominated** (with secondary AI taxonomy and residual client).

Not AI-taxonomy-dominated: taxonomy ≈3.4K on one instance vs snapshots ≈28.8K in the same window.

## P3 / P4 warrant (planning only — do not implement this pass)

| Priority | Warranted? | Why |
|---|---|---|
| **P4** (snapshot schedule / non-ready write guard / coalesce) | **Yes** | 25 full C+T(+R) publications from `design-write` during one 45-design import/review; many with R=0 |
| **P3** (taxonomy TTL / shared taxonomy doc) | Secondary | Only 3 loads / ~3.4K; already 60s in-process cache on one instance |

## Owner evidence still useful (optional)

1. Firebase Console → Firestore → Usage for the exact 5-minute bucket that showed ~7.7K (screenshot with UTC bounds).
2. Query Insights for `tags` / `categories` / `designs` in `16:54:30Z`–`17:02:00Z` (collection + fingerprint).
3. Re-export post-P0 Studio Debug JSON (session start `2026-08-06T16:53:20.612Z`) for archival parse parity with pre-P0 Run B.

## Commands used (read-only)

```text
gcloud logging read 'timestamp>="2026-08-06T16:54:30Z" AND timestamp<="2026-08-06T17:02:00Z" AND jsonPayload.message="catalog-snapshot-publication" AND jsonPayload.outcome="success"' --project=fresh-prints-dev --format=json --limit=100

gcloud logging read '... AND jsonPayload.message="catalog-snapshot-scheduling"' --project=fresh-prints-dev --format=json --limit=1000

gcloud logging read '... AND jsonPayload.message="ai-pipeline" AND jsonPayload.event:"reference_"' --project=fresh-prints-dev --format=json --limit=500

gcloud logging read '... AND jsonPayload.message="ai-pipeline" AND jsonPayload.event="enqueue.completed_direct"' --project=fresh-prints-dev --format=json --limit=100
```
