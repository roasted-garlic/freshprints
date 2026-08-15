# Review: Studio AI Review reprocess local reconciliation

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-14-studio-ai-review-reprocess-local-reconciliation-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly re-verifies current HEAD: automatic Processing navigation is an explicit `onNavigateToTab` call, and delayed multi-row disappearance follows from reload/cache-primary reconciliation that never applies the already-returned reset patch. The proposed Amendment 9–style patch-primary stay-on-tab path is the smallest safe fix, requires no Functions change, and correctly amends only the Reprocess navigation clause of ADR-FP-027.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Renderer-only; Reopen navigation untouched |
| Architecture alignment | pass | Hook/service layers; no component Firebase |
| Security impact addressed | pass | Permissions/callable unchanged |
| Data model impact addressed | pass | Uses existing reset response fields |
| Backend impact addressed | pass | Confirmed no API change needed |
| Test strategy adequate | pass | Wiring tests must be rewritten to new contract |
| Human checkpoints identified | pass | Owner manual QA after automated tests |
| Roadmap alignment | pass | Phase 5 / AI Review maintenance corrective |
| Documentation plan | pass | ADR-FP-027 + narrow DATA_MODEL/UX wording |
| No silent scope expansion | pass | Prior Design Library goal remains closed/separate |

---

## Architecture Review

**Findings:**
- Mirrors `reconcileSuccessfulInboxManualAction` / hard-delete local reconcile — good reuse.
- Returning `ResetAiEnrichmentResult` from the inbox service is the correct authority source; do not hardcode guessed statuses beyond that typed result.
- Keeping `onNavigateToTab` wired for Reopen is correct.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- No auth, rules, or secrets changes.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None for this corrective (no prod deploy in phase)

---

## Data Model Review

**Findings:**
- Server reset semantics already match client patch fields.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- `[NEEDS REPO CHECK]` for Functions expansion is correctly cleared.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Must update tests that currently **require** `reloadDesigns` → `onNavigateToTab` order — those become anti-regressions for the old UX.
- Add focused stay-on-tab / sequential disappearance coverage.

**Required changes:**
- [x] None beyond what the plan already lists

---

## Documentation Review

**Findings:**
- ADR-FP-027 amendment is required so implementation does not silently contradict accepted decisions.
- Reopen clause of ADR-FP-027 must remain.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Evidence is current-HEAD verified, scope is narrow, preferred implementation matches existing local-reconciliation architecture, and out-of-scope boundaries (Functions, Processing auto-advance, Design Library) are respected. Approved to implement as written.

---

## Next Step

Implement approved scope on a dedicated branch; exclude unrelated dirty 1.0.5 release-bump files from this goal’s commits.
