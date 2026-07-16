# Review: Etsy link-only rip scrape

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-16-etsy-link-only-rip-scrape-plan.md |
| Verdict | **approved** |

---

## Summary

Owner rejects ScraperAPI scrape quality and orders a full rip to Primary + Broader link cards only. Plan is narrowly scoped, matches ADR-FP-087f website-first posture, improves UX without reintroducing scrape secrets on the hot path, and correctly gates production out. Approved to implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Rip scrape + polish links; keep questionnaire/submit |
| Architecture alignment | pass | Removes scrape service layer; Portal stays thin |
| Security impact addressed | pass | Stop wiring SCRAPERAPI; no client scrape |
| Data model impact addressed | pass | Cache/kill-switch become inert; no prod migration |
| Backend impact addressed | pass | Delete callable on fresh-prints-dev |
| Test strategy adequate | pass | Unit + typecheck + owner manual QA |
| Human checkpoints identified | pass | Manual UI PASS/FAIL |
| Roadmap alignment | pass | Update ROADMAP scrape bullet |
| Documentation plan | pass | ADR-087j + BACKEND/SECURITY/RISK/DATA_MODEL |
| No silent scope expansion | pass | No secret destroy; no MCP wipe; no prod |

---

## Architecture Review

**Findings:**
- Restores link-only results consistent with ADR-FP-087f.
- Listing card / parser modules become dead code — delete with callable.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Product path no longer needs ScraperAPI. Leaving GCP secrets unused is acceptable; do not print or rotate in this phase.
- R-010 scrape ToS risk is mitigated for product (no scrape).

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] None (dev-only function delete)

---

## Data Model Review

**Findings:**
- Document inert collections; optional later cleanup of Firestore docs/rules is fine.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Must remove export and delete deployed function so clients cannot call a ghost endpoint.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Remove scrape unit tests with code; keep query-builder / validation tests.
- Manual QA required for link-card UX.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- ADR-FP-087j must supersede 087g/h/i for live product path.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Owner decision is explicit and product-correct. Scope, security, and deploy gates are clear. Implement immediately.

---

## Next Step

Implement approved scope on `fresh-prints-dev` only.
