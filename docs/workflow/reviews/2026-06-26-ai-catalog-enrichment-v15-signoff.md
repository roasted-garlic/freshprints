# Signoff: AI catalog enrichment prompt v15 + validation hardening

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Plan | docs/workflow/plans/2026-06-26-ai-catalog-enrichment-v15-plan.md |
| Review | docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-review.md |
| Tests | docs/workflow/reviews/2026-06-26-ai-catalog-enrichment-v15-test-report.md |
| Status | **approved_with_notes** |

---

## Summary

Upgraded catalog AI enrichment from prompt v14 to **v15** with cleaner prompts and dedicated validation modules. Model output is now coerced, consistency-checked, category-remapped, tag-filtered, and optionally retried before suggestions reach AI Review.

## Files Changed

| File | Change |
|------|--------|
| `functions/src/ai/catalogTitleRules.ts` | v15 prompts, `GENERIC_CATALOG_TAGS`, export `CANVAS_PALETTE_TERMS` |
| `functions/src/ai/catalogEnrichmentResponse.ts` | **NEW** — parse/coerce/consistency |
| `functions/src/ai/catalogCategoryResolver.ts` | **NEW** — exact + semantic remap |
| `functions/src/ai/catalogEnrichmentRetry.ts` | **NEW** — unified retry triggers |
| `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` | Wired new pipeline |
| `functions/src/ai/catalogTitleRules.test.ts` | v15 assertions + generic tag test |
| `functions/src/ai/catalogEnrichmentResponse.test.ts` | **NEW** |
| `functions/src/ai/catalogEnrichmentRetry.test.ts` | **NEW** |
| `docs/project/DECISIONS.md` | ADR-FP-029 |

## Tests

| Check | Result |
|-------|--------|
| Lint | pass |
| Typecheck | pass |
| Functions build | pass |
| Unit tests (49) | pass |

## Manual Tests

Not run. Recommended before deploy: re-enrich 3–5 problem designs; verify inbox + logs.

## Human Approvals

| Item | Status |
|------|--------|
| Production functions deploy | **pending** |

## Risks / Follow-ups

- Unified retry may increase latency/cost on weak first passes — monitor `catalog.enrich.retry` logs.
- First-pass `reasoning_effort: "low"` deferred; measure v15 quality before bumping.
- Optional: re-enrich historical designs on v14 prompts.

## Final Status

**approved_with_notes** — implementation and automated tests complete; production deploy requires human approval.
