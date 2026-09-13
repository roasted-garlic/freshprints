# Signoff: Portal Upcoming Shows calendar polish + performance

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-plan.md |
| Review | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-review.md |
| Implementation Review | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-implementation-review.md |
| Test report | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-test-report.md |
| Owner QA | docs/workflow/reviews/2026-09-02-portal-upcoming-shows-calendar-polish-and-performance-owner-qa.md |
| Final status | **approved** |

---

## Summary

Portal `/shows` Upcoming Shows calendar now renders its shell immediately while public show metadata hydrates asynchronously; today is the strongest highlight; upcoming show days use a softer light-green treatment; today+upcoming preserves both cues. Existing `listPortalPublicShows` + 5-minute client cache reused (snapshot peek for warm/SWR-style paint). Owner DEV QA **PASS**. Production **NOT AUTHORIZED**. No Functions/Rules/index/migration work.

---

## Changes Delivered

### Behavior

- Shell-first calendar (no full-page loader gate)
- Localized “Loading upcoming shows…” metadata status
- Error leaves calendar usable
- Today: stronger cell lift + `aria-current="date"` + “Today” in label
- Upcoming: soft green fill/border; aired muted; capacity low/medium/high quieter but distinct
- Cache snapshot peek + single mount fetch; month nav local-only
- Initial month = current browser-local month

### Files Created

- `apps/portal/features/show-designs/utils/ourShowsDayAriaLabel.ts`
- `apps/portal/features/show-designs/utils/ourShowsDayAriaLabel.test.ts`
- `apps/portal/features/show-designs/pages/ShowDesignsPageContent.shellFirst.test.ts`
- Workflow plan/review/test/owner-QA/signoff docs

### Files Modified

- `apps/portal/features/show-designs/pages/ShowDesignsPageContent.tsx`
- `apps/portal/features/show-designs/components/OurShowsCalendar.tsx`
- `apps/portal/features/show-designs/services/portalPublicShowsReadCache.ts`
- `apps/portal/features/show-designs/services/portalPublicShowsReadCache.test.ts`
- `apps/portal/styles/our-shows.css`
- `packages/shared/src/utils/showCalendarGrid.test.ts`
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`

### Documentation Updated

- Plan, Formal Review, Implementation Review, Test Report, Owner QA, Signoff, ROADMAP banner

---

## Tests

### Automated

- Final focused suite: **29/29 PASS**
- Portal typecheck: pre-existing catalogService failures only (`passed_with_notes`)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Shell-first + visual hierarchy Owner QA | **PASS** | Owner (local DEV Portal) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not authorized | 2026-09-02 | Portal hosting promote later |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-09-02 | Owner QA PASS after visual corrective |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |
| Functions deploy | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Gen2 cold start still delays show metadata | low–medium | Shell usable; optional `minInstances` only if owner later decides |
| Portal typecheck debt (`interactiveEnhanced*`) | low | Pre-existing; separate cleanup |

---

## Deferred Items (Roadmap)

- Production Portal promote (hosting only; no Functions/Rules/indexes)
- Optional `listPortalPublicShows` minInstances — **[NEEDS OWNER DECISION]** only if metadata latency remains a problem after shell-first

---

## Open Blockers

- [x] None

---

## Verdict

**approved** — Owner QA PASS; focused tests pass; pre-existing typecheck debt documented; production not authorized.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `references/project-chatgpt-handoff/` absent — N/A
- [x] Production inventory note: Portal source/hosting only for future promote

**Recommended next action for user:** Coordinate Portal production promote when ready (separate authorization). Do not start unrelated work until IDLE confirmed.
