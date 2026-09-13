# TD-034 / catalog-enrich-v36 — Cucumber Owner QA Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Environment | `fresh-prints-dev` |
| Design | `Y2IQuCgAPgnqrBIeJuap` |
| Deploy | six-Function allowlist + `updateAiEnrichmentSettings` (mechanical Settings Save fix) |
| Results JSON | `docs/workflow/reviews/_td034-v36-cucumber-qa-dev-results.json` |

## Deploy revisions

| Function | Revision |
|----------|----------|
| enqueueAiEnrichment | enqueueaienrichment-00102-dat |
| reprocessReadyDesignWithAi | reprocessreadydesignwithai-00013-joz |
| onCatalogReprocessJobWritten | oncatalogreprocessjobwritten-00024-pij |
| testAiEnrichmentPlayground | testaienrichmentplayground-00061-zad |
| startCatalogReprocessJob | startcatalogreprocessjob-00013-jof |
| previewCatalogReprocessJob | previewcatalogreprocessjob-00013-col |
| updateAiEnrichmentSettings (extra) | updateaienrichmentsettings-00050-dij |

## Settings

Persisted prompt was recognized **previous default** (v34-class stock, ~10780 chars). Auto-upgrade would have applied on Processing load; **Use current default + Save** succeeded after Settings updater deploy. Persisted template now **v36 default** (1854 chars, no `{{excluded_tags}}`).

## Playground (saved v36)

| Field | Value |
|-------|-------|
| Model/provider | gemini-2.5-flash-lite / google |
| Title | Retro Woman Holding Cucumber with Sarcastic Saying |
| Description | Rich visual: woman, blonde hair, blue eyes, holding cucumber, pointing, sarcastic quote, vintage palette |
| Category | Funny & Sarcastic |
| tags | `[]` |
| subjects | woman, cucumber |
| objects | vegetable |
| unexpected keys | none |

## Processing (saved v36)

| Field | Value |
|-------|-------|
| promptVersion | **catalog-enrich-v36** |
| Model/provider | gemini-2.5-flash-lite / google |
| Title | When Life Gives You Cucumbers Go F*** Yourself Woman |
| Description | The overall concept is humorous and suggestive. (**weak visual coverage**) |
| Category | Funny & Sarcastic |
| suggestedTags | `[]` |
| tagRerankStatus | **failed** |
| subjects | woman |
| objects | cucumber |
| woman evidence gap | **NO** |
| automationDecision | shadow |
| reason codes | shadow_would_auto_approve |

## Owner judgment needed

Playground visual quality is strong. Processing provenance/schema/tags/`woman` gap look correct, but Processing **description is still thin** vs Playground on the same saved prompt.

Classify:

- `TD-034 V36 CUCUMBER: PASS`
- `TD-034 V36 CUCUMBER: PASS WITH NOTES`
- `TD-034 V36 CUCUMBER: FAIL`
