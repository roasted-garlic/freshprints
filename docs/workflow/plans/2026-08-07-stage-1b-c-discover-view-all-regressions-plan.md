# Plan: Stage 1b-C Discover View All regressions (Popular blank + category order)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Author | Planning Agent |
| Status | signed_off (approved_with_notes) |
| Workflow | managed-phase (corrective) |
| Managed goal | `post-launch-catalog-and-processing-stability` |

---

## Goal

1. Popular → View All shows ready designs with **requestCount** ranking (not blank).
2. Category → View All uses Portal **ready-order** key (`readyAtMs ?? createdAtMs`), including legacy docs missing `readyAt`.
3. Do not regress New This Week / metric semantics / Algolia.

---

## Investigation (completed)

### A — Popular View All blank

| Surface | Data path |
|---------|-----------|
| Home Popular rail | `listHomeDiscoveryPool` merges readyAt/requestCount/… pools → client `rankPopular` (missing `requestCount` → **0**) |
| Popular View All | `/catalog?discover=popular` → `sortField: 'requestCount'` → Firestore `orderBy(requestCount)` |

**Root cause:** Firestore `orderBy(requestCount)` **silently omits** documents missing the field. `requestCount` is only written when a design is added to a print request. If few/no designs have the field, View All returns **empty** while the Home rail still ranks the readyAt-fetched pool client-side.

**Not** URL/discovery parsing — `discover=popular` is plumbed correctly.

### B — Category View All order

| Surface | Order |
|---------|-------|
| Home category rail | `rankNewestStudioFirst` (**createdAt**) — by design for rails |
| Category View All | default browse `sortField: 'readyAt'` |

**Root cause (proven in code):** `listReadyDesignsPage` completeness guard: when `orderBy(readyAt)` returns fewer docs than `countReadyDesigns` (legacy missing `readyAt`), it **re-queries with `orderBy(createdAt)`** — losing the documented ready-order key (`readyAtMs ?? createdAtMs`). Newly approved/new-import designs can still appear first under `createdAt`, while the rest look “wrong” vs ready-order.

Index `categoryId + status + readyAt` exists — not a missing-index blank. New This Week (`readyAfterMs`) already refuses this demotion.

### Shared?

**Related pattern** (Firestore orderBy omitting missing fields / completeness demotion), **different sort fields**. Fix both in `catalogService` list path.

---

## Approach

1. Extract client sort helper using `getDesignSortValue` (already exists).
2. **Metric sorts** (`requestCount`, `favoriteCount`, `lastAddedToShowAt`): if first page empty or incomplete vs count, fetch complete membership via `createdAt` (same filters), client-sort by metric, return paged slice. Preserve metric semantics (not readyAt).
3. **readyAt completeness** (non–New This Week): instead of demoting to createdAt **order**, fetch via `createdAt` then client-sort by ready-order key (`readyAtMs ?? createdAtMs`).
4. Discriminating tests for Popular empty→populated metric order; category incomplete readyAt → ready-order key; New This Week unchanged.
5. No migration/backfill; no index deploy unless proven required (not expected).

---

## Scope

In: `catalogService.ts` (+ tests), possibly tiny hook docs comments.  
Out: Algolia, publisher, Stage 4/5/6, production, PR merge, New This Week behavior change.

---

## Test / QA

Automated as above + Portal tsc/lint/diff-check.  
Owner re-QA: Popular View All; Funny & Sarcastic View All; one other category; New This Week View All.
