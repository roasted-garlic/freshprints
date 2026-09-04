# Review: Design Library → AI Processing Reprocess

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-design-library-ai-processing-reprocess-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies that Ready → AI Review cannot reuse `resetAiEnrichmentForProcessing` / `enqueueAiEnrichment` as-is (Ready blocked; reset deletes `smartProfile`). A narrow owner-only callable with staff/preset-preserving demotion + queue enrichment is the right shape. Taxonomy check on DEV shows a single **Inspirational Quotes & Affirmations** category (no duplicate inspirational name). Implementation must not start until listed owner decisions are recorded; single-design MVP is mandatory.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Single Ready→AI Review tool; excludes bulk Ready reprocess / Autonomous / tags |
| Architecture alignment | pass | Component→Hook→Service→Callable |
| Security impact addressed | pass | Owner UI + owner callable; not staff rerun permission |
| Data model impact addressed | pass | Reuses statuses; optional audit field gated |
| Backend impact addressed | pass | New callable + staff-aware queue merge |
| Test strategy adequate | pass | Unit + permission + manual taxonomy QA |
| Human checkpoints identified | pass | Category authority, roots, audit, label |
| Roadmap alignment | pass | Smart Catalog governance inside parent goal |
| Documentation plan | pass | BACKEND / DATA_MODEL / DECISIONS as needed |
| No silent scope expansion | pass | Explicitly rejects Library multi-select expansion |

---

## Architecture Review

**Findings:**

- Existing reset path is unsafe for Ready (wipes Smart Profile).
- Queue enrichment currently merges **presets only**; staff preserve exists on `ready_backfill`. Implement must wire staff merge for this demotion path.
- Algolia / Design Library / print-request behavior is correctly analyzed.

**Required changes:**

- [x] Implement must add an explicit shared helper for “Ready demotion clear” (not copy-paste reset).
- [x] Pipeline write for this path must use staff+preset merge equivalent to `mergeReadyBackfillSmartProfile` (not bare queue preset merge alone).
- [ ] Do not extend Design Library print-request multi-select for AI batch in this phase.

---

## Security Review

**Findings:**

- Owner-only is appropriate (catalog demotion + public unpublish).
- Server must reject admin/helper even if UI is spoofed.

**Required changes:**

- [x] Callable: `assertOwnerCaller` only.
- [x] New permission helper distinct from `canRerunAiSuggestions` (staff).

**Human approval needed before production:**

- [x] Entire feature — production deploy not authorized in this phase.

---

## Data Model Review

**Findings:**

- No approval history collection today — plan correctly flags audit gap.
- Category not in `staffEditedDimensionKeys` — plan correctly flags **CATEGORY HUMAN AUTHORITY**.

**Required changes:**

- [x] Before implement: record owner answers for category overwrite-on-Approve, root retain vs clear, and audit (`previousReadyAt` yes/no).

---

## Backend Review

**Findings:**

- Taxonomy revision-aware cache is sufficient; no ad hoc 15-minute timer.
- Materialization meta `revision: 16`, `ready: true` observed on DEV at plan time.

**Required changes:**

- [x] Document in implement notes: wait for `taxonomyMaterialization/meta.ready === true` after category edits before owner QA reprocess (observable, not timer).

---

## Test Review

**Findings:** Adequate. Manual QA trio + Faith/Music/Pop regressions required.

**Required changes:**

- [x] Add automated denial tests: Ready design rejected by old reset/enqueue; new callable accepts Ready; non-owner denied.

---

## Required Changes Before / During Implement

1. Resolve all **[NEEDS OWNER DECISION]** in the plan (category authority, root fields, audit, button label, owner-only confirm).  
2. Do **not** call `resetAiEnrichmentForProcessing` for Ready.  
3. Staff+preset-preserving demotion + merge on enrichment write.  
4. Single-design only.  
5. No Autonomous, tag retirement, Algolia settings, Rules, production.

---

## Verdict

**approved_with_changes** — Plan is sound for implementation **after** owner decisions are recorded. Do **not** implement until those decisions are answered in workflow state.

---

## WS4 / WS5

- WS4 owner QA: **PASS WITH NOTES** (taxonomy re-test #5/#6/#15 deferred to this feature).  
- WS5 / Autonomous: **not authorized**.
