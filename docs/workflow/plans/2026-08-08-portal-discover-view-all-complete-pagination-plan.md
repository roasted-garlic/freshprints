# Plan: Portal Discover / View All complete pagination (TD-031)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review 2026-08-08) |
| Workflow | managed-phase |
| Managed goal | `portal-discover-view-all-complete-pagination` (TD-031) |
| Related | `docs/workflow/reviews/2026-08-08-portal-discover-view-all-complete-pagination-plan-review.md` |
| Tech debt | `TD-031` in `docs/project/TECH_DEBT.md` |
| FreshForge impact | **Documentation** (workflow artifacts) + future **Starter Surface: none** (Portal app code only; not FreshForge starter) |

---

## Goal

Ensure every Portal Discover / View All (and ordinary `/catalog` library) filter page can reach **every** design matching the active server filters via **bounded cursor pagination**, and that the result-count badge reflects the **true matching membership**, not the first loaded page size (`DEFAULT_CATALOG_PAGE_SIZE = 40`).

Do **not** raise page size to “fix” counts. Do **not** introduce one-shot unbounded fetches. Do **not** enable Algolia.

---

## Background

After production `readyAt` backfill (R-018 resolved), New This Week membership = **45**, but View All showed **“40 designs”** and only the first page of cards. Owner recorded this as **TD-031** / PASS WITH NOTES on the backfill signoff — separate from Home/Discover population and readyAt semantics.

Prior Stage 1b-C work fixed Popular blank + category ready-order repair; it did **not** change first-page sizing or total-count seeding in `useCatalogDesigns`.

---

## Investigation — root cause (repo-proven)

### Exact customer surface

| Item | Location |
|------|----------|
| Route | `apps/portal/app/(app)/catalog/page.tsx` → `/catalog` |
| UI copy | `"Search and filters still apply to this list."` in `CatalogPageContent.tsx` (~358) when `discoveryMode \|\| categoryFilter` |
| Discover modes | URL `?discover=new\|popular\|mostLiked\|recent` (`CatalogDiscoveryMode`) |
| Hook | `useCatalogDesigns` in `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` |
| Service | `listReadyDesignsPageWithSortFallback` / `countReadyDesigns` in `catalogService.ts` |
| Existing UX | Explicit **Load more** button when `hasMore` (`CatalogPageContent.tsx` ~562–570) |

Home Discover **rails** use `listHomeDiscoveryPool` — **out of scope** (separate closed regression).

### Why the page stops at exactly 40

1. `DEFAULT_CATALOG_PAGE_SIZE = 40` is the ordinary first-page `limitCount`.
2. Firestore list uses `limit(pageSize + 1)` and returns `hasMore` / `nextCursor` correctly for further pages.
3. The UI only renders `filteredDesigns.slice(0, visibleCount)` with `visibleCount` starting at `pageSize`.
4. Further rows require **`loadMoreDesigns`** (Load more), which already exists and appends the next cursor page.

**Stopping at 40 is therefore the first-page boundary**, not a Firestore hard cap of 40 membership — **unless** `hasMore`/`nextCursor` are not consumed or are incorrectly false.

### Which component discards / mishandles `hasMore` / `nextCursor` / count

**Not discarded for paging:** `CatalogPageContent` wires `hasMore` → Load more → `loadMoreDesigns`, which passes `cursor: nextCursor` into `listReadyDesignsPageWithSortFallback`.

**Mishandled for the badge (PROVEN):** in `useCatalogDesigns` ordinary Firestore path (~234–253):

```text
setServerTotalCount(firstPage.designs.length);   // seeds badge to loaded page size (e.g. 40)
if (!hasMore || !nextCursor) { mark fully hydrated; return; }  // never calls count
void countReadyDesigns(...).then(setServerTotalCount).catch(() => {/* swallow */});
```

`matchingCount` for ordinary (non-fully-hydrated) mode is `serverTotalCount ?? filteredDesigns.length`.

So the production **“40 designs”** badge is explained by:

- **Primary:** lasting/initial total seeded from **loaded-page length**, with true total only if async `countReadyDesigns` succeeds; failures are **silent**.
- **Contributing:** if `hasMore`/`nextCursor` are false while more matches exist, count is **never** requested and Load more is **hidden** — both badge and reachability break.

For New This Week with 45 matches and working `orderBy(readyAt)` + `readyAfterMs`, the list path **should** return `hasMore=true`. Owner symptom (badge stuck at 40) is therefore most consistent with **count not updating the badge** (fail/slow/race) and/or user not using Load more; Plan still requires proving Load more works and **never** treating page length as authoritative total when aggregation is available.

### Is the defect shared by all Discover View All pages?

**Yes for badge seeding** — all ordinary Firestore library loads (Discover modes, category, single-tag, Halftone-as-primary-tag, plain `/catalog`) share `useCatalogDesigns` and the same `setServerTotalCount(firstPage.designs.length)` pattern whenever the first page is full and/or count fails.

**Reachability:** shared Load more path. Any mode that correctly returns `hasMore`/`nextCursor` can page; any mode that incorrectly clears them cannot.

### Affected vs not affected

| Surface | Affected? | Notes |
|---------|-----------|-------|
| `/catalog?discover=new` (New This Week) | **Yes** | Observed prod defect; `readyAfterMs` + `readyAt` |
| `/catalog?discover=popular\|mostLiked\|recent` | **Yes** (same hook) | Metric paths may use client membership repair |
| `/catalog?categoryId=…` View All | **Yes** | Same hook |
| Tag / Halftone (single primary tag) | **Yes** | Tag in `serverListQuery` |
| Plain `/catalog` browse | **Yes** (same count seeding) | Must not regress paging |
| Discover **home rails** | **No** (out of scope) | `listHomeDiscoveryPool` |
| Text search / multi-tag | **Separate path** | Managed search → Algolia; **OFF in prod** → fail closed. Do **not** enable Algolia in this phase |
| Studio / Functions / Rules | **No** | Out of scope |

### Badge: loaded-count vs true-count

**Currently behaves as loaded-count (or stale loaded-count)** until/unless `countReadyDesigns` wins. It is **not** guaranteed to be true membership.

### How to obtain true counts efficiently

Reuse existing **`catalogService.countReadyDesigns(listQuery)`** → Firestore `getCountFromServer` over `buildDesignFilterConstraints` (status + optional categoryId / tag / `readyAfterMs`).  
**One aggregate read per filter change** — not a full document scan. Do **not** invent a new full-collection fetch for the badge.

### Existing Portal pagination UX to reuse

**Explicit “Load more”** already on `CatalogPageContent`.  
**Do not** introduce infinite scroll or raise `DEFAULT_CATALOG_PAGE_SIZE` unless a separate product decision says so (not this plan).

### Filter persistence across pages

`serverListQuery` is rebuilt from `discoveryMode`, `categoryId`, primary tag; Load more spreads `...serverListQuery` with `cursor`. Filter / discover URL changes remount/reload via effect deps (`serverListQueryKey`, etc.) and reset cursor/designs. **Preserve this**; ensure filter changes clear `nextCursor` / `serverHasMore` / `visibleCount` (already reset at load start).

### Sort / cursor integrity

Keep `orderBy(sortField, 'desc')` + `orderBy('__name__', 'desc')` + `startAfter(sortValue, designId)` and existing client-sort repair for metric/readyAt completeness. Do **not** change sort fields or demote New This Week `readyAt` window queries.

### Second ceiling beyond 40

**Yes:** `CLIENT_SORT_MEMBERSHIP_CAP = 500` in `catalogService.ts` for client membership repair (Popular / Most Liked / incomplete readyAt repair). Designs beyond 500 matching a repaired metric membership are unreachable.  
**NTW with `readyAfterMs` skips that repair** — native cursor paging; no 500 cap on NTW.  
Document 500 as **known residual risk / optional follow-up**; do **not** expand membership cap in this phase unless review requires a hard fix for catalogs >500 (current prod ~46 ready — not blocking NTW).

### Indexes

**No new indexes expected.** readyAt composites already READY in prod; count uses filter constraints without orderBy. Only add an index if implement/test proves a missing composite for a specific filter combo.

### Algolia

Remain **OFF**. No dependency introduced. Search/multi-tag stay fail-closed until separate Algolia enablement.

---

## Answers to required Plan questions

1. **Why stop at 40?** First-page `limitCount` / `DEFAULT_CATALOG_PAGE_SIZE`; UI window starts at pageSize; further results need Load more.
2. **Who mishandles hasMore/nextCursor/count?** Paging consumers exist; **`useCatalogDesigns` seeds `serverTotalCount` from page length** and only best-effort counts when `hasMore`; swallows count errors. That produces the misleading badge and can hide incompleteness.
3. **Shared by all Discover View All?** Yes for badge/count seeding; same Load more path for reachability.
4. **Affected / not?** See table above.
5. **Badge loaded vs true?** Effectively loaded/stale-loaded until aggregate wins.
6. **Efficient true count?** Existing `countReadyDesigns` / `getCountFromServer`.
7. **UX?** Reuse **Load more**.
8. **Filter persistence?** Keep `serverListQuery` on subsequent page fetches; reset on filter change.
9. **Sort/cursors stable?** Preserve existing orderBy + `__name__` + repair paths; no demotion of NTW.
10. **Duplicate/skip prevention?** Keep existing id-dedupe on append; cursor from last page design; tests across page boundaries.
11. **Search >40?** Managed search / Algolia path — out of enablement; when Algolia on, it already pages by offset/total. With Algolia off, search fails closed (do not client-filter only first 40 as a “fix”).
12. **Firestore read impact?** Prefer **A→B**: keep 40-page fetches; +1 aggregate count per filter set; additional page reads only on Load more. Reject unbounded one-shot (**C**).
13. **Metric membership second ceiling?** Yes — **500** on repair paths; NTW window path uncapped by that constant.
14. **New indexes?** Not expected.
15. **Exact files for implementation?** See Affected Areas below.

---

## Scope

### In Scope

- Fix true matching count badge for ordinary Firestore library / Discover View All
- Ensure Load more / cursor paging exposes all matches (bounded pages)
- Preserve filter + sort + cursor integrity
- Regression tests + production follow-up QA checklist
- Update TD-031 / CURRENT-STATE / workflow state on close (implement/signoff later)

### Out of Scope

- Home rail composition / `listHomeDiscoveryPool`
- readyAt backfill / R-018 / readyAt semantics
- Algolia enablement
- Raising `DEFAULT_CATALOG_PAGE_SIZE`
- One-shot load-all
- Functions / Rules / Storage / Studio / taxonomy
- Expanding `CLIENT_SORT_MEMBERSHIP_CAP` (unless Formal Review mandates)
- Production deploy during Plan/Review/Implement source work (deploy only under later owner phrase)

---

## Affected Areas

### Files / Modules (expected)

| File | Role |
|------|------|
| `apps/portal/features/catalog/hooks/useCatalogDesigns.ts` | **Primary fix** — total count seeding; ensure hasMore vs count consistency; Load more already here |
| `apps/portal/features/catalog/pages/CatalogPageContent.tsx` | Likely **no UX pattern change**; keep Load more; verify badge wiring |
| `apps/portal/features/catalog/services/catalogService.ts` | Touch only if count/list inconsistency or paging helpers need small fix — **prefer not** to change page size |
| New/extended unit tests under `apps/portal/features/catalog/hooks/` and/or existing catalogService tests | Prove count vs page size; multi-page append; filter reset |
| `docs/project/TECH_DEBT.md` | Resolve TD-031 at signoff |
| Workflow plan/review/test/signoff artifacts | This phase |

### Architecture Impact

- [x] Details: Stay within Portal catalog hook → service layering. No new backend provider. No Algolia.

### Security Impact

- [x] None (same public ready-design reads; aggregate count already used elsewhere)

### Data Model Impact

- [x] None

### Backend Impact

- [x] None (client Firestore SDK only; no Functions)

### UI / UX Impact

- [x] Details: Badge shows true count; Load more remains the paging control; loading/end states must stay correct

### Migration Impact

- [x] None

---

## Approach

### Read-efficiency comparison (required)

| Option | Behavior | Verdict |
|--------|----------|---------|
| **A. Existing 40-page cursor** | First page 40; optional count; Load more | Keep as base |
| **B. Incremental page loading** | Same as A; fix count + ensure Load more / hasMore integrity | **Preferred** |
| **C. One-shot load all** | Unbounded / large membership fetch | **Reject** |

### Implementation steps (for Implement phase — not this pass)

1. **Count authority**
   - Do **not** leave `serverTotalCount` permanently equal to `firstPage.designs.length` when a matching aggregate is obtainable.
   - Always call `countReadyDesigns(serverListQuery)` on ordinary path after successful first page (including when `!hasMore`, so a full page of 40 with a broken cursor still surfaces a true total).
   - Prefer aggregate for badge; if count fails, show loaded length **with** Load more still driven by `hasMore`/`nextCursor`, and/or surface non-blocking count failure in logs (no silent forever-wrong total when count later succeeds).

2. **hasMore vs count consistency (defensive)**
   - If aggregate `total > allDesigns.length` and cursor paging claims end-of-list, treat as incomplete: keep or restore Load more / re-fetch next page using last design cursor where possible, or document failure for QA. Prefer fixing cursor integrity over raising page size.

3. **Preserve Load more UX**
   - No infinite scroll unless existing convention found (none for this page).
   - Keep dedupe-by-id on append.
   - On filter/discover/search-path change: reset designs, cursor, visibleCount, totals (already largely present — verify).

4. **Do not change** `DEFAULT_CATALOG_PAGE_SIZE`, Algolia flags, Home pool, readyAt backfill scripts, Rules, Functions.

5. **Tests**
   - Unit/hook tests: first page 40 of 45 → badge 45 (mock count); Load more fetches page 2; no duplicate ids; filter change resets paging.
   - Service tests only if catalogService changes.
   - Portal typecheck + touched lint + `git diff --check`.

6. **Docs / debt**
   - Mark TD-031 resolved at signoff; note residual 500 membership cap if still open.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | Portal `tsc` / package script per `docs/standards/TESTING.md` | yes |
| Lint | Touched-file eslint | yes |
| Unit tests | Focused catalog hook/service tests for paging + count | yes |
| Build | Not required for this narrow hook fix unless CI demands | no (unless CI gate) |
| Integration | n/a | no |
| E2E | n/a automated | no |
| Backend/rules | n/a | no |

### Manual (production / staging follow-up QA — after implement + deploy approval)

- [ ] New This Week with 45 matches → all 45 reachable; badge **45**
- [ ] >80 fixture (dev) → all reachable via Load more
- [ ] No duplicates / skips; order stable
- [ ] Category / tag / Halftone after page 1
- [ ] Filter change resets paging
- [ ] Navigate away/back does not corrupt paging
- [ ] Load more / end-of-results / error UI
- [ ] `/catalog` ordinary browse not regressed
- [ ] Discover rails not regressed
- [ ] No Algolia enablement

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — owner QA after App Hosting rollout of the fix (separate deploy phrase)
- [ ] Design approval — not required (reuse Load more)
- [ ] Production deploy — **required later**; not during Plan/Review/source implement
- [ ] Database migration — none
- [ ] Auth / external service — none
- [ ] Secrets — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Extra `getCountFromServer` on every filter change | low | Already intended; one aggregate per query key |
| Count fails → badge still wrong | medium | Always attempt count; defensive hasMore vs total; don’t swallow without fallback strategy |
| Metric membership >500 unreachable | low (current prod size) | Document; out of scope unless review mandates |
| Accidental unbounded fetch | high | Explicit reject of load-all; code review gate |
| Scope creep into Algolia / Home / readyAt | high | Hard out-of-scope list |

---

## Rollback Plan

Revert the Portal hook (and any tiny service) commit; redeploy previous App Hosting build. No data migration.

---

## Documentation Updates Required

- [ ] TECH_DEBT.md — resolve TD-031 at signoff
- [ ] TESTING.md — only if new test commands added
- [x] Workflow plan/review (this phase)
- [ ] Signoff + CURRENT-STATE after implement/test

---

## Open Questions

None blocking Plan → Review. Residual product note: whether to raise or paginate past `CLIENT_SORT_MEMBERSHIP_CAP` for huge catalogs — track separately if needed.

---

## Acceptance Criteria (future implementation)

- [ ] New This Week with 45 matches exposes all 45
- [ ] Result count reflects 45, not 40
- [ ] >80-match fixture can reach all results
- [ ] No duplicates / skips across page boundaries
- [ ] Ordering remains correct
- [ ] Category / tag / Halftone correct after page 1
- [ ] Supported search behavior unchanged (Algolia off → fail closed)
- [ ] Changing filters resets paging
- [ ] Navigate away/back does not corrupt paging
- [ ] Loading / error / end-of-results UI correct
- [ ] `/catalog` ordinary browse not regressed
- [ ] Discover rails not regressed
- [ ] No unbounded Firestore query
- [ ] No Algolia dependency introduced
- [ ] No production mutation/deploy during source implementation

---

## Next owner phrase (after Formal Review approval)

If Formal Review is **approved** or **approved_with_changes**:

`IMPLEMENT PORTAL DISCOVER VIEW ALL COMPLETE PAGINATION`
