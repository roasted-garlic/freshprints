# Review: Close messaging on terminal Assisted Creation requests

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-17-assisted-terminal-messaging-closed-plan.md |
| Verdict | **approved** |

---

## Summary

Bounded behavior change: stop new Assisted Creation chat on terminal statuses (`approved` | `rejected` | `cancelled`), with shared helper, Portal/Studio UI, and fail-closed callables. Aligns with existing open vs terminal model; no schema or production deploy.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | UI + two callables + docs |
| Architecture alignment | pass | Shared helper; services/callables own enforcement |
| Security impact addressed | pass | Server fail-closed; no secret/rules change |
| Data Model impact addressed | pass | Docs update only |
| Backend impact addressed | pass | Dev deploy of two send callables |
| Test strategy adequate | pass | Unit helper + manual QA |
| Human checkpoints identified | pass | Manual UI; `fresh-prints-dev` deploy |
| Roadmap alignment | pass | Residual on Assisted messaging |
| Documentation plan | pass | DATA_MODEL, BACKEND, ADR-FP-092 |
| No silent scope expansion | pass | Does not touch Halloween/skeleton parked work |

---

## Architecture Review

**Findings:**
- Correct layering: pure status helper in shared constants; UI gates; callables validate.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Closing terminal messaging is a tightening of existing authz/validation. UI alone insufficient — plan correctly requires callable rejection.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev Functions only in this phase)

---

## Data Model Review

**Findings:**
- Correct mapping: no `completed` status; terminal trio is the closed set. All-terminal close is coherent with Past Requests.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Replace “open + terminal” allow-lists with open-only. Preserve cooldown and length checks.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Shared unit tests + manual Portal/Studio QA sufficient. No existing Functions tests for these callables.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- DATA_MODEL / BACKEND currently say messaging works in every status — must update with ADR.

---

## Required Changes (if approved_with_changes)

(none)

---

## Blockers (if blocked)

(none)

---

## Verdict Rationale

Clear product mapping, fail-closed security, narrow file set, explicit deploy and QA. Safe to implement.

---

## Next Step

Implement approved scope.
