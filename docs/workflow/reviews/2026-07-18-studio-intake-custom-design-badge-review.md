# Review: Studio intake — Custom design badge for assisted uploads

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-studio-intake-custom-design-badge-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow Studio-only UI annotation using existing `assistedCreationRequestId`. Matches Portal **Custom** labeling and purple cue. No backend, schema, or permission changes. Safe to implement with soft-reload only.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Badge only; no flow changes |
| Architecture alignment | pass | Map in intake service; render in section |
| Security impact addressed | pass | No new exposure beyond staff intake |
| Data model impact addressed | pass | Existing optional fields |
| Backend impact addressed | pass | No Functions; deploy not required |
| Test strategy adequate | pass | Typecheck + manual Studio QA |
| Human checkpoints identified | pass | Manual UI glance |
| Roadmap alignment | pass | Owner follow-up on assisted intake |
| Documentation plan | pass | Light optional DATA_MODEL note |
| No silent scope expansion | pass | Explicit out of scope |

---

## Architecture Review

**Findings:**
- Detection via existing audit field is correct and matches Portal.
- Keep donate vs print_request scopes unchanged; only annotate when assisted id present.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Staff already load full upload docs for intake; reading one more string field is fine.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (Studio soft-reload only for this change)

---

## Data Model Review

**Findings:**
- No new fields. Prefer not inventing a parallel `isCustomDesign` flag.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Do not deploy Functions for this. Consent residual deploy remains separate.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Manual check of assisted vs normal upload vs donation is the real gate.
- Note: if no assisted intake row exists until consent deploy + Add to Request, QA may need a row that already has `assistedCreationRequestId`.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- Optional one-line in DATA_MODEL under customerUploads audit fields is enough.

---

## Required Changes (if approved_with_changes)
1. N/A

---

## Blockers (if blocked)
1. N/A

---

## Verdict Rationale

Approved: clear owner ask, existing field, UI-only, reversible, no deploy risk.

---

## Next Step

Implement approved scope.
