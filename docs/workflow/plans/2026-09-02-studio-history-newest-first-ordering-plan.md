# Plan: Studio history newest-first ordering

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal slug | `studio-history-newest-first-ordering` |
| Related | docs/workflow/reviews/2026-09-02-studio-history-newest-first-ordering-review.md |

---

## Goal

Make historical Studio lists show the most recent item first:

1. **Internal Gang Sheets → History** — newest / most recently completed sheet at the top.
2. **Past Shows** — newest past show at the top (**audit first**; no-op if already correct).
3. **Upcoming Shows** — **no behavioral change**.

---

## Background

Owner observes Internal Gang Sheet History with older cycles above newer ones (e.g. #4 above #5). Past Shows may already be newest-first. Upcoming ordering must stay exactly as today.

---

## Audit findings (source of truth)

### Shared list load

| Layer | Path | Behavior |
|-------|------|----------|
| Hook | `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useUpcomingShows.ts` | Calls `upcomingShowService.listUpcomingShows` |
| Service | `apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.ts` → `listUpcomingShows` | Full-collection `getDocs` (no Firestore `orderBy`), then **client** `sortUpcomingShowsForDisplay` |
| Page | `apps/studio/src/renderer/src/features/upcoming-shows/pages/UpcomingShowsPage.tsx` | Filters by surface; partitions Current/History or Upcoming/Past; Past re-sorts |

Route: `/internal-gang-sheets` and `/show-queue` both render `UpcomingShowsPage` with `lockedSurface` (`AppRoutes.tsx`).

### 1. Internal Gang Sheets — Current / History

| Item | Detail |
|------|--------|
| Component | `UpcomingShowsPage.tsx` (`lockedSurface="staff_gang_sheets"`) |
| Partition | `staffShowsByListTab` (~L511–522): `open`/`full`/`printing` → Current; else → History |
| Current ordering | **No dedicated sort.** Inherits `listUpcomingShows` → `sortUpcomingShowsForDisplay` (`scheduledStartAt` ASC; missing schedule → `id` ASC). Staff sheets usually lack `scheduledStartAt`, so History is effectively **id ascending** → older docs toward top. |
| History ordering today | Same as above — **not** completion-newest-first. Matches owner report. |
| Authoritative chronology | **`printFinishedAt`** on `upcomingShows`. Set on Mark Complete / `completeStaffGangSheetAndOpenNext` (`productionStatus: "completed"`, `printFinishedAt: serverTimestamp()`). Typed on `UpcomingShow` and mapped in `upcomingShowService`. |
| Not used as primary | Display cycle `#N` / `staffGangSheetCycleNumber` alone — monotonic in happy path, but completion timestamp is the explicit finish field. Do not sort by title string. |

### 2. Past Shows

| Item | Detail |
|------|--------|
| Component | Same page, Whatnot surface (`lockedSurface="shows"`), Past tab |
| Partition | `partitionWhatnotShowsByQueueTab` → `showsByScheduleTab.past` |
| Sort | **Already** `sortPastShowsForDisplay` → `scheduledStartAt` **descending** (unscheduled last; `id` tie-break when both unscheduled) in `upcomingShowListSort.ts` |
| Needs code change? | **No** — already satisfies newest-first by schedule. |

### 3. Upcoming Shows

| Item | Detail |
|------|--------|
| Component | Same page, Upcoming tab |
| Ordering | `listUpcomingShows` applies `sortUpcomingShowsForDisplay` (`scheduledStartAt` **ASC**, unscheduled last). Partition preserves input order for `upcoming`. |
| Change | **None.** Add regression coverage so History work cannot reverse this. |

---

## Scope

### In Scope

- Client-side sort for **Internal Gang Sheet History only** (prefer pure util + wire in `staffShowsByListTab`).
- Focused unit tests (History newest-first, ties, Current unchanged, Past regression, Upcoming regression, empty/single).
- Owner QA checklist for Studio History + Past + Upcoming visual confirm.

### Out of Scope

- Upcoming Shows ordering, grouping, filtering, UI.
- Current-tab Internal Gang Sheet ordering changes (beyond leaving partition as-is).
- Functions, Firestore rules, Storage rules, new indexes, migrations, new APIs.
- Sorting by cycle number alone as primary key.
- Portal surfaces.

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `apps/studio/.../upcoming-shows/utils/upcomingShowListSort.ts` | Add `sortStaffGangSheetHistoryForDisplay` (`printFinishedAt` DESC; missing finish last; deterministic `id` tie-break per existing convention; optional cycle desc only as secondary when finishes equal/missing — document in code) |
| `apps/studio/.../upcoming-shows/utils/upcomingShowListSort.test.ts` | History + regression cases for Past/Upcoming |
| `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` | Apply history sort inside `staffShowsByListTab` only: `history: sortStaffGangSheetHistoryForDisplay(history)` |

### Architecture Impact

- [x] None beyond existing client sort pattern (same layer as Past Shows).

### Security Impact

- [x] None — display order only; no auth/rules/data exposure change.

### Data Model Impact

- [x] None — no new fields; use existing `printFinishedAt`.

### Backend Impact

- [x] None — Functions **NO**; Rules **NO**; indexes **NO**.

### UI / UX Impact

- [x] Details: History rail order flips to newest-first. Current / Upcoming / Past (already correct) unchanged.

### Migration Impact

- [x] None. Legacy History rows without `printFinishedAt` sort after finished rows (same pattern as unscheduled-last on Past); among unfinished-history, use existing deterministic tie-breaks — no backfill required.

---

## Approach

1. Add `sortStaffGangSheetHistoryForDisplay(shows)` next to existing list sort helpers:
   - Primary: `printFinishedAt.toMillis()` **descending**.
   - Missing `printFinishedAt`: after all finished (like unscheduled-last).
   - Tie / both missing: prefer `staffGangSheetCycleNumber` descending when both are valid integers (stable chronology for non-finished terminal statuses), then `id.localeCompare` (existing convention).
2. In `UpcomingShowsPage` `staffShowsByListTab`, sort **history** only; leave **current** array order unchanged.
3. Do **not** touch `showsByScheduleTab.upcoming` or Past sort wiring.
4. Extend `upcomingShowListSort.test.ts` (and contract assertion on page if useful) per Test Strategy.
5. Owner QA on Studio DEV.

**Indexes:** Not required — client sort after existing full-collection read.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit | `npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/upcomingShowListSort.test.ts` | yes |
| Typecheck / lint | Project Studio scripts as applicable for touched files | yes if routinely run for Studio |
| Functions / rules | n/a | no |

### Cases to cover

1. History with 3 records → newest `printFinishedAt` first.
2. Equal `printFinishedAt` → deterministic tie-break (cycle / id per helper contract).
3. Current partition / ordering not rewritten by history helper (Current list not passed through history sort).
4. Past Shows → still `scheduledStartAt` DESC (existing tests + keep).
5. Upcoming → still `scheduledStartAt` ASC (existing tests + keep / strengthen).
6. Empty history → `[]`.
7. Single historical item → identity.

### Manual

- Owner QA on Studio Internal Gang Sheets History + Show Queue Past + Upcoming (see checklist below).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Owner QA after implement/test)
- [ ] Design approval
- [ ] Business logic decision — **none** (`printFinishedAt` is authoritative)
- [ ] Production deploy — **NOT AUTHORIZED**
- [ ] Database migration
- [ ] Auth / external service setup
- [ ] Secrets / env vars

---

## Owner QA checklist (planned)

1. Internal Gang Sheets → History: newest completed sheet at top; older below; oldest at bottom.
2. Current tab: still shows the active sheet(s); no unexpected reorder vs today for the single active case.
3. Show Queue → Past: newest scheduled past show still at top (regression).
4. Show Queue → Upcoming: soonest / ascending schedule unchanged (regression).
5. Empty History and single History item behave sanely.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental Upcoming reverse | Medium | Do not edit upcoming sort path; regression tests |
| Legacy History without `printFinishedAt` | Low | Missing-finish last + cycle/`id` fallback; no migration |
| Confusing cycle # with chronology | Low | Document primary field is `printFinishedAt` |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the History-only sort helper + page wire-up; no data migration to undo.

---

## Documentation Updates Required

- [ ] None required for product docs unless Owner wants a one-line note in STYLE/ARCHITECTURE later.
- [ ] Workflow plan + review + test/signoff artifacts only for this phase.

---

## Open Questions

- [x] None — no `[NEEDS OWNER DECISION]`. Authoritative field verified: `printFinishedAt`.

---

## Plan answers (required)

1. **Internal Gang Sheet History path:** `UpcomingShowsPage.tsx` + `staffShowsByListTab` on `/internal-gang-sheets`.
2. **Past Shows path:** same page + `showsByScheduleTab.past` via `sortPastShowsForDisplay`.
3. **Upcoming Shows path:** same page + `showsByScheduleTab.upcoming` (order from `sortUpcomingShowsForDisplay` in `listUpcomingShows`).
4. **Current History ordering:** unsorted beyond list ASC/`id` ASC → older-first in practice.
5. **Authoritative field:** `printFinishedAt`.
6. **Past ordering:** `scheduledStartAt` DESC.
7. **Past source change:** **No**.
8. **Upcoming ordering:** `scheduledStartAt` ASC, unscheduled last.
9. **Proposed change:** History-only client sort by `printFinishedAt` DESC.
10. **Functions:** NO.
11. **Rules:** NO.
12. **Indexes:** NO.
13. **Migration:** NO.
14. **Tests:** extend `upcomingShowListSort.test.ts` (+ optional page contract).
15. **Owner QA:** History newest-first; Past/Upcoming/Current regressions.

---

## Approval

- Review doc: docs/workflow/reviews/2026-09-02-studio-history-newest-first-ordering-review.md
- Verdict: pending
