# Formal Review: Stage 1a Amendment 3 — Portal category availability

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Independent Formal Reviewer (read-only app code) |
| Plan | `docs/workflow/plans/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-category-availability-plan.md` |
| HEAD reviewed | `bc893f6` (Plan claim; source paths verified in workspace) |
| Mode | Plan + Formal Review only — **no implement / no deploy** |
| Verdict | **APPROVED WITH REQUIRED CHANGES** → **APPROVED** after Plan revision |

---

## Summary

Option A (per-active-category `countReadyDesigns({ categoryId })`, C≤64, no snapshots, no Studio page-local copy) is the right Stage 1a bridge for globally truthful Portal category availability. Studio Design Library category options are confirmed **page-local / incidental** from source; copying that algorithm would be wrong for Portal. The Plan is **not** fully implement-ready until it resolves the Amendment 2 freshness/TTL conflict, aligns the binding “Portal-visible” wording with the Rules-ready count definition, and clarifies C>64 fail behavior.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Option A bridge; Stage 1b / Option C / Studio global filter out |
| Architecture alignment | pass with notes | Service-layer filter; no new snapshot layer |
| Security impact addressed | pass | Guest-compatible `status==ready` counts; no Rules change expected |
| Data model impact addressed | pass | None for Stage 1a bridge |
| Backend impact addressed | pass | No Functions/deploy; index confirm at implement |
| Test strategy adequate | pass with notes | Must update Amendment 2 freshness tests if TTL retained |
| Human checkpoints identified | pass | Owner re-QA after implement; no deploy anticipated |
| Roadmap alignment | pass | Stage 1a bridge → Stage 1b facets |
| Documentation plan | pass | Empty-active Portal QA wording already marked superseded in Stage 1a / Amendment 2 QA docs |
| No silent scope expansion | pass | Search / multi-tag / facets / snapshots / Studio admin untouched |
| This pass is Plan+Review only | pass | No application source changes authorized |

---

## 1. Studio Design Library category dropdown — source re-derivation

Verified independently (do not rely on Plan alone):

| Piece | Source fact |
|-------|-------------|
| Filter UI | `DesignLibraryFilterControls.tsx` — presentational `Select` `designLibraryCategoryFilter`; receives `categoryOptions` only |
| Assembly | `DesignLibraryPage.tsx` builds options via `buildCategoryFilterOptions` |
| Builder | `designLibrarySearch.ts` — `collectUsedCategoryIds(designs)` then keep **active** categories that appear in that design set (or the currently selected id) |
| Designs fed to builder | Not raw `useDesigns` output alone: `filterDesignsByTags(searchMatchedDesigns, selectedTags)` — so options shrink further with **page-local search + selected tags** |
| List query | `buildCatalogDesignListQuery` → `statusIn: ["ready"]` normally; `["archived"]` when archived toggle on |
| Pagination | `useDesigns(listQuery)` **without** `loadAll: true`; `DEFAULT_LIST_LIMIT` / page size **100** in `designService` |
| Category labels | Normal browse: `useGeneratedDesignLibraryTaxonomy` → `categoryService.listCategories` (active). Archived/management path uses Firestore `useCategories` |
| Staff empty actives | `CategoryManagementModal` / full category management still lists active empties — correct for staff |

**Verdict (confirmed):** Studio filter is **page-local / incidental**, not a global availability contract. Plan’s “do not copy” conclusion is correct. Plan understates one nuance (search/tag further gate options) but that strengthens, not weakens, the anti-copy argument.

---

## 2. Would copying Studio be wrong for Portal?

**Yes.** Portal customers need a stable, globally truthful dropdown: empty active categories (e.g. Occasions) must not appear even if the customer has never paginated far enough to “discover” emptiness. Studio’s algorithm can omit categories that exist elsewhere in the catalog (not yet loaded / filtered out by tags/search) and can include empties only when selected. That is acceptable for staff browse; it is the wrong product rule for Portal.

Plan correctly chooses a **global** Firestore-authoritative filter instead.

---

## 3. “Has ready designs” vs `mapCatalogDesign` incompleteness

| Layer | Requirement |
|-------|-------------|
| Guest Rules | `isPublicCatalogDesign()` ⇒ `status == "ready"` |
| `countReadyDesigns` / `buildDesignFilterConstraints` | `status==ready` (+ optional `categoryId` / tag / createdAfter) |
| `mapCatalogDesign` | Additionally requires `title`, `thumbnailPath`, finite positive `width`/`height` |

Plan’s Stage 1a definition (count Rules-ready by `categoryId`) is **technically honest as an approximation**, and aggregates cannot express mapper completeness without denormalized fields.

**Challenge:** Goal / binding rule text says “Portal-visible ready design,” which a reader can interpret as **mapper-displayable**. Under Option A, a category whose only ready docs fail `mapCatalogDesign` would still appear, then browse empty. Plan acknowledges rarity but does not bind the customer-facing language to that approximation.

This is acceptable for Stage 1a **only if** the Plan’s binding rule is rewritten to match the count definition and the empty-after-select edge case is explicitly accepted (or deferred to a later denormalized flag Plan).

---

## 4. Option A cost arithmetic and C≤64

Firebase aggregation billing (current docs): **1 document-read equivalent per ≤1000 matched index entries**, **minimum 1** per aggregation (including zero matches).

Plan arithmetic:

- Category list: **C** `getDocs` reads  
- Counts: **Σ_c max(1, ceil(N_c / 1000))**  
- Lower bound ≈ **2C** when all N_c &lt; 1000 — **honest**  
- Example upper bound ~140 for C=64 and ~10k ready — **slightly conservative** (double-counts floor vs totalReady/1000) but directionally honest and far below full-catalog hydrate  

**C≤64** is a reasonable Stage 1a hard gate above current ~18 actives on `fresh-prints-dev`. Cap honesty depends on specifying what happens when C&gt;64 (see Required Changes).

---

## 5. Guest Rules feasibility for `countReadyDesigns({ categoryId })`

| Check | Result |
|-------|--------|
| Designs read | `allow read: if isStaff() \|\| isPublicCatalogDesign()` with `status == "ready"` |
| Count query | Equality `status==ready` + `categoryId==…` — query constraints stay within guest-readable set |
| Categories read | `isPublicCatalogCategory()` ⇒ `isActive == true` (unchanged) |
| Rules change | **Not required** for Option A |

**Feasible.** Implement must still confirm the composite index path works for equality-only count (existing `categoryId` + `status` + sort composites in `firestore.indexes.json` are plausible prefixes; Plan correctly defers confirm-to-emulator).

---

## 6. Hidden full-catalog hydration / snapshot recreation

| Option | Plan stance | Review |
|--------|-------------|--------|
| B — derive from bounded ready result | Rejected (incomplete or unbounded) | Agree |
| E — generated design / catalog snapshots | Rejected | Agree — do not revive publishers for this |
| Tag facets / search snapshots | Out of scope; left as-is | Agree |

**No hidden hydrate/snapshot path found in the Plan.** Acceptable.

---

## 7. Archive / restore / approval / reassignment freshness

Amendment 2 contract today (`useCatalogCategories` + freshness tests):

- Every load hits Firestore (**no module TTL**)
- Focus / visibility reload
- No polling / listeners
- Test explicitly forbids `catalogCategoriesCache` / `CATALOG_CATEGORIES_TTL` patterns in `listActiveCategories`

Plan proposes: reuse focus/visibility **and** add short module TTL (15–30s) with invalidate-on-focus.

**Conflict:** Introducing module TTL without an explicit Amendment 2 supersession + test updates would **regress** the Case A freshness guarantee or fail containment tests. “Invalidate-on-focus” can preserve freshness **if** focus/visibility always bypasses TTL before recount — but that must be written as the contract, and Amendment 2 tests must be revised accordingly. Prefer **in-flight Promise dedupe only** (no TTL) unless TTL is justified and Amendment 2 is formally superseded for this layer.

Event table (ready ↔ archived, reassignment, category activate/archive) is directionally correct **if** focus/visibility always forces a fresh active-list + recount.

---

## 8. Search / multi-tag / facets

Plan Out of Scope: “Changing search, multi-tag, or tag facets.” Stage 1a QA docs still treat search/tags/facets as generated-path. **Confirmed untouched.** Good.

---

## 9. This pass = Plan + Review only

Plan Mode and stop line forbid application source changes and Firebase deploy. Reviewer wrote **only** this Formal Review under `docs/workflow/reviews/`. **Pass constraint satisfied.**

---

## Architecture Review

**Findings:**
- Prefer evolving `listActiveCategories` or a clearly named `listCustomerVisibleCategories` behind `useCatalogCategories` — keeps Library, Discover naming, and share name resolve on one contract.
- Discover rails already apply client `minDesigns` against the home pool; filtering empties from the shared category list is compatible and does not require changing ranking math.
- Fail-closed on partial count failure is correct (avoids lying with “all actives”).

**Required changes:**
- See global Required Changes list below (TTL / C&gt;64 / binding definition).

---

## Security Review

**Findings:**
- Guest count constraints align with public design read rules.
- No Secrets, Rules, or production deploy in this Plan’s authorized future implement.

**Required changes:**
- [ ] None beyond confirming indexes at implement (already in Plan).

**Human approval needed before production:**
- [ ] None for Option A client-only filter (re-confirm if implement somehow expands to Rules/Functions).

---

## Data Model Review

**Findings:**
- No new persisted fields; Option C correctly deferred.

**Required changes:**
- [ ] None for Stage 1a bridge.

---

## Backend Review

**Findings:**
- Reuse of `countReadyDesigns` is correct.
- Indexes: composites with `categoryId` + `status` prefixes exist; equality-only count still needs implement-time verification.

**Required changes:**
- [ ] None blocking Plan approval beyond clarifying C&gt;64 behavior.

---

## Testing Review

**Findings:**
- Automated cases (empty active excluded; ready&gt;0 included; inactive excluded; ready-only counts; no taxonomy/snapshot restore; containment) are adequate for the bridge.
- Amendment 2 freshness tests **must** be updated if any module TTL is introduced; otherwise keep “no module TTL” and rely on in-flight dedupe + focus/visibility.

**Required changes:**
- [ ] Plan must state the exact freshness test updates when choosing TTL vs no-TTL.

---

## Documentation Review

**Findings:**
- Stage 1a / Amendment 2 manual QA docs already mark Portal empty-active visibility superseded — consistent with this Plan.
- Amendment 1 implementation-review historical wording (“empty active categories remain visible”) remains historical; Plan supersession covers product rule going forward.

---

## Required Changes (must land in Plan before Implement)

1. **Resolve Amendment 2 freshness vs proposed module TTL (blocking)**  
   Choose one and write it explicitly:
   - **Preferred:** no module TTL; in-flight Promise dedupe + existing focus/visibility reload only; keep Amendment 2 “uncached Firestore-only” tests green; **or**
   - **If TTL kept:** supersede Amendment 2’s no-TTL rule for the customer-visible category list; require focus/visibility to **always invalidate** before reload; name the cache symbol; update `useCatalogCategories.freshness.test.ts` (and hook comment) in the same implement pass.

2. **Align binding customer rule with count definition (blocking)**  
   Rewrite Goal / binding rule so “has ready designs” means **`countReadyDesigns({ categoryId }) > 0` under Rules-ready constraints**, not `mapCatalogDesign` completeness. Explicitly accept (for Stage 1a) that mapper-incomplete ready-only categories may appear then show empty browse — or state that such docs are treated as data defects outside this amendment.

3. **Define C&gt;64 behavior (blocking)**  
   Replace “Reject / fail soft” with one concrete behavior: fail the category-list load (error surface, fail closed — consistent with partial count failure), and do **not** silently fall back to all actives.

4. **Replace “3–20 owner criteria” handwave**  
   Either enumerate the implement acceptance checklist in the Plan, or point to a single authoritative checklist (manual QA + automated table) so Implement/Signoff cannot invent missing items.

5. **Studio investigation nuance (non-blocking but should fix)**  
   Note that `buildCategoryFilterOptions` is fed search- and tag-filtered loaded designs, not merely “loaded pages of ready designs,” so Studio is even more incidental than stated.

---

## Blockers

None that require a different architecture. Option A remains the recommended Stage 1a bridge after the Required Changes above are applied to the Plan.

---

## Verdict Rationale

**APPROVED WITH REQUIRED CHANGES** — Independent source review confirms Studio is page-local; Portal must not copy it; Option A is bounded, Rules-feasible, snapshot-free, and cost-honest with a C≤64 gate. Implement must not start until the Plan corrects the Amendment 2 TTL conflict, binds “ready” language to the count definition, and specifies C&gt;64 fail-closed behavior.

---

## Plan revision follow-up (same pass)

Planning Agent applied Required Changes 1–5 to the Plan:

1. **No module TTL** — in-flight dedupe + Amendment 2 focus/visibility only.
2. Binding rule = `countReadyDesigns({ categoryId }) > 0` (Rules-ready); mapper incompleteness accepted as Stage 1a approximation.
3. C&gt;64 = **fail closed** (error; no all-actives fallback).
4. Concrete **Implement acceptance checklist** (22 items) added.
5. Studio search/tag narrowing nuance added.

**Final Formal Review verdict after delta:** **APPROVED**.

Implement is **not** authorized in this pass — stop for owner/continue-workflow gate to open Implement later.

---

## Next Step

1. ~~Planning Agent revises the Plan for Required Changes 1–4 (and preferably 5).~~ **Done.**  
2. ~~Brief re-review of the delta.~~ **Done — APPROVED.**  
3. Later: Implement → Test → Owner QA → Signoff (separate workflow continuation).  
4. **No application code, Rules, Functions, or Firebase deploy in this pass.**
