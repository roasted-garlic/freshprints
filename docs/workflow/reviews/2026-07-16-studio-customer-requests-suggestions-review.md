# Review: Studio Customer Requests — suggestion inbox + placeholders

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-16-studio-customer-requests-suggestions-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly activates the existing Customer Requests surface, moves suggestion management out of Settings, and closes the Portal “Suggest” gap with a real pending queue. Scope is bounded; security defaults (owner/admin writes) are acceptable for v1. Proceed to implement with the required changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Placeholders only for AI / FP assisted |
| Architecture alignment | pass | Services/callables; no Portal direct writes |
| Security impact addressed | pass | Owner/admin mutate; manageRequests page gate |
| Data model impact addressed | pass | New request collection documented |
| Backend impact addressed | pass | New callables + rules/indexes |
| Test strategy adequate | pass | Validation + manual Studio/Portal |
| Human checkpoints identified | pass | Manual QA + dev deploy |
| Roadmap alignment | pass | Extends Phase 9A / customer requests |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS, ROADMAP |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Reusing `/customer-requests` and moving Settings UI is the right seam.
- Prefer keeping suggestion list service code importable rather than large unrelated refactors.

**Required changes:**
- [ ] None beyond implement notes below

---

## Security Review

**Findings:**
- Customer submit must validate kind/label length and auth; no client write to overlays.
- Approve must reuse collision validation from existing add path.
- Owner/admin write gate for v1 is safer than expanding `manageRequests` write power blindly.

**Required changes:**
- [x] On approve, if label already exists as active overlay, mark request approved with link/idempotent success rather than hard-failing awkwardly — or reject with clear message; pick one and document in UI copy.
- [x] Dedupe: reject or no-op submit when an identical pending request already exists for that customer+kind+labelKey.

**Human approval needed before production:**
- [x] None for `fresh-prints-dev`
- [ ] Production deploy later

---

## Data Model Review

**Findings:**
- `etsySuggestionRequests` shape is sufficient for v1.
- Keep `etsyRecommendationSuggestions` as the live overlay source of truth.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Callable-centric design matches existing Etsy suggestion pattern.
- Studio may subscribe to pending requests if rules allow staff read; otherwise list callable is fine.

**Required changes:**
- [x] Deploy only to `fresh-prints-dev`
- [x] Rate limit submit (daily per customer); include remaining/limit in error message

---

## Testing Review

**Findings:**
- Validation unit tests + manual Studio/Portal path are enough for v1.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Amend ADR-FP-087k for Studio home + customer request queue.

---

## Required Changes (if approved_with_changes)

1. Idempotent/clear handling when approving a label that already exists as an active overlay.
2. Dedupe pending submits per customer+kind+labelKey.
3. Daily per-customer submit rate limit with a clear error.
4. Keep overlay/approve/reject mutations owner/admin in v1; page visibility `manageRequests`.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Bounded, aligns with owner request, reuses existing overlay system, and closes a real product gap (Portal suggest was a no-op). Safe to implement on dev with the listed changes.

---

## Next Step

Implement approved scope with required changes; then automated tests + `fresh-prints-dev` deploy + manual QA.
