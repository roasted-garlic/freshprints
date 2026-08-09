# Incident Report: Large-batch Firestore read amplification

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Managed goal | `post-launch-catalog-and-processing-stability` |
| Amendment | **Amendment 9** (investigation + plan only) |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| Starting HEAD | `4a0c039e63778d82a40efba678fdfa3c311cead3` |
| PR | #40 — open / unmerged (`refs/pull/40/head` = `4a0c039…`) |
| Scope of this doc | Evidence parse + attribution. **No implementation.** |

---

## 1. Executive summary

Two **independent** owner observations show elevated Firestore cost around a ~45-design import / AI Review workflow:

| Run | Evidence type | Window | Observed |
|---|---|---|---|
| **A** | Firebase Console 5-minute bucket | ~10:04–10:05 AM owner-local, 2026-08-06 | ~**7.1K** reads, **93** writes, **0** deletes |
| **B** | Studio Firebase Debug JSON (`output.txt`) | `2026-08-06T15:29:47.352Z` → `15:35:39.722Z` (~352s) | Client-traced **~2,495** approx billable reads, **225** writes, **45** callables |

**Do not subtract B from A.** Timestamps do not prove the same run or overlapping measurement window. Treat them as separate observations until Console/Query Insights prove otherwise.

**Proven client root cause (Run B):** AI Review **reloads the entire remaining Needs Review page and refreshes all three tab counts after every approval**, producing a **triangular / O(n²)** design-list document-read pattern for N ≤ page size (100).

**Not proven for Run A:** Whether the Console spike was dominated by that client path, Functions AI taxonomy cold loads, snapshot publications, deletion-triggered background work, index-entry charges, or a mix. Owner log checklist is required (§10).

---

## 2. Test Run A — Console spike (owner-confirmed)

| Field | Value | Confidence |
|---|---|---|
| Reads | ~7.1K | Owner Console observation |
| Writes | 93 | Owner |
| Deletes | 0 | Owner |
| Visible bucket | ~10:04–10:05 AM local, 2026-08-06 | Owner |
| Exact UTC start/end | **Unresolved** | — |
| Composition (upload only vs AI vs approvals) | **Unresolved** | — |
| Studio/Portal responsiveness | Remained responsive | Owner |
| Client Debug overlap with Run B | **Not proven** | Different later UTC window for B |

### Run A — working attribution (separate from B)

| Contributor | Status |
|---|---|
| Client AI Review O(n²) if approvals occurred in-bucket | Possible; **not proven** without Console filters |
| Functions AI taxonomy full load (~C+T ≈ 1,140 docs/miss, 5 min TTL) | Possible; scales with cold instances / TTL expiry |
| Snapshot full publications (R + C + T per publish) | Possible; **must not be blamed without publication logs** |
| Prior deletion cleanup / delayed publish | Possible; **needs logs** |
| Index-entry charges | Unknown; Console may include; Debug excludes |
| Untraced client `getDoc` in write paths | Exists in source; Console would include; Debug undercounts |

---

## 3. Test Run B — Debug report parse

### 3.1 Session metadata

| Field | Value |
|---|---|
| File | Owner attach `output.txt` (schemaVersion **2**) |
| App / project | Studio / `fresh-prints-dev` |
| Started | `2026-08-06T15:29:47.352Z` |
| Generated / elapsed | `2026-08-06T15:35:39.722Z` / ~352370 ms |
| Routes | `/imports` → `/ai-review` → `/designs` |
| Events retained | **1535** (within 2000-event bound) |

### 3.2 Tracer accuracy (binding)

From report `accuracyDisclaimer`:

- In-memory **client SDK** instrumentation only
- **Excludes** Cloud Functions Firestore reads/writes
- **Excludes** index-entry charges
- Approx billable = returned docs + **one-document minimum** for completed one-shot queries (including `getCountFromServer` with `returnedCount: 0`)
- **Not** a substitute for Console billing

### 3.3 Totals

| Metric | Value |
|---|---:|
| readOperations | 326 |
| documentsReturned | 2,354 |
| approximateBillableDocumentReads | 2,495 |
| writes | 225 |
| callables | 45 |
| cacheHits / cacheMisses | 16 / 324 |
| listenerAttaches / emissions | **0 / 0** |
| storageAssetRequests | 0 |
| fallbacks / errors | 0 / 0 |

### 3.4 By route

| Route | Read ops | Docs returned | Approx billable | Writes | Callables |
|---|---:|---:|---:|---:|---:|
| `/imports` | 90 | 90 | 90 | 135 | 45 |
| `/ai-review` | 234 | 2,219 | 2,359 | 90 | 0 |
| `/designs` | 2 | 45 | 46 | 0 | 0 |

Route entry timestamps: `/imports` `15:29:48.618Z` · `/ai-review` `15:33:52.553Z` · `/designs` `15:35:39.123Z`.

### 3.5 By collection (tracer)

| Collection | Read ops | Docs returned | Approx billable | Writes |
|---|---:|---:|---:|---:|
| `designs` | 322 | 1,215 | 1,356 | 225 |
| `tags` | 3 | 1,121 | 1,121 | 0 |
| `categories` | 1 | 18 | 18 | 0 |

### 3.6 By source (`oneShotComplete` exact)

| Source | Ops | Docs returned | Notes |
|---|---:|---:|---|
| `catalogTagService.listTagPage` | 3 | **1,121** | 500+500+121; `/ai-review` only; trigger `route` |
| `designService.listDesignsPage` | 48 | **1,080** | 47 on `/ai-review` (1,035 docs), 1 on `/designs` (45) |
| `designService.getDesignById` | 135 | 135 | 90 `/imports` + 45 `/ai-review` |
| `designService.countDesigns` | 139 | **0** | `getCountFromServer`; tracer bills ≈1 each → **139** approx |
| `categoryService.listCategories` | 1 | 18 | `/ai-review` |

**Sources >5% of ~2,495 approx reads:** tags (44.9%), listDesignsPage (43.3%), countDesigns (5.6%), getDesignById (5.4%).

### 3.7 Writes / callables

| Kind | Count | Success |
|---|---:|---:|
| `setDoc` (`createDesign`) | 45 | 45 |
| `updateDoc` | 180 | 180 |
| `enqueueAiEnrichment` | 45 | 45 (avg ~3430 ms) |

Write sources: `createDesign` 45 · `updateDesign` 135 · `applyCatalogApprovalUpdate` 45.

### 3.8 Cache

| Cache | Misses | Hits |
|---|---:|---:|
| `designService.documentCache` | 135 | 0 |
| `designService.countCache` | 139 | 4 |
| `designService.pageCache` | 48 | 2 |
| `catalogTagService.listTagsCache.approved` | 1 | 5 |
| `categoryService.listCategoriesCache.active` | 1 | 5 |

---

## 4. AI Review list sequence (O(n²) proof)

Exact `/ai-review` `listDesignsPage` `returnedCount` sequence (**47** ops):

```
0, 45, 44, 43, …, 2, 1, 0
```

| Slice | Sum | Interpretation |
|---|---:|---|
| Initial `0` then `45` | 45 | Route mount / empty then full Needs Review page |
| Post-approval `44…0` (45 values) | **990** = 44×45/2 | One full remaining-page reload after each of 45 approvals |
| **All list docs** | **1,035** | = 45×46/2 |

**Classification:** For N ≤ `DEFAULT_LIST_LIMIT` (100), post-approval list document reads are **Θ(N²)** (triangular). Not O(n log n).

### Tab counts

Exactly **3** distinct count signatures × **46** = **138** `/ai-review` `countDesigns` ops:

1. `aiReviewStatus==pending` + `status in imported,processing` (Processing)
2. `aiReviewStatus==needs_review` + `status==imported` (Needs Review)
3. `status==rejected` (Rejected)

Pattern = **1 initial + 1 per approval** for each tab → **3 counts after every approval**. Aggregation ops do **not** return documents in the tracer (`returnedCount: 0`); approx billable uses the one-document minimum (**do not** treat count results as N document reads).

---

## 5. Hypothesis verdicts (Run B)

| # | Hypothesis | Verdict | Evidence |
|---|---|---|---|
| 1 | AI Review reloads entire remaining Needs Review page after every approval | **PROVEN** | Sequence 44…0 after each approval; source `runInboxAction` → `reloadDesigns` |
| 2 | Shrinking O(n²) / triangular returned counts | **PROVEN** | Sum 990 = triangular; formula N(N−1)/2 for N≤100 |
| 3 | Multiple `countDesigns` after each approval | **PROVEN** | Exactly 3 tab aggregations × 45 approvals |
| 4 | Complete tag library once per route/session | **PROVEN** | One paginated load (3 pages, 1121 docs); later cache hits |
| 5 | Imports ≈2 `getDesignById` per design | **PROVEN** (traced) | 90/45 = 2.000; **PARTIALLY** complete story — write-path `getDoc`s are **untraced** (§6) |
| 6 | Design Library one bounded page after approvals | **PROVEN** | `/designs`: 1× list (45) + 1× count |
| 7 | No listener / observer read storm | **PROVEN** | 0 attaches, 0 emissions |
| 8 | Cache invalidation forces miss after every approval | **PROVEN** | Writes call `invalidateDesignReadCaches`; page/count miss fan-out matches approvals |
| 9 | React rerenders / unstable deps cause **duplicate identical** queries | **DISPROVEN** | 1 list + 3 **distinct** tab counts per approval; Amendment 7 observer loop not active in this trace |
| 10 | Authority reread may be necessary; surrounding list/count reloads unnecessary | **PROVEN** | `getDesignById` in approval path; returned `Design` discarded; UI always `reloadDesigns` + `reloadCounts` |

---

## 6. Tracer undercount (source-proven)

These client `getDoc` calls **do bill in Firestore** but are **not** emitted as `oneShotComplete` in this tracer build:

| Path | When | Ops in Run B (expected) |
|---|---|---:|
| `createDesign` post-`setDoc` `getDoc` | Import | 45 |
| `updateDesign` pre-write `getDoc` | Import derivatives + AI Review draft | 135 |
| `applyCatalogApprovalUpdate` pre-write `getDoc` | Approval | 45 |
| **Total untraced client design gets** | | **~225** |

**Implication:** Run B traced ≈2,495 understates true client document reads by ~225 design gets (plus any other uninstrumented SDK usage). Still **far below** Run A’s 7.1K — server-side / index / other apps remain required to explain A.

---

## 7. Consumer: why Studio downloads 1,121 tags

| Question | Finding |
|---|---|
| Who loads tags on AI Review? | `useGeneratedDesignLibraryTaxonomy` → `catalogTagService.listTags` → paginated `listTagPage` (500) |
| Mounted where? | **Twice**: `AiReviewPage` (categories) + `useAiReviewInbox` (`approvedTags`) — second instance hits **shared in-memory cache** (hits observed) |
| Why full set? | Tag picker / assigned-tag display / approve-suggested-tag against **approved** corpus (aliases + names). Not required as 1,121 docs **per design** — once per session is current behavior |
| Query shape | Bounded pages of 500 until exhausted; not one unbounded single query; TTL **12h** in `catalogTagService` |
| Reload on `/designs`? | Cache hits — no second full download in this trace |
| On-demand search? | Not used today for AI Review picker |

---

## 8. Server AI taxonomy (model; not in Debug)

| Item | Source fact |
|---|---|
| Loader | `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` — Firestore `categories` (active) + `tags` (approved) |
| TTL | `FALLBACK_TTL_MS = 5 * 60_000` |
| In-flight dedupe | Yes (`fallbackLoad` Promise) |
| Runtime cache layer | `aiEnrichmentRuntimeCache.ts` — **60s** TTL; process/instance locals |
| Per enqueue | `enqueueAiEnrichment` loads caller + design; pipeline loads taxonomy via cached helpers |
| Run B client callables | 45 × success; avg ~3.4s → sequential wall ≈ **154s** if one-at-a-time (fits **one** 5-min taxonomy window on a **warm single instance**) |
| Cold / multi-instance | Each instance pays full **C+T** (~18+1,121 ≈ **1,140**) per miss |

**Expected taxonomy reads (taxonomy docs only):**

| Scenario | Loads | ≈ Docs |
|---|---:|---:|
| 1 warm instance, &lt;5 min wall | 1 | ~1,140 |
| 1 instance, 30 min wall | ~6 | ~6,840 |
| N cold instances | N | N×~1,140 |

Run B does **not** measure these. They are candidates for Run A remainder / concurrent Function cost.

---

## 9. Snapshot scheduling (model; no live log pull this pass)

| Item | Source fact |
|---|---|
| Trigger | `onPortalCatalogSnapshotSourceWritten` on `designs/{id}` |
| Ready enter/leave + index fields | `index-filter` → debounce + full publish |
| Debounce | `DEBOUNCE_MS = 15_000`; joiners coalesce |
| Full publish scan | All `status==ready` designs + taxonomy (C+T) |
| Import create / non-ready card-only fallthrough | Can **schedule** full publication even when design is not ready |
| 45 rapid approvals | Up to 45 schedule events → **typically few** coalesced publications, not 45 full scans |
| Deletion before Run B | Ready-archive/delete can schedule; non-ready archive often `operational` (skip) |

**This pass:** No Cloud Logging / Query Insights export attached. Snapshot contribution to Run A/B is **modeled, not measured**. Do **not** treat snapshot removal as the fix for proven AI Review O(n²).

---

## 10. Owner evidence still required (read-only checklist)

Cursor did not retrieve Query Insights or Function logs for these windows in this pass. Exact owner retrieval:

### 10.1 Align Run A UTC

1. Google Cloud Console → Logging → convert owner-local **10:04–10:05 AM** (timezone) → **UTC**
2. Record exact bucket start/end used in Firebase Console Usage

### 10.2 Firestore Query Insights / Usage

1. Firebase Console → Firestore → Usage / Query insights for `fresh-prints-dev`
2. Filter UTC window for Run A and separately for Run B (`15:29–15:36Z`)
3. Export or screenshot: reads by collection if available

### 10.3 Function logs — AI taxonomy

Filter `fresh-prints-dev`, resource `cloud_function` / `cloudfunctions.googleapis.com`:

- Text containing taxonomy / reference cache miss / `returnedDocumentCount`
- Callable `enqueueAiEnrichment` invocation count in each window
- Note instance ids if present (multi-instance cold loads)

### 10.4 Function logs — snapshots

Filter structured / text:

- `catalog-snapshot-scheduling`
- `catalog-snapshot-publication`
- Fields: joined debounce, claim, `readyDesignsRead`, `categoriesRead`, `tagsRead`, success/failure

### 10.5 Deletion overlap

For time **immediately before** Run B start (`15:29:47Z`): any publication or cleanup after owner wiped designs.

**Do not** invoke rebuild/retry callables or delete coordination docs while collecting.

---

## 11. Numerical reconciliation — Test Run B (client traced)

| Contributor | Collection | Shape | Docs/op | Occurrences | Subtotal (docs or approx) | Confidence |
|---|---|---|---:|---:|---:|---|
| Tag library load | tags | paginated getDocs | 500/500/121 | 3 | **1,121** | High |
| AI Review list (incl. initial) | designs | getDocs page | shrinking | 47 | **1,035** | High |
| Import getDesignById | designs | getDoc | 1 | 90 | **90** | High |
| Approval getDesignById | designs | getDoc | 1 | 45 | **45** | High |
| Design Library page | designs | getDocs | 45 | 1 | **45** | High |
| Categories | categories | getDocs | 18 | 1 | **18** | High |
| countDesigns (approx min 1) | designs | getCountFromServer | — | 139 | **~139** | High (billing semantics: aggregation, not list size) |
| **Traced sum** | | | | | **≈2,493** | Matches 2,495 |
| Untraced write-path getDoc | designs | getDoc | 1 | ~225 | **~225** (not in tracer) | High (source) |
| Functions AI taxonomy | tags+categories | query | ~1,140 | ≥0 | **unknown in B** | Needs logs |
| Snapshot publications | designs+taxonomy | full scan | R+C+T | ? | **unknown in B** | Needs logs |

### Scale extrapolation — **AI Review list reload only** (post-approval docs, N ≤ 100)

| N | Triangular list docs Σ(0..N−1) | +3N traced oneshots (update path authority)* | +3N count approx |
|---:|---:|---:|---:|
| 45 | 990 | 135 | 135 |
| 100 | 4,950 | 300 | 300 |
| 500 | ≈45,349† | 1,500 | 1,500 |
| 1,000 | ≈95,849† | 3,000 | 3,000 |

\*Traced `getDesignById` only; excludes untraced write gets.  
†For N&gt;101: Σ min(101,r) for r=0..N−1 = 5050 + 101×(N−101).

---

## 12. Relationship to Amendment 8 Phase 1B

| Cause | Phase 1B (managed search + snapshot retirement) |
|---|---|
| AI Review O(n²) page reload | **WILL NOT ADDRESS** |
| Per-approval triple count refresh | **WILL NOT ADDRESS** |
| Import duplicate / untraced gets | **WILL NOT ADDRESS** |
| Studio full tag hydrate once | **WILL NOT ADDRESS** (may remain acceptable) |
| Server AI taxonomy full Firestore load | **WILL NOT ADDRESS** (already Firestore-only post-1A) |
| Portal snapshot full-scan publications | **WILL ADDRESS** when publishers retired |
| Client AI Review cost after snapshot removal | **Remains** |

**Production promotion / PR #40 merge remains paused** until Amendment 9 containment is implemented and tested (see Plan), independent of Phase 1B provider choice.

---

## 13. Protected constraints honored this pass

- No application source / test changes retained
- No deploy, merge, Phase 1B, snapshot deletion, destructive wipe/import
- Test Run A and B kept separate
- Snapshots not blamed as sole cause without logs
