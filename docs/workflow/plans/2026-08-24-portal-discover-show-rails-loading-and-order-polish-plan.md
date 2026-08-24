# Plan: Portal Discover Show Rails Loading and Order Polish

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Managed goal | `portal-discover-show-rails-loading-and-order-polish` |
| Related | docs/workflow/reviews/2026-08-24-portal-discover-show-rails-loading-and-order-polish-review.md |
| Roadmap | Phase 8 Portal post-launch refinement |
| FreshForge impact | Documentation, Development Tooling (Portal app only) — **not** Starter Surface |

---

## Goal

Improve Portal Discover loading performance so the main Discover page and all rows above the show-specific rails render immediately, while **Next Show** and **Added to Shows This Week** load independently with localized loading states. Reverse presentation order for the compact **Added to Shows This Week** rail only, without changing View All canonical ordering.

---

## Background

Phase 8 Portal Discover show rails (Next Show + Added to Shows This Week) shipped in the 2026-08-22 show-discovery workstream. Owner observation: show rails delay perceived Discover load. This is a narrow UX/performance refinement — no new product capability, no schema changes, no production deploy in this goal.

ADR-FP-142 boundaries (public show browsing, no customer-upload exposure, login gating unchanged) must be preserved.

---

## Root-cause findings (proven from repo)

### 1. Parent-level OR gate — **primary cause**

`CatalogHomePageContent` blocks the **entire** Discover rail grid when **either** catalog home data **or** show rails are loading:

```243:244:apps/portal/features/catalog/pages/CatalogHomePageContent.tsx
      {isLoading || isShowRailsLoading ? (
        <div className="design-library-loading-state">Loading designs…</div>
```

Even when `useCatalogHomeDesigns` has resolved, the page shows a single full-section `"Loading designs…"` placeholder until `usePortalShowHomeRails` completes. This is not a CSS hide — it replaces all rails with one loading block.

### 2. Combined show-rail loading flag — **secondary cause**

`usePortalShowHomeRails` exposes one `isLoading` boolean for both rails. Both rails appear or disappear together; neither can render while the other is still pending.

### 3. Sequential service aggregation — **secondary cause**

`loadPortalShowHomeRails` performs work in one async function:

1. `await portalShowDesignsService.listPublicShows()`
2. Resolve Next Show → `await hydrateShowDesigns([nextShow.id])`
3. Resolve This Week → `await hydrateShowDesigns(weekShows.map(...))` (sequential after step 2)

A slow This Week hydrate delays Next Show from being returned even if the hook/page did not OR-gate (today it does).

### 4. Not the cause (ruled out)

| Mechanism | Finding |
|-----------|---------|
| Next.js Suspense on Discover route | `apps/portal/app/(app)/page.tsx` wraps page in Suspense with generic fallback; client `CatalogHomePageContent` owns rail loading — Suspense is not the show-rail blocker once client mounts |
| `useCatalogHomeDesigns` awaiting show data | Independent — only loads home discovery pool + category rails |
| Shared array mutation for ordering | Not present today; ordering risk is future regression if reversal mutates in place |

---

## Scope

### In scope

1. Decouple show-rail loading from the main Discover rail grid gate.
2. Independent loading states and resolution for Next Show and This Week.
3. Localized rail loading copy per owner spec.
4. Presentation-only reversal for compact This Week rail.
5. Focused automated tests for loading isolation and ordering contract.
6. Portal manual DEV QA at localhost:3100 before signoff.
7. Workflow state + handoff doc updates per FreshForge signoff rules.

### Out of scope

- Discover redesign, Design Library ordering changes, Next Show ordering changes.
- View All canonical ordering changes (must remain as today).
- Our Shows, show allocation logic, print requests, Firestore schema, new Cloud Functions, new indexes, production deploy, Studio, Phase 9, separate upcoming bug phase.

---

## Affected areas

### Files / modules (expected)

| File | Change |
|------|--------|
| `apps/portal/features/catalog/pages/CatalogHomePageContent.tsx` | Remove OR gate; render base rails when catalog ready; insert show rails with per-rail loading/empty/error; apply presentation reversal for This Week |
| `apps/portal/features/show-designs/hooks/usePortalShowHomeRails.ts` | Split into per-rail async state (`nextShow`, `thisWeek`) with independent `isLoading` / `error` / `rail` |
| `apps/portal/features/show-designs/services/portalShowDiscoveryContent.ts` | Split `loadPortalShowHomeRails` into `loadPortalNextShowRail` + `loadPortalShowsThisWeekRail`; add non-mutating presentation helper; mark This Week rail with `reversePresentationOrder: true` |
| `apps/portal/features/show-designs/services/portalShowDiscoveryContent.test.ts` | **New** — loader split, presentation helper, ordering contract |
| `apps/portal/features/catalog/pages/CatalogHomePageContent.showRails.test.ts` | **New** — containment: no `isShowRailsLoading` OR gate; localized loading copy present |
| `apps/portal/styles/catalog.css` | **Optional minor** — rail-scoped loading wrapper inside `.catalog-discovery-section` if layout jump needs min-height (only if manual QA shows jump) |

**Not modified (by design):**

- `apps/portal/features/show-designs/hooks/useCatalogShowDesigns.ts` — View All path unchanged
- `loadCatalogShowDesigns` canonical ordering — unchanged
- `packages/shared/src/utils/portalShowDiscovery.ts` — show selection logic unchanged
- Backend / Cloud Functions

### Architecture impact

- **Hooks layer:** `usePortalShowHomeRails` returns structured per-rail state instead of a single `rails[]` + `isLoading`.
- **Services layer:** Two focused loaders replace one aggregator; shared private helpers (`hydrateShowDesigns`, `takeRailDesigns`) remain.
- **UI layer:** Discover page composes base rails + show rail slots; show errors scoped per rail (page-level `showRailsError` OR removed in favor of per-rail error text).
- **No layer violations:** Firebase/callable access stays in services; components render only.

### Security impact

- [x] None — same public callables (`listPortalPublicShows`, `listPortalShowCatalogDesigns`) and same hydration path (`getReadyDesignsByIds` omits non-ready/denied). No new endpoints or relaxed rules.

### Data model impact

- [x] None

### Backend impact

- [x] None — may result in two parallel `listPortalPublicShows` calls on Discover load (acceptable tradeoff for independence; see Risks).

### UI / UX impact

- Discover header, search, and non-show rails render without waiting for show rails.
- Per-rail loading messages:
  - Next Show: `"Loading Next Show designs…"`
  - This Week: `"Loading this week's designs…"`
- Reuse existing `.design-library-loading-state` inside `.catalog-discovery-section` shell for theme/responsive consistency.
- Compact This Week rail displays reversed presentation order.

### Migration impact

- [x] None

---

## Approach

### Step 1 — Split service loaders

In `portalShowDiscoveryContent.ts`:

1. Extract existing logic into:
   - `loadPortalNextShowRail(): Promise<PortalShowHomeRail | null>`
   - `loadPortalShowsThisWeekRail(): Promise<PortalShowHomeRail | null>`
2. Each loader independently:
   - Calls `listPublicShows()`
   - Applies existing shared selectors (`findNextUpcomingShowWithDesigns`, `findShowsThisWeekWithDesigns`)
   - Hydrates via existing `hydrateShowDesigns` + `takeRailDesigns`
3. Set `reversePresentationOrder: true` on This Week rail object only.
4. Add pure helper:

   ```typescript
   export function designsForShowHomeRailPresentation(
     rail: PortalShowHomeRail,
   ): CatalogDesign[] {
     return rail.reversePresentationOrder
       ? [...rail.designs].reverse()
       : rail.designs;
   }
   ```

5. Deprecate/remove monolithic `loadPortalShowHomeRails` (update sole consumer — the hook).

**View All contract:** `loadCatalogShowDesigns({ showsThisWeek: true })` and `useCatalogShowDesigns` remain untouched. Canonical list order stays the hydrated order from show schedule + allocation order.

### Step 2 — Independent hook loading

Refactor `usePortalShowHomeRails`:

```typescript
export interface PortalShowHomeRailSlot {
  error: string | null;
  isLoading: boolean;
  rail: PortalShowHomeRail | null;
}

export function usePortalShowHomeRails(): {
  nextShow: PortalShowHomeRailSlot;
  thisWeek: PortalShowHomeRailSlot;
}
```

- Two `useEffect` blocks (or one effect with two non-awaited parallel IIFEs), each with its own `isLoading` / `error` / `rail` state.
- No shared `isLoading` across rails.
- Cancellation on unmount per effect.

### Step 3 — Discover page render boundary

Refactor `CatalogHomePageContent`:

1. **Catalog gate only:** `{isLoading ? <design-library-loading-state>Loading designs…</design-library-loading-state> : ...}` — remove `isShowRailsLoading` from this condition.
2. Build `discoveryRails` + `categoryRails` as today (no show data dependency).
3. Render rails in document order:
   - Discovery mode sections up to and including **New** (if present)
   - **Next Show slot** (always at insert position after New — see step 4)
   - Remaining discovery mode sections
   - Category rails
   - **This Week slot** — **relocate to current insert behavior**

**Insert position (preserve current product behavior):** Today both show rails splice into discovery at `newIndex + 1`. Plan keeps that: both show rail slots render at that index in order (Next Show, then This Week), even while loading.

4. **Per-rail slot rendering:**

   | State | Next Show | This Week |
   |-------|-----------|-----------|
   | `isLoading` | Section shell + `"Loading Next Show designs…"` | Section shell + `"Loading this week's designs…"` |
   | `rail` with designs | Normal `CatalogDiscoveryCarousel` | Carousel with `designsForShowHomeRailPresentation(rail)` |
   | `rail` null, not loading | Omit section (empty — no designs this week / no next show) | Omit section |
   | `error` | Inline `portal-error` within section; omit carousel | Same |

5. Remove page-level `showRailsError` OR aggregation unless we keep it as non-blocking banner — **prefer per-rail error only** to match bounded failure acceptance criteria.

6. Extract a small internal helper or component (same file unless it grows):

   ```typescript
   function CatalogDiscoveryRailLoadingSection({ title, message }: { title: string; message: string })
   ```

   Uses `catalog-discovery-section` header + `design-library-loading-state` body so layout matches loaded rails.

### Step 4 — Ordering implementation

- **Compact This Week rail:** call `designsForShowHomeRailPresentation(rail)` at map time in `CatalogHomePageContent` only.
- **View All:** no change — continues using `useCatalogShowDesigns` → `loadCatalogShowDesigns` unmodified array.
- **Never** call `.reverse()` on `rail.designs` in place.

### Step 5 — Tests

See Test Strategy below.

### Step 6 — Manual DEV QA

Owner checkpoint at localhost:3100 per acceptance criteria (9 scenarios).

---

## Proposed asynchronous-loading boundary

```
CatalogHomePageContent
├── useCatalogHomeDesigns ──► gates ONLY catalog pool + category rails
├── usePortalShowHomeRails
│   ├── nextShow effect ──► loadPortalNextShowRail() ──► independent isLoading/error/rail
│   └── thisWeek effect ──► loadPortalShowsThisWeekRail() ──► independent isLoading/error/rail
└── Render tree
    ├── [catalog loading] if isLoading
    └── [catalog ready]
        ├── discovery rails (through New)
        ├── Next Show slot (loading | carousel | omit)
        ├── remaining discovery rails
        ├── category rails
        └── (This Week is inserted with Next Show after New — both slots at splice index)
```

**Note on insert order:** Current code splices **both** show rails together after New. Implementation preserves that visual order: Next Show first, This Week second, at the same index block.

---

## Proposed This Week rail-only ordering

| Surface | Order source | Transform |
|---------|--------------|-----------|
| Compact Discover rail | `PortalShowHomeRail.designs` from `loadPortalShowsThisWeekRail` | `designsForShowHomeRailPresentation()` → `[...designs].reverse()` when `reversePresentationOrder` |
| View All (`discover=showsThisWeek`) | `loadCatalogShowDesigns` → `hydrateShowDesigns` | **None** — canonical hydrated order preserved |

---

## Test strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused new tests | `npx tsx --test apps/portal/features/show-designs/services/portalShowDiscoveryContent.test.ts apps/portal/features/catalog/pages/CatalogHomePageContent.showRails.test.ts` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |
| Portal build | `npm run build:portal` | yes |
| git diff hygiene | `git diff --check` | yes |

**New unit tests (`portalShowDiscoveryContent.test.ts`):**

- `designsForShowHomeRailPresentation` returns new array when reversing (source unchanged).
- `designsForShowHomeRailPresentation` passthrough when flag false/absent.
- Loader functions are exported and structurally distinct (smoke / mock-free pure paths where possible).

**New containment tests (`CatalogHomePageContent.showRails.test.ts`):**

- Page does **not** contain `isLoading || isShowRailsLoading` (or equivalent combined gate).
- Page contains `"Loading Next Show designs…"` and `"Loading this week's designs…"`.
- Page uses `designsForShowHomeRailPresentation` or equivalent for This Week mapping (not in-place `.reverse()` on rail.designs).

**Hook tests (optional if hook logic is thin):** Prefer service + containment tests; add hook test only if effect isolation needs coverage.

### Manual (owner DEV QA — required before signoff)

1. Hard-refresh Discover — upper content renders while show rails loading.
2. Next Show pending — localized loading copy.
3. This Week pending — localized loading copy.
4. Next Show finishes first — usable without This Week.
5. This Week finishes — compact rail reversed vs Next Show direction.
6. View All from This Week — canonical order unchanged (newest-to-oldest as established today).
7. Guest session — public Discover intact, no private data.
8. Desktop + narrow mobile.
9. Light + dark themes.

---

## Human checkpoints anticipated

- [x] Manual UI/UX review — owner DEV QA at localhost:3100 (required before signoff)
- [ ] Production deploy — **explicitly out of scope**
- [ ] Database migration — none
- [ ] Auth / secrets — none

---

## Risks and mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Duplicate `listPortalPublicShows` calls (2× on Discover load) | low | Accept for independence; callable is lightweight summary list; monitor if needed in future optimization phase |
| Layout shift when rail loading → loaded | low | Reuse `catalog-discovery-section` shell; add min-height in CSS only if QA shows jump |
| Accidental in-place reverse mutates View All cache | medium | Pure helper + spread copy; test asserts source unchanged |
| Per-rail error UX inconsistent with rest of Portal | low | Use existing `portal-error` within section; do not block other rails |
| Insert-position regression (show rails no longer after New) | medium | Containment test + manual QA step 1–5 |

---

## Rollback plan

Revert Portal commits for this goal. No migrations or production config. Behavior returns to combined loading gate and unified show-rail order.

---

## Documentation updates required

- [ ] `.cursor/workflow/state.md` — workflow progression
- [ ] `references/project-chatgpt-handoff/CURRENT-STATE.md` — on signoff only
- [ ] `references/project-chatgpt-handoff/13-recent-completed-work.md` — on signoff only
- [x] Permanent architecture docs — **none** (behavioral UX refinement only)

---

## Open questions

- [x] None blocking — insert position confirmed from current `homeRails` splice after `discover === 'new'`.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-08-24-portal-discover-show-rails-loading-and-order-polish-review.md`
- Verdict: pending
