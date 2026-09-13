# Plan: Studio Design Library archive / search consistency

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal | `studio-design-library-archive-search-consistency` |
| Related | docs/workflow/reviews/2026-09-02-studio-design-library-archive-search-consistency-review.md |

---

## Goal

Make Studio Design Library membership mutually consistent for **ready** vs **archived** across Firestore browse, managed Algolia search hydration, exact design-ID lookup, mutation reconciliation, and request-selection — so archived / image-purged designs never appear in the normal ready catalog, while Archive retains its existing contract (including ADR-FP-084 purged-browse hide).

## Background

Owner observed:

1. Designs with permanently purged images sometimes remain findable via normal Design Library search.
2. Archiving a design does not reliably remove it from the main/ready list without restart.

Product contract (this task + existing docs):

| View | Membership |
|------|------------|
| Normal Design Library | `status === "ready"` only |
| Archive | `status === "archived"` only |
| After image purge | Metadata retained; **ADR-FP-084**: purged rows leave Archive **browse** (history/thumbnail elsewhere); must never leak into ready Library/search |

Handoff package `references/project-chatgpt-handoff/` is **absent** from this checkout — audit used current `docs/` + development source.

Production: **NOT AUTHORIZED**. Smart Profiling: **PARKED**. `show-queue-batch-allocation-performance`: **DEFERRED**.

---

## Scope

### In Scope

- Studio Design Library ready/archive membership enforcement on managed search hydrate
- Archive mutation UI reconciliation when managed search is active (and browse path hardening)
- Shared membership helper reuse across hydrate / exact-ID / managed patch
- Honest managed search count adjustment when non-ready hits are discarded
- Request-selection path audit (UI + service gate) — fix only if same leak path is shared
- Unit/contract tests for membership + archive reconciliation
- Doc touch: brief note in DATA_MODEL / TESTING if behavior clarifications needed (membership rule pointer)

### Out of Scope

- Production deploy / Algolia production index edits
- Manual Algolia reconcile/backfill without owner decision
- Portal UI changes
- New Functions / Rules / Storage Rules / Firestore indexes / migrations
- Changing ADR-FP-084 (showing purged designs in Archive browse) unless owner reverses ADR
- Hard-delete of archived metadata
- Restoring Smart Profiling or deferred goals
- Full search/count system rebuild
- `window.location.reload()` workarounds

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Project docs only (`docs/architecture` / standards as needed) |
| Development History | Workflow plan/review only |

---

## Audit answers (verified against current development source)

### 1. Exact Design Library browse query (normal)

`DesignLibraryPage` → `buildCatalogDesignListQuery({ archived: false, … })` → `statusIn: ["ready"]` → Firestore `where("status", "==", "ready")` + `orderBy(readyAt|createdAt)` + `__name__` + limit.

- Page: `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` (`listQuery` ~237–247)
- Builder: `apps/studio/src/renderer/src/features/designs/constants/designLibraryFilters.ts` (`DESIGN_LIBRARY_CATALOG_STATUSES`, `buildCatalogDesignListQuery`)
- Execution: `apps/studio/src/renderer/src/features/designs/services/designService.ts` (`buildDesignFilterConstraints`, `fetchDesignListPageUncached`)

### 2. Exact Archive query

Same builder with `archived: true` → `statusIn: ["archived"]`, sort `createdAt`. Toggle: local `includeArchived` + URL `archived=true`.

**Client post-filter (Archive only):** `visibleDesigns` drops `assetsPurgedAt` rows (ADR-FP-084).

### 3. Exact archive mutation path

UI `handleArchiveConfirm` → `useArchiveDesign.archiveDesign` → `designService.archiveDesign`:

- Writes: `status: "archived"`, `previousStatus`, `archivedAt`, `archivedBy`, `updatedAt`, `updatedBy`
- `invalidateDesignReadCaches(designId)`
- UI then: `await refreshCatalog()` → `reloadDesigns()` only
- **Does not** call `removeDesignFromList` (contrast restore/purge)

### 4. Exact permanent image purge path

Archive UI → `PurgeArchivedDesignAssetsDialog` → `usePurgeArchivedDesignAssets` → callable `purgeArchivedDesignAssets` (`functions/src/purgeArchivedDesignAssets.ts`):

- Requires `status === "archived"`
- Deletes Storage originals + previews; **keeps thumbnail**
- Sets `assetsPurgedAt` / `assetsPurgedBy` only (status stays `archived`)
- No Algolia write in purge (already non-ready if archive sync ran)
- UI happy path: `removeDesignFromList` (no stale refresh)

### 5. Current normal search architecture

When `managedSearchActive` (ready catalog + non-empty search **or** tags **or** category **or** smart filters):

Algolia `listMatchingDesigns` → IDs → `hydrateStudioDesignsPreservingOrder` → `getDesignsByIds` → smart-filter consistency filter → optional exact-ID merge → Needs Companion client filter.

`useDesigns` is **disabled** while managed search is active.

### 6. Current Archive search architecture

**Page-local only.** Managed Algolia is off when `browsingArchived`. Search = `filterDesignsBySearch` over loaded Firestore archive pages. Documented in `docs/architecture/BACKEND.md`.

### 7. Current full design-ID search architecture

`looksLikeDesignDocumentId` → `fetchVisibleExactIdDesign` → `designVisibleForExactIdLibrary`:

- Normal: `status === "ready"` and **not** `assetsPurgedAt`
- Archive: `status === "archived"` and **not** `assetsPurgedAt`
- Managed path forces `browsingArchived: false`

**Does not** universal-bypass membership (already gated).

### 8. Which path(s) leak archived records

| Path | Leaks? |
|------|--------|
| Firestore ready browse | No (server `status==ready`) |
| Managed Algolia hydrate | **Yes** — no post-hydrate `status==="ready"` filter |
| Exact ID (normal) | No |
| Archive browse | No (intended archived) |
| Request-selection UI list | Same managed hydrate leak if search active |
| Print-request add service | Hard fail if `status !== "ready"` |

### 9. Why archived designs remain on main list after archive

**Verified root cause (managed-search context):** After archive, UI only `refreshCatalog()` → `reloadDesigns()`, but `useDesigns` is disabled when `managedSearchActive`. Visible list is `managedSearchDesigns`, which is never patched/removed/reloaded. Stale ready card remains until query change / Studio restart.

**Browse-only archive** (no managed search): `reloadDesigns` + cache invalidation + `status==ready` query should drop the card — lower risk.

### 10. Whether Algolia stale membership contributes

**Yes.** Index sync on leave-ready **is wired** (`syncPortalCatalogDesignToAlgolia` deletes object when `after.status !== "ready"`). Failures log only; scheduled/manual reconcile can repair. Stale objectIDs + Studio hydrate without status filter = leak. Portal hydrate already maps non-ready → null.

### 11. Whether local cache/state contributes

**Yes for archive-while-searching:** managed-search React state is the primary stale surface. Firestore page cache is invalidated on archive write; browse-only path is comparatively healthy. No full-app reload needed.

### 12. Whether direct-ID lookup bypasses active status scope

**No** for current exact-ID helper. Do not weaken it.

### 13–14. Image-purged representation / metadata retention

- Marker: `assetsPurgedAt` / `assetsPurgedBy` (no `imagesDeleted` field)
- Status remains `archived`
- Thumbnail kept; originals/previews deleted
- Metadata retention is **intentional** (ADR-FP-084)
- Archive **browse** hides purged rows (ADR) — conflict with this task brief’s “visible in Archive” wording; **preserve ADR** unless owner reverses (see Open Questions)

### 15. Proposed authoritative membership helper

Introduce (or centralize) a small helper used by managed hydrate + managed patch + exact-ID (exact-ID already close):

```ts
// Conceptual
designMatchesLibraryScope(design, { scope: "ready" | "archived" }): boolean
// ready: status === "ready"
// archived: status === "archived" (browse may additionally exclude assetsPurgedAt per ADR)
```

Prefer one ownership module under `features/designs/utils/` rather than five divergent checks.

### 16. Exact mutation reconciliation after archive

On successful archive from `DesignLibraryPage`:

1. Close archive confirm / details per existing conventions
2. **Always** remove id from Firestore list state via `removeDesignFromList` (parity with restore/purge)
3. **If managed search active:** drop from managed list (`applyManagedSearchPatch` status-aware drop, or explicit remove + decrement total) and/or `managedSearch.reload()`
4. Decrement ready `libraryTotal` when applicable
5. Keep `refreshCatalog()` optional as secondary consistency — must not be the sole mechanism when managed search owns the grid

### 17. Search result post-hydrate filtering

After Studio hydrate (and on Load More), discard any design where `status !== "ready"` (defense in depth even if Algolia is correct). Do **not** re-apply text search on Algolia hits (existing Slice 3 contract).

### 18. Search result count implications

Today `total` uses Algolia `nbHits` with smart-filter drop adjustments only. Status drops must adjust the same way (decrement displayed total for discarded non-ready hits on the page; avoid advertising raw `nbHits` as valid ready count when discards occur). Prefer smallest change mirroring existing `droppedAlgolia` pattern — not a full count redesign.

### 19. Request-selection safety

- Mode forces `archived: false` / ready query
- Shares managed search path → needs same hydrate filter
- `printRequestService` already rejects non-ready adds — keep; do not rely on UI alone

### 20. Restore behavior

Exists: `designService.restoreDesign` + `useRestoreDesign`. Restores via `resolveRestoreStatus` (not invent `ready` blindly). Blocks if `assetsPurgedAt`. Archive view removes via `removeDesignFromList`. **Do not change restore semantics** except ensuring symmetry if ready membership helper is shared.

### 21. Portal / public catalog impact

Same Algolia index. Portal already status-gates hydrate. Customers should not see archived cards even with stale IDs. Stale IDs may inflate Portal `nbHits` until delete/reconcile — **flag only**; no Portal UI work in this goal.

### 22. Functions impact

**None required** for Studio fix. Archive→Algolia delete already exists. No new Function deploy for this Studio membership fix.

### 23. Algolia / index mutation impact

Prefer **defense in depth**:

- **A (required):** Studio post-hydrate `status === "ready"` enforcement
- **B (already present):** index delete on leave-ready — do not add new infrastructure
- Optional owner-run reconcile if stale IDs suspected → **[NEEDS OWNER DECISION]** (do not auto-run)

### 24–26. Firestore Rules / Storage Rules / indexes

**No changes expected.**

### 27. Migration / backfill

**None** for Firestore. Algolia reconcile is optional owner action, not a code migration.

### 28. Tests (planned)

| # | Coverage |
|---|----------|
| Unit | Membership helper: ready / archived / purged / imported / rejected |
| Unit | Hydrate / managed filter drops non-ready |
| Unit | Count adjustment when non-ready discarded |
| Contract | `handleArchiveConfirm` reconciles managed list (remove/reload), not refresh-only |
| Existing | Exact-ID tests remain green; extend if helper moves |
| Existing | Archive restore/purge contract tests updated if archive path changes |
| Matrix | Map owner items 1–20 into unit/contract + Owner QA |

### 29. DEV deploy / restart scope

- Studio renderer only (no Functions/Rules deploy for core fix)
- Local Studio restart to pick up renderer changes
- No production

### 30. Owner QA

Disposable DEV design checklist (see Manual below). Adjust purge step H to ADR-FP-084 unless owner reverses.

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/src/renderer/src/features/designs/utils/designLibraryExactIdSearch.ts` and/or new `designLibraryMembership.ts`
- `apps/studio/src/renderer/src/features/designs/services/studioAlgoliaCatalogSearchService.ts`
- `apps/studio/src/renderer/src/features/designs/hooks/useDesignLibraryManagedSearch.ts`
- `apps/studio/src/renderer/src/features/designs/pages/DesignLibraryPage.tsx`
- Related unit/contract tests under `features/designs/`
- Optional: `docs/architecture/DATA_MODEL.md` or `docs/standards/TESTING.md` membership pointer

### Architecture Impact

- [x] Details: reinforce Firestore status as authority over Algolia membership; shared membership helper; no layer violations

### Security Impact

- [x] Details: prevents archived/purged catalog designs from being selected via stale search UI; service-layer ready gate already exists

### Data Model Impact

- [ ] None (no schema change; clarify membership/purge browse contract if docs need a cross-link)

### Backend Impact

- [ ] None required (existing Algolia sync unchanged)

### UI / UX Impact

- [x] Details: archive removes card immediately from ready/managed grid; ready search no longer shows archived/purged; Archive browse purge-hide preserved per ADR

### Migration Impact

- [ ] None (optional Algolia reconcile is owner decision, not automatic)

---

## Approach

1. Add/centralize `designMatchesLibraryScope` (ready vs archived).
2. Apply ready scope after Studio Algolia hydrate (initial page + Load More); adjust totals for discarded hits.
3. Make `applyDesignPatch` drop designs that leave ready scope (or archive handler explicitly removes).
4. Fix `handleArchiveConfirm` to locally reconcile Firestore list **and** managed search state (no reload-only).
5. Keep exact-ID gates; wire to shared helper if extracted.
6. Add/update tests; record Owner QA checklist.
7. Do **not** change Archive purged-browse hide without owner ADR reversal.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | Studio/workspace typecheck script per `TESTING.md` | yes |
| Lint | if configured | yes if present |
| Unit tests | focused design-library membership / managed search / exact-id / archive contract | yes |
| Build | Studio build if required by project scripts | as documented |
| Integration | no | |
| E2E | no | |
| Backend/rules | no (no Rules change) | |

### Manual

Owner QA on disposable DEV design:

| Step | Expected |
|------|----------|
| A Ready visible in normal Library | yes |
| B Search finds it | yes |
| C Archive → disappears from normal list immediately | yes |
| D Same search in normal mode | no result |
| E Paste full design ID in normal mode | no result |
| F Switch to Archive | appears (non-purged) |
| G Archive search (page-local) | findable per loaded pages |
| H Delete images | **ADR:** disappears from Archive browse; thumbnail+metadata retained for history; **never** in normal Library/search |
| I Normal search after purge | never appears |
| J Request-selection | cannot select archived/purged |
| K Restore (non-purged) | returns to ready membership |

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — Owner QA after implement/test
- [ ] Design approval
- [ ] Business logic decision — **only if** owner wants purged designs browsable in Archive (reverses ADR-FP-084)
- [ ] Production deploy — **NOT AUTHORIZED**
- [ ] Database migration — no
- [ ] Other: optional Algolia reconcile run — **[NEEDS OWNER DECISION]** if desired

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale Algolia IDs remain until reconcile | Medium | Studio status filter removes UI leak; Portal already filters |
| Count under/over after status discard | Low | Mirror smart-filter drop math |
| Archive browse-only path regression | Low | Keep Firestore query; add local remove as belt-and-suspenders |
| Misreading purge visibility as bug | Medium | Preserve ADR; document Owner QA H |

---

## Rollback Plan

Revert Studio renderer commits on `development`. No Rules/Functions/index changes to roll back for the core fix.

---

## Documentation Updates Required

- [ ] DATA_MODEL.md — optional cross-link that Studio ready search must treat Firestore status as authority
- [ ] TESTING.md — optional note for membership tests
- [ ] DECISIONS.md — only if owner reverses ADR-FP-084 purge browse hide
- [x] Workflow plan/review (this goal)

---

## Open Questions

- [x] **[NEEDS OWNER DECISION]** Run Algolia reconcile (`reconcilePortalCatalogAlgoliaIndex`, dry-run first) to scrub stale archived objectIDs? **Not required** to fix Studio visibility once post-hydrate filter ships. Do not auto-run.
- [x] **[NEEDS OWNER DECISION]** Task brief says purged designs “visible in Archive”; ADR-FP-084 / DATA_MODEL / SECURITY say Archive browse **hides** purged. **Plan default: preserve ADR.** Owner must explicitly reverse ADR to change Archive browse visibility.

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-studio-design-library-archive-search-consistency-review.md
- Verdict: pending
