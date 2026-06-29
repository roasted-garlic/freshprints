# Review: AI catalog enrichment prompt v15 + validation hardening

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-06-26-ai-catalog-enrichment-v15-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan is well-scoped, builds on existing v14 post-processing, and correctly separates prompt intent from code validation. Module split (`catalogEnrichmentResponse`, `catalogCategoryResolver`, `catalogEnrichmentRetry`) aligns with architecture rules. Open questions resolved with safe defaults; production deploy remains a human checkpoint.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Prompt + validation only; no canvas/UI changes |
| Architecture alignment | pass | Provider orchestrates; logic in dedicated modules |
| Security impact addressed | pass | Server-side validation only |
| Data model impact addressed | pass | `visibleTextColor` collapsed to enum |
| Backend impact addressed | pass | Retry cap documented; logging planned |
| Test strategy adequate | pass | Unit tests for all new modules |
| Human checkpoints identified | pass | Deploy + optional reasoning bump |
| Roadmap alignment | pass | Continues catalog enrichment polish |
| Documentation plan | pass | ADR + optional BACKEND note |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**
- Extracting parse/retry/category from provider matches existing `catalogTitleRules` pattern.
- Unified retry replaces separate OCR-only retry path; must cap at one quality retry plus existing empty-output retry.

**Required changes:**
- [x] Document max 3 vision calls per design in ADR

---

## Security Review

**Findings:**
- No auth/rule changes; validation tightens output quality.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Functions deploy

---

## Data Model Review

**Findings:**
- `visibleTextColor` array in prompt collapsed to existing enum at parse time.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Keep first-pass `reasoning_effort: "minimal"` for v15 initial ship to avoid unmeasured latency increase.
- Category remap must never invent names outside Firestore list.

**Required changes:**
- [x] Omit category when remap confidence below threshold (no hardcoded Uncategorized)

---

## Testing Review

**Findings:**
- Test cases cover coercion, consistency, category remap, generic tags, retry triggers.

**Required changes:**
- [x] None

---

## Required Changes (approved_with_changes)

1. Resolve open questions per plan table (enum collapse, omit category on low confidence, keep minimal reasoning).
2. Log `catalog.enrich.category_remapped` and `catalog.enrich.retry` events.

---

## Verdict Rationale

Approved with documented defaults for open questions. Scope is incremental over v14, testable, and reversible via prompt version rollback.

---

## Next Step

Implement approved scope.
