# Manual Test Checkpoint: Upcoming Shows calendar polish + performance

**Feature / area:** Portal `/shows` Upcoming Shows calendar  
**Why automated tests are insufficient:** Visual brightness hierarchy and perceived load timing need human judgment.  
**Environment:** local DEV Portal (`npm run dev:portal`, port 3100)  
**Prerequisites:** DEV Firebase; public shows present preferred

### Result

| Field | Value |
|-------|-------|
| Goal | `portal-upcoming-shows-calendar-polish-and-performance` |
| Owner QA | **PASS** |
| Environment | local DEV Portal |
| Date | 2026-09-02 |
| Production validated | **no** |

Owner accepted:

1. Calendar shell-first loading/performance behavior  
2. Final visual hierarchy for today / upcoming / aired show cells (including soft upcoming green + today strongest + today+upcoming both cues)

### Steps completed

## A — TODAY / UPCOMING HIERARCHY
- [x] Soft upcoming green; today strongest; today+upcoming both cues; not “selected”

## B — FIRST LOAD
- [x] Calendar grid immediate; metadata hydrates after

## C — WARM LOAD
- [x] Calendar immediate; warm metadata near-immediate

## D — MONTH NAVIGATION
- [x] Immediate; calendar never disappears

## E — DATA CORRECTNESS
- [x] Counts, dates, status, gallery/picker, legend, a11y, browser-local timezone OK

## F — FAILURE UX
- [x] N/A / covered by contract tests (calendar remains on error)

### Pass criteria
- [x] Upcoming show days are lightly green / subtle
- [x] Today is the strongest highlight
- [x] Today + upcoming still reads as both
- [x] Shell-first: dates visible before/without waiting on spinner replacement
- [x] Warm path feels fast for metadata when cache warm
- [x] Month nav never blanks the calendar
- [x] Show data/behavior unchanged for correctness

### Owner reply
`PASS`
