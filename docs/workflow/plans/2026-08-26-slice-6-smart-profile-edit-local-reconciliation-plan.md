# Plan: Slice 6 Smart Profile Edit Local Reconciliation Corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-08-26-slice-6-smart-profile-owner-qa-record.md` |
| Parent | smart-catalog-intelligence-unattended-enrichment — Slice 6 |

---

## Goal

Fix Studio Design Library stale Smart Profile state after owner/admin save or Reset to AI so edited dimensions survive immediate modal close/reopen without page navigation, using existing `applyDesignPatch` reconciliation patterns — no backend, Algolia, or lifecycle changes.

## Background

Owner QA **PASS WITH NOTES** confirmed callables and persistence work. Reopen-after-close shows stale dimensions because Smart Profile saves update only modal-local `smartProfileOverride` and never patch the authoritative Design Library list (`useDesigns` / managed-search cache) or `selectedDesign` source used by `openDesignDetails`.

Ordinary **Edit Design** already reconciles via `handleDesignUpdated` → `applyDesignPatch` + optional `applyManagedSearchPatch`.

Owner autonomy calibration requires verified customer search for title, description, category **plus** Smart Profile — documented in this plan (read-only verification complete).

## Scope

### In Scope

- Root-cause fix: propagate callable `smartProfile` result into Design Library local state
- Same path for Reset to AI when snapshot exists
- Remove reliance on modal-only override as the sole post-save source of truth
- Contract/regression tests for reconciliation wiring
- Document search contract matrix (verification only)

### Out of Scope

- Page reload / full `refreshCatalog()` workaround as primary fix
- Callable / Functions / Firestore / Algolia changes
- Lifecycle or root metadata mutation
- Autonomous enablement or verifier threshold changes
- Jimothy blocker policy change
- Tag retirement
- Full Ready Catalog Start (remains blocked until this corrective passes QA)
- Backfill `smartProfileAiSnapshot` on existing canaries

---

## Root cause (confirmed)

### Competing sources of truth

| Source | Role | Updated on Smart Profile save? |
|--------|------|--------------------------------|
| Firestore | Authoritative | Yes (callable) |
| `useDesigns().designs` list | Design Library grid + `openDesignDetails(design)` argument | **No** |
| `useDesignLibraryManagedSearch` list | Algolia-mode grid | **No** |
| `DesignLibraryPage.selectedDesign` | `DesignDetailsModal` prop | **No** (only local override while open) |
| `DesignDetailsModal.smartProfileOverride` | Ephemeral modal state | Yes — **lost on close** |

### Failure sequence

1. User opens details → `setSelectedDesign(design)` where `design` is reference from list cache (stale smartProfile OK).
2. Save succeeds → `onProfileUpdated={setSmartProfileOverride}` updates modal-only state; `viewedDesign` shows new profile.
3. Close → `setSelectedDesign(null)`; override discarded with modal unmount.
4. Reopen → `openDesignDetails(design)` passes **same stale list object**; `useEffect` clears override; UI shows old profile.
5. Navigate away → hook refetch/load replaces list → reopen shows Firestore truth.

### Edit Design contrast (working pattern)

```690:705:apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx
  const handleDesignUpdated = useCallback(async (updated: Design) => {
    await withFirebaseTraceAction("Save design", async () => {
      applyDesignPatch(updated.id, updated);
      if (managedSearchActive) {
        applyManagedSearchPatch(updated);
      }
      ...
    });
  }, [...]);
```

Companion mutations use the same list patch + `setSelectedDesign(updated)` pattern (`handleDesignCompanionsChanged`).

---

## Approach

### 1. Authoritative state after Smart Profile save

**Callable response** (`{ designId, smartProfile }`) remains sufficient. No service API change required.

Construct local patch:

```ts
{ smartProfile: result.smartProfile }
```

Optional: merge `smartProfileAiSnapshot` if reset callable later returns it (currently only `smartProfile`; reset updates effective profile only — snapshot unchanged on reset).

### 2. Smallest repo-aligned fix

**A. `DesignLibraryPage`** — add `handleSmartProfileUpdated`:

```ts
const handleSmartProfileUpdated = useCallback(
  (designId: string, smartProfile: DesignSmartProfile) => {
    applyDesignPatch(designId, { smartProfile });
    if (managedSearchActive) {
      const current = /* resolve from visible list or selectedDesign */;
      if (current) applyManagedSearchPatch({ ...current, smartProfile });
    }
    setSelectedDesign((prev) =>
      prev?.id === designId ? { ...prev, smartProfile } : prev,
    );
  },
  [applyDesignPatch, applyManagedSearchPatch, managedSearchActive],
);
```

Pass to `DesignDetailsModal` as `onSmartProfileUpdated`.

**B. `DesignDetailsModal`** — replace bare `setSmartProfileOverride` callback:

- On save/reset success: call `onSmartProfileUpdated(design.id, smartProfile)` **first**
- Optionally retain `smartProfileOverride` only for in-flight optimistic display (or remove if parent patch is synchronous — prefer remove to reduce dual state)

**C. `DesignSmartProfileSection`** — unchanged contract if modal forwards parent callback; or accept `(designId, profile)` upward.

**D. Do NOT** call `refreshCatalog()` for this fix (too heavy; companion path uses it for multi-design denorm — not needed here).

### 3. Reset-to-AI reconciliation

Same handler — `resetDesignSmartProfileDimension` returns `{ designId, smartProfile }`. Identical patch path.

### 4. Managed search edge case

When `managedSearchActive`, `applyManagedSearchPatch` needs full `Design` with updated `smartProfile` so smart-filter membership re-evaluates. Resolve from `selectedDesign` or find in managed list by id.

If smart-filter exclusion removes design from visible list after edit, that is **correct** behavior (same as tag edit semantics) — document in QA.

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `apps/studio/.../pages/DesignLibraryPage.tsx` | `handleSmartProfileUpdated`; wire modal prop |
| `apps/studio/.../components/DesignDetailsModal.tsx` | `onSmartProfileUpdated` prop; simplify/remove override-only path |
| `apps/studio/.../components/DesignSmartProfileSection.tsx` | Callback signature (if needed) |
| `apps/studio/.../pages/designLibrarySmartProfileReconciliation.contract.test.ts` | **New** — wiring contract |
| `docs/workflow/reviews/2026-08-26-slice-6-smart-profile-owner-qa-record.md` | Already created |

### Architecture / Security / Data / Backend

- **None** — Studio UI state only; existing callables unchanged.

### UI / UX Impact

- Smart Profile save/delete/reset survives immediate modal reopen.
- No visual redesign.

### Migration Impact

- None.

---

## Customer search contract verification (read-only)

Source of truth: `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts`, `functions/src/algolia/buildPortalCatalogAlgoliaRecord.ts`, tests in `buildPortalCatalogAlgoliaRecord.test.ts`, Portal `portalAlgoliaCatalogSearchService.ts`.

### Matrix

| Field | Keyword searchable | Facetable / filterable | Current mechanism |
|-------|-------------------|------------------------|-------------------|
| **title** | **Yes** (primary) | No | First-class Algolia attribute `#1` in `PORTAL_CATALOG_ALGOLIA_SEARCHABLE_ATTRIBUTES` |
| **description** | **Yes** (via aggregate) | No | Embedded in `searchText` (includes title, description, categoryName, tag names/aliases); `searchText` is searchable attribute #13 — **not** a first-class field |
| **category (name)** | **Yes** | No (name) | `categoryName` searchable attribute #8; also in `searchText` |
| **category (id)** | No (not keyword attr) | **Yes** | `filterOnly(categoryId)` facet; Portal category selector uses `filters: categoryId:…` |
| **subjects** | Yes | **Yes** (Smart Filter) | Searchable + `PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES` |
| **styles** | Yes | Yes | Same |
| **themes** | Yes | Yes | Same |
| **interests** | Yes | Yes | Same |
| **professions/groups** | Yes | Yes | Field `professionsGroups` |
| **occasions** | Yes | Yes | Same |
| **places** | Yes | Yes | Same |
| **colors** | Yes | Yes | Same |
| **objects** | Yes | No (customer facet) | Searchable only (#12) — not in Smart Filter facet list |
| **searchConcepts** | Yes | No | Searchable #10 |
| **visibleText** | Yes | No | Searchable #11 |
| **legacy tags** | Yes | **Yes** | Names/aliases in `searchText`; `tagFacetKeys` searchable + facet; `tagIds` filterOnly facet |

**Owner calibration conclusion:** Title, description, and category **remain discoverable** alongside Smart Profile dimensions on current DEV contract. Description is not a standalone Algolia attribute but is keyword-reachable through `searchText`. Category is keyword-reachable via `categoryName` + `searchText` and filterable via `categoryId`.

**No Algolia architecture change required** for this corrective or for documenting owner trust precondition.

---

## Jimothy calibration classification

Design `6x2LyTvG3ewIePeWHanV`:

- **Owner:** acceptable for unattended auto-approval (quality)
- **System:** `needs_review`, verifier unresolved, hard-block reason family
- **Record as:** automation false-negative / over-conservative candidate
- **Action in this plan:** none — defer to broader Ready sample + dedicated calibration phase

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Reconciliation contract | `npx tsx --test apps/studio/.../designLibrarySmartProfileReconciliation.contract.test.ts` | yes |
| Existing Smart Profile contracts | `designSmartProfileSection.contract.test.ts` | yes |
| Studio tsc | `npx tsc --noEmit` (apps/studio) | yes |

Contract tests assert:

- `DesignLibraryPage` defines handler calling `applyDesignPatch`
- Modal receives and invokes `onSmartProfileUpdated`
- No `refreshCatalog`-only workaround in Smart Profile save path

### Manual (post-implement)

Repeat owner defect reproduction steps 1–7; expect saved value after immediate reopen.

---

## Human checkpoints

- Re-run owner Smart Profile QA on canary trio after implement (focus: close/reopen)
- Full Ready Catalog Start remains **blocked** until reconciliation QA passes

---

## Risks

| Risk | Mitigation |
|------|------------|
| Managed-search list miss when patching | Resolve design from `selectedDesign` or managed list by id |
| Dual override + patch race | Remove override-only path; parent patch is source of truth |
| Smart filter removes design from view after edit | Expected; document in QA |

## Rollback

Revert Studio-only diff; callables and Firestore unchanged.

---

## Full Ready Start readiness

**Not ready** until:

1. This corrective implemented + tested
2. Owner confirms close/reopen QA pass
3. Existing Slice 6 gates unchanged (Shadow, Autonomous OFF)

---

## Acceptance criteria (implement phase)

- [ ] Save persists and survives modal close/reopen without navigation
- [ ] Removal survives reopen
- [ ] Reset uses same reconciliation path
- [ ] No page reload workaround
- [ ] No lifecycle / root metadata / Algolia changes
- [ ] Design Library Edit Design behavior preserved

---

## FreshForge impact

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Documentation | Owner QA record only |
| Development History | This plan + review |
