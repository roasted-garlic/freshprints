# Attribution: Firestore read spike 2026-08-07 12:47–12:53 CDT

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Mode | **Read-only** — no code / deploy / publisher change |
| Project | `fresh-prints-dev` |
| Window (UTC) | `2026-08-07T17:47:00Z` – `17:53:59Z` |
| Window (Central) | 12:47–12:53 PM CDT |
| Source | Cloud Logging (`gcloud logging read`) |

---

## Verdict

The Console spikes are **bounded, expected Amendment 9 P4 portal-catalog full publications** (~1.18K C+T+R each), paced at the **~120s** minimum interval, triggered by owner design writes during Stage 1b QA. The first ~**2.3K** minute is **publication #1 (~1.18K) overlapping an AI taxonomy cold load (~1.14K)** that finished seconds earlier. **Not** a new amplification defect. **Not** Algolia reconcile. Stage 4 publisher retirement would eliminate this C+T+R read class.

---

## 1. Portal-catalog full publications

Three **successful** `portal-catalog` publications (`schedulingReason: design-write`, `pass: 1`). **Zero** `deferred-wake` outcomes in this window.

| # | Success (UTC) | Success (CDT) | C | T | R | **C+T+R** | Duration | Notes |
|---|---------------|---------------|---|---|---|-----------|----------|-------|
| 1 | 17:47:10.336Z | **12:47:10** | 18 | 1121 | 45 | **1184** | ~42 s | Scan started ~17:46:28 |
| 2 | 17:49:08.435Z | **12:49:08** | 18 | 1121 | 46 | **1185** | ~84 s | Claimed debounce 17:47:44 |
| 3 | 17:51:08.984Z | **12:51:09** | 18 | 1121 | 46 | **1185** | ~87 s | Claimed debounce 17:49:41 |

**Scheduling / wake**

| Timestamp (UTC) | Event |
|-----------------|-------|
| 17:46:29 | `claimed-debounce-waiter` (design-write) — ahead of Pub 1 |
| 17:47:44 | `claimed-debounce-waiter` (design-write) — seeds Pub 2 |
| 17:49:41 | `claimed-debounce-waiter` (design-write) — seeds Pub 3 |
| — | **No** `deferred-wake` / `deferredWakeNonce` activity logged |

Also seen: several `skipped` / `non-ready-index-filter-skipped` accounting rows with **C+T+R = 0** (not spike drivers).

**Spacing (success → success)**

| Gap | Delta |
|-----|-------|
| Pub 1 → Pub 2 | **~118 s** |
| Pub 2 → Pub 3 | **~120 s** |

Matches P4 **minimum publication interval ≈ 120 s**. Console peaks near 12:47 / 12:49–50 / 12:51–52 align with these completions (minute buckets).

**Sum C+T+R (3 pubs):** **3,554**

---

## 2. Algolia sync / reconcile

| Activity | In window? | Firestore impact |
|----------|------------|------------------|
| `syncPortalCatalogDesignToAlgolia` upserts | **Yes — 2** | Per-design + few tag/category doc gets only |
| Design | `vEUrzV9KjCFcCMZI3o3i` | tagCount 1 @ 17:47:45; tagCount 2 @ 17:49:41 |
| `reconcilePortalCatalogAlgoliaIndex` | **No** | — |
| Scheduled reconcile | **No** | — |

Algolia sync did **not** cause the multi-K read spikes (no full taxonomy/design collection scans).

---

## 3. AI taxonomy cache

Just **before** the requested window (still relevant to the first Console peak):

| Timestamp (UTC / CDT) | Event | Detail |
|-----------------------|-------|--------|
| 17:46:32.192 / 12:46:32 | `taxonomy-cache-miss` | `coldStart: true` |
| 17:46:32.798 / 12:46:32 | `taxonomy-load-success` | **`documentCount: 1139`** (tagCount 1121, categoryCount 18), `elapsedMs: 605`, `publishedToCache: true` |
| Runtime instance | | `8c02568e-1dcf-4ee1-b8c3-d5a16b737790` |
| Design | | `vEUrzV9KjCFcCMZI3o3i` (AI enrich) |

**Yes — a cold ~1.1K taxonomy load occurred**, overlapping Pub 1’s scan window (~17:46:28–17:47:10).

Also: `reference_cache.miss` / settings query (`returnedDocumentCount: 1`) — negligible vs spikes.

---

## 4. Other Functions in window

| Service | Log volume (broader 17:46–17:54) | Spike role |
|---------|-----------------------------------|------------|
| `onPortalCatalogSnapshotSourceWritten` | High | **Primary** — pubs + scheduling |
| `onPortalCatalogPublicationStateWritten` | Medium | Coordination / W2 surface; not C+T+R scan |
| `syncPortalCatalogDesignToAlgolia` | 18 entries / 2 upserts | Tiny |
| `enqueueAiEnrichment` / AI pipeline | Present | Taxonomy ~1.1K once; then cache hits |

No other Function showed a large Firestore collection scan in-window.

---

## Console shape vs attributable reads

| Console observation | Attribution |
|---------------------|-------------|
| ~**2.3K** @ ~12:47–12:48 | Pub 1 **1184** + taxonomy cold load **~1139** ≈ **~2.3K** (same minute) |
| Peak ~12:50 | Pub 2 **1185** (success 12:49:08; scan spanned prior minute) |
| Peak ~12:52 | Pub 3 **1185** (success 12:51:09) |
| Writes ~4 / minute | Consistent with a few design/state writes, not bulk writes |

**Total attributable large reads (~12:46:30–12:51:10):**  
taxonomy **~1,139** + pubs **3,554** ≈ **~4.7K** — three paced ~1.1K classes + one overlapping taxonomy load. Matches multi-peak Console shape; low writes match.

---

## Expected vs defect

| Question | Answer |
|----------|--------|
| Matches P4 ~120s cadence? | **Yes** (~118s, ~120s) |
| New amplification defect? | **No** — same ~1.1K C+T+R full-pub class as prior P4 QA |
| Bounded expected? | **Yes** while generated publisher remains alive |
| Stage 4 publisher retirement eliminate this class? | **Yes** — full portal-catalog C+T+R publications go away; Algolia per-design sync stays small; AI taxonomy cold loads are a **separate** ~1.1K class (P3) |

---

## STOP

No code changes. No deploy. No publisher retirement. Attribution only.
