# Review: Upload caps + Studio Settings (Small Managed Items #2)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-upload-caps-studio-settings-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly scopes backlog #2: new purpose-scoped daily quota defaults (request ↓ / donation ↑), Firestore settings doc with owner Studio UI, and Functions enforcement with safe defaults. Mirrors the proven `emailProviders` pattern. Proceed to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Six daily caps + Settings; no size/lease/#3 |
| Architecture alignment | pass | Shared resolve + callable write + Studio subscribe |
| Security impact addressed | pass | Owner-only; bounds; rules deny client write |
| Data model impact addressed | pass | New settings doc documented |
| Backend impact addressed | pass | Load on charge; update callable; dev deploy gate |
| Test strategy adequate | pass | Unit + rules + manual QA |
| Human checkpoints identified | pass | APPROVE DEV DEPLOY + owner PASS |
| Roadmap alignment | pass | Small Managed Items #2 |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS |
| No silent scope expansion | pass | Byte caps / #3 explicitly out |

---

## Architecture Review

**Findings:**
- Reusing Settings collection + callable write is correct.
- Keep resolve helpers in shared so Studio and Functions agree on defaults/bounds.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Owner-only update; validate integers and bounds server-side.
- Do not expose settings write to admin/helper/customer.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Production Function/rules deploy (out of scope)

---

## Data Model Review

**Findings:**
- Six numeric fields + audit timestamps sufficient; rate-limit counter schema unchanged.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- `chargeDailyQuota` must use loaded settings; missing doc → code defaults.
- Deploy update callable + any Function that charges quota after change.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Extend daily-quota unit tests for overrides; add resolve/validate tests; rules alignment.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- DATA_MODEL + BACKEND + short ADR required in implement phase.

---

## Required Changes (if approved_with_changes)
1. None

---

## Blockers (if blocked)
1. None

---

## Verdict Rationale

Clear, bounded, follows existing Settings patterns, security gates adequate for dev. Approved for implementation with proposed defaults (25/50/2 request; 400/1000/40 donation).

---

## Next Step

Implement approved scope; request `APPROVE DEV DEPLOY` before live verification; then manual QA for owner PASS.
