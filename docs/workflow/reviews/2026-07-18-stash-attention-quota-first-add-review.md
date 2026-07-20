# Review: Stash false attention, Cap A refresh, first-add lag

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-stash-attention-quota-first-add-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly separates soft DPI chrome noise from blocking Stash attention, fixes Cap A UI refresh racing ahead of the charge callable, and targets first-add round-trips without a Functions change. Scope is narrow and safe for Portal soft-reload only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Three concrete bugs; no Cap B/Settings |
| Architecture alignment | pass | Shared util + Portal context/service |
| Security impact addressed | pass | No rule/callable permission changes |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | No deploy expected |
| Test strategy adequate | pass | Unit + manual smoke |
| Human checkpoints identified | pass | Owner manual QA |
| Roadmap alignment | pass | Follow-up to Cap A / Stash polish |
| Documentation plan | pass | State + short QA note |
| No silent scope expansion | pass | Explicit out-of-scope |

---

## Architecture Review

**Findings:**
- Quota epoch on existing Portal print-request context is appropriate; avoid a second global listener system.
- Single-item `getDoc` after add callable is a safe speedup.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- None. Same Cap A callables.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev soft-reload only)

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Cap A charge already happens in `addPortalCatalogDesignToPrintRequest`; stale UI is a client refresh race, not a server miss.

**Required changes:**
- [x] None

---

## Test Review

**Findings:**
- Must add/adjust aggregates tests so “good” DPI no longer counts as attention.
- Manual: first-add quota + attention + lag.

**Required changes:**
- [x] None beyond plan

---

## Required Changes Before Implement
- [x] None

## Blockers
- None
