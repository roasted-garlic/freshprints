# Review: Phase 9A — Etsy Recommendations Foundation

| Field | Value |
|-------|-------|
| Date | 2026-07-15 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-15-phase-9a-etsy-recommendations-foundation-plan.md |
| Verdict | **approved** |

---

## Summary

The plan correctly starts from clean `master`, refuses archived Phase 9 code, scopes to Etsy-only with disabled AI/Assisted cards, and uses a server-side secret-bound callable with one canonical query for both the direct link and API. It is implementable after a short list of required clarifications (nav commitment, Functions gitignore commit scope, fixed sort, price normalization, replace-active confirmation).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Etsy-only; AI/Assisted deferred; Studio/Print Requests/uploads untouched |
| Architecture alignment | pass | Component→Hook→Service→Callable; Portal never calls Etsy |
| Security impact addressed | pass | Auth, ownership, secret binding, no arbitrary query proxy, rate limits |
| Data Model impact addressed | pass | New `etsyRecommendationRequests`; no migration; schemaVersion 1 justified |
| Backend impact addressed | pass | Callables + Etsy client + secret; gitignore hygiene required |
| Test strategy adequate | pass | Mocked Etsy; shared + functions + portal builds; honest pre-existing blockers |
| Human checkpoints identified | pass | Etsy access, secret, visual smoke; production forbidden |
| Roadmap alignment | pass | Phase 9 slice; updates planned |
| Documentation plan | pass | DATA_MODEL/BACKEND/SECURITY/TESTING/ROADMAP/DECISIONS/TECH_DEBT |
| No silent scope expansion | pass | Explicit out-of-scope list; no archived import |

---

## Independent confirmation (owner Review requirements)

| Requirement | Result |
|-------------|--------|
| Starts from current master only | **pass** — audit recorded; no Phase 9 app code on HEAD |
| No archived Phase 9 code imported | **pass** — forbidden; orphan transitions file excluded |
| Only Etsy card functional | **pass** |
| Future cards true disabled mockups | **pass** |
| Only search-relevant questions | **pass** — description/wording/mustHaveDetails |
| One canonical query | **pass** |
| Direct link and API share query | **pass** — equivalence tests required |
| API server-side | **pass** |
| Credentials never reach Portal | **pass** |
| Arbitrary query proxy prevented | **pass** — requestId only |
| No pagination | **pass** |
| No second/third search query | **pass** |
| No AI/Assisted data fields | **pass** |
| Print Requests unchanged | **pass** |
| Artwork uploads unchanged | **pass** |
| No production deployment | **pass** |

---

## Architecture Review

**Findings:**
- Feature folder `etsy-recommendations` matches Portal conventions.
- Choosing `etsyRecommendationRequests` over the old planned `customRequests` sketch is correct for a clean schemaVersion-1 Etsy slice.
- Functions `lib/` gitignore trap is a real deployability blocker and must be fixed in this phase.

**Required changes:**
- [x] See Required Changes below (nav + lib commit scope)

---

## Security Review

**Findings:**
- Secret binding, ownership, and rejection of client query/limit/sort/offset are sound.
- Trademark disclosure text from official Commercial Access criteria is included.
- Live access still gated on human Etsy app purpose/access confirmation.

**Required changes:**
- [ ] None beyond plan clarifications

**Human approval needed before production:**
- [x] Production deploy not authorized (always)
- [x] Etsy secret + access before live API / dev deploy

---

## Data Model Review

**Findings:**
- Minimal statuses `active|completed|cancelled` fit the slice.
- One active request per customer with confirmation before replace is good.
- Storing `etsySearchUrl` derived from canonical query is acceptable (not a secret).

**Required changes:**
- [x] Document replace-active confirmation UX explicitly in Plan Approach

---

## Backend Review

**Findings:**
- `findAllListingsActive` + optional `listings/batch` hydration fits the ≤2 call budget.
- OAuth not required for public active listing search; x-api-key required.
- Sort choice left slightly open (“default or score”) — must be locked server-side.

**Required changes:**
- [x] Lock server sort to a single documented value
- [x] Document Money/price normalization expectations for mocks + live smoke verification

---

## Testing Review

**Findings:**
- Matrix matches owner prompt.
- Correctly forbids live network in unit tests.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Required durable docs listed.
- CURRENT-STATE reset already performed.

---

## Required Changes (approved_with_changes)

All six required changes were applied to the plan on 2026-07-15. Re-review: **approved**.

1. ~~Bottom nav~~ — done
2. ~~Functions lib hygiene~~ — done
3. ~~Server sort~~ — done (`sort_on=score`)
4. ~~Price normalization~~ — done
5. ~~Replace-active confirmation~~ — done
6. ~~Nav icon~~ — done (`Palette`)

---

## Blockers

None.

---

## Verdict Rationale

Plan amendments satisfy the conditional approval. Architecture, security, and product boundaries remain correct for a clean master restart. Implementation may proceed automatically within approved scope.

---

## Next Step

Implement approved scope. Stop only for Etsy access/secret checkpoint, consolidated visual smoke, or production (forbidden).
