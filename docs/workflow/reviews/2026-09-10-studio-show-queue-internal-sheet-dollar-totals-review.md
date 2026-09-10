# Review: Studio Show Queue / Internal Sheet dollar totals

| Field | Value |
|-------|-------|
| Date | 2026-09-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-09-10-studio-show-queue-internal-sheet-dollar-totals-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow Studio presentation change: reuse shared gang-sheet pricing for per-PR and selected show/sheet dollar totals on UpcomingShowsPage (Whatnot + Internal surfaces). No backend, schema, or permission impact. Allocated-on-this-show quantity is the correct default for production planning.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit out-of-scope for PR list rail, inbox, page-wide rail totals, persistence |
| Architecture alignment | pass | UI → shared util; settings already loaded |
| Security impact addressed | pass | Staff Studio only; no new reads |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Helper tests + owner visual QA |
| Human checkpoints identified | pass | Visual QA; commit/push gated |
| Roadmap alignment | pass | Orthogonal polish during maintenance pause |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Helper extraction keeps UpcomingShowsPage from embedding pricing math.
- Using non-canceled allocations matches capacity/production semantics.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth/Rules/callable changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for local implement; deploy/commit/push remain owner-gated separately.

---

## Data Model Review

**Findings:**
- Compute-only from allocation snapshots + settings.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Test Review

**Findings:**
- Unit-test invalid/canceled/empty cases; manual QA for both surfaces.

**Required changes:**
- [x] None

---

## Required Changes Before Implement

- [x] None — proceed with plan defaults.

---

## Verdict Rationale

Approved as a bounded visual/ops polish that answers the owner’s calculation question with existing shared pricing and does not conflict with the paused maintenance prerequisite.
