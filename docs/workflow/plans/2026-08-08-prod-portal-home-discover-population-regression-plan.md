# Plan: Production Portal Home/Discover population regression

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | **ready_for_review** |
| Workflow | managed-phase |
| Managed goal | `prod-portal-home-discover-population-regression` |
| Related Formal Review | `docs/workflow/reviews/2026-08-08-prod-portal-home-discover-population-regression-plan-review.md` |
| Production build | `build-2026-08-08-001` @ `1e65a43` |
| Parent promotion | `pr-40-production-promotion` |

---

## Goal

Restore production Home / Discover rails so they show the expected multi-design population
(matching ordinary catalog eligibility), while Algolia remains **OFF** and Stage 4
Firestore-primary architecture is preserved.

---

## Background

After App Hosting rollout `build-2026-08-08-001` (infrastructure **PASS**), owner content QA
found:

- `/catalog` shows the full ready catalog (~many designs)
- Home / Discover (`/`) shows only ~one design image
- Algolia intentionally OFF

HTTP 200 smoke from the rollout record is **insufficient** for this defect.

---

## Proven root cause

### Verdict: **PROVEN** (environment gap + Home pool short-circuit; Algolia unrelated)

**Failing production path**

| Layer | Path |
|-------|------|
| Route | `/` → `apps/portal/app/(app)/page.tsx` |
| UI | `CatalogHomePageContent` |
| Hook | `useCatalogHomeDesigns` |
| Service | `catalogService.listHomeDiscoveryPool()` |
| Queries (parallel) | `listReadyDesignsPage` with `skipClientSortRepair: true` and sortFields: `readyAt`, `requestCount`, `favoriteCount`, `lastAddedToShowAt` (limit 80 each) |

**Working production path**

| Layer | Path |
|-------|------|
| Route | `/catalog` |
| Hook | `useCatalogDesigns` |
| Service | `catalogService.listReadyDesignsPageWithSortFallback(...)` |
| Behavior | On missing `readyAt` index → falls back to `createdAt` order |

### Production evidence (read-only, `fresh-prints-prod`)

| Fact | Value |
|------|-------|
| Ready designs | **46** |
| Ready with `readyAt` field | **0 / 46** |
| Ready with `requestCount` | **1 / 46** |
| Ready with `favoriteCount` | **1 / 46** |
| Ready with `lastAddedToShowAt` | **1 / 46** |
| `orderBy(readyAt)` query | **400** — “The query requires an index” (composite `status`+`readyAt`+`__name__` **absent**; 0 readyAt composites live) |
| `orderBy(createdAt)` query | **46** returned (index READY) |
| Metric `orderBy(requestCount\|favoriteCount\|lastAddedToShowAt)` | **1** each |
| Home pool union of metric paths | **1** design |

### Causal chain

1. Home pool’s preferred `readyAt` query **rejects** (missing composite index).
2. Metric queries **succeed** but Firestore `orderBy(metric)` omits docs missing the field → only **1** ready design qualifies.
3. `listHomeDiscoveryPool` merges results; `byId.size > 0` → **returns early**.
4. It therefore **never** reaches the intended “indexes missing → usable catalog” `createdAt` path (that path only runs when the merged pool is empty / all rejected in a specific way — and the secondary fallback still uses `readyAt` + `skipClientSortRepair`, not `createdAt` via `WithSortFallback`).
5. `/catalog` uses `listReadyDesignsPageWithSortFallback`, which demotes failed `readyAt` sorts to **`createdAt`** → full 46-design browse.

### Index hypothesis classification

| Missing PR #40 `readyAt` composites | Classification |
|-------------------------------------|----------------|
| `status` + `readyAt` + `__name__` | **A. PROVEN ROOT CAUSE (contributing / necessary)** for the preferred Home query failure |
| Index deploy **alone** | **NOT sufficient** — even with the index, `orderBy(readyAt)` returns **0** designs today because **0** ready docs have `readyAt`; Home would still short-circuit on the **1** metric design unless source and/or backfill also land |

### Algolia relationship

| Question | Answer |
|----------|--------|
| Cause? | **NO** — Home pool is Firestore-only; Algolia OFF is unrelated |
| Exposing defect? | **NO** — defect is Firestore index + Home short-circuit |
| Enabling Algolia as fix? | **NO** — would not repair Home/Discover rails; architecture requires Firestore for Home/Discover |

### Stage 4 / generated assets

Home does **not** read `generated/portal-catalog/**`. Stage 4 removal of generated search is **not** this defect’s cause. Catalog works via Firestore `createdAt` fallback.

### CDN 404 noise (owner App Hosting logs)

Invalid paths `/discover`, `/library`, `/Library`, `/browse`, `/categories`, `/catalog/categories` are **not** current Portal routes.

Real routes:

| Surface | URL |
|---------|-----|
| Home / Discover rails | `/` |
| Design Library / Catalog | `/catalog` |
| Category browse | `/catalog?category=<id>` |
| Discover View All modes | `/catalog?discover=new\|popular\|mostLiked\|recent` |

Those 404s match prior agent smoke probes — **probe noise**, not the population defect. No current source links found to those paths.

---

## Scope

### In Scope

1. **Source fix** to `listHomeDiscoveryPool` (and tests): when preferred sorts fail or return a pool that is incomplete relative to ready membership (or when `readyAt` index/path is unavailable), fall through to the same safe path catalog uses (`createdAt` / `WithSortFallback` / membership completeness — without demoting New This Week View All semantics incorrectly).
2. **Deploy missing `readyAt` composites** from `firestore.indexes.json` to `fresh-prints-prod` (required for correct ready-order / New This Week once `readyAt` exists).
3. **Optional follow-up (separate phrase if large):** backfill `readyAt` on ready designs lacking the field (data integrity for New This Week). May be deferred if source fallback restores Home rails using `createdAt` eligibility; still recommended for product correctness of “New This Week”.

### Out of Scope

- Algolia config/enable
- Functions Wave A
- Publisher deletes
- Storage cleanup / Rules deploy (unless Formal Review later couples RC-R4)
- Restoring generated catalog readers
- Changing `/catalog` behavior that already works

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/features/catalog/services/catalogService.ts` (`listHomeDiscoveryPool`)
- Tests under `apps/portal/features/catalog/services/catalogService.*.test.ts`
- `firestore.indexes.json` (deploy existing indexes — no schema invention)
- Docs: rollout record amendment; this plan/review; workflow state

### Architecture Impact

- [x] Details: Preserve Firestore-primary Home/Discover; do not introduce Algolia dependency

### Security Impact

- [x] None

### Data Model Impact

- [x] Details: Optional `readyAt` backfill only (existing field); no new entities

### Backend Impact

- [x] Details: Firestore composite index deploy only (plus optional backfill script/callable later)

### UI / UX Impact

- [x] Details: Home/Discover rails populate; owner content QA required

### Migration Impact

- [x] Forward: index deploy; source fix + Portal App Hosting rollout; optional readyAt backfill
- [x] Rollback: revert App Hosting to prior build; indexes are additive (safe to leave)

---

## Approach

1. Implement Home pool fallback parity with catalog (source) — minimal change to `listHomeDiscoveryPool`.
2. Add/extend unit tests proving: preferred sorts fail or metric-only tiny pool → createdAt/completeness path yields full ready membership (bounded).
3. Deploy the four `readyAt` composites (and any other missing indexes already in `firestore.indexes.json` required by Portal) to `fresh-prints-prod`.
4. App Hosting rollout of the source fix (manual).
5. Owner content QA (not HTTP-only).
6. Optional: schedule `readyAt` backfill under a separate owner phrase.

**Note:** Index-only deploy without source fix will **not** restore Home while metric short-circuit + zero `readyAt` coverage remain.

---

## Acceptance criteria

- [ ] Home `/` shows multiple designs across Discover rails (not ~1)
- [ ] New This Week / Popular / Most Liked / Recently Requested rails populate per eligible data
- [ ] Category rails populate when categories have ready designs
- [ ] `/catalog` remains correct
- [ ] Algolia remains OFF
- [ ] No generated catalog reader restored
- [ ] Automated Portal catalog/home tests pass
- [ ] Production indexes for `readyAt` present (or documented deferral with source fallback covering Home)

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused catalogService / home pool tests | repo `tsx --test` / workspace scripts for Portal catalog tests | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |

### Manual (owner — CONTENT)

See Owner QA below.

---

## Production deployment sequence

1. `APPROVE PROD HOME DISCOVER FIX IMPLEMENT` (source on branch → merge to `production`)
2. `APPROVE PROD INDEXES DEPLOY: PR40 READYAT` (or include in same release gate)
3. `APPROVE APP HOSTING ROLLOUT` (Portal build with Home fix)
4. Owner content QA phrase
5. Optional later: `APPROVE PROD READYAT BACKFILL`

---

## Rollback

- App Hosting: redeploy previous successful build
- Indexes: leave deployed (non-destructive)
- Source: revert merge commit

---

## Human checkpoints

| Phrase | Action |
|--------|--------|
| `APPROVE PROD HOME DISCOVER FIX IMPLEMENT` | Source fix + tests |
| `APPROVE PROD INDEXES DEPLOY: PR40 READYAT` | Deploy readyAt composites |
| `APPROVE APP HOSTING ROLLOUT` | Ship Portal fix |
| Owner content QA | PASS / FAIL |
| Optional `APPROVE PROD READYAT BACKFILL` | Data backfill |

---

## Owner QA (post-fix)

Environment: production Portal `hosted.app` (Algolia OFF).

| # | Check | Expected |
|---|--------|----------|
| 1 | Open `/` | Multiple designs visible on Home rails (not ~1) |
| 2 | New This Week rail | Populates **or** empty only if no designs qualify after readyAt semantics (document) |
| 3 | Popular / Most Liked / Recent rails | Populate where metrics exist; do not collapse whole Home to one tile |
| 4 | Category rail(s) | Populate for categories with ready designs |
| 5 | `/catalog` | Still full browse |
| 6 | Algolia | Remains OFF |
| 7 | No generated dependency | Still no generated fallback for Home |

Reply: `HOME DISCOVER CONTENT QA: PASS` or `FAIL: …`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Home fallback increases reads | Bound by existing `HOME_DISCOVERY_POOL_PAGE_SIZE` / membership cap; mirror catalog |
| Index-only mistaken as complete fix | Plan requires source fix given 0 readyAt coverage |
| New This Week empty until backfill | Document; optional backfill phrase |

---

## Confirmations (this planning pass)

- NO source implementation
- NO index deploy
- NO Rules/Functions/Algolia/Storage/App Hosting mutation
