# Amendment 9 — Combined live QA attribution (P3 + P1 + P4)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Environment | `fresh-prints-dev` |
| Branch | `fix/post-launch-catalog-and-processing-stability` @ `21583c1` |
| P3 deploy | Owner phrase + record `2026-08-07-amendment-9-p3-dev-deploy-record.md` |
| Window (UTC) | `2026-08-07T14:27:30Z` – `2026-08-07T14:34:30Z` |
| Studio Debug | started `14:27:44.359Z`, generated `14:33:16.070Z` |
| Pass type | **Read-only attribution** — no implement / deploy / merge |

---

## Evidence sources

| Layer | Source | Status |
|-------|--------|--------|
| P3 taxonomy | Cloud Logging `jsonPayload.message="ai-pipeline" AND jsonPayload.event=~taxonomy-` | **Retrieved** |
| P4 pubs | Cloud Logging `catalog-snapshot-publication` + `catalog-snapshot-scheduling` | **Retrieved** |
| P1 / P0 client | Owner-reported Studio Debug summary for this run | **Used** |
| Full Debug JSON event file | Searched Downloads / Desktop / workspace | **Not found on disk** (Aug-6 `output.txt` only) |

Owner Debug summary facts (this run) treated as authoritative for client totals:

- ≈**1,514** approximate billable client reads
- designs **375**, categories **18**, tags **1,121** (375+18+1121=**1514**)
- imports route: **90** reads / **45** designs → **2.00**/import
- **45** `enqueueAiEnrichment` callables
- listeners attach/emit: **0**
- fallbacks: **0**
- writes: **226**

---

## A. P3 Cloud Logging attribution

### Global

| Metric | Value |
|--------|------:|
| Distinct `runtimeInstanceId` | **1** (`79275082-5da1-4f5b-a9cb-59d65b0734e5`) |
| `taxonomy-cache-miss` | **1** |
| `taxonomy-load-success` | **1** |
| `taxonomy-cache-hit` | **89** |
| `taxonomy-cache-join-inflight` | **0** |
| `taxonomy-cache-expired` | **0** |
| `taxonomy-load-failure` | **0** |
| Approx Firestore taxonomy docs loaded | **1,139** (`documentCount`; C=18 + T=1121) |
| TTL logged | **900000** ms (15 min) |
| Window of events | `14:29:38.791Z` → `14:31:58.953Z` |

### Per-instance detail

| Field | Value |
|-------|-------|
| First event | miss @ `14:29:38.791Z` (`coldStart: true`) |
| Load success | `14:29:39.342Z` — `elapsedMs=550`, `publishedToCache=true`, `documentCount=1139` |
| Subsequent | hits only; last hit `cacheAgeMs≈139611` (~2.3 min ≪ 15 min TTL) |
| >1 full load inside TTL without clear? | **No** |

Event accounting vs 45 AI jobs: sequential `categories` then `tags` adapters → 1 miss + 1 hit on first job, then 44×2 hits = 88 → **89 hits**. Matches.

### P3 verdict

**PASS** — one cold load on one warm instance; hits dominate; no same-instance reload within TTL.

---

## B. P4 publication attribution

### Successful full `portal-catalog` publications: **3**

| # | End (UTC) | Start≈ | Spacing | C | T | R | C+T+R | Duration | Gen |
|---|-----------|--------|--------:|--:|--:|--:|------:|---------:|----:|
| 1 | `14:30:05.595Z` | `14:29:32Z` | — | 18 | 1121 | 0 | **1139** | 33.2s | 1412 |
| 2 | `14:32:05.713Z` | `14:30:06Z` | **120.1s** | 18 | 1121 | 0 | **1139** | 119.4s | 1446 |
| 3 | `14:34:13.855Z` | `14:32:07Z` | **128.1s** | 18 | 1121 | 45 | **1184** | 126.5s | 1491 |

| Metric | Value |
|--------|------:|
| Total C+T+R | **3,462** |
| Prior known good (same ~45 batch class) | 3 pubs / 3,436 |
| `joined-existing-debounce-window` | **87** |
| `claimed-debounce-waiter` | **3** |
| W2 / deferred-wake publications | **0** this window |
| Failures / lease-busy / not-yet-eligible | **0** |

Min-interval (~120s) preserved between pub ends. Count **3 ≤ 6**.

### P4 verdict

**PASS** — rate guard still live-passing; comparable to prior 3/3,436 result.

---

## C. P1 / P0 live attribution (Studio Debug)

### Import (live-confirmed)

| Metric | Value |
|--------|------:|
| Designs imported | **45** |
| Imports-route design reads | **90** |
| Per-design | **2.00** |
| Expected (I1 create + I4 authority) | **2** |

**P1 import: PASS.**

### Approval (arithmetic from summary; event-level file missing)

| Metric | Value |
|--------|------:|
| designs collection docsReturned (session) | **375** |
| Of which imports-route | **90** |
| Remainder (AI Review / Library / approval / other) | **285** |
| Expected approval oneshots if 45×(A1+A3) | **90** |
| Room left for list/browse/etc. | **195** |

Pre-P0 comparable session burned **990** list docs on approve alone (triangular). That pattern **cannot fit** in the remaining 195. Session billable reads equal **exactly** designs+categories+tags (1514) — no spare mass for count storms either.

Without the raw event JSON on disk, source-level counts for `updateDesign` vs `applyCatalogApprovalUpdate` vs unexpected `getDesignById` cannot be line-item proven. Narrowest honest claim:

- Approval oneshots are **consistent with ~2/design** and **inconsistent with pre-P1 (~3) + P0 reload amplification**.
- P0: **PASS** on evidence of zero listeners + no triangular list/count mass in totals.

### P1 / P0 verdicts

| Area | Verdict |
|------|---------|
| P1 import | **PASS** |
| P1 approval | **PASS WITH NOTES** (summary-level; raw export not on disk) |
| P0 | **PASS** |

---

## D. Console ~2.0K / ~1.7K spike reconstruction

Central 9:30–9:31 / 9:32–9:33 ≈ UTC **14:30–14:31** / **14:32–14:33**.

| Contributor | Evidence | ≈Docs | Likely bucket |
|-------------|----------|------:|---------------|
| P3 cold taxonomy load | success `14:29:39Z`, 1139 docs | **1139** | Leading edge of ~2K (with pub1) |
| P4 pub1 | ended `14:30:05Z`, C+T+R 1139; reads ~`14:29:32`–`14:30:05` | **1139** | **~2.0K** with P3 |
| P4 pub2 | ended `14:32:05Z`, C+T+R 1139 | **1139** | **~1.7K** core |
| Studio tags hydrate | Debug: **1121** once | **1121** | Same session; exact minute needs event file |
| Studio import design reads | 90 over import phase | **90** | Spread; small vs spikes |
| P4 pub3 | ended `14:34:13Z`, 1184 | **1184** | Trailing / next bucket |

**Best reconstruction:** the ~2K spike is **two legitimate Function full-corpus operations stacking** (P3 cold taxonomy + P4 publication #1), not O(n²). The ~1.7K spike aligns with **P4 publication #2 (~1139)** plus concurrent Studio fixed costs (tag hydrate and/or residual client activity). Multiple fixed-cost operations **do** stack into one-minute Console buckets.

Answers:

1. Studio 1,121-tag hydrate: **in this session**; exact Debug event timestamp **not recoverable** without the JSON file — likely during AI Review entry inside `14:30Z`–`14:33Z`.
2. P3 cold load: **yes**, at `14:29:39Z`, stacks into the first spike with pub1.
3. P4 full pubs: **yes** — pub1→first spike; pub2→second spike.
4. Stacking: **yes** — intentional fixed costs, not runaway.

---

## E. Combined QA verdicts

| Workstream | Verdict |
|------------|---------|
| **P0** | **PASS** |
| **P1** | **PASS WITH NOTES** |
| **P3** | **PASS** |
| **P4** | **PASS** |

### OVERALL AMENDMENT 9 LIVE QA: **PASS WITH NOTES**

Notes:

1. Full Studio Debug event JSON for this run was not found on disk; client approval source breakdown is arithmetic from owner summary.
2. Console spikes remain visible because P3+P4+Studio each still perform ~1.1K fixed corpus reads — **bounded**, not amplifying with N.
3. Remaining permanent ~1.1K/pub C+T+R awaits generated-search retirement (Stage 1b / later) — not a P4 regression.

---

## Signoff disposition

P1 + P3 meet live targets → Signoffs created:

- P1: `docs/workflow/reviews/2026-08-07-amendment-9-p1-signoff.md` — **approved_with_notes**
- P3: `docs/workflow/reviews/2026-08-07-amendment-9-p3-signoff.md` — **approved**

P2 Plan + Formal Review: **recommend NO IMPLEMENTATION** (accept ~1.1K Studio tag hydrate).

Amendment 9 **optimization set for P0/P1/P3/P4 is live-validated / closed**; Stage 1b **not** complete.
