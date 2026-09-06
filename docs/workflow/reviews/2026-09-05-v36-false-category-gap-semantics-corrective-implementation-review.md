# Implementation Review: v36 False Category-Gap Semantics Corrective → catalog-enrich-v37

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Implementation Review |
| Plan | `docs/workflow/plans/2026-09-05-v36-false-category-gap-semantics-corrective-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-v36-false-category-gap-semantics-corrective-review.md` (approved) |
| Verdict | **approved** — source ready; **STOP before DEV deploy** |

---

## Required answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Old prompt version | `catalog-enrich-v36` (archived as `PREVIOUS_DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE_V36`) |
| 2 | New prompt version | **`catalog-enrich-v37`** |
| 3 | Exact prompt delta | Added one general sentence on the category line: `Use categoryAlternatives only when another approved category is genuinely plausible. Use categoryGapNote only when no approved category is a reasonable fit; otherwise return "". Do not use categoryGapNote to explain or justify a valid category choice.` |
| 4 | Word-count delta | v36 **215** words / **1854** chars → v37 **251** words / **2106** chars (**+36** words / **+252** chars) |
| 5 | Fixture-specific text added? | **NO** |
| 6 | categoryGapNote semantics restored? | **YES** (true-gap only; otherwise `""`) |
| 7 | categoryAlternatives semantics | Prefer only when another approved category is genuinely plausible; soft `category_alternatives_present` unchanged |
| 8 | Server/parser changed? | **NO** |
| 9 | Resolver changed? | **NO** |
| 10 | Automation decision changed? | **NO** (tests only) |
| 11 | Category-gap blocker hardness changed? | **NO** |
| 12 | Model 2 changed? | **NO** |
| 13 | Schema changed? | **NO** |
| 14 | Normalizer changed? | **NO** (240 evidence cap unchanged) |
| 15 | Option B changed? | **NO** |
| 16 | Tag system changed? | **NO** |
| 17 | Reason truncation diagnosis | Stored evidence truncated by `SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH = 240` in Smart Profile normalizer (mid-word `...prim`); not Studio-only clip |
| 18 | Reason truncation fix | **None this pass** (false gaps should emit empty note; expanding 240 deferred) |
| 19 | Exact tests/results | See below — **all pass**; `functions` `npm run build` **pass**; `git diff --check` **no whitespace errors** |
| 20 | Source ready for DEV deploy? | **YES** (await owner auth) |
| 21 | Exact deploy allowlist | `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `testAiEnrichmentPlayground`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`, `updateAiEnrichmentSettings` |
| 22 | Five-run QA plan | After deploy: 5 consecutive Processing reprocesses of `Y2IQuCgAPgnqrBIeJuap`; expect valid primary (e.g. Funny & Sarcastic) with `categoryGapNote=""`; no hard `category_gap_suggested` from secondary food/style concepts |
| 23 | True-gap regression plan | Contract/unit: non-empty `categoryGapNote` → hard `category_gap_suggested` + Would Auto Approve NO (no fabricated production design required) |
| 24 | Verdict | **approved** |

---

## Tests run (this pass)

```text
npx tsx --test packages/shared/src/constants/aiEnrichment.constants.test.ts \
  packages/shared/src/constants/catalogReprocess.constants.test.ts \
  packages/shared/src/utils/catalogAutomationDecision.test.ts
# → 58 pass

npx tsx --test functions/src/ai/catalogEnrichV37CategoryGapSemantics.contract.test.ts \
  functions/src/ai/catalogEnrichV36VisualFirst.contract.test.ts \
  functions/src/ai/catalogTitleRules.test.ts \
  functions/src/ai/smartProfileQuality.contract.test.ts \
  functions/src/ai/smartProfileBuilder.test.ts \
  functions/src/ai/catalogEnrichSchemaParity.contract.test.ts \
  functions/src/ai/categoryDescriptionsPromptParity.contract.test.ts \
  functions/src/ai/explicitContentAutomation.contract.test.ts \
  functions/src/ai/catalogEnrichParityDiagnostic.contract.test.ts
# → 118 pass

npx tsx --test functions/src/ai/catalogThemeCategoryResolver.test.ts \
  packages/shared/src/utils/catalogAutomationDecision.test.ts
# → 82 pass (resolver + decision regressions)

cd functions && npm run build
# → tsc exit 0

git diff --check
# → no conflict markers / whitespace errors (LF/CRLF warnings only)
```

### Case coverage

| Case | Result |
|------|--------|
| Clear fit + empty gap → no `category_gap_suggested` | pass (builder + decision) |
| Secondary concepts + empty gap → no hard gap | pass |
| Alternatives present → soft only | pass |
| True gap non-empty note → hard | pass |
| Prompt contract (gap semantics; no fixture examples) | pass |
| v36 → v37 previous-default auto-upgrade | pass |

---

## Pins updated

- `CURRENT_CATALOG_ENRICH_PROMPT_VERSION` / Functions `CATALOG_ENRICHMENT_PROMPT_VERSION` / reprocess snapshot → `catalog-enrich-v37`
- `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` = visual-first + semantic sentence
- ADR-FP-178; TECH_DEBT TD-034 disposition HOLD until DEV QA + Signoff

---

## Post-IR gate

**NO DEV deploy in this pass.** Owner must authorize allowlist deploy to `fresh-prints-dev`, then Settings Use current default + Save if stock v36 text is saved, then five-run cucumber QA.
