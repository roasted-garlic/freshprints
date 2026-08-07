# Amendment 9 P4 — Owner QA FAIL + Cloud Logging attribution

| Field | Value |
|-------|-------|
| Date | 2026-08-06 (local) / 2026-08-07 (UTC window) |
| Environment | `fresh-prints-dev` |
| Deploy SHA | `9fe6430` (record commit `4dbb1c6`) |
| Owner verdict | **FAIL** (overall QA) |
| P4 Signoff | **Blocked** — do not Signoff |
| Rate-guard live target | **PASSING** (see §A) |
| Ordering product FAIL | Separate from P4 rate-guard — see linked investigation |

---

## Owner QA window

| Field | Value |
|-------|-------|
| Local | 2026-08-06 ~9:27 PM–9:35 PM Central |
| UTC (Studio debug) | ~2026-08-07T02:27:31Z–02:35:21Z |
| Logging filter used | `2026-08-07T02:27:31Z` through `2026-08-07T02:36:30Z` |
| Approx. AI enqueue calls | ~45 |
| Owner notes | Console read spikes lower (~1.5K largest 2-min bucket) but still present; search / multi-tag / facets / non-ready import OK; **Portal catalog ordering ≠ Studio** |

Source of attribution: Cloud Logging for deployed P4 Functions on `fresh-prints-dev`. Studio Debug tracer was **not** used for server read totals (excludes Cloud Functions reads).

---

## A. Portal publication attribution (Cloud Logging)

### Successful full `portal-catalog` publications

**Exact count: 3**

| # | Timestamp (UTC) | `outcome` | `schedulingReason` | Generation | C | T | R | C+T+R | Duration |
|---|-----------------|-----------|--------------------|------------|---|---|---|-------|----------|
| 1 | `2026-08-07T02:29:48.504734Z` | `success` | `design-write` | 1276 | 18 | 1121 | 0 | **1139** | 31401 ms |
| 2 | `2026-08-07T02:31:49.262265Z` | `deferred-wake-published` | `deferred-wake` | 1311 | 18 | 1121 | 0 | **1139** | 120330 ms |
| 3 | `2026-08-07T02:34:35.857096Z` | `success` | `design-write` | 1329 | 18 | 1121 | 19 | **1158** | 42937 ms |

### Spacing between successful publications

| Interval | Spacing |
|----------|---------|
| Pub 1 → Pub 2 | **~120.8 s** (~min-interval floor) |
| Pub 2 → Pub 3 | **~166.6 s** |

### Scheduling / guard outcomes (portal-catalog, same window)

| Outcome | Count |
|---------|------:|
| `claimed-debounce-waiter` | **2** |
| `joined-existing-debounce-window` | **88** |
| `deferred-wake-requested` | **2** |
| `deferred-wake-claimed` | **2** |
| W2 publications (`deferred-wake-published`) | **1** |
| `deferred-not-yet-eligible` / not-yet-eligible deferrals | **0** |
| Lease-busy / contention | **0** |
| Failed publications | **0** |

### Total publication reads (C+T+R)

| Metric | Value |
|--------|------:|
| Sum C+T+R (3 full pubs) | **3,436** |
| Prior attribution (25 pubs) | **~28,710** |
| Ratio vs prior | **~12.0%** (~88% reduction) |

### Spike ↔ publication alignment

Largest owner-visible Console ~2-minute spike ≈ **1.5K** reads. Each full publication’s C+T+R is **~1,139–1,158**, which lines up with that spike magnitude. The three success timestamps (~02:29:48, ~02:31:49, ~02:34:35) explain **spread** spikes across the session rather than one burst — rate guard is working; publications are not eliminated (by design: eventual search correctness).

### Rate-guard live target verdict

Criteria from owner CONTINUE WORKFLOW:

- Successful publications **≤ 6** → **3 ≤ 6** ✓  
- Full-publication C+T+R substantially below prior **~28.7K** → **3,436** ✓  

**P4 rate-guard portion of QA: functionally PASSING.**

Overall Amendment 9 P4 QA remains **FAIL** because of Portal ordering (product criterion / ordinary-browse regression concern).

---

## B. Ordering FAIL — disposition pointer

Full surface-by-surface source/order investigation:

`docs/workflow/reviews/2026-08-06-amendment-9-p4-portal-ordering-investigation.md`

Linked corrective Plan (not silent P4 scope expansion):

`docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md`

Formal Review of that Plan:

`docs/workflow/reviews/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-review.md`

---

## Explicit non-actions this pass

- No implementation
- No Functions / Rules / Hosting deploy
- No PR #40 merge
- No production action
- No Stage 1b / P3
- No P4 Signoff
