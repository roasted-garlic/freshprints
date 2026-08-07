# Review: Portal Discover “New This Week” → `readyAt` (corrective Plan)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Reviewer | Review Agent (Independent Formal Review) |
| Plan | `docs/workflow/plans/2026-08-06-portal-studio-catalog-ordering-mismatch-corrective-plan.md` |
| Verdict | **approved** |

---

## Summary

Owner surface confirmation closes R1 as **Case D**: Portal Discover → New This Week. Source proof shows Firestore (not generated) currently uses **`createdAt` for both membership and ordering**; Home’s identically labeled rail uses client `rankNewThisWeek` on **`createdAtMs`**. The amended Plan correctly requires **both** membership and ordering to move to **`readyAt`**, includes Home for the same product concept, excludes ordinary Library and metric rails, and keeps P4 / Stage 1b / generated-search out of scope. No blocking gaps for Plan approval; Implement still requires a separate owner phrase.

---

## Formal Review verification (owner-required)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Exact Discover New This Week source path | **pass** | `CatalogPageContent` → `useCatalogDesigns({ discoveryMode: 'new' })` → Firestore `listReadyDesignsPageWithSortFallback`; **not** generated assets |
| 2 | Membership predicate uses correct timestamp | **pass (Plan)** | Today: `createdAt`; Plan: `readyAt >= now-7d` via `readyAfterMs` |
| 3 | Sort uses `readyAt desc` | **pass (Plan)** | Today: `createdAt`; Plan: `sortField: 'readyAt'` + `__name__` tie-breaker |
| 4 | Old-import / new-approval designs appear | **pass (Plan)** | Explicit acceptance + tests + manual QA |
| 5 | Ordinary Library not unnecessarily modified | **pass** | Out of scope; default remains `readyAt` already |
| 6 | Other Discover rails unchanged | **pass** | Popular / Most Liked / Recently Requested out of scope |
| 7 | Home only if same “new” concept | **pass** | Home “New This Week” rail **in scope**; other Home rails out |
| 8 | No hidden P4 / Stage 1b / generated-search redesign | **pass** | Explicit exclusions; no publisher change expected |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Case D only; both membership + order |
| Architecture alignment | pass | Firestore ordinary discovery path |
| Security impact addressed | pass | Read filters only |
| Data model impact addressed | pass | Existing `readyAt` |
| Backend impact addressed | pass | No Functions/P4 expected |
| Test strategy adequate | pass | Shared + Portal + manual |
| Human checkpoints identified | pass | Manual QA; index only if needed |
| Roadmap alignment | pass | Does not jump Stage 1b |
| Documentation plan | pass | ARCHITECTURE / DECISIONS |
| No silent scope expansion | pass | Ordinary Library / metrics / P4 excluded |

---

## Architecture Review

**Findings:**
- Library path bug is intentional historical “import newness,” not a Firestore index accident.
- Home rail must move with Library or product meaning splits across surfaces.
- Disabling createdAt completeness demotion when `readyAfterMs` is set is required; otherwise Implement could “pass tests” and still ship wrong semantics under fallback.

**Required changes:** None beyond Plan as written (already includes the completeness guardrail).

---

## Security Review

**Findings:** None.

**Required changes:** None.

---

## Data / Backend Review

**Findings:**
- Existing `status + readyAt + __name__` (and category/tag variants) are expected to support `readyAt` range + desc order; confirm at Test.
- No P4 publisher involvement for this surface.

**Required changes:** None for Plan approval.

---

## Test Review

**Findings:** Old-create / new-ready case is the critical automated assertion for both `rankNewThisWeek` and the Portal query wiring.

**Required changes:** None for Plan approval (already in acceptance criteria).

---

## Prior Review notes (superseded)

Prior Formal Review **approved_with_changes** (R1–R4) targeted Case C/A ordinary browse. **R1 is satisfied** by owner surface confirmation. Those ordinary-Library assumptions are **superseded** by this Case D Plan; do not Implement the old Case C scope under this authorization.

---

## Verdict

**approved** — Proceed to Implement only after owner issues corrective-Plan Implement authorization. **STOP** — no implementation in this pass.

---

## Explicit non-actions

- No implementation  
- No deploy / merge / production  
- No P4 Signoff  
- No Stage 1b / P3  
- P4 rate-guard result remains **PASSING** (3 pubs; 3,436 C+T+R vs ~28,710)
