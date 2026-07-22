# Review: AI text title completeness regression (description leakage)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-22-ai-text-title-completeness-regression-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly frames the Christmas mouse-ear failure as a regression in the same lean title-finalization system, not a new title feature. Repo investigation identifies the bad title materializing at description-wording extraction / lean resolve via **first-sentence fallback** and missing prose-boilerplate rejection, compounded by lean responses lacking structured readable-text evidence and weak single-quote / `text reads` extraction. Scope stays inside Functions helpers + lean parse/prompt, with explicit stop if persisted `aiSuggestions` must change.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Same finalization path; no parallel title system; no Best Christmas Ever special case |
| Architecture alignment | pass | Service-layer Functions helpers; optional transient parse field only |
| Security impact addressed | pass | No secrets; no permanent customer-text logging |
| Data Model impact addressed | pass | No persisted contract change; transient `readableTextLines` optional |
| Backend impact addressed | pass | Prompt version + previous-default auto-upgrade; all enrichment entry points via lean resolve |
| Test strategy adequate | pass | Leakage, first-sentence rejection, boilerplate variants, style exclusion, preservation, no-text, prior fixtures |
| Human checkpoints identified | pass | Soft-deploy manual 5× Christmas + prior QA set; production gated |
| Roadmap alignment | pass | Phase 5 maintenance / regression harden |
| Documentation plan | pass | ADR amendment + BACKEND version + handoff state |
| No silent scope expansion | pass | Parks brand-logo; out-of-scope list explicit |

---

## Architecture Review

**Findings:**
- Correct target: `resolveLeanCatalogTitle` / `extractPrimaryWordingFromDescription` used by `buildSimpleCatalogEnrichmentResult` (shared across processing paths).
- Preferring transient readable lines without persisting them preserves the `aiSuggestions` contract.
- Removing first-sentence-as-title is required; implementer must ensure empty-title risk is covered by guarded extraction + non-prose candidate fallback.

**Required changes:**
- [ ] None

---

## Security Review

**Findings:**
- No auth, rules, or secret changes.
- Plan forbids permanent logging of raw artwork text.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] Production Functions deploy (out of scope this phase)

---

## Data Model Review

**Findings:**
- Transient lean field only; titles change on reprocess.
- Stop condition if persistence becomes required — correct.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Prompt bump + previous-default registration matches existing Settings sync pattern.
- Guaranteed path coverage: initial, Reprocess, playground, retries, customer-upload promotion all go through lean build/resolve — implementer must not add a second title path.
- Motherhood / mixed-content and Sarcasm fixtures must stay green.

**Required changes:**
- [ ] None (implementer must keep prior completeness fixtures green)

---

## Testing Review

**Findings:**
- New fixtures match the addendum; 5× manual Christmas QA is appropriate for intermittency.
- Must cover single-quote `Text reads '…'` as well as double-quoted forms (called out in approach).

**Required changes:**
- [ ] None beyond plan fixtures

---

## Documentation Review

**Findings:**
- ADR-FP-113 amendment (or short ADR) + CURRENT-STATE + workflow artifacts sufficient.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Investigation pins the failure to a concrete code stage (first-sentence title fallback + missing prose rejection + weak readable extraction on lean path). Fix is centralized, testable, and explicitly preserves prior completeness work without expanding into category/tag architecture or a parallel title system.

---

## Next Step

Implement approved scope. Soft-deploy + manual QA remain human-gated after automated tests.
