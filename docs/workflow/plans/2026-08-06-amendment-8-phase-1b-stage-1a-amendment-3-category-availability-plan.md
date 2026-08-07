# Plan: Stage 1a Amendment 3 — Portal category availability (active + has ready designs)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Author | Planning Agent |
| Status | ready_for_review → **revised after Formal Review required changes** |
| Workflow | managed-phase (Investigate → Plan → Formal Review only) |
| Goal | `post-launch-catalog-and-processing-stability` |
| Phase | Amendment 8 Phase 1B Stage 1a — Owner QA Amendment 3 |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| HEAD at plan | `bc893f6` |
| PR | #40 open / unmerged |
| Related | Stage 1a `b397ec0`; Amendment 1 `c15a7be`; Amendment 2 `bc893f6` |
| Mode | **Docs only this pass — no implementation** |

---

## Goal

Make the Portal customer category dropdown (and shared category-list consumers) show only
**active** categories that have **at least one Portal-visible ready design**, matching the
**intended product rule** (not Studio’s incidental page-local facet). Studio Category Management
continues to show active empty categories for staff. Do this with a **bounded, Firestore-authoritative,
snapshot-free** approach.

---

## Background / product clarification

Owner FAIL on Amendment 2 re-QA reframed the defect:

> Portal is not incorrectly showing archived categories. It is showing **active categories with
> zero ready designs** (e.g. Occasions).

**Superseded:** prior Stage 1a / Amendment 1–2 acceptance that “active empty categories remain
visible” on Portal. That wording must be removed from Stage 1a QA docs at implement time (and is
marked superseded in this Plan).

**Binding customer rule (Stage 1a count definition):**

`All categories` + each category where:

1. Amendment 1 mapper accepts it (`isActive === true` and valid name); **and**
2. `catalogService.countReadyDesigns({ categoryId }) > 0`

where `countReadyDesigns` uses the same `buildDesignFilterConstraints` as ordinary browse:
`status == "ready"` + `categoryId == <id>` (guest Rules–aligned).

This is **not** “passes `mapCatalogDesign`.” Mapper also requires `title`, `thumbnailPath`,
positive `width`/`height`. Aggregates cannot express those fields. **Stage 1a explicitly accepts**
that a category whose only ready docs fail the mapper may still appear and then show an empty
browse result — treat such docs as data defects outside this amendment (a later denormalized
display-ready flag would need its own Plan).

Do **not** delete/archive empty categories to hide them. Studio admin UI keeps them.

---

## Investigation findings (source-proven)

### 1. Studio Design Library dropdown — **page-local (do not copy as Portal truth)**

| Piece | Path |
|-------|------|
| Filter UI | `apps/studio/.../components/DesignLibraryFilterControls.tsx` (`Select` `designLibraryCategoryFilter`) |
| Assembly | `DesignLibraryPage` → `buildCategoryFilterOptions` |
| Builder | `apps/studio/.../utils/designLibrarySearch.ts` `buildCategoryFilterOptions` |
| Labels | Firestore `categories` via `useGeneratedDesignLibraryTaxonomy` → `categoryService.listCategories` (active) |
| Which options show | `collectUsedCategoryIds(designs)` over **currently loaded** `useDesigns` page(s) |

- Normal browse list query: `statusIn: ["ready"]` only (`DESIGN_LIBRARY_CATALOG_STATUSES`).
- Archived toggle: `statusIn: ["archived"]` — archived designs contribute options only in that mode.
- Options are further narrowed by **page-local search + selected tags**
  (`filterDesignsByTags(searchMatchedDesigns, selectedTags)` fed into `buildCategoryFilterOptions`) —
  even more incidental than “loaded pages alone.”
- **Not** global: `useDesigns` is bounded (`DEFAULT_LIST_LIMIT` 100; no `loadAll: true`). Options grow only as pages load.
- Generated ready-index **not** involved for Design Library filter options.
- Category Management modal (`CategoryManagementModal`) still lists **all** active categories including empty — correct for staff.

**Verdict:** Studio filter is **page-local / incidental**. Portal must **not** copy that algorithm; Portal needs **globally truthful** availability.

### 2. Portal surfaces today

| Surface | Path | Category contract |
|---------|------|-------------------|
| Library dropdown | `CatalogFilterBar` ← `CatalogPageContent` ← `useCatalogCategories` | **All active** (mapper `isActive === true`) |
| Discover rails | `CatalogHomePageContent` ← same hook | Same list for names; rail ranking adds client min-designs-in-pool |
| Share name lookup | `ShareDesignPortalPageContent` ← same hook | Name resolve only |
| Mobile | Same `PortalSelect` / CSS — no separate selector | Same |

**Service today:** `catalogService.listActiveCategories` —

```text
collection(categories) where isActive == true
→ mapPortalActiveCategory → sortPortalCatalogCategories
```

**No** ready-design count filter. Guest Rules: `isPublicCatalogCategory` = `isActive == true`; designs public read = `status == "ready"`.

### 3. Authoritative “has ready designs” (Portal)

**Binding definition for this amendment:**

`countReadyDesigns({ categoryId: category.id }) > 0`

Constraints (via `buildDesignFilterConstraints`):

1. `status == "ready"` (Rules `isPublicCatalogDesign`);
2. `categoryId == <category.id>`.

**Do not count:** imported, processing, needs-review, rejected, archived; uploads not in catalog;
request artwork; print-request items; show allocations.

**Mapper nuance (accepted Stage 1a approximation):** client `mapCatalogDesign` additionally requires
`title`, `thumbnailPath`, `width`, `height`. Those are **out of scope** for the count. Categories
that only contain mapper-incomplete ready docs may appear then browse empty — data defect / later
Plan, not a blocker for Option A.

---

## Options evaluated

### Option A — Per-active-category `getCountFromServer` (recommended Stage 1a bridge)

**Algorithm:**

1. Load active categories (existing `listActiveCategories` query + Amendment 1 mapper).
2. For each active category id, `countReadyDesigns({ categoryId })` (existing Portal helper —
   already `status==ready` + optional `categoryId`).
3. Keep categories with `count > 0`; preserve `sortPortalCatalogCategories` order.
4. Cap parallelism / category set size (see bounds).

**Cost arithmetic (Firestore aggregation billing):**

- Aggregation queries: **1 document-read equivalent per ≤1000 index entries scanned**, minimum 1
  per query (Firebase aggregation pricing).
- Let `C` = number of active categories after mapper (~**18** on `fresh-prints-dev` today).
- Let `N_c` = ready designs in category `c`.
- Per availability refresh:
  - Category list docs: **C** reads (getDocs).
  - Counts: **Σ_c max(1, ceil(N_c / 1000))** aggregation bill units.
- **Lower bound:** `C + C = 2C` (~36 for C=18) when every category has &lt;1000 ready designs.
- **Hard caps:**
  - `MAX_ACTIVE_CATEGORIES_FOR_COUNT = 64`. If active category count **after mapper** exceeds 64:
    **fail the category-list load** (surface error to UI; **fail closed**). Do **not** silently
    fall back to “all actives,” do **not** truncate arbitrarily, do **not** skip counts.
  - Per refresh bill units ≤ `C + Σ max(1, ceil(N_c/1000))` with C≤64; with e.g. 10k ready designs
    spread across ≤64 categories: on the order of **~140** units — far below full-catalog hydrate.
- **Latency:** `Promise.all` over C counts; typical C≈18 parallel aggregates; acceptable vs browse.
- **In-flight dedupe / freshness (aligned with Amendment 2 — no module TTL):**
  - **No** module-level TTL cache for the customer-visible category list (keeps Amendment 2
    “uncached Firestore-only” freshness tests green).
  - **In-flight Promise dedupe** only (concurrent callers share one availability load).
  - Existing **focus / visibility reload** forces a fresh active-list + recount (no polling, no
    listeners, no browser-storage clear).
- **Indexes:** equality `status` + `categoryId` is already covered by existing composite prefixes in
  `firestore.indexes.json` (e.g. `categoryId` + `status` + sort fields). Confirm at implement;
  add a dedicated equality-only composite only if emulator/console reports missing index.
- **Guest Rules:** guests may read `status==ready` designs → count queries with those constraints
  are allowed. No Rules change required for Option A.
- **Failure:** if one count fails, fail the list load (surface error) rather than silently showing
  all actives or an incomplete set — avoids lying about availability. Same fail-closed policy as C&gt;64.

### Option B — Derive from bounded ready-design result

**Rejected.** Page-one / home pool / ≤2k hydrate / full ready scan are all either **incomplete** or
**unbounded**. Cannot be globally truthful without scanning all ready designs.

### Option C — Denormalized `readyDesignCount` on category docs

**Deferred / not for Stage 1a implement without separate backend Plan.** Requires trusted writers on
ready transitions, reassignment, archive/restore; reconciliation/backfill; Rules; migration;
production risk. Out of this amendment’s no-migration / no-deploy gate.

### Option D — Managed-search category facets (Stage 1b)

**Eventual home** when provider is chosen. **Do not select provider now.** Stage 1b must not start
in this amendment. Option A is explicitly a **bridge** Stage 1b may replace with facet-derived
category availability.

### Option E — Generated design / catalog snapshots

**Rejected.** Owner-approved no-design-snapshot direction stands. Do not revive publishers to hide
empty categories.

---

## Recommended implementation (for a **future** Implement pass — not this pass)

**Option A** as a **documented Stage 1a bridge**, replaceable by Stage 1b managed-search category
facets when that provider ships.

### Permanence

| Classification | Value |
|----------------|-------|
| This solution | **Stage 1a bridge** |
| Steady-state intent | Stage 1b managed-search facets (or Option C if product later prefers denormalized counts) |

### Approach (implement later)

1. Extend Portal category loading (prefer evolving `listActiveCategories` or a clearly named
   `listCustomerVisibleCategories` used by `useCatalogCategories`) to filter by
   `countReadyDesigns({ categoryId }) > 0`.
2. Bound `C ≤ 64`; if exceeded, **fail closed** (error, no all-actives fallback). Document and test.
3. Parallel counts with **in-flight Promise dedupe only** (no module TTL). Keep Amendment 2
   focus/visibility reload as the freshness path; keep freshness tests asserting no category TTL cache.
4. Keep Amendment 1 mapper (`isActive === true`).
5. Preserve sort order.
6. Update Discover rails / share name consumers to use the same customer-visible list (share:
   ready design’s category remains countable → still present).
7. **Do not** change Studio Category Management or Studio Design Library page-local facet
   (optional later Studio follow-up for global completeness — **out of scope**).
8. Supersede QA docs that required empty actives visible on Portal (already marked in this pass).
9. Tests: empty active excluded; active with ready included; inactive excluded; no taxonomy
   restore; no full hydrate; containment; ordering stable; count uses `status==ready` only;
   C&gt;64 fail-closed; Amendment 2 freshness (no TTL) still green.

### Cache / freshness contract

| Event | Portal learns via |
|-------|-------------------|
| Design → ready | Focus/visibility reload or remount → fresh list + recount |
| Ready → archived / non-ready | Same |
| Ready design category reassignment | Same |
| Restore to ready | Same |
| Category activate/archive | Same (active list + counts) |

**Chosen mechanism (Amendment 2–compatible):**

- **No** module TTL / no `catalogCategoriesCache` for customer category availability.
- **In-flight Promise dedupe** for concurrent loads.
- **Focus / visibility** reload (already on `useCatalogCategories`).
- Full page refresh always reloads.

**Forbidden:** continuous polling; Firestore listeners; requiring users to clear browser storage;
snapshot publication for this feature.

### Query / read upper bound (summary)

Per customer category-list refresh: **≤ C category doc reads + Σ_c max(1, ceil(N_c/1000))
aggregation units**, with **C ≤ 64**.

### Required indexes

- Reuse existing `designs` composites whose equality prefix is `categoryId` + `status` (already in
  `firestore.indexes.json` for category browse).
- Implement pass must verify `countReadyDesigns({ categoryId })` against emulator/dev; add index
  entry only if missing.

### Migration / deploy

- **None** in Stage 1a Amendment 3 implement (client-only count filter).
- No Function, Rules, Storage, merge, cleanup, or production action in this Plan’s authorized
  future implement without a new gate.

---

## Scope

### In Scope (future implement; docs now)

- Portal customer category availability = active ∧ ready-count &gt; 0.
- Shared hook/service used by Library dropdown, Discover rails naming, share name resolve.
- QA/doc supersession of “empty actives remain visible.”
- Automated tests for availability contract + Stage 1a containment.

### Out of Scope

- Stage 1b / provider selection / managed search.
- Option C denormalized counts / backfill / migration.
- Studio Design Library making its filter globally complete.
- Changing search, multi-tag, or tag facets.
- Snapshot restore / publisher changes.
- Archiving empty categories as a workaround.
- Firebase deploy / Rules / Functions / production.

---

## Affected Areas (expected at implement)

### Files / Modules

- `apps/portal/features/catalog/services/catalogService.ts` (+ tests)
- `apps/portal/features/catalog/hooks/useCatalogCategories.ts` (+ freshness/availability tests)
- Possibly `useCatalogCategoryOptions` / Discover ranking call sites if they assume “all actives”
- Stage 1a + Amendment 1/2 manual QA docs (supersede empty-visible wording)
- Workflow state / CURRENT-STATE

### Architecture Impact

- [x] Details: Portal service-layer availability filter via existing bounded aggregates; no new
  snapshot layer; Stage 1b bridge noted.

### Security Impact

- [x] Details: Guest-compatible count constraints (`status==ready`); no Rules change expected.

### Data Model Impact

- [x] None for Stage 1a bridge (no new fields).

### Backend Impact

- [x] None (no Functions). Index confirm only.

### UI / UX Impact

- [x] Details: Dropdown / rails omit empty actives; Studio admin unchanged. Manual QA required.

### Migration Impact

- [x] None.

---

## Test Strategy (future implement)

### Automated

| Check | Required |
|-------|----------|
| Empty active category excluded from customer list | yes |
| Active with ready count &gt; 0 included | yes |
| Inactive excluded (Amendment 1 still green) | yes |
| Counts constrained to `status==ready` (+ categoryId) | yes |
| Cap / bound documented in test or constant | yes |
| No `loadClientTaxonomy` / design snapshot restore | yes |
| Stage 1a containment tests | yes |
| Portal typecheck / lint / diff-check | yes |
| Portal build when `.next` unlocked | yes |

### Manual

Owner QA: empty active (e.g. Occasions) absent from Portal dropdown; category with ready designs
present; Studio Category Management still shows empty actives; search/multi-tag/facets unchanged;
archive/restore still work (Amendment 2).

---

## Human Checkpoints

- Owner re-QA after implement (no Signoff until then).
- No Firebase deploy anticipated for Option A.

## Risks and rollback

| Risk | Mitigation |
|------|------------|
| Count cost grows with C | Hard cap 64; Stage 1b facets / Option C later |
| Mapper-incomplete ready docs | Documented approximation; monitor |
| Partial count failure | Fail closed on list error |
| Stale availability | Focus/visibility + short TTL |

Rollback: revert client filter; restore prior `listActiveCategories` behavior.

## Implement acceptance checklist (authoritative)

Implement / Test / Signoff must satisfy **all** of the following (replaces prior “3–20 handwave”):

1. Studio page-local behavior remains documented; Portal does **not** copy it.
2. Portal customer list = active ∧ `countReadyDesigns({ categoryId }) > 0` (Rules-ready definition).
3. Active empty categories omitted from Portal dropdown / shared customer list.
4. Active empty categories still manageable in Studio Category Management.
5. Inactive categories still excluded (Amendment 1 mapper).
6. Non-ready statuses do not make categories visible.
7. Availability is globally correct (not page-local).
8. No full-catalog hydration.
9. No generated design snapshot restored.
10. No design publisher required for categories.
11. No N+1 design-document reads (counts only + one active-category getDocs).
12. Query/count ops respect C≤64 and documented aggregation bounds.
13. Indexes confirmed (or added only if missing) for `status`+`categoryId` counts.
14. Freshness = focus/visibility + in-flight dedupe; **no** module TTL; no polling/listeners.
15. Search, multi-tag, tag facets unchanged.
16. Stage 1b does not begin; Option A marked Stage 1b-replaceable bridge.
17. No migration / denormalized count field.
18. No Function, Rules, Storage, deploy, cleanup, merge, or production action unless newly gated.
19. Prior Stage 1a containment + Amendment 1 mapper tests remain green.
20. Prior “empty actives remain visible on Portal” QA wording remains superseded.
21. C&gt;64 and partial count failure both **fail closed** (no silent all-actives fallback).
22. Mapper-incomplete ready-only edge case documented as accepted Stage 1a approximation.

---

## Acceptance criteria (this Plan pass)

1. Studio behavior source-proven (page-local, including search/tag narrowing) — **done**.
2. Plan does not copy page-local Studio filtering — **Option A global counts**.
3. Implement checklist above is the gate for the future Implement pass.
4. Prior empty-category Portal QA requirement **explicitly superseded**.

---

## This pass deliverables

- This Plan.
- Independent Formal Review.
- Workflow state + CURRENT-STATE update.
- Stage 1a / Amendment 2 QA docs marked superseded for empty-visible wording (minimal edit).

**Stop after Formal Review. No application source changes in this pass.**
