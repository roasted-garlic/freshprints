# Formal Review: Restore OpenAI `gpt-5.6-luna` AI enrichment (Phase 1)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Plan | `docs/workflow/plans/2026-09-05-restore-openai-gpt-5-6-luna-ai-enrichment-plan.md` |
| Reviewer | Review Agent |
| Verdict | **approved_with_notes** |
| Implementation authorized | **YES** under owner conditional instruction (no unresolved owner product decisions) |

---

## Checklist answers (owner-required 1–32)

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact existing model allowlist | `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite` (`GEMINI_VISION_MODEL_IDS` / `ALLOWED_VISION_MODEL_IDS`) |
| 2 | Gemini 3.1 currently present | **YES** — `gemini-3.1-flash-lite` |
| 3 | Luna exact model ID | `gpt-5.6-luna` |
| 4 | Explicit provider-map design | Code-side map `modelId → "google" \| "openai"`; persist only `settings/aiEnrichment.visionModelId`; **no** prefix inference |
| 5 | Current global-default resolver | `resolveVisionModelId` / `resolveEffectiveVisionModelId` + Settings `visionModelId`; override via `aiRequestedVisionModelId` |
| 6 | System fallback | `DEFAULT_VISION_MODEL_ID = "gemini-2.5-flash-lite"` on missing/invalid |
| 7 | Run override | `enqueueAiEnrichment` `visionModelIdOverride` → design `aiRequestedVisionModelId`; cleared after run; must not write Settings |
| 8 | Unsupported model rejection | Allowlist set; invalid → fallback / enqueue validation rejects bad override |
| 9 | OpenAI provider adapter | Extend `resolveProviderTarget(providerId)`; OpenAI URL `https://api.openai.com/v1/chat/completions`; Bearer auth (same header shape as Gemini OpenAI-compat); add `reasoning_effort: "low"` only for OpenAI; isolate in request-body builders |
| 10 | Gemini preserved | Default/fallback unchanged; Gemini request body omits reasoning; existing pricing kept |
| 11 | Luna reasoning field | Top-level Chat Completions `reasoning_effort: "low"` (not Settings-exposed) |
| 12 | Image input | Existing `image_url` data-URL content parts (Chat Completions) — compatible with OpenAI vision |
| 13 | Structured output | Instruction-only JSON + server `extractJsonObject` / normalizer (no `response_format`) — keep for both providers |
| 14 | Secondary AI path routing | **Must follow** selected target: `callTagRerank`, `callSuggestedTagAuthorStandalone` currently hardcode `resolveProviderTarget()` → Gemini — **required fix** |
| 15 | Settings picker | Persist `visionModelId`; copy → “Default AI model”; no provider dropdown |
| 16 | Playground | `testAiEnrichmentPlayground` / `runAiEnrichmentPlayground` — must resolve provider by selected model; Playground selection ≠ Settings save |
| 17 | Reprocess | `catalogReprocessWorker` / `reprocessReadyDesignWithAi` / `onCatalogReprocessJobWritten` → `runAiEnrichmentPipeline` — inherit resolution; bind OpenAI secret |
| 18 | Secret binding | Reintroduce `OPENAI_API_KEY` on enqueue, playground, tag-rerank playground, reprocess, catalog reprocess worker entry |
| 19 | Missing OpenAI secret | Fail closed when resolved model provider is `openai` and key empty (no silent Gemini mislabel) |
| 20 | Cost estimator | Extend pricing type with optional `cachedInput`; Luna 0.20 / 0.02 / 1.20; Gemini unchanged |
| 21 | Cached input usage | Represent in metadata; Phase 1 estimate may continue using input+output unless usage exposes cached tokens (**note**) |
| 22 | Firestore schema change | **NO** |
| 23 | Rules change | **NO** |
| 24 | Index change | **NO** |
| 25 | Migration | **NO** |
| 26 | Functions deploy surface | `enqueueAiEnrichment`, `testAiEnrichmentPlayground`, `testAiEnrichmentTagRerank`, `reprocessReadyDesignWithAi`, catalog reprocess trigger/worker (secret arrays + provider routing) |
| 27 | Studio changes | Settings Default AI model options + copy; Processing override options; shared constants sync |
| 28 | Tests required | As Plan + owner instruction (resolution, override, provider request, secrets, secondary paths, pricing, Studio, regression) |
| 29 | Phase 2 deferred | **YES** |
| 30 | Production impact | **NONE** this pass (stop before DEV deploy) |
| 31 | Unresolved human checkpoints | DEV deploy auth (post-IR); OpenAI secret **value** live auth at DEV QA; ADR number **ADR-FP-174** (172/173 occupied) |
| 32 | Implementation verdict | **approved_with_notes** — proceed |

---

## AI path inventory (mechanical)

| Path | Finding | Phase 1 action |
|------|---------|----------------|
| Primary enrichment | `resolveAiEnrichmentProvider(geminiOnly)` → always Gemini factory | Dual keys + provider map |
| Catalog reprocess | Pipeline with `geminiApiKeySecret` only | Bind OpenAI secret; pass through |
| Settings Playground | `resolveProviderTarget()` no-arg Gemini | Model→provider; dual secrets |
| Processing override | Allowlist validation present | Expand allowlist; never mutate Settings |
| Tag rerank | Uses `provider.modelId` but **Gemini URL hardcoded** | Same target/key as run |
| Suggested-tag author | Same Gemini pin | Same |
| Tag-rerank playground | `testAiEnrichmentTagRerank` Gemini secret only | Follow selected `visionModelId` provider (**no exception**) |
| Development provider | Fallback when Gemini key empty | OpenAI path must **not** use this as silent substitute |

**Approved path exceptions:** none.

---

## Provider request contract notes

- Today: Gemini OpenAI-compatible Chat Completions; `Authorization: Bearer`; `max_completion_tokens`; multimodal `image_url`; instruction JSON (no `response_format`).
- OpenAI Chat Completions: same general shape; add `reasoning_effort` for Luna; do not send to Google.
- Usage: `prompt_tokens` / `completion_tokens`; optional future `cachedInput` in estimate helper.
- Empty-output user message currently says “Google AI…” — make provider-neutral.

**Luna capability:** Public docs confirm Chat Completions + image input for `gpt-5.6-luna`. No STOP for capability checkpoint.

---

## Notes for Implement (no owner decision required)

1. Next ADR id: **ADR-FP-174** (not 172).
2. Reframe comments/`DEFAULT_VISION_MODEL_ID` as **system fallback**.
3. Generalize vision chat-completions provider factory; avoid forking Smart Profile pipeline.
4. Extend `RunAiEnrichmentPipelineOptions` (or equivalent) with `openAiApiKey`.
5. Update `AiEnrichmentProviderId` to include `"openai"`.
6. Slice-5 contract tests that assert only `geminiApiKeySecret` will need dual-secret updates.
7. Do not implement Phase 2 registry / free-form IDs.
8. Do not bump `catalog-enrich-v34` / normalizer v6 / smart-profile-v1 / evidence validators.

---

## Security

- Keys server-only; Settings stores model id only; fail closed for OpenAI without key; no secret values in logs/tests.

---

## Verdict

**approved_with_notes** — Implementation authorized under owner conditional instruction.
