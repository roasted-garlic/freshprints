# Implementation Review: TD-034 Visual-First v36 + Playground/Processing Parity

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Implementation Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-td034-visual-first-catalog-description-and-structured-profile-consistency-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-td034-visual-first-catalog-description-and-structured-profile-consistency-review.md` |
| ADR | **ADR-FP-177** |
| Verdict | **approved_with_notes** |
| DEV deploy authorized | **NO** — STOP before deploy |

---

## Answers (required)

| # | Question | Answer |
|---|----------|--------|
| 1 | Why current run reports v35 | Deployed Functions binary stamps `CATALOG_ENRICHMENT_PROMPT_VERSION` from source at deploy time = **v35**. Settings prompt text does not change the label. |
| 2 | Exact prompt Playground used | **Request-body** text from Playground editor (`validatedRequest.prompt` → `buildSimpleCatalogEnrichmentUserPrompt`). Owner’s short visual-first text when typed there. |
| 3 | Exact prompt Processing used | **Persisted Settings** `promptTemplate` after `resolveAiPromptTemplate`. Owner Processing title/tags behavior matches **v35-style** stock (slogan title + tag candidates) — not the short Playground text unless Save had applied it (behavioral inference: texts differed). |
| 4 | Saved/default/custom state | Live DEV Settings still resolving prior default path until v36 deploy + auto-upgrade; Playground does not need Save. |
| 5 | Settings-cache behavior | `clearAiEnrichmentSettingsCache()` at each enrichment pipeline start; TTL 60s otherwise. Prompt freshness for Processing **mitigated**. Playground prompt body not from cache. |
| 6 | Playground response stage | Canonical enrichment JSON after normalize + projector (not full Smart Profile / not Suggestions) |
| 7 | Processing AI Suggestions stage | Post title rules + tag resolve/rerank + category resolver → `aiSuggestions` |
| 8 | Canonical provider response contract | `normalizeSimpleCatalogEnrichment` / `SimpleCatalogEnrichmentParsed` → `toCanonicalSimpleCatalogEnrichmentJson`; NL JSON (no `response_format`) |
| 9 | Unknown-field policy | **Strip** (ignore extras; not persist) |
| 10 | Why subjects `Woman` vs `woman` | Playground preserves model casing; Smart Profile runs `normalizeDesignSmartProfile` vocab display rewrite → lowercase/canonical forms |
| 11 | Why halftone differed | Playground shows parse field; Smart Profile panel does **not** surface `halftoneShadowLikelihood` as a dimension (may live under `aiAnalysis.halftoneShadowAssessment`) |
| 12 | Primary AI tag output (owner Processing) | Non-empty candidates implied (Suggested Tags populated) — consistent with v35 prompt still requesting tags |
| 13 | Tag Rerank I/O | Optional second call on approvedTagCandidates shortlist; status `succeeded` when mode triggers and call completes |
| 14 | Origin of screenshot Suggested Tags | `aiSuggestions.tags` = matched/reranked **approved** tags from primary candidates |
| 15 | Tag persistence | Written on design `aiSuggestions.tags` (+ optional `suggestedNewTags`); design.tags separate assigned set |
| 16 | `tags:[]` retires AI tags? | **NO** — only primary generation intent; Tag Rerank / suggestion paths remain until WS7 |
| 17 | `excluded_tags` still required? | **NO** (v36+); optional; post-parse exclusions remain |
| 18 | Old prompt version | `catalog-enrich-v35` (live DEV) |
| 19 | New prompt version | `catalog-enrich-v36` (source; undeployed) |
| 20 | Exact final prompt | Owner-approved text in `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` (no `{{excluded_tags}}` line) |
| 21 | Normalizer changed | **NO** (`smart-profile-normalizer-v6`) |
| 22 | Schema changed | **NO** (`smart-profile-v1`) |
| 23 | Evidence changed | **NO** |
| 24 | Model 2 changed | **NO** |
| 25 | Option B active | **NO** |
| 26 | Tests/results | Focused suites **pass** (72+55); Functions build **PASS**; `git diff --check` **PASS** |
| 27 | Source ready for DEV deploy | **YES** |
| 28 | Exact DEV deploy allowlist | `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `testAiEnrichmentPlayground`, `startCatalogReprocessJob`, `previewCatalogReprocessJob` |
| 29 | Verdict | **approved_with_notes** |

---

## Notes

1. Owner did not authorize prior agent WIP; this pass **reconciles** source under Formal Review.
2. After DEV deploy: use **Save** / Use current default so Processing shares the visual-first Settings text; Playground typed-only text still won’t update Processing until saved.
3. Tag Rerank **not** retired.

---

## Safety

shadow · Autonomous OFF · WS6 blocked · registry deferred · production untouched · no commit/push · **no DEV deploy this pass**
