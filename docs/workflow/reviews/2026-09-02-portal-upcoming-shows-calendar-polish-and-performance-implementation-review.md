# Implementation Review: Portal Upcoming Shows calendar polish + performance

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-plan.md |
| Formal Review | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-review.md |
| Test report | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-test-report.md |
| Verdict | **approved** |

---

## Summary

Implementation matches the approved Portal-only scope: calendar shell mounts immediately with empty or cached shows; metadata loading is localized; today gets a subtle whole-cell brighten plus `aria-current="date"`; browser-local day keys preserved; existing `listPortalPublicShows` + 5-minute cache reused with a snapshot peek for warm/SWR-style first paint. No backend, Rules, indexes, migrations, minInstances, or production deploy.

---

## Checklist (owner-required confirmations)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Calendar shell no longer waits for show request | **pass** | `OurShowsCalendar` always mounted; `PortalLoadingPanel` removed |
| 2 | Today whole-cell treatment stronger but subtle | **pass** | `.is-today` background + neutral border; show fills/borders still win via higher specificity |
| 3 | Accessibility semantics added | **pass** | `aria-current="date"`; label includes `Today` via `formatOurShowsDayAriaLabel` |
| 4 | Browser-local timezone contract preserved | **pass** | Still `toLocalDateKey` / local `Date` getters; no Chicago/UTC day keys |
| 5 | Existing public-show API reused | **pass** | `portalShowDesignsService.listPublicShows` only |
| 6 | Existing cache reused | **pass** | Same module TTL + in-flight dedupe; added snapshot getter only |
| 7 | No unnecessary duplicate fetch | **pass** | Single `useEffect([])` with one `listPublicShows()` call; concurrent dedupe covered by tests |
| 8 | Month navigation local/immediate | **pass** | Unchanged local state; no fetch in calendar |
| 9 | Metadata failure does not hide calendar | **pass** | Error copy below calendar; grid remains |
| 10 | No backend changes | **pass** | |
| 11 | No minInstances | **pass** | |
| 12 | No Rules/index/migration | **pass** | |
| 13 | Show counts/status behavior preserved | **pass** | Same grouping/lifecycle/CSS class composition |

---

## SWR decision

**Implemented (lightweight):** `getPortalPublicShowsReadCacheSnapshot()` + page initializes/`useEffect` paints any cached response immediately, then awaits `listPublicShows()` which refreshes when TTL expired (existing cache semantics). Fresh TTL hits remain zero-network. No second cache layer, no localStorage.

---

## Derived data / memoization

- Kept existing `useMemo` for `showsByDateKey` / weeks.
- Initial month now always **current local month** (not earliest show) so shell-first + today stay in view — intentional UX binding from plan.

---

## Residual performance note

Cold Gen2 metadata may still take several seconds. Calendar is no longer blocked. **minInstances** remains **[NEEDS OWNER DECISION]** only after Owner QA if metadata lag is still unacceptable.

---

## Test evidence

- 28/28 goal tests pass
- Portal typecheck: pre-existing unrelated failures documented (`passed_with_notes`)

---

## Next step

Owner DEV QA on local Portal (`npm run dev:portal`). **Do not signoff / commit / push** until owner directs.
