# Review: Portal print progress rail + live elapsed clock

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-10-portal-print-progress-rail-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow, well-bounded Portal UX: stage rail from existing allocation-derived tabs plus a customer-safe callable for show timer fields. Correctly keeps `upcomingShows` staff-only and defers quantity/design progress. Callable deploy is the main human gate.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicitly excludes 3/4 progress ideas |
| Architecture alignment | pass | UI → service → callable; no layer violations |
| Security impact addressed | pass | Ownership + safe DTO; no rules widening |
| Data Model impact addressed | pass | Read-only existing fields |
| Backend impact addressed | pass | New callable documented |
| Test strategy adequate | pass | Typecheck + manual matrix + graceful fallback |
| Human checkpoints identified | pass | UI QA + callable deploy |
| Roadmap alignment | pass | Customer visibility of print run |
| Documentation plan | pass | Optional ADR note; behavior in UI copy |
| No silent scope expansion | pass | Matches user decision |

---

## Architecture Review

**Findings:**
- Callable-only access to show timer fields matches ADR-FP-066 pattern used by allocatable shows.
- Stage rail from list-tab derivation stays consistent with Queued/Printing/Printed tabs.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Must verify print request ownership before reading shows.
- DTO must omit sensitive show fields (notes, URLs, sync).

**Required changes:**
- [x] None (plan already requires this)

**Human approval needed before production:**
- [x] Deploy callable to shared Firebase project(s)

---

## Data Model Review

**Findings:**
- None — no schema changes.

**Required changes:**
- [x] None

---

## Required Changes Before Implementation

- [x] None

---

## Verdict Rationale

Approved to implement as planned. Park gang-sheet-local-generate manual QA; this is a separate managed goal.
