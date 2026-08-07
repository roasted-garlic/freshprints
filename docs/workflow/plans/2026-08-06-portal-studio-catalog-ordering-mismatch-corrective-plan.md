# Plan: Portal Discover “New This Week” → `readyAt` (corrective)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Author | Planning Agent |
| Status | implemented (Impl Review APPROVED; awaiting owner Manual QA) |
| Workflow | managed-phase (linked corrective; **not** P4 Implement scope) |
| Supersedes (classification) | Prior draft assumed ordinary Library / Case C; **owner surface confirm = Case D** |
| Related | `docs/workflow/reviews/2026-08-06-amendment-9-p4-owner-qa-fail-attribution.md`, `docs/workflow/reviews/2026-08-06-amendment-9-p4-portal-ordering-investigation.md`, prior signoff `docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-signoff.md` |

---

## Goal

Make customer-facing **Discover → New This Week** (and the Home rail with the same label/concept) mean **newly approved / newly ready for customers**: membership and ordering both use authoritative **`readyAt`**, newest first, with the existing stable document-ID tie-breaker — without changing ordinary Library defaults or metric Discover rails, and without touching Amendment 9 P4.

---

## Owner surface confirmation (R1 closed)

| Field | Value |
|-------|-------|
| Observed FAIL surface | **Portal → Discover → New This Week** (`/catalog?discover=new`) |
| Ordinary Library broken? | **Do not assume** — not in scope unless a separate defect is proven later |
| Product decision | “New” = most recently made available to customers (`readyAt`), not import/`createdAt`. A design imported earlier and approved today **must** appear in New This Week today |

---

## Investigation (source proof) — amend inputs

### 1. Discover → New This Week (Library View All / filtered grid)

| Item | Current |
|------|---------|
| Source | **Firestore** via `useCatalogDesigns` → `catalogService.listReadyDesignsPageWithSortFallback` (**not** generated assets) |
| Eligibility window | `CATALOG_NEW_THIS_WEEK_DAYS` (7) → `createdAfterMs = now - 7d` |
| Membership predicate | `where('createdAt', '>=', Timestamp.fromMillis(createdAfterMs))` — **only when `sortField === 'createdAt'`** (`buildDesignFilterConstraints`) |
| Ordering | `sortFieldForDiscovery('new')` → **`createdAt`**, then `orderBy(createdAt,'desc')` + `orderBy('__name__','desc')` |
| Generated? | No |

**Both membership and ordering use `createdAt` today → both must change.**

Proof paths:

- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` — `sortFieldForDiscovery` / `buildServerListQuery`
- `apps/portal/features/catalog/services/catalogService.ts` — `buildDesignFilterConstraints` (`createdAt` range)
- `apps/portal/features/catalog/types/catalog.types.ts` — documents Discover new = `createdAt` + `createdAfterMs`

### 2. Home “New This Week” rail

| Item | Current |
|------|---------|
| Pool source | **Firestore** `listHomeDiscoveryPool()` (bounded pages: readyAt / requestCount / favoriteCount / lastAddedToShowAt) |
| Rail ranking | Client `rankCatalogDiscoveryDesigns(designs, 'new')` → **`rankNewThisWeek`** |
| Membership | `createdAtMs >= now - 7d` |
| Ordering | `createdAtMs` desc, then `id` asc (`compareById`) |
| Same product concept? | **Yes** — same label (`getCatalogDiscoveryModeLabel('new')` → “New This Week”) and same mode key; View All navigates to `discover=new` |

**Home New This Week is in scope** for consistency. Other Home rails (Popular, Most Liked, Recently Requested, popular category carousels) stay on their existing metric / Studio-newest category behavior.

Proof paths:

- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `packages/shared/src/utils/catalogDiscoveryRanking.ts` — `rankNewThisWeek`

### Classification

**Case D — Discover “new” product semantics**, with an explicit owner product decision to redefine “new” from import-time to **ready-time**. Not Case A ordinary Library; not Case B generated search; not Case C completeness on ordinary browse.

---

## Product contract (acceptance)

For customer-facing **“new”** catalog surfaces:

1. “New” means newly approved / newly ready for customer use.  
2. Use **`readyAt`**, not original import **`createdAt`**.  
3. Newest **`readyAt` first**; stable document-ID tie-breaker where the surface already has one (`__name__ desc` on Firestore; existing id compare on client ranking — keep each surface’s current tie-breaker style unless a shared helper is introduced without behavior churn).  
4. Re-approval follows existing authoritative `readyAt` semantics (same field Studio/Portal ready ordering already use).  
5. Seven-day **membership** is `readyAt >= now - 7 days` (not `createdAt`).  
6. Old import + approval today → **eligible and ordered as new today**.  
7. Metric Discover rails unchanged.  
8. Ordinary Library default browse unchanged unless a separate defect is proven.  
9. Legacy designs missing `readyAt`: use the same key fallback already used for ready ordering (`readyAt ?? createdAt`) **only where a client-side key is needed**; Firestore New This Week range query on `readyAt` naturally omits docs lacking the field. **Do not** reintroduce a `createdAt` week window as the primary membership rule. When `readyAfterMs` is set, **disable** the ordinary completeness fallback that switches the whole query to `createdAt` (that would restore the wrong product meaning).

---

## FreshForge impact classification

| Area | Impact? |
|------|---------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Yes — ARCHITECTURE / DECISIONS / types comments / prior discovery docs notes |
| Application | Yes — Portal hooks/services + shared `rankNewThisWeek` (+ tests) |
| Functions / P4 publisher | **No** unless Implement discovers a genuine generated Discover dependency (none found; Home/Library new are Firestore + client rank) |

---

## Scope

### In Scope (after Formal Review + Implement phrase)

1. Library `discover=new`: membership + sort → `readyAt` (7-day window on `readyAt`).  
2. Shared `rankNewThisWeek` (Home rail): membership + sort → `readyAtMs` (with `createdAtMs` only as legacy key fallback consistent with ready-order semantics).  
3. Query typing: replace Discover-new use of `createdAfterMs` with an explicit **`readyAfterMs`** (or equivalent) so filters cannot silently bind the week window to `createdAt`.  
4. Guardrails: no createdAt completeness/index demotion for New This Week queries.  
5. Tests + doc updates for the product contract.  
6. Manual QA: old-import / approve-today appears in New This Week (Library + Home rail).

### Out of Scope

- Ordinary Library default / category / single-tag ready browse (already `readyAt`)  
- Popular / Most Liked / Recently Requested rails and their counters  
- Popular category Home rails (`rankNewestStudioFirst` / request aggregates) — leave unchanged  
- Amendment 9 P4 rate-guard / publisher (PASSING: 3 pubs, 3,436 C+T+R)  
- Stage 1b, P3, generated-search redesign  
- PR #40 merge, production, Rules (unless unexpected Rules gap — none expected)  
- Index deploy **only if** live query proves missing composite; existing `status + readyAt + __name__` (and category/tag variants) are expected to cover `readyAt >=` + `orderBy readyAt desc` — verify at Test; human checkpoint if a new index is required

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | `new` → `sortField: 'readyAt'`; set `readyAfterMs` (not `createdAfterMs`) |
| `apps/portal/features/catalog/services/catalogService.ts` | Apply `readyAt >= readyAfterMs`; skip createdAt completeness demotion when week window active; comments/trace |
| `apps/portal/features/catalog/types/catalog.types.ts` | Document `readyAfterMs`; update Discover-new comments |
| `packages/shared/src/utils/catalogDiscoveryRanking.ts` | `rankNewThisWeek` on `readyAtMs` (+ legacy fallback); extend `CatalogDiscoveryDesign` |
| `packages/shared/src/utils/catalogDiscoveryRanking.test.ts` | Old-create / new-ready eligibility + order |
| Portal readyAt / discovery unit tests as needed | Hook/query serialization expectations |
| `docs/architecture/ARCHITECTURE.md`, `docs/project/DECISIONS.md` (or ADR note) | Record product contract; supersede “New This Week = createdAt” |

### Architecture / Security / Data / Backend / UI

- Architecture: Discover “new” semantics align with ready-approval time.  
- Security: none (read-path filter/sort).  
- Data model: no new fields; uses existing `readyAt`.  
- Backend: no Functions/P4 changes expected.  
- UI: New This Week Library + Home rail contents/order change to match product decision.  
- Migration: none required for the field; legacy missing `readyAt` handled per product contract above.

---

## Approach

1. Add `readyAfterMs` to Portal list query; wire `discover=new` to `readyAt` + `readyAfterMs`.  
2. Update `buildDesignFilterConstraints` to `where('readyAt','>=',…)`.  
3. When `readyAfterMs` is set: do **not** completeness-fallback to `createdAt`; do **not** map the week window onto `createdAt`.  
4. Update `rankNewThisWeek` + Home rail via shared helper.  
5. Tests: imported 10d ago, `readyAt` today → included and ordered ahead of older approvals.  
6. Docs: ARCHITECTURE / DECISIONS + type comments.  
7. Manual QA checklist (Library `?discover=new` + Home New This Week rail).

---

## Amended acceptance criteria

- [ ] `/catalog?discover=new` is Firestore-backed; membership = `readyAt` within last 7 days; order = `readyAt desc` + `__name__` tie-breaker.  
- [ ] Design with old `createdAt` and `readyAt` today appears in New This Week and ranks by `readyAt`.  
- [ ] Home “New This Week” rail uses the same ready-time membership/order semantics.  
- [ ] Popular / Most Liked / Recently Requested unchanged.  
- [ ] Ordinary Library (no `discover`) unchanged by this Plan’s diff.  
- [ ] No P4 publisher / Stage 1b / P3 / generated-search redesign in the diff.  
- [ ] Automated tests cover membership + ordering for old-import/new-approval.  
- [ ] Manual QA PASS on Library + Home new rails.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared discovery ranking tests | package/shared test for `rankNewThisWeek` | yes |
| Portal catalog / hook tests | existing portal catalog tests + extend | yes |
| Typecheck / build touched packages | project scripts | yes |

### Manual

- [ ] Approve today a design imported &gt;7 days ago → appears in Discover New This Week near the top.  
- [ ] Same design appears on Home New This Week rail (or View All path if pool-cap edge).  
- [ ] Metric rails visually unchanged.  
- [ ] Ordinary Library still `readyAt` (smoke only).

---

## Human Checkpoints Anticipated

- [x] Surface confirmation (done — Discover New This Week)  
- [x] Product decision (done — `readyAt` membership + order)  
- [ ] Manual UI QA after Implement  
- [ ] Firestore index deploy **only if** Test proves a missing composite  
- [ ] Production — none  
- [ ] P4 Signoff — separate; rate-guard remains PASSING; may proceed with notes after this corrective Signoff (owner decides)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Completeness fallback reverts New This Week to `createdAt` | High | Disable that fallback when `readyAfterMs` set |
| Index missing for `readyAt` range | Medium | Verify existing readyAt composites; deploy only if needed |
| Home pool cap misses some week-ready designs | Low (pre-existing) | Full list via View All `discover=new`; document |
| Scope creep into ordinary Library | Medium | Diff review: no default-browse changes |

---

## Rollback Plan

Revert the corrective commit(s) on the feature branch.

---

## Open Questions

None blocking Plan/Review. P4 Signoff timing remains an owner decision after this corrective lands.

---

## Implementation gate

**Do not Implement** until:

1. Independent Formal Review of **this amended Plan** is not `blocked`, and  
2. Owner issues Implement authorization for **this corrective Plan** (not P4 phrase reuse).
