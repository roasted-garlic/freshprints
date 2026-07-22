# Review: AI text title completeness

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-21-ai-text-title-completeness-plan.md |
| Verdict | **approved** |

---

## Summary

Plan correctly documents that title-completeness is **not** fully implemented: prompt already asks for full readable text (`catalog-enrich-v24`), but `resolveLeanCatalogTitle` trusts incomplete titles like `I` / `Sarcasm`, and `extractPrimaryWordingFromDescription` corrupts contraction-heavy unquoted descriptions. Scope stays inside the lean enrichment path with a small prompt bump, narrow safeguard, and regression fixtures — no provider, category, or tag-architecture reopen.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Prompt + title resolve/extract + tests/docs only |
| Architecture alignment | pass | Services layer; no UI/backend client Firebase access |
| Security impact addressed | pass | No secrets; no permanent customer-text logging |
| Data model impact addressed | pass | Same `aiSuggestions.title` string; no migration |
| Backend impact addressed | pass | Functions AI path + prompt version + Settings default auto-upgrade |
| Test strategy adequate | pass | Required fixtures listed; Functions build/lint/diff-check |
| Human checkpoints identified | pass | Manual AI Review reprocess after optional dev deploy |
| Roadmap alignment | pass | Phase 5 maintenance, not a new roadmap feature |
| Documentation plan | pass | ADR + BACKEND version touch + handoff state |
| No silent scope expansion | pass | Explicit out-of-scope list matches intake |

---

## Architecture Review

**Findings:**
- Correctly targets lean path (`simpleCatalogEnrichmentResponse` → `resolveLeanCatalogTitle`) rather than legacy OCR `resolveCatalogTitle` / `visibleText[0]` 6-word path.
- Investigation split (model vs post-model) is required and present.

**Required changes:**
- [ ] None

---

## Security Review

**Findings:**
- No auth, rules, or secret changes.
- Plan forbids adding permanent logging of raw artwork text.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] Production Functions deploy (out of scope this phase)

---

## Data Model Review

**Findings:**
- No schema change; titles update only on reprocess.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Prompt version bump + previous-default registration matches existing Settings sync pattern.
- Completeness fallback must remain narrow so mixed-content titles (e.g. Motherhood Skeleton Rock On) are not collapsed.

**Required changes:**
- [ ] None (implementer must keep Motherhood regression green)

---

## Testing Review

**Findings:**
- Fixtures cover apostrophe straight/curly, multi-line, decorative, mixed visual, no-text, and valid short title.
- Must also cover the extractor bug (`I'm … I'm …` unquoted → not `M Not Arguing I`).

**Required changes:**
- [ ] None beyond plan fixtures

---

## Documentation Review

**Findings:**
- ADR + CURRENT-STATE + workflow artifacts sufficient; BACKEND if version cite is stale.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Investigation is concrete, root causes are separated, fix is the narrowest reliable combination of prompt + extractor + completeness gate, and stop conditions (contract change / migration / interrupting #12) do not apply — workflow is idle.

---

## Next Step

Implement approved scope.
