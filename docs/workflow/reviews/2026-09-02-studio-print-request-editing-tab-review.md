# Formal Review: Studio Print Request Editing tab (+ Internal Printed group order)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Amended | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-studio-print-request-editing-tab-plan.md` |
| Goal | `studio-print-request-editing-tab` |
| Baseline | `development @ e985c95888b4002688eaf4d781d57c43258f0262` |
| Verdict | **approved** |
| Production | **NOT AUTHORIZED** |

---

## Summary

Owner decisions 1–6 fully resolve the prior **blocked** data-plane checkpoint. The amended plan correctly extends the existing `queueTab` mirror with `"editing"`, keeps Portal Continuable semantics via an adapter, exposes Internal Editing, and adds a scoped Internal→Printed group-order fix that reuses the established History recency contract (`printFinishedAt` DESC → cycle DESC → id). No new ambiguous product decision remains. **Implement is allowed**; DEV deploy/reconcile remains a later human checkpoint.

---

## Owner decisions recorded

| # | Topic | Recorded |
|---|-------|----------|
| 1 | `queueTab` += `editing` | YES — APPROVED |
| 2 | Rules allowlist | YES — APPROVED (DEV later) |
| 3 | DEV Functions redeploy | YES — APPROVED (list at checkpoint) |
| 4 | DEV backfill/recompute | YES — APPROVED (post Impl Review + auth) |
| 5 | Portal exposes Editing tab; ADR-FP-071 unchanged | YES — **amended** 2026-09-02 (owner reversed fold-into-Working) |
| 6 | Internal Editing tab | YES — APPROVED |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Editing + Internal Printed group sort only |
| Architecture alignment | pass | One derive; Portal adapter; shared History comparator |
| Security impact addressed | pass | Additive Rules allowlist only |
| Data model impact addressed | pass | Enum extension + DEV reconcile |
| Backend impact addressed | pass | Existing recompute/backfill; no new callable |
| Test strategy adequate | pass | Editing + layout + sort cases 1–32 |
| Human checkpoints identified | pass | DEV deploy/reconcile; Owner QA; no production |
| Roadmap alignment | pass | Amendment folded before Implement |
| Documentation plan | pass | DATA_MODEL + ADR |
| No silent scope expansion | pass | Lightbox explicitly deferred |

---

## Editing verifier (amended)

1. Predicate: `status === "editing"`  
2. Mirror: `queueTab === "editing"` after derive + recompute  
3. Continuable/duplicate-CR: unchanged (`draft`\|`editing`)  
4. Customer + Internal Editing tabs: yes  
5. Mutual exclusivity: single derive order printed→printing→queued→editing→working  
6. Tab UI: `PrintRequestsPage` + `print-requests-tab-bar`  
7. CSS: `show-queue.css`; nowrap + overflow-x  
8. Counts: `countPrintRequests({ queueTab, isInternal })` includes editing  
9. Search: active-tab client filter  
10–12. Grouping/selection/transitions: preserve; expose existing transitions  
13–14. Backend/Rules yes; **no new index**  
15–18. Layout/files/tests/Owner QA as plan  

---

## Internal Printed sort verifier

| # | Finding |
|---|---------|
| Path | `groupPrintRequestsByShow` ← `PrintRequestsPage.visibleRequestSections` |
| Root cause | Section sort = `scheduledStartAt` ASC; NOT SCHEDULED → `+Infinity` tie → **show id localeCompare** — ignores cycle/`printFinishedAt` |
| Authoritative recency | Prefer **`printFinishedAt` DESC** (present on completed sheets even when label is NOT SCHEDULED) |
| Fallback | Missing finish last → **`staffGangSheetCycleNumber` DESC** → **`id`** |
| History reuse | **Yes** — extract/share `sortStaffGangSheetHistoryForDisplay` comparator; do not invent a second newest algorithm |
| Scope of sort mode | **Only** Internal + Printed; default schedule ASC elsewhere |
| Within-group requests | Keep `updatedAt` DESC |
| Do not regress | Upcoming ASC, Past DESC, History list (same helper), Customer grouping |

**No [NEEDS OWNER DECISION]** on sort — preferred contract matches source + History.

---

## Architecture / Security / Data / Backend

**Required changes for Implement:** follow amended plan only.

**Human approval before production:** entire goal — Production NOT AUTHORIZED. DEV Rules/Functions/backfill require separate checkpoint auth after Implementation Review.

---

## Testing Review

Pass — coverage list in plan matches owner tests 1–32. Layout may be CSS contract assertions + Owner QA.

---

## Required Changes

- [x] None beyond executing the amended plan

---

## Blockers

None. Prior blockers cleared by owner decisions.

---

## Verdict Rationale

**approved** — decisions recorded, sort root cause verified, reuse path clear, deploy/reconcile correctly deferred to a checkpoint. Safe to Implement → Test → Implementation Review, then STOP for DEV authorization.

---

## Next Step

Implement approved scope. After tests + Implementation Review, present DEV Functions list, Rules diff, and backfill dry-run command — **do not deploy or reconcile** until owner authorizes.
