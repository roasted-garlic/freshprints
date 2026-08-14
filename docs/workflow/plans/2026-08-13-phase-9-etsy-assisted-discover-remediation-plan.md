# Plan: Phase 9 Etsy+Assisted remap + Portal Discover catalog remediation

| Field | Value |
|-------|-------|
| Date | 2026-08-13 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `phase-9-custom-request-results-and-routing-remediation` |
| Supersedes | `docs/workflow/plans/2026-08-12-phase-9-custom-request-results-and-routing-remediation-plan.md` |
| Remount STOP evidence | `docs/workflow/reviews/2026-08-13-phase-9-remount-gate-stop-checkpoint.md` |
| Predecessor FAIL | `docs/workflow/reviews/2026-07-14-phase-9-custom-request-results-ux-qa-fail-checkpoint.md` |
| Related Formal Review | `docs/workflow/reviews/2026-08-13-phase-9-etsy-assisted-discover-remediation-review.md` |
| Authoritative base | `origin/production` @ `975f6400262a86600c4662f39480c6f55e20b0c1` |
| Implementation branch / worktree | `fix/phase9-results-and-discover-remediation` / `C:\coding\fresh-prints-wt-phase9-remediation` |

---

## Goal

Remediate Portal **Help Me Find a Design (Etsy Recommendations)** and **Fresh Prints Assisted Creation** results/lifecycle UX against the **current split products**, and fix Portal Discover category-rail + curated count/`hasMore` correctness — without recreating the obsolete Custom Request monolith.

No application code in this Plan/Review step.

---

## Source-of-truth corrections

1. Authoritative tip: `975f6400262a86600c4662f39480c6f55e20b0c1`.
2. Etsy + Assisted already on production; development feature diff empty — **no further remount**, no development merge, no old Phase 9 cherry-pick.
3. Do **not** plan around: `closeCustomRequest`, `etsy_referred`, `reviewing` (as Etsy status), `human_creation`, unified `transitionHistory`, Etsy `not_found` cross-product recompute, live AI recommendation engine to “broaden”.

---

## Workstream A — architecture summary

| Product | Collection | Statuses | Portal surface |
|---------|------------|----------|----------------|
| Etsy Recommendations (“Help Me Find a Design”) | `etsyRecommendationRequests` | `active` \| `completed` \| `cancelled` | `/custom-designs` choose → questionnaire → `EtsyResultsDashboard` |
| Fresh Prints Assisted Creation | `assistedCreationRequests` | proof-centric open set → `approved` / `rejected` / `cancelled` | Assisted wizard + `AssistedCreationStatusPanel` + Past Requests drawer |

Shared choose-path hub: `EtsyRouteChoosePath` (product cards, Assisted one-open notice, Assisted Past Requests link). Products do **not** share a backend lifecycle.

### Etsy lifecycle (authoritative)

- Submit creates/replaces `active` (confirm replace if another `active` exists).
- Server already provides:
  - `completeEtsyRecommendationRequest` → `active` → `completed` (owner-only)
  - `cancelEtsyRecommendationRequest` → `active` → `cancelled` (owner-only)
- Portal service wrappers exist (`etsyRecommendationService.completeRequest` / `cancelRequest`).
- **Gap:** results UI / wizard do **not** currently expose these actions on the dashboard (no `completeRequest` wiring in `useEtsyRecommendationWizard` / `EtsyResultsDashboard`).

### Proposed Etsy customer completion (preferred — no new status)

| Action | Customer wording | Backend | Semantics |
|--------|------------------|---------|-----------|
| Done / successful close | **Mark as satisfied** | `completeEtsyRecommendationRequest` → `completed` | Customer finished with this search (found / purchased / no longer needs it) |
| Abandon | **Cancel** (quiet footer / confirm) | `cancelEtsyRecommendationRequest` → `cancelled` | Customer abandons without treating it as satisfied |
| Allow-list | — | Only from `active` | Already enforced server-side |

**Complete vs cancel:** Already distinct in Functions. **No blocking owner decision** for semantics. Optional non-blocking: exact CTA label if owner prefers “I’m done” over “Mark as satisfied”.

### Assisted lifecycle handling

- Open: `submitted` \| `in_progress` \| `proof_ready` \| `revision_requested` \| `final_source_needed`
- Terminal success: customer/staff **approve** → `approved` (proof workflow)
- Terminal abandon: **Cancel request** → `cancelled` (already on status panel)
- Old “Mark as satisfied on all open statuses” → **RETIRE for Assisted** — satisfied by approval/terminal proof path; do not add redundant satisfied close
- Preserve: Past Requests drawer, reference uploads, one-open constraint, cancel, proof workflow, auth boundaries

---

## Requirement mapping (July 14 FAIL → current products)

| # | Old requirement | Classification | Target |
|---|-----------------|---------------|--------|
| 1 | Modern custom-request result dashboard | **ETSY** (+ Assisted polish only if gap) | Redesign `EtsyResultsDashboard` IA/CSS; Assisted status panel preserved unless proven clutter |
| 2 | One-open lifecycle notice | **ETSY** + **ASSISTED** (product-specific) | Assisted: preserve choose-path notice. Etsy: add clear notice on **active** results (one active search; mark satisfied or cancel before another without replace confirm) |
| 3 | Mark as satisfied (all open / not only etsy_referred) | **ETSY** remap; **RETIRE** for Assisted | Wire UI → existing `completeEtsyRecommendationRequest`. Assisted uses approve/cancel — no new satisfied action |
| 4 | History in drawer/sheet not main feed | **PRESERVE** Assisted; **ETSY** = no inline history today | Assisted drawer: preserve/not rebuild. Etsy: no history feed on results → QA “move history off feed” **N/A**; optional Past Etsy searches = **DEFERRED** unless owner wants parity |
| 5 | Etsy purchase → `/requests/artwork` | **ALREADY SATISFIED / PRESERVE ONLY** | Keep `buildRequestArtworkHref` path |
| 6 | No new artwork upload pipeline | **PRESERVE ONLY** | — |
| 7 | Broaden AI recommendation rules | **DEFERRED PRODUCT FEATURE** | AI Coming soon; roadmap deferred |
| 8 | Preserve enum `human_creation` | **RETIRE AS OBSOLETE** | No live enum; do not resurrect |
| 9 | Wording “Fresh Prints Assisted Creation” | **PRESERVE ONLY** | — |
| 10 | No Gemini / credits / payments / proofs-in-remediation | **PRESERVE ONLY** (scope gate) | Do not expand proof system |
| B1 | Etsy `not_found` recompute AI vs Assisted | **RETIRE AS OBSOLETE** | No unified transition model |
| B2 | Satisfied allow-list OPEN+`etsy_referred`+`reviewing` | **RETIRE** names; **ETSY** remap | Allow-list = `active` → `completed` / `cancelled` only |
| B3 | History drawer default | **PRESERVE** Assisted | — |
| B4 | `etsy_referred` still shows purchase CTAs | **ETSY** remap | Keep purchase/upload CTAs on **`active`** results; after complete/cancel return to hub |
| B5 | Don’t break reference uploads | **PRESERVE ONLY** | — |
| B6 | Pricing as shared constant | **PRESERVE ONLY** | Existing `ETSY_RECOMMENDATION_SEARCH_*_PRICE_USD` |
| — | Hardcoded `$1–$8` claim | **PRESERVE / verify** | Confirm dashboard does not reintroduce fixed dollar range copy |

**Owner decisions:** none blocking for complete-vs-cancel semantics. Optional: Etsy Past searches drawer (defer by default); CTA label wording.

---

## Workstream A — results / dashboard proposal

### Etsy main results (`EtsyResultsDashboard`) — implement

1. Compact header + **one-active-search** lifecycle notice  
2. Search/browse cards + listing previews (existing)  
3. Purchase path: keep **Print this / upload via `/requests/artwork`**  
4. Primary lifecycle: **Mark as satisfied** → `completeRequest`  
5. Quiet **Cancel** with confirm → `cancelRequest`  
6. Edit search / search again (existing) as secondary  
7. No inline past-request feed  
8. After complete/cancel → return to choose-path hub (releases active slot)

### Assisted

- Preserve status panel, cancel, proof/approve, Past Requests drawer  
- Do not unify with Etsy lifecycle components beyond shared Portal chrome/tokens  
- Optional light copy polish only if needed for lifecycle clarity — not a rebuild

### Shared presentation

- May share drawer chrome / button patterns  
- Must **not** invent unified status enums or shared transitionHistory schema

---

## Workstream B — Discover (unchanged validity)

### Category rails

- Keep pool-based **selection** (max 3, min 3, popularity = Σ `requestCount`)  
- After selection, hydrate each category via `listReadyDesignsPageWithSortFallback({ categoryId, limitCount: 25, sortField: 'createdAt', skipClientSortRepair: true })`  
- Target: `min(actual ready membership, CATALOG_DISCOVERY_RAIL_LIMIT)`  
- Do **not** raise `HOME_DISCOVERY_POOL_PAGE_SIZE` as the fix  
- Cold-load bound: ≤3 queries; ≤78 design reads (3×26); reuse `catalogPageCache` / in-flight dedupe; no listeners; no full hydrate  

### Curated membership

| Mode | Membership | Action |
|------|------------|--------|
| Recently Requested | `lastAddedToShowAt` present | Align list + `countReadyDesigns` + badge + `hasMore` (explicit query flag; do not infer only from sortField) |
| Most Liked | `favoriteCount > 0` | Same alignment |
| Popular | All ready / `requestCount` | Preserve |
| New This Week | `readyAt` window / `readyAfterMs` | Preserve |

**Load more:** `hasMore` authoritative; button only renders when `hasMore`; no `length < pageSize` heuristic.

### Indexes (vs `firestore.indexes.json` on tip)

Existing composites cover `status` + `favoriteCount` / `lastAddedToShowAt` (+ category / tags variants) and category + `createdAt` for rail hydrate. **No new index assumed.** Confirm at implement/DEV if inequality + orderBy fails; rare missing combo `categoryId+tags+status+favoriteCount` only if that path is used and fails.

---

## Scope

### In scope

- Workstream A: Etsy results UX + wire complete/cancel; Etsy one-active notice; preserve Assisted  
- Workstream B: rail hydration + metric eligibility on list/count  
- Focused tests, Portal typecheck, lint, `git diff --check`  
- Docs only if behavior docs need a short note  

### Out of scope

- Remount/merge/cherry-pick development  
- Recreating monolith / AI engine / Gemini / credits / payments / new proofs  
- New upload pipeline / Algolia for Discover Home  
- Studio 1.0.4 drafts  
- Production deploy  
- DEV deploy without later human checkpoint  
- Etsy Past searches drawer (deferred unless owner asks)  
- General catalog redesign  

---

## Approach (after owner APPROVE)

1. Workstream B Goal B (eligibility filters) then Goal A (rail hydrate) on production catalog code  
2. Workstream A: wire Etsy complete/cancel into dashboard + lifecycle notice + CSS IA polish  
3. Automated tests  
4. STOP before DEV Functions/indexes/App Hosting — human checkpoint  

---

## Affected files (expected)

### Workstream A

- `apps/portal/features/etsy-recommendations/components/EtsyResultsDashboard.tsx`
- `apps/portal/features/etsy-recommendations/hooks/useEtsyRecommendationWizard.ts`
- `apps/portal/features/etsy-recommendations/pages/EtsyRecommendationsPageContent.tsx` (props wiring)
- `apps/portal/styles/etsy-recommendations.css`
- Possibly light copy on `EtsyRouteChoosePath.tsx`  
- **Functions:** prefer **no change** if existing complete/cancel callables suffice; only touch if metadata/copy-side validation required  
- Assisted files: **prefer touch-none** (preserve)

### Workstream B

- `apps/portal/features/catalog/types/catalog.types.ts`
- `apps/portal/features/catalog/services/catalogService.ts`
- `apps/portal/features/catalog/hooks/useCatalogDesigns.ts`
- `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx`
- Optional helper in `packages/shared/.../catalogDiscoveryRanking.ts` (selection-only; no eligibility redefine)

---

## Test strategy

| Check | Required |
|-------|----------|
| `catalogDiscoveryRanking.test.ts` | yes |
| `catalogService.homeDiscoveryPool.test.ts` | yes |
| `catalogService.discoverViewAllRepair.test.ts` | yes (eligibility preserved through membership repair) |
| `useCatalogDesigns.test.ts` | yes (query flags + reconcile with eligibility-scoped counts) |
| `catalogService.ntwCountOrder.test.ts` pattern for metric count orderBy | yes if inequalities added |
| New: rail hydrate bound (10 / 25); Recent 2 → no Load more; Most Liked `favoriteCount > 0` | yes |
| Etsy: service already has callables — add UI/hook tests or lightweight integration asserts if patterns exist | preferred |
| Portal typecheck | yes |
| Functions build | **only if Functions changed** |
| Lint + `git diff --check` | yes |

---

## Deployment matrix (Plan/Review: no deploys)

| Artifact | Workstream A | Workstream B |
|----------|--------------|--------------|
| Portal only | **Yes** (primary) | **Yes** |
| Functions | **No** expected (callables exist); if changed → DEV human OK | No |
| Firestore Rules | No expected | No expected |
| Firestore indexes | No assumed; verify if query fails | **No assumed**; existing composites should cover; DEV verify |
| Storage Rules | No | No |
| Algolia | No | No (do not add) |

---

## Acceptance criteria

Workstream A: mapping table complete; no legacy recreation; Etsy complete→`completed` + cancel→`cancelled`; Assisted proof/cancel/drawer preserved; purchase→artwork preserved; no `human_creation`; AI deferred; no Gemini/credits/payments/new proofs; auth/reference uploads preserved.

Workstream B: criteria 15–26 from owner brief (rails 10/25, pool independence, bounded reads, Recent/Most Liked agreement, Popular/NTW preserved, browse/search/tag/halftone/censored/Algolia no regress).

General: typecheck, focused tests, lint, diff-check; Functions build if Functions touched.

---

## Human checkpoints

1. This Formal Review / owner APPROVE  
2. Optional CTA label / Past Etsy searches (non-blocking; default defer Past searches)  
3. DEV Functions only if A changes callables  
4. DEV indexes only if B proves need  
5. Portal DEV/manual QA  
6. Production later  
7. Studio 1.0.4 parked — do not mutate  

---

## Risks

| Risk | Mitigation |
|------|------------|
| Scope creep into Assisted rebuild | Preserve-only unless proven gap |
| Inventing new Etsy statuses | Forbidden — use `completed`/`cancelled` |
| False hasMore after partial filter | Explicit eligibility on list+count+membership repair |
| Index miss in DEV | Document; human checkpoint before index deploy |

---

## FreshForge

Plan → Formal Review → **STOP** for owner approval. Do not implement or deploy from this step.
