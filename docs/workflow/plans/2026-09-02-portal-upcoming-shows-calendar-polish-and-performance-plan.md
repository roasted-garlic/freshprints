# Plan: Portal Upcoming Shows calendar — today highlight + load performance

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase (small-task) |
| Goal | `portal-upcoming-shows-calendar-polish-and-performance` |
| Related | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-review.md |

---

## Goal

Make the Portal **Upcoming Shows** calendar (`/shows`) easier to read by subtly brightening the **current calendar day**, and make the calendar **usable faster** by reducing real loading work / blocking — not by only changing the spinner.

---

## Background

Owner reports:

1. Ordinary date cells are dark and visually similar; **today** is hard to spot.
2. The calendar “loads for a while” before it is usable.

Prior related work (do not undo):

- Public show callables + `/shows` calendar (2026-08-22 discovery workstream)
- `portalPublicShowsReadCache` (5 min TTL + in-flight dedupe) — also used by Discover show rails
- Discover show-rails loading polish (2026-08-24) — accepted duplicate `listPortalPublicShows` on Discover for independence; cache shared
- Signoff note (2026-08-28): Portal first-load `listPortalPublicShows` remains heavy on **cold callable + backend queries**; client cache helps **repeat visits only**

`references/project-chatgpt-handoff/` is absent in this checkout; planning used live repo docs + source.

Production remains **NOT AUTHORIZED**. Smart Profiling **PARKED**. `show-queue-batch-allocation-performance` **DEFERRED**.

---

## Scope

### In Scope

1. **Today highlight** — subtle brighter treatment for the calendar day that is “today,” with a11y semantics; preserve show/status hierarchy.
2. **Performance** — measured root-cause fixes justified by source + DEV timing:
   - Render calendar **shell before** show metadata arrives
   - Improve client cache warm/stale behavior where justified
   - Do **not** invent a second public-show API
3. Deterministic tests + Owner QA checklist
4. Docs touch only if behavior contracts change (STYLE_GUIDE / TESTING notes as needed)

### Out of Scope

- Calendar redesign / legend redesign / new show product features
- `minInstances`, keep-warm cron, or other paid always-on infra **without owner decision**
- New Firestore indexes unless a new query shape requires them (current shape does not)
- Slimming/rewriting `countUniquePublicCatalogDesignsByShowId` backend (optional follow-up; not required for primary UX acceptance)
- Gallery page (`/shows/[showId]`) performance
- Studio Show Queue calendar
- Production deploy

---

## Affected Areas

### Files / Modules (expected)

| Path | Role |
|------|------|
| `apps/portal/app/(app)/shows/page.tsx` | Route shell (`Suspense` → page content) |
| `apps/portal/features/show-designs/pages/ShowDesignsPageContent.tsx` | Load gate + calendar mount (primary UX fix) |
| `apps/portal/features/show-designs/components/OurShowsCalendar.tsx` | Grid, today class, aria, month nav |
| `apps/portal/styles/our-shows.css` | Today visual contract |
| `apps/portal/features/show-designs/services/portalShowDesignsService.ts` | Callable wrapper (reuse) |
| `apps/portal/features/show-designs/services/portalPublicShowsReadCache.ts` | Existing TTL/dedupe; optional SWR |
| `packages/shared/src/utils/showCalendarGrid.ts` | `isToday` via local date keys (likely unchanged) |
| Tests under portal/shared for calendar + cache | New/extended |

### Architecture Impact

- [x] Details: Portal UI + client cache only for approved primary fix. Continues one-direction service → callable path. No new competing public-show API.

### Security Impact

- [x] Details: None material. Still uses public `listPortalPublicShows` (no auth). Cache remains in-memory public DTO only (no staff/PII). No Rules/Storage changes.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: **No Functions deploy required** for approved primary scope. Reuse existing `listPortalPublicShows`. Backend cost documented as residual cold/metadata latency; optional follow-up only.

### UI / UX Impact

- [x] Details: Today cell slightly brighter; calendar visible immediately; show counts/status hydrate when data arrives; localized loading (not full-page calendar hide). Owner visual QA required.

### Migration Impact

- [x] None

---

## Trace (exact paths)

```
apps/portal/app/(app)/shows/page.tsx
  → ShowDesignsPageContent
    → useEffect → portalShowDesignsService.listPublicShows()
      → readPortalPublicShowsCached(...)
        → callTracedFunction('listPortalPublicShows')
          → functions/src/listPortalPublicShows.ts
            → Firestore upcomingShows where scheduledStartAt >= pastWindowStart (2 months)
            → filter visibility (portalCalendarShowVisibility)
            → countUniquePublicCatalogDesignsByShowId (showAllocations in chunks + designs ready check)
    → [TODAY: blocked] PortalLoadingPanel until complete
    → OurShowsCalendar(shows)
      → showCalendarGrid.buildCalendarMonthWeeks(..., now) → day.isToday
      → ourShowsLifecycle borders/timing
      → our-shows.css (.is-today currently number color only)
```

Discover warm path (reuse, do not break):

```
usePortalShowHomeRails / portalShowDiscoveryContent
  → same portalShowDesignsService.listPublicShows()
  → same portalPublicShowsReadCache
```

---

## Answers to required plan questions

### 1. Exact Upcoming Shows route/component

- Route: **`/shows`**
- Page: `apps/portal/app/(app)/shows/page.tsx`
- Content: `apps/portal/features/show-designs/pages/ShowDesignsPageContent.tsx`
- Public browse: `isPortalPublicBrowsePath` includes `/shows` (guests OK after AuthGate bootstrap)

### 2. Exact calendar component

- `apps/portal/features/show-designs/components/OurShowsCalendar.tsx`
- Styles: `apps/portal/styles/our-shows.css`
- Shared grid: `packages/shared/src/utils/showCalendarGrid.ts`

### 3. Exact hook/service/backend path

- No dedicated hook on the calendar page — inline `useEffect` in `ShowDesignsPageContent`
- Service: `portalShowDesignsService.listPublicShows`
- Cache: `readPortalPublicShowsCached` (TTL **300_000 ms**, in-flight dedupe)
- Callable: **`listPortalPublicShows`** (Gen2 `onCall`, us-central1, no auth required)
- Backend file: `functions/src/listPortalPublicShows.ts`
- Count helper: `functions/src/lib/portalShowCatalogDesigns.ts` → `countUniquePublicCatalogDesignsByShowId`

### 4. How today is currently calculated

- `OurShowsCalendar` memos `now = new Date()` once per mount
- `buildCalendarMonthWeeks` sets `isToday: toLocalDateKey(cursor) === toLocalDateKey(now)`
- CSS applies `.our-shows-day.is-today` → **only** accent color on `.our-shows-day-number` (no brighter cell background)

### 5. Calendar timezone contract

**Preserve existing contract:**

| Concern | Contract |
|---------|----------|
| Wire `scheduledStartAt` | ISO UTC string from Firestore Timestamp (`toISOString()`) |
| Day grouping / today | **Browser local calendar date** via `toLocalDateKey` (`getFullYear/getMonth/getDate`) |
| Display times | `toLocaleTimeString(undefined, …)` / locale formatters |
| Backend past window floor | Server `Date(y, m-2, 1)` in Functions runtime (Cloud Run typically UTC) — **not** America/Chicago; unchanged by this goal |
| Auth / quotas Chicago | Unrelated to this calendar day key |

Do **not** introduce America/Chicago day keys for today unless a separate ADR changes show calendar policy. Prefer browser-local consistency with current grid.

### 6. Exact proposed today visual treatment

Subtle hierarchy (dark UI, not glow/badge):

- **Normal day:** keep existing dark cell (`color-mix` primary bg)
- **Today (no shows):** slightly lighter background + slightly stronger neutral border; keep/strengthen day-number accent
- **Today + shows:** keep existing timing fill + capacity border as primary show signal; today remains a **secondary** cue (e.g. slightly lifted base / number treatment) so status colors stay meaningful
- **“Selected”:** calendar has **no selected-day cell state** today (click opens gallery or day picker modal). Do not invent a strong selection fill that competes with today. Modal remains the multi-show selector.
- **Out-of-month:** keep `is-outside-month` opacity; today only if that adjacent-month cell is actually today (grid already sets `isToday` on those cells — keep, but visual should remain subtle under outside-month opacity)
- **a11y:** set `aria-current="date"` on today’s button; extend `aria-label` to include “Today” when applicable

### 7–10. Current timing (measured / observed)

| Metric | Evidence | Value |
|--------|----------|-------|
| Cold container start | DEV Cloud Logging `listportalpublicshows` “Starting new instance” → TCP probe | **~3.3–5.2 s** (sampled recent starts) |
| Cold/first request HTTP latency (200) after start | Cloud Logging `httpRequest.latency` on 200s colocated with cold starts | **~1.3–2.4 s** handler |
| **Cold end-to-end (approx)** | Sum of start + handler (client still blocked on full page loader) | **~5–7+ s** typical cold |
| Warm callable (live invoke 2026-09-02) | Direct HTTPS POST to DEV callable ×3 | **952 ms / 552 ms / 695 ms**; **41 shows** |
| Calendar shell today | Source: calendar not mounted while `isLoading` | **Blocked for entire fetch** (0 ms usable grid) |
| Client cache hit | `portalPublicShowsReadCache` TTL 5 min | Near-instant after await; **still flashes full `PortalLoadingPanel`** because page gates on `isLoading` |
| Month navigation network | Source: local `viewMonth`/`viewYear` state only | **No refetch** |

Auth bootstrap: `AuthGate` can show “Loading your account…” before any `/shows` content (`isInitialBootstrap` / profile load). `/shows` is public browse afterward — **auth is not required for the callable**, but bootstrap can delay first paint of the page shell.

### 11–12. Cloud Function / cold start

- **Yes**, Gen2 callable `listPortalPublicShows` is involved.
- **Yes**, cold start is materially involved on idle DEV (logged AUTOSCALING instance starts).
- Function has **no** `minInstances` (default scale-to-zero).
- **Do not** add minInstances/cron warmer in this goal without **[NEEDS OWNER DECISION]**.

### 13. Exact show query / data source

1. `upcomingShows` where `scheduledStartAt >=` first day of month **2 months ago** (unbounded future)
2. Filter archived / staff_gang_sheet / canceled/archived status; calendar visibility helper
3. For remaining show IDs: `showAllocations` `where upcomingShowId in chunk(30)` then `designs` `__name__ in chunk(30)` for ready catalog IDs (+ upload IDs counted without design fetch)
4. Return `{ id, scheduledStartAt, productionStatus, uniquePublicCatalogDesignCount }[]`

### 14. Duplicate fetching?

- Calendar page: **single** `useEffect([])` → one logical load; cache dedupes concurrent callers.
- Discover may have already warmed the same cache (good).
- No React `StrictMode` in portal `next.config.ts` (no intentional double-mount config). Dev remounts can still occur in Next; in-flight dedupe covers concurrent identical loads.

### 15. Over-fetching?

- **Not** fetching Design Library / gallery cards for the calendar (good).
- **Does** fetch full public calendar window (past 2 months → all future matching shows) + per-show design counts — more than “visible month only,” but matches product need for past shows + navigation without per-month API.
- Month change does **not** over-fetch (client-side).

### 16. Current caching

| Property | Value |
|----------|-------|
| Key | Single module singleton (no month key) |
| TTL | 300_000 ms (5 minutes) |
| Dedupe | Shared `inFlight` promise |
| Scope | In-memory per JS realm (tab/session); cleared on full reload |
| Invalidation | TTL expiry or `clearPortalPublicShowsReadCache()` |
| Shared with | Discover rails + other `listPublicShows` callers |

### 17. Month-navigation request behavior

- Immediate local state update; **no** network; **no** full refetch.
- Perceived slowness today is **first paint blocked**, not month nav itself (once calendar mounts).

### 18. Existing public-show infrastructure to reuse

- **Reuse** `listPortalPublicShows` + `portalShowDesignsService` + `portalPublicShowsReadCache`.
- **Do not** create a second public-show listing API.

### 19. Verified root cause(s)

1. **Primary UX bottleneck (source):** `ShowDesignsPageContent` hides `OurShowsCalendar` behind `isLoading` + full `PortalLoadingPanel` — calendar geometry does not need show data.
2. **Primary network bottleneck (logs + live):** Gen2 cold start (~4s) + Firestore-backed handler (~0.55–2.4s warm/cold handler). Design-count aggregation is the heavy server work after show listing.
3. **Today visibility (source/CSS):** today is only an accent on the day number — too subtle on dark cells.
4. **Cache helps warm revisit metadata, not shell:** even cache hits still go through loading gate.

### 20. Smallest safe optimization

**Portal-only, no Functions deploy:**

1. Always render calendar shell (current month from `new Date()`, empty show map OK) immediately after page content mounts.
2. Hydrate show counts/status when `listPublicShows` resolves; localized metadata loading indicator (non-blocking).
3. On cache hit / optional **stale-while-revalidate**: paint cached shows immediately; refresh in background when TTL expired (if implementing SWR — justified by current “wait for network even when stale” behavior).
4. Today CSS + `aria-current="date"` + label text.

### 21. Calendar before show data?

**Yes — required.** Grid needs only year/month/now. Preferred UX matches owner brief.

### 22. Proposed cache/dedupe strategy

- Keep existing TTL 5 min + in-flight dedupe.
- Optional enhancement: **stale-while-revalidate** — if expired cache exists, return it immediately and refresh; document that counts/status may lag up to refresh RTT (acceptable for public calendar).
- Do **not** persist to localStorage in this goal (avoid stale cross-session complexity without need).

### 23–25. Backend / Functions / Portal impact

| Area | This goal |
|------|-----------|
| Backend code | No required change |
| Functions deploy | **Not required** for primary fix |
| Portal | **Yes** — page gate, CSS, a11y, optional cache SWR, tests |

### 26–29. Rules / indexes / migration

| Area | Impact |
|------|--------|
| Firestore Rules | None |
| Storage Rules | None |
| Indexes | None new — `scheduledStartAt` range + `upcomingShowId in` use single-field / existing indexes |
| Migration | None |

### 30. Tests planned

Deterministic (node:test / existing portal patterns):

**Today**

1. Current day gets today styling class / contract
2. Non-current day does not
3. Today + shows keeps show classes readable (class composition)
4. Out-of-month today still flagged `isToday` with outside-month class (existing grid behavior)
5. Timezone/local date key boundary (shared `showCalendarGrid` tests extended as needed)
6. `aria-current="date"` (and “Today” in label) on today cell

**Performance / data**

7. Page/calendar can render with empty shows while loading (shell-first contract test)
8. Shows hydrate into counts after data arrives
9. Cache dedupe / TTL (extend existing cache test); SWR if implemented
10. Month change does not clear grid / does not call service (component/state test or page test)
11. Failed load: localized error; calendar shell remains if implemented that way
12. Existing empty-vs-populated calendar behavior regression coverage

### 31. Performance acceptance targets (DEV Owner QA; not CI Firebase ms)

| Target | Acceptance |
|--------|------------|
| Calendar shell | Visible essentially immediately after `/shows` content renders (post AuthGate bootstrap) |
| Interaction | Month prev/next usable before show metadata arrives |
| Warm / cache | Show metadata near-immediate when cache warm (<~100ms perceived after paint) |
| Cold metadata | May still take ~1–7s depending on cold start; **must not blank the calendar** |
| Counts correctness | Unchanged mapping of shows → local date keys |

### 32. Owner QA plan

See below (also mirrored in Formal Review).

---

## Approach (implementation — after review only)

1. Update `ShowDesignsPageContent` to mount `OurShowsCalendar` immediately; track `isLoading` / `error` as metadata state; avoid full-page calendar hide.
2. Adjust empty-state: prefer empty calendar + short muted message rather than replacing the whole calendar when `shows.length === 0` after load (preserves shell-first consistency).
3. Strengthen `.is-today` styles per visual contract; add `aria-current` / label.
4. Optionally enhance `readPortalPublicShowsCached` with SWR for expired entries.
5. Add/extend tests.
6. No Functions deploy unless a later approved amendment adds backend work.
7. Owner QA on DEV Portal (`npm run dev:portal`); no production.

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | None (Fresh Prints product app) |
| Development Tooling | None |
| Distribution/Installer | None |
| Documentation | Minimal product docs if STYLE_GUIDE notes today treatment |
| Development History | Workflow plan/review only |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit/contract | `npx tsx --test` on touched calendar/cache/page tests | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` (scoped if repo practice allows) | yes |
| Functions build | N/A if no Functions change | no |
| E2E / live Firebase ms in CI | — | no |

### Manual

- Owner QA checklist (visual today + first/warm load + month nav + counts)

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (today brightness + load feel)
- [ ] Design approval — light; owner QA covers
- [ ] **[NEEDS OWNER DECISION]** only if residual cold **metadata** latency remains unacceptable after shell-first → consider `minInstances: 1` cost/benefit (not in default implement scope)
- [ ] Production deploy — **NOT AUTHORIZED**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Today styling confused with show/upcoming fill | medium | Keep show borders/fills primary; today = subtle lift only |
| Layout shift when counts hydrate | low | Fixed cell geometry already; counts fill empty placeholder |
| SWR shows briefly stale counts | low | 5 min TTL already accepted; document lag |
| Cold callable still slow for counts | medium | Accepted residual; shell usable; minInstances only with owner decision |
| Empty calendar when zero shows | low | Explicit empty copy under grid |

---

## Rollback Plan

Revert Portal page/CSS/cache commits on `development`. No Rules/index/migration rollback needed.

---

## Documentation Updates Required

- [ ] STYLE_GUIDE.md — brief note on Upcoming Shows today treatment if project style docs cover Portal calendar
- [ ] TESTING.md — only if new test commands/patterns need listing
- [ ] DECISIONS.md — only if SWR or timezone ADR needed (prefer not)
- [ ] Other: workflow plan/review/signoff

---

## Open Questions

- [x] None blocking Plan → Formal Review
- [ ] Optional post-QA: **[NEEDS OWNER DECISION]** minInstances if cold metadata still too slow

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-review.md
- Verdict: **approved**
