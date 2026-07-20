# Review: Cap A / Cap B foolproof UX (per-request max = Cap B)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-a-b-foolproof-per-request-max-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly separates **per-request max** (Cap B value) from **Cap A daily**, mandates server enforcement on all charge paths, and identifies the optimistic Cap A hydrate race behind the false "Daily print limit" at 26 prints. Scope is bounded; no production deploy.

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Per-request gate + copy + Cap A baseline fix |
| Architecture alignment | pass | Shared helpers → Functions assert → Portal UX |
| Security impact addressed | pass | Server authoritative |
| Data model impact addressed | pass | Doc-only; reuses Cap B setting |
| Backend impact addressed | pass | New error code; deploy fresh-prints-dev |
| Test strategy adequate | pass | Unit + manual QA matrix |
| Human checkpoints identified | pass | Soft-reload + manual QA |
| Roadmap alignment | pass | Print request caps |
| Documentation plan | pass | DATA_MODEL / BACKEND |
| No silent scope expansion | pass | No split UI return |

---

## Architecture Review

**Findings:**
- Per-request max equals Cap B setting is clear and avoids a third Settings field.
- Cap A optimistic baseline fix is required alongside the gate.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Client disable alone is insufficient; plan requires callable checks before Cap A charge.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev deploy only)

---

## Data Model Review

**Findings:**
- Doc note that working request print max = Cap B setting.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Apply assert on all Cap A charge callables listed in plan.
- Prefer `failed-precondition` + `WORKING_REQUEST_PRINT_LIMIT` (not Cap A `resource-exhausted`) so Portal does not map to daily copy.

**Required changes:**
- [x] None (noted as implement guidance)

---

## Testing Review

**Findings:**
- Scenario matrix covers screenshot bug and 25+25 happy path.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Update DATA_MODEL Cap note and BACKEND error-code list.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Root causes and product model are sound; enforcement and copy separation are necessary and implementable without production risk.

---

## Next Step

Implement approved scope; deploy Functions to `fresh-prints-dev`; soft-reload Portal; run tests + manual QA.
