# Review: Studio Design Library archive / restore / companion Load More reconciliation

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | docs/workflow/plans/2026-08-14-studio-design-library-archive-restore-reconciliation-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The Plan correctly identifies four distinct root causes with verified repo paths, preserves request-selection and catalog lifecycle constraints, and chooses local reconciliation over full-catalog reloads. Defect C correctly requires a Rules restore fast path (same class as the known archive expression-budget fix). Defect D correctly rejects unsafe short-page Load More heuristics. Implementation must not start until the owner approval phrase is given. Two owner clarifications are noted but do not block Plan approval if defaults in the Plan are accepted.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | A–D only; Phase 9 / production / Portal out |
| Architecture alignment | pass | Component → Hook → Service; AI Review reconcile precedent |
| Security impact addressed | pass | Narrow Rules allowlist; deploy gated |
| Data model impact addressed | pass | No new statuses |
| Backend impact addressed | pass | Rules + index; no new Function |
| Test strategy adequate | pass | Includes rules, local reconcile, request-selection, companion hasMore |
| Human checkpoints identified | pass | Approval phrase; Rules/index deploy; manual QA |
| Roadmap alignment | pass | Corrective maintenance |
| Documentation plan | pass | Workflow artifacts; Rules/index notes |
| No silent scope expansion | pass | Algolia B3 explicitly optional / owner input |

---

## Architecture Review

**Findings:**
- Defect A/B/C/D paths are source-verified; request-selection protected.
- B/C remediation correctly prefers `removeDesignFromList` + invalidation over refresh-into-stale-cache.
- D remediation correctly requires authoritative pagination metadata (server filter), not filtered-length heuristics.

**Required changes:**
- [x] None blocking — implement must keep D behind index availability (already in Plan)

---

## Security Review

**Findings:**
- Restore Rules fast path is necessary and must mirror archive allowlist discipline (purge fields immutable; status transition only from `archived` to catalog operational statuses).
- No client Firebase writes from components.

**Required changes:**
- [x] None beyond Plan’s Rules test requirements

**Human approval needed before production:**
- [x] Yes — `firestore.rules` deploy
- [x] Yes — `firestore.indexes.json` deploy for D

---

## Data Model Review

**Findings:**
- Catalog statuses unchanged.
- Uses existing `companionSetIncomplete` denorm for D.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No new Cloud Function required for Restore/Delete evidence.
- Emulator/Java unavailable during Plan session — live Restore error string deferred to Implement QA; source-proven `permission-denied` class accepted for Plan.

**Required changes (approved_with_changes):**
1. During Implement, before claiming Defect C fixed: capture and record the exact pre-fix Restore failure message once (DevTools or rules test assertFails), then post-fix ALLOW for enrichment-heavy restore.
2. If owner does not answer Algolia B3 question, default to **Firestore Needs Companion–only fix this phase** and document managed+Needs Companion residual explicitly in Implement/signoff (Plan already allows this).

---

## Test Review

**Findings:**
- Coverage list matches acceptance criteria.
- Must update Option B contract test when removing Library hard-delete chrome.
- Rules tests mandatory for C before Rules deploy.

**Required changes:**
- [x] None beyond Plan

---

## Required Changes Before Implementation

1. Obey approval phrase gate — no source edits until owner sends it.
2. Implement QA must record exact Restore deny/allow evidence (rules test and/or live).
3. Default Defect D scope: Firestore Needs Companion–only unless owner expands to Algolia B3.
4. Do not reopen recovery env implementation.

---

## Verdict Rationale

**approved_with_changes** — Plan is implementable and evidence-based. Changes are process/verification defaults, not a rewrite of root causes. Owner may proceed to authorize Implement with the stated phrase after accepting the defaults above (or answering the two `[NEEDS OWNER INPUT]` items).
