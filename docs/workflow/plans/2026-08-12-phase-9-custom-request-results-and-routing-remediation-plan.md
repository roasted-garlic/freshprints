# Plan: Phase 9 Custom Request results/routing remediation + Portal Discover catalog correctness

| Field | Value |
|-------|-------|
| Date | 2026-08-12 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `phase-9-custom-request-results-and-routing-remediation` |
| Predecessor FAIL | `docs/workflow/reviews/2026-07-14-phase-9-custom-request-results-ux-qa-fail-checkpoint.md` |
| Prior plan (superseded) | Transcript-restored Jul 14 remediation plan (not present on starting SHA; product direction retained below) |
| Prior review (binding changes) | Jul 14 Formal Review **approved_with_changes** (binding constraints retained in Workstream A) |
| Related Formal Review | `docs/workflow/reviews/2026-08-12-phase-9-custom-request-results-and-routing-remediation-review.md` |
| Starting branch / SHA | `production` / `76205da8eeab43c545112f7399522e6b4106a03e` |

---

## Goal

Complete the Phase 9 Custom Request **results UX / lifecycle / Etsy→Print / Assisted Creation** remediation already approved in product direction, **and** fix Portal Discover/catalog correctness defects found in production/manual QA:

1. Discover category rails under-representing true ready category membership.
2. Curated Discover modes (especially Recently Requested) showing inflated badge counts and false **Load more** because list membership and aggregate count disagree.

No implementation in this Plan/Review step. Development-first after approval. No production deploy in this goal without a later explicit human checkpoint.

---

## Background

### Workstream A — Phase 9 remediation (retained)

Owner FAIL (2026-07-14) against Phase 9 recommendation-engine QA: routing works; results experience and lifecycle clarity do not. Prior Formal Review was **approved_with_changes**. This revision does **not** reopen that product direction; it keeps it and adds Discover remediation in the same Portal cycle.

**Handoff note:** `references/project-chatgpt-handoff/CURRENT-STATE.md` **is present** on this checkout but previously tracked Studio 1.0.4 Mac smoke — parked in Decision Log / handoff update for this goal switch. Earlier handoff gaps do not block planning.

### Workstream B — Discover/catalog correctness (new)

Production QA:

- Discover “Patriotic & Americana” rail showed **3** designs while View All showed **10** ready designs for that category.
- Recently Requested showed badge like **“366 designs”** with **2** cards and **Load more** still visible.

---

## Branch / source gate (critical)

On starting SHA `76205da8eeab43c545112f7399522e6b4106a03e` (`production`):

| Expected Phase 9 slice-1 surface | Status on starting SHA |
|----------------------------------|------------------------|
| `apps/portal/features/custom-requests/**` | **Absent** |
| `functions/src/closeCustomRequest.ts` (and related custom-request callables) | **Absent** |
| `packages/shared/src/utils/customRequestRecommendation*` | **Absent** |
| Current Portal substitutes on tree | `apps/portal/features/etsy-recommendations/**`, `apps/portal/features/assisted-creation/**` |

**Implement must not invent a second Custom Request stack.** Before coding Workstream A:

1. Recover the slice-1 Custom Request tree from the checkout/branch where it was developed, **or**
2. Owner decides explicit remount of the same product requirements onto current `etsy-recommendations` + `assisted-creation` surfaces.

Until that gate clears, Workstream B (Discover) may still proceed on this SHA after Formal Review approval, but Workstream A coding is blocked on the source-recovery decision.

---

## Scope

### In Scope

**Workstream A — Phase 9 (retained)**

1. Modern custom-request result dashboard.
2. Clear one-open-request lifecycle notice.
3. “Mark as satisfied” for all intended open statuses, not only `etsy_referred`.
4. Request history in drawer/sheet (not main results feed).
5. Etsy purchase routing through existing `/requests/artwork` customer upload flow.
6. Do **not** create a new artwork upload pipeline.
7. Broaden applicable AI recommendation rules as already planned.
8. Preserve enum value `human_creation`.
9. Customer-facing/UI wording: **Fresh Prints Assisted Creation**.
10. No Gemini / credits / payments / proofing work.

Binding Jul 14 **approved_with_changes** constraints (still required):

1. Etsy `not_found` recomputes AI vs Assisted; distinct transition reason; never drop prior Etsy from `transitionHistory`.
2. Satisfied close allow-list = OPEN statuses **including `reviewing`** + `etsy_referred`; reject terminal `completed` / `cancelled` / `rejected` / `archived`.
3. History default = **drawer/sheet** (Current Request pattern); dedicated route only if drawer fails mobile.
4. `etsy_referred` UI still shows purchase/upload/satisfied CTAs.
5. Do not break existing reference upload path while redesigning results.
6. Etsy pricing copy = shared constant (not Firestore settings).

**Workstream B — Portal Discover/catalog**

- Discover category rail completeness via bounded post-selection hydration.
- Curated discovery membership consistency (list / count / badge / pagination / `hasMore`).
- Focused regression tests + Firestore-read impact documentation.
- Preserve ready-only visibility, rail limits, popularity/selection semantics, no full-catalog client hydration, no listeners, no Algolia-for-Home unless separately approved.

### Out of Scope

- Studio feature work beyond Assisted Creation **label** updates required by Workstream A
- Studio 1.0.4 release/package/smoke/publish work (parked separately)
- Production release draft mutation
- Customer-upload pipeline replacement; new Etsy upload pipeline
- Gemini, credits, payments, proofs
- Native mobile app
- General catalog redesign; new discovery sections; arbitrary ranking changes
- Algolia index mutation
- Production App Hosting / Firebase deploy; domain cutover
- Unrelated Firestore optimization
- Migrations unless unavoidable and surfaced as human checkpoint
- Fixing category rails solely by increasing `HOME_DISCOVERY_POOL_PAGE_SIZE`

---

## Workstream A — retained approach (summary)

Sequence after source-recovery gate:

1. Shared copy constants + Assisted Creation label renames (`human_creation` enum retained).
2. Recommendation util rebalance + unit tests.
3. Extend close callable for open-status satisfied + metadata (`closedBy`, `closureReason`, `closedAt`).
4. Amend Etsy `not_found` recompute with history preservation.
5. Rebuild result dashboard IA + CSS.
6. History drawer/sheet; remove inline full history from main result.
7. Etsy purchase → existing `/requests/artwork` bridge (no auto-close).
8. Studio display labels only as needed.
9. Docs: ADR-FP-087 amend, DATA_MODEL closure fields, ROADMAP backlog notes.
10. Dev Functions deploy only after human OK.

### Phase 9 files (from Jul 14 inventory — verify before edit)

| Path | Note |
|------|------|
| `apps/portal/app/(app)/custom-request/page.tsx` | [NEEDS REPO CHECK] absent on starting SHA |
| `apps/portal/features/custom-requests/**` | [NEEDS REPO CHECK] absent on starting SHA |
| `apps/portal/styles/custom-requests.css` | [NEEDS REPO CHECK] |
| `apps/portal/features/print-requests/utils/catalogSelectionNavigation.ts` | Present — reuse for artwork href |
| `apps/portal/app/(app)/requests/artwork/page.tsx` | Present — reuse |
| `packages/shared/src/utils/customRequestRecommendation*` | [NEEDS REPO CHECK] |
| `packages/shared/src/types/customRequest/**` | [NEEDS REPO CHECK] |
| `functions/src/closeCustomRequest.ts`, `resolveCustomRequestEtsy.ts`, related | [NEEDS REPO CHECK] |
| `apps/studio/.../features/custom-requests/**` | [NEEDS REPO CHECK] |
| Possible remount surfaces if owner chooses | `apps/portal/features/etsy-recommendations/**`, `apps/portal/features/assisted-creation/**` |

---

## Workstream B — proven diagnoses (this SHA)

### Goal A — Category rails (proven)

**Path:** `CatalogHomePageContent.tsx` → `useCatalogHomeDesigns()` → `catalogService.listHomeDiscoveryPool()` → `selectTopPopularCategoryRails(designs, categories)`.

**Constants (source):**

- `HOME_DISCOVERY_POOL_PAGE_SIZE = 80`
- `CATALOG_DISCOVERY_RAIL_LIMIT = 25`
- `CATALOG_POPULAR_CATEGORY_RAIL_LIMIT = 3`
- `CATALOG_POPULAR_CATEGORY_MIN_DESIGNS = 3`

**Root cause:** `selectTopPopularCategoryRails` buckets **only** designs present in the bounded Home discovery pool, then `takeCatalogDiscoveryRail(..., 25)`. A category can qualify (≥3 pool hits) while the rail shows a pool subset (e.g. 3) even when View All / category membership has more ready designs (e.g. 10). Raising pool size increases reads and still does not guarantee per-category completeness.

**Required behavior:** After a category is selected for a rail, hydrate rail designs via the existing bounded category list path so the rail can show `min(actual ready category membership, CATALOG_DISCOVERY_RAIL_LIMIT)`.

**Proposed strategy:**

1. Keep existing selection/popularity semantics on the Home pool (do not change max rails / min designs / popularity sort unless product revises).
2. For each selected `categoryId` (≤3), fetch a bounded page with `categoryId` + `limitCount: CATALOG_DISCOVERY_RAIL_LIMIT` via `listReadyDesignsPageWithSortFallback` (same membership contract as View All / ready-only).
3. Replace rail `designs` with that page (Studio-newest / existing category ordering via current list sort for category browse — today rails use `rankNewestStudioFirst` on the pool bucket; hydration should preserve that ordering contract by sorting the category page the same way or requesting the matching sort).
4. Reuse `catalogPageCache` / `createBoundedAsyncCache` + in-flight dedupe; do not add listeners; do not hydrate full catalog; do not add Algolia to Discover Home for this fix.

#### Firestore cost — worst-case **additional** cold Discover load (after selection)

| Item | Bound |
|------|-------|
| Max additional queries | **3** (one per selected category rail; `CATALOG_POPULAR_CATEGORY_RAIL_LIMIT`) |
| Max additional design docs read | **3 × (25 + 1) = 78** if each query uses `limit(pageSize + 1)` probe |
| Aggregates for rails | **0** required for rail cards (optional count not needed for carousel) |
| Cache / dedupe | Reuse `catalogPageCache` keyed by serialized `CatalogDesignListQuery` (categoryId, sortField, limitCount, …); `createBoundedAsyncCache` already coalesces in-flight `get(key)` |
| Listeners | None |
| Algolia | Not introduced |

Baseline Home pool cost already exists (`listHomeDiscoveryPool` multi-sort merge + possible fill + `countReadyDesigns({})` for ready-library placeholder). This plan documents **added** cost only.

### Goal B — Curated count / hasMore (proven)

**Path:** `CatalogPageContent.tsx` → `useCatalogDesigns()` → `buildServerListQuery()` → `listReadyDesignsPageWithSortFallback()` + `countReadyDesigns()` → `reconcilePagingWithAggregateCount()` → `hasMore` → Load more UI.

**Recently Requested — proven mismatch:**

1. List sorts by `lastAddedToShowAt` → Firestore omits docs missing the field → list ≈ eligible membership.
2. `buildDesignFilterConstraints` / `countReadyDesigns` only apply `status==ready` (+ category/tag/`readyAfterMs`) — **no** `lastAddedToShowAt` eligibility.
3. Aggregate therefore counts the **entire ready library**.
4. `reconcilePagingWithAggregateCount`: when `aggregateTotal > loadedCount` and list reports complete → forces `hasMore: true` and synthesizes a cursor.
5. UI shows **Load more** and an inflated badge despite no further eligible designs.

**Do not** fix with presentation-only rules like `displayedDesigns.length < pageSize`.

#### Mode audit (this SHA vs shared `catalogDiscoveryRanking.ts`)

| Mode | Shared eligibility | List query | Count today | Verdict |
|------|-------------------|------------|-------------|---------|
| New This Week | `readyAt` within 7-day window | `readyAfterMs` + `orderBy readyAt` | Same `readyAfterMs` filter | **Aligned** — do not regress |
| Popular | All ready, `requestCount` desc | `orderBy requestCount` | All ready | **Aligned** |
| Most Liked | `favoriteCount > 0` | `orderBy favoriteCount` (includes zeros) | All ready (no `> 0`) | **Inconsistent** — correct count (+ list/repair membership) to `favoriteCount > 0` |
| Recently Requested | `lastAddedToShowAt` present | `orderBy lastAddedToShowAt` (field required) | All ready | **Inconsistent** — proven production bug |

If product ADRs disagree with shared eligibility, **STOP** for human decision — do not silently redefine.

**Correction approach:**

- Extend filter/count constraints (or dedicated metric eligibility helpers used by both list and count) so membership, list, aggregate, badge, pagination, and `hasMore` agree per mode.
- Likely Firestore inequalities:
  - Recently Requested: constrain on `lastAddedToShowAt` existence/range consistent with list.
  - Most Liked: `favoriteCount > 0` (or equivalent) on both list and count.
- Document any new composite indexes in the deployment matrix; do **not** deploy indexes/rules in Plan/Review.

---

## Combined acceptance criteria

### Workstream A (retain prior)

Matches Jul 14 owner checklist: modern results; lifecycle notice + satisfied/cancel; history off main page; Etsy→existing upload; AI broadened; Assisted naming; enum `human_creation` retained; no Gemini/credits/payment/proofs; tests + manual QA; no production deploy without later checkpoint.

### Workstream B (new)

1. Selected Discover category with 10 ready designs can provide all 10 to its carousel.
2. Category with >25 ready designs returns ≤ `CATALOG_DISCOVERY_RAIL_LIMIT` (25).
3. Category rail membership no longer limited to Home-pool coincidence.
4. Category-rail selection/popularity behavior intact unless explicitly revised.
5. No full-catalog hydration.
6. Additional Discover Firestore cost bounded and documented (≤3 queries / ≤78 docs cold).
7. Recently Requested list/count/badge/pagination membership agree.
8. Exactly 2 eligible Recently Requested → badge “2 designs”, 2 cards, `hasMore=false`, no Load more.
9. Multi-page Recently Requested exposes Load more only while another eligible page exists.
10. Most Liked audited and corrected if inconsistent with shared `favoriteCount > 0`.
11. Popular remains all-ready by `requestCount`.
12. New This Week `readyAt` semantics do not regress.
13–18. Ordinary category View All, search, tags, halftone filter, censored filter, managed Algolia pagination do not regress.
19. Portal print-request selection/add-to-request does not regress.
20–23. Portal typecheck, relevant lint, focused tests, `git diff --check` pass.

---

## Affected Areas

### Files / Modules — Discover (verified on starting SHA)

- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- `apps/portal/features/catalog/components/CatalogDiscoveryCarousel.tsx` (consume only unless props change)
- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` (`reconcilePagingWithAggregateCount`, `buildServerListQuery`, home hook)
- `apps/portal/features/catalog/pages/CatalogPageContent.tsx` (badge / Load more consumers)
- `apps/portal/features/catalog/services/catalogService.ts` (`buildDesignFilterConstraints`, `countReadyDesigns`, `listHomeDiscoveryPool`, page cache)
- `apps/portal/features/catalog/types/catalog.types.ts` (only if query fields needed)
- `packages/shared/src/utils/catalogDiscoveryRanking.ts` (selection helpers only if needed; do not silently change product defs)
- `packages/shared/src/utils/boundedAsyncCache.ts` (reuse; prefer no change)

### Architecture / Security / Data / Backend / UI

| Area | Impact |
|------|--------|
| Architecture | Portal catalog service/hooks only for B; A stays feature-folder + shared recommendation + Functions ownership |
| Security | No rule broaden planned; ready-only customer visibility preserved; no Algolia/Home secrets |
| Data model | A: optional closure fields on custom requests; B: no schema change expected — index additions possible |
| Backend | A: close/resolve callables; B: client Firestore queries/indexes only unless rules gap found |
| UI/UX | A: results dashboard + drawer; B: truthful badges/Load more + fuller category rails — manual QA |
| Migration | None expected; indexes additive |

---

## Approach (implementation sequence — after Formal Review + owner approval)

1. Clear Phase 9 source-recovery / remount human gate (Workstream A).
2. Workstream B Goal B first (count/membership/`hasMore`) — highest customer-facing correctness, shared by View All modes.
3. Workstream B Goal A (post-selection category rail hydration + cache keys).
4. Workstream A Phase 9 remediation per retained sequence.
5. Focused tests + Portal typecheck/lint + `git diff --check`.
6. Local Portal validation; DEV Firebase/Algolia only if remote DEV needed; never production Algolia for this work.
7. Manual QA checkpoints (Phase 9 results + Discover rails/counts).
8. Signoff; production deploy remains a **later** explicit checkpoint.

---

## Test Strategy

### Automated (required / preferred)

| Check | Command / target | Required |
|-------|------------------|----------|
| Discover ranking / rail helpers | `npx tsx --test packages/shared/src/utils/catalogDiscoveryRanking.test.ts` | yes |
| Home pool | `apps/portal/features/catalog/services/catalogService.homeDiscoveryPool.test.ts` | yes |
| Discover View All repair | `catalogService.discoverViewAllRepair.test.ts` | yes |
| Hook paging / NTW query | `useCatalogDesigns.test.ts` | yes |
| ReadyAt / NTW count order | `catalogService.readyAtOrdering.test.ts`, `catalogService.ntwCountOrder.test.ts` | yes |
| New focused tests | Metric eligibility list↔count agreement (recent + mostLiked); category rail hydration bound (10 vs 25); reconcile no false hasMore when aggregate matches eligible membership | yes |
| Phase 9 recommendation / close tests | Restore with Workstream A source | yes when A active |
| Portal typecheck | portal `tsc --noEmit` / workspace script | yes |
| Relevant lint | scoped portal/shared lint | yes |
| `git diff --check` | yes | yes |
| Functions build | when A callables change | yes for A |

### Manual

- Phase 9 results/lifecycle/Etsy→artwork/Assisted wording (from FAIL checkpoint themes).
- Discover: category rail vs View All membership; Recently Requested 2-eligible case; multi-page Load more; Most Liked / Popular / NTW spot checks.

---

## Deployment / index / rules matrix

| Artifact | Needed? | When | Deploy in this Plan/Review? |
|----------|---------|------|-----------------------------|
| Firestore composite indexes for metric eligibility counts/lists | **Likely** for `favoriteCount > 0` and/or `lastAddedToShowAt` count alignment — [NEEDS REPO CHECK] against `firestore.indexes.json` during implement | Before DEV validation of Goal B | **No** |
| Firestore Rules | Not expected | Only if gap found → human checkpoint | **No** |
| Cloud Functions (close/resolve/recommendation) | Workstream A only | DEV after human OK | **No** (Plan/Review) |
| App Hosting / production Firebase | Out of scope | Later explicit checkpoint | **No** |
| Algolia index mutation | Out of scope | — | **No** |
| Studio release drafts | Out of scope (parked) | — | **No** |

---

## Human Checkpoints Anticipated

1. **This Formal Review** — owner APPROVE / APPROVE WITH NOTES / REVISE PLAN (stop; no implement until then).
2. **Phase 9 source recovery vs remount** onto etsy/assisted surfaces — required before Workstream A code.
3. Dev Functions deploy (A).
4. Firestore index deploy to DEV if required (B).
5. Portal manual QA (A + B).
6. Production infrastructure — **not authorized** in this goal.
7. Studio 1.0.4 smoke/publish — **separate parked goal**; do not mutate in this cycle.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Phase 9 source missing on branch | Explicit gate; no invented second stack |
| Extra Discover reads | Cap at 3 category queries / ≤78 docs; reuse cache |
| Index missing → query fail | Matrix + DEV deploy before claiming B fixed |
| Over-filtering Most Liked / Recent | Match shared ranking eligibility; unit tests |
| Scope creep into Algolia/Home redesign | Hard out of scope |
| Studio release interference | Forbidden; parked in Decision Log |

Rollback: revert Portal commits; redeploy prior Functions; indexes additive/harmless if left.

---

## Open questions

1. Phase 9: recover `custom-requests` tree vs remount onto `etsy-recommendations` + `assisted-creation`? **Blocking for Workstream A implement.**
2. Category rail hydration sort: confirm Studio-newest (`rankNewestStudioFirst` / `createdAt`) remains authoritative for category rails after hydration (default: yes).

---

## FreshForge

Plan → Review → Implement → Test → Signoff.

**STOP after Formal Review.** Do not implement, deploy, or open/merge a PR from this step.
