# Portal ↔ Studio catalog ordering investigation (post–P4 QA FAIL)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Trigger | Owner QA FAIL on Amendment 9 P4 — Portal ordering ≠ Studio |
| Method | Read-only source proof + Cloud Logging context; **no live browser reproduction in this pass** |
| P4 code touch of Portal apps? | **No** — `9fe6430` changed Functions/docs only |

---

## Previously signed-off intended behavior

From `docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-signoff.md` (`42f7b20`):

| Surface | Intended order |
|---------|----------------|
| Studio ready Design Library | `readyAt desc` + `__name__` tie-breaker |
| Portal ordinary / default ready browse | Firestore `readyAt desc` |
| Portal category browse | Firestore `readyAt desc` |
| Portal single-tag browse | Firestore `readyAt desc` |
| Completeness / index fallback | Must not silently leave normal complete catalogs on wrong product order |
| Generated search / multi-tag publisher ID order | Historically noted as deferred `createdAt` (see below — **code has since moved**) |

---

## Surface matrix (current code)

| # | Surface | Actual source | Server / asset order | Client re-sort? | Notes |
|---|---------|---------------|----------------------|-----------------|-------|
| 1 | Default Library (no search, no category, no tags, no `discover`) | **Firestore** via `listReadyDesignsPageWithSortFallback` | `orderBy(readyAt,'desc')` + `orderBy('__name__','desc')` | Filters only (preserve order) | Default `sortField` = `readyAt` |
| 2 | Category browse | **Firestore** (same path) | `readyAt desc` + category filter | Category filter preserve | Same completeness/index fallbacks |
| 3 | Single-tag browse | **Firestore** (same path) | `readyAt desc` + `array-contains` tag | Tag filter preserve | Same |
| 4 | Text search | **Generated** `portalCatalogAssetService.listMatchingDesigns` | ID lists from `portalCatalogBrowseOrder` → `readyAtMs ?? createdAtMs` | Intersection preserves relative ID-list order; `loadCards` preserves requested ID order | Not ordinary Firestore browse |
| 5 | Multi-tag AND | **Generated** (same) | Same browse-order ID lists ∩ | Same | Same |
| 6 | Discover mode `?discover=new` | **Firestore** | **`createdAt`** (intentional discovery mode) | No | **Not** “most recently approved” |
| 7 | Home / Discover rails | **Firestore** pools (`listHomeDiscoveryPool`) | Mixed: readyAt + requestCount + favoriteCount + lastAddedToShowAt | Map merge — **not** global readyAt Library order | Not ordinary Library |

### Fallback paths that can change ordinary browse order

1. **Completeness guard** (`catalogService.listReadyDesignsPage`): if `sortField === 'readyAt'` and first page has `!hasMore` and `countReadyDesigns > page.designs.length`, **re-query with `createdAt`**. Same pattern exists in Studio `designService`.
2. **Index-not-ready fallback** (`listReadyDesignsPageWithSortFallback`): on missing composite index for `readyAt`, falls back to `createdAt` (then `updatedAt`).

### Generated-path nuance (stale signoff note)

- Signoff still says generated search publisher order remained `createdAt` and was deferred.
- Current publisher uses `resolveCardReadyOrderMillis` = `readyAtMs ?? createdAtMs` for tag/search/category **ID lists**.
- Unit tests for `portalCatalogBrowseOrder` still describe **createdAt-only** scenarios (no `readyAtMs` differentiation assertions).
- During this QA window, two of three full pubs logged **`readyDesignsRead: 0`**, then one with **`R: 19`**. Empty/partial ready sets in published assets can make generated surfaces look “wrong” relative to Studio Firestore until a later pub with ready cards lands.

---

## Working classification (updated 2026-08-06 — owner surface confirm)

| Case | Verdict |
|------|---------|
| **A** ordinary Firestore Library | **Not assumed.** Owner did not report ordinary Library FAIL. |
| **B** generated search / multi-tag | **Out.** Owner said those behaved correctly; New This Week is Firestore. |
| **C** completeness/index on ordinary browse | **Not the observed FAIL.** |
| **D** Discover / Home “new” | **CONFIRMED.** Fail surface = **Portal → Discover → New This Week**. Product decision: membership + order = **`readyAt`**, not `createdAt`. Home “New This Week” rail is the same concept → **in corrective scope**. |

Amended Plan + Formal Review **approved**:
`docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md`
`docs/workflow/reviews/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-review.md`

---

## Earlier Case matrix (superseded for Implement scope)

| Case | Meaning | Prior working note |
|------|---------|---------------------|
| **A** — ordinary Firestore browse wrong | … | Do not Implement under that assumption |
| **B** — only generated search / multi-tag wrong | … | Do not default to B |
| **C** — fallback activating | … | Not the owner-confirmed surface |
| **D** — other source/order mismatch | Discover=`new`, Home rails | **Now primary** |

---

## Discover → New This Week (confirmed source proof)

| Item | Value |
|------|-------|
| Source | Firestore (`useCatalogDesigns` + `listReadyDesignsPageWithSortFallback`) |
| Membership | **`createdAt >= now - 7d`** (`createdAfterMs`) |
| Ordering | **`createdAt desc`** + `__name__ desc` |
| Both need correction? | **Yes** |

## Home “New This Week” rail

| Item | Value |
|------|-------|
| Pool | Firestore `listHomeDiscoveryPool` |
| Rank | `rankNewThisWeek` → **`createdAtMs`** membership + order |
| In scope? | **Yes** (same product label/concept) |

---

## Scope gate vs P4

P4 Plan **explicitly excluded Portal feature changes**. Commit `9fe6430` did not modify `apps/portal/**`.

Therefore:

- **Do not** fix ordering under existing P4 Implement authorization.
- **Do not** treat this FAIL as proof that the rate guard failed (rate guard **PASSING** — see attribution doc).
- **Do** use a **linked corrective Plan** + Independent Formal Review before any Portal ordering code change.
- P4 Signoff remains blocked until ordering disposition is accepted (fix via corrective plan **or** explicit owner note that ordering is out-of-band and P4 may Signoff with notes — **not decided here**).

---

## Proposed narrow correction scope (for linked Plan)

1. Owner confirms exact Portal URL/surface (ordinary vs Discover vs search/multi-tag).  
2. If ordinary Firestore + fallback: add visible/traceable fallback telemetry; ensure `readyAt` completeness does not demote complete catalogs; backfill/repair missing `readyAt` if present; align Portal/Studio completeness behavior.  
3. If generated-only: update deferred notes/tests; fix publisher/card `readyAtMs` emission only as needed — attach to generated-search replacement or a tiny ordering patch Plan, not P4.  
4. If Discover/Home confusion: docs/UI copy only — no catalog query change.  
5. No Stage 1b, no P3, no production, no PR merge under this investigation pass.
