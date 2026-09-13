# Review: Portal Upcoming Shows calendar — today highlight + load performance

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly traces `/shows` → `ShowDesignsPageContent` → `OurShowsCalendar` → shared `listPortalPublicShows` + existing 5-minute client cache, and verifies the owner’s “slow load” against source and DEV measurements rather than spinner-only speculation. Primary approved fix is Portal-only: render the calendar shell immediately, hydrate show metadata afterward, strengthen today’s visual/a11y cue, optionally add stale-while-revalidate on the existing cache. No second public-show API, no Rules/index/migration, no Functions deploy, and no `minInstances` without a separate owner decision.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Today polish + verified load work; out-of-scope infra explicit |
| Architecture alignment | pass | Reuses Portal service → callable; no layer violation |
| Security impact addressed | pass | Public DTO only; no staff cache; no Rules relaxation |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Residual cold/handler cost documented; not required for primary UX |
| Test strategy adequate | pass | Deterministic today + shell-first + cache; Owner QA for feel |
| Human checkpoints identified | pass | Owner visual/load QA; optional minInstances decision |
| Roadmap alignment | pass | Portal polish; deferred goals untouched |
| Documentation plan | pass | Minimal |
| No silent scope expansion | pass | Backend slim / minInstances deferred |

---

## Root-cause verification (against source + measurements)

| Claim | Verified? | Evidence |
|-------|-----------|----------|
| Calendar hidden until shows load | **Yes** | `ShowDesignsPageContent` mounts calendar only when `!isLoading && !error` |
| Calendar grid does not need show data | **Yes** | `buildCalendarMonthWeeks(year, month, showDateKeys, now)` — empty set OK |
| Gen2 callable involved | **Yes** | `portalShowDesignsService` → `listPortalPublicShows` |
| Cold start material | **Yes** | DEV logs: instance start → TCP probe **~3.3–5.2s**; AUTOSCALING scale-from-zero |
| Handler cost after warm | **Yes** | Live DEV HTTPS invoke: **~0.55–0.95s**; log 200 latencies **~1.3–2.4s** near cold events; **41 shows** |
| Duplicate calendar-page fetches | **No (not a primary bug)** | Single `useEffect([])`; cache dedupes concurrent |
| Month nav refetches | **No** | Local month state only |
| Existing public API sufficient | **Yes** | DTO already has schedule + status + design count |
| Competing new API needed | **No** | Do not add |
| Today too subtle | **Yes** | `.is-today` only recolors day number |
| Cache already exists | **Yes** | `portalPublicShowsReadCache` TTL 300s + inFlight |
| Spinner-only fix adequate | **No** | Rejected; plan reduces blocking work/UX correctly |

**Verdict on performance narrative:** Approved primary work targets the **verified** page-level block + optional cache SWR. Backend design-count aggregation and cold start remain residual causes of **metadata** delay; addressing them with minInstances or backend rewrite is **not** required to approve this plan.

---

## Architecture Review

**Findings:**

- Correct reuse of `listPortalPublicShows` / Discover-shared cache — no undo of rail performance work.
- Shell-first preserves architecture: UI can render geometry; services still own fetch.
- Timezone: Formal Review confirms calendar day keys and today use **browser local** `toLocalDateKey`; wire times are ISO UTC. Preserve; do not silently switch to America/Chicago for today.

**Required changes:**

- [x] None

---

## Security Review

**Findings:**

- Callable remains public, catalog-safe DTO (no printRequest/customer upload IDs in list).
- In-memory cache of public shows only — acceptable.
- No Firestore/Storage Rules changes.

**Required changes:**

- [x] None

**Human approval needed before production:**

- [x] None for this DEV Portal-only goal (production still NOT AUTHORIZED separately)

---

## Data Model Review

**Findings:**

- No entity/schema changes.

**Required changes:**

- [x] None

---

## Backend Review

**Findings:**

- Query: `upcomingShows.scheduledStartAt >= pastWindowStart` + allocation/design count aggregation — efficient enough for warm (~sub-second to ~2s); cold start dominates idle first hit.
- Indexes: no new composite required for current shape.
- **Do not approve** minInstances/cron as part of this plan.
- **Do not require** Functions deploy for implementation of approved Portal scope.

**Required changes:**

- [x] None for primary scope

**[NEEDS OWNER DECISION] (optional later):** If after shell-first Owner QA, cold **metadata** hydrate is still unacceptable, evaluate `minInstances: 1` on `listPortalPublicShows` with cost/benefit — stop and ask; do not auto-add.

---

## Testing Review

**Findings:**

- Plan covers today hierarchy, a11y, shell-before-data, cache, month nav non-clear, count mapping, error localization.
- Correctly excludes live Firebase ms from CI gates.

**Required changes:**

- [x] None

---

## Documentation Review

**Findings:**

- STYLE_GUIDE touch optional; workflow artifacts sufficient for behavior change at this scale.

---

## Required Changes (if approved_with_changes)

_None — verdict is approved._

---

## Blockers (if blocked)

_None._

---

## Implementation binding (approved scope)

Implement **only**:

1. Today visual + `aria-current="date"` (+ label) per plan contract  
2. Calendar shell before show hydration; localized loading; no full-calendar hide for data wait  
3. Optional stale-while-revalidate on existing public-shows cache  
4. Planned tests + Owner QA  

Do **not** implement in this goal unless amended + re-reviewed:

- New public-show callable  
- Backend count rewrite  
- minInstances / warmers  
- Index/Rules changes  
- Production deploy  

---

## Verdict Rationale

Root causes are source- and measurement-backed. Proposed fixes are the smallest safe set that improve real usability (shell usable immediately; today readable) without infrastructure spend or API duplication. Residual cold metadata latency is honestly scoped as Owner-QA residual / optional decision — not papered over with a skeleton-only “fix.”

---

## Next Step

Proceed to **Implement** approved Portal scope on `development`. No Functions deploy required. Stop for Owner QA after Test phase. Production **NOT AUTHORIZED**.
