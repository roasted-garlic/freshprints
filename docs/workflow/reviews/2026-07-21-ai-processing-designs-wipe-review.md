# Review: Test Data wipe — AI Processing designs only

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-ai-processing-designs-wipe-plan.md |
| Verdict | **approved** |

---

## Summary

The plan correctly scopes a new allowlisted wipe target to AI Processing inbox designs (all three tabs) without nuking ready/archived catalog assets or requiring a full print-request wipe. Shared eligibility + selective Storage deletes are the right safety boundaries; existing owner/dev gates remain intact.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | New target + preset; keeps ready/archived; no production |
| Architecture alignment | pass | Shared expand/eligibility SSOT; callable executes; Studio selects only |
| Security impact addressed | pass | Same owner + allowlist + phrase; per-id Storage paths only |
| Data model impact addressed | pass | Destructive subset delete; no schema change |
| Backend impact addressed | pass | Redeploy `wipeOperationalTestData` to fresh-prints-dev called out |
| Test strategy adequate | pass | Eligibility + expand unit tests; manual smoke after deploy |
| Human checkpoints identified | pass | Dev Functions redeploy + manual Test Data smoke |
| Roadmap alignment | pass | Dev tooling / scratch QA; aligns with ADR-FP-068 |
| Documentation plan | pass | TESTING + ADR-FP-068 amendment |
| No silent scope expansion | pass | Explicit out-of-scope for uploads, favorites, archived, production |

---

## Architecture Review

**Findings:**
- Selective wipe as a plan flag (not `deleteCollections: ["designs"]`) avoids accidental full-collection delete.
- Eligibility helper should stay in shared and mirror Studio inbox tab rules exactly.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Highest risk is calling the existing full-prefix `deleteDesignStorageAssets()` from the selective path — plan correctly forbids that unless full `designs` is also selected.
- Skipping catalog ack for selective wipe is acceptable because ready library is preserved; phrase confirm remains.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (wipe must not ship to production / non-allowlisted projects)

---

## Data Model Review

**Findings:**
- Predicate on `status` + `aiReviewStatus` is sufficient; `aiProcessingStage` correctly ignored.
- Ready and archived excluded — matches “images on the AI Processing page.”

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Page/scan + predicate is fine for dev volumes; status-filtered queries optional optimization.
- Response field `aiProcessingDesignsDeleted` is a good distinction from full collection wipe counts.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Unit matrix must cover: processing pending, needs_review, rejected → true; ready, archived → false; full `designs` coexistence (selective skipped / auto-cleared).
- Manual smoke after Functions redeploy is required before signoff.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR-FP-068 amendment + TESTING wipe bullet are sufficient; optional BACKEND one-liner okay.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner need is clear; plan reuses the proven wipe architecture with the correct narrower delete set and storage safety rules. Approved to implement as written.

---

## Next Step

Implement approved scope: shared target + eligibility, callable selective delete, Studio checkbox/preset, docs, then test + soft-reload Studio; redeploy Functions to `fresh-prints-dev` with owner approval.
