# Plan: Add Google Gemini 2.5 Flash-Lite as an AI Vision Provider

- **Phase slug:** `gemini-vision-provider`
- **Date:** 2026-06-30
- **Mode:** managed-phase
- **Status:** created — blocked pending review approval before implementation

## Goal

Add `gemini-2.5-flash-lite` (Google) as a selectable AI vision model in **both** the
AI Processing enrichment pipeline and the Settings AI Playground, alongside the existing
OpenAI models.

## Model facts (verified from ai.google.dev, 2026-06-30)

- **Model ID:** `gemini-2.5-flash-lite` (plain string on the compat endpoint).
- **Stability:** GA / stable (not preview).
- **Multimodal:** yes — text, image, video, audio, PDF input. Fits the existing base64
  `image_url` request path (output is text-only, which is what enrichment needs).
- **Endpoint:** OpenAI-compatible Chat Completions available.
- **Input/output limits:** 1,048,576 input tokens / 65,536 output tokens.
- **Pricing (standard tier):** $0.10 / 1M input tokens (text/image/video), $0.40 / 1M output
  tokens; free tier available. Google's cheapest multimodal option.
- **Thinking:** supported via Google's native thinking config, **not** OpenAI's
  `reasoning_effort`. Confirms the decision below to omit reasoning fields for `gemini-*`.
  Native thinking-level control is **out of scope** for this phase.

## Key decisions (approved by user 2026-06-30)

1. **Routing: by model ID prefix.** Model IDs beginning with `gemini-` route to Google's
   OpenAI-compatible endpoint; all other allowed IDs continue to route to OpenAI. No new
   explicit "provider" selector/UI.
2. **Secret: user-provisioned.** The user will add `GEMINI_API_KEY` to Firebase secrets
   themselves. This plan writes only the code that reads it. **No console or deploy action
   is performed by the agent.**
3. **Surfaces: both** — enrichment pipeline and playground.

## Why this is tractable

- Gemini 2.5 Flash-Lite is a **vision** model with an **OpenAI-compatible** Chat Completions
  endpoint: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`.
- Existing request body (`model`, `messages`, base64 `image_url`) is reused nearly verbatim.
- Provider selection already flows through `resolveAiEnrichmentProvider` and the
  `AiEnrichmentProvider` interface.

## Design details

### Provider abstraction
- Introduce a small `resolveProviderTarget(modelId)` helper returning `{ providerId, baseUrl }`.
  `gemini-*` → `{ providerId: "google", baseUrl: <gemini compat url> }`; otherwise
  `{ providerId: "openai", baseUrl: "https://api.openai.com/v1/chat/completions" }`.
- Generalize the two hardcoded OpenAI URLs to accept a base URL argument:
  - `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` (`postOpenAiVisionCompletion`)
  - `functions/src/ai/aiEnrichmentPlayground.ts` (`requestPlaygroundCompletion`)
- `fetchOpenAiWithRetry` is provider-agnostic (takes a URL already) — reused unchanged.

### `reasoning_effort` handling
- Gemini's compat endpoint does not accept `reasoning_effort`. For `gemini-*` models, **omit**
  `reasoning_effort` and `max_completion_tokens`-reasoning semantics from the request body
  rather than relying on the existing 400-retry fallback. Request builders take a flag or the
  resolved provider target to decide whether to include reasoning fields.
- Playground/pipeline continue to report `reasoningEffortApplied` as the requested value or a
  neutral marker for Gemini (documented in the response type change below).

### Two API keys
- Add `geminiApiKeySecret = defineSecret("GEMINI_API_KEY")` in `functions/src/lib/secrets.ts`.
- Bind both secrets on `enqueueAiEnrichment` and `testAiEnrichmentPlayground`.
- Pass the correct key to the provider/playground based on the resolved provider target. If the
  required key for the chosen provider is missing, fail with a clear message (mirrors the
  existing OpenAI "not configured" precondition).

### Shared constants + types
- `shared/constants/aiEnrichment.constants.ts`:
  - Add `GEMINI_VISION_MODEL_IDS = ["gemini-2.5-flash-lite"]`.
  - Introduce a combined `ALLOWED_VISION_MODEL_IDS` (OpenAI + Gemini) used by validation and the
    UI dropdown. Keep `OPENAI_VISION_MODEL_IDS` for OpenAI-specific logic. Default model unchanged.
- `shared/types/ai/aiEnrichmentPlayground.types.ts`:
  - Broaden `provider` from `"openai"` to `"openai" | "google"`.
  - Broaden `visionModelId` to the combined model id union.

### Validation / allowlist
- `aiEnrichmentConfig.ts` and `aiEnrichmentPlayground.ts` validation use the combined allowlist so
  Gemini IDs pass. `reasoningEffort` validation stays as-is (ignored for Gemini in the request).

### UI
- Model dropdown in Settings Playground reads from the combined allowlist — Gemini appears
  automatically. For `gemini-*` selection, disable/neutralize the reasoning-effort control
  (Gemini ignores it). Minimal renderer change in the settings constants + playground component.

### Logging / error codes
- Keep existing `openai.*` pipeline log events but include the resolved `providerId`/`baseUrl`
  host so Google runs are distinguishable. (Renaming event keys is out of scope — noted as
  optional future cleanup to avoid churn.)

## Files expected to change (~10–12)

**Backend (functions):**
1. `functions/src/lib/secrets.ts` — add `geminiApiKeySecret`.
2. `functions/src/ai/providers/resolveProviderTarget.ts` — **new** prefix router.
3. `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` — base URL + reasoning flag.
4. `functions/src/ai/providers/resolveAiEnrichmentProvider.ts` — select key/base by target.
5. `functions/src/ai/aiEnrichmentPlayground.ts` — base URL + reasoning flag + provider in response.
6. `functions/src/enqueueAiEnrichment.ts` — bind gemini secret, pass correct key.
7. `functions/src/testAiEnrichmentPlayground.ts` — bind gemini secret, pass correct key.
8. `functions/src/ai/aiEnrichmentPipeline.ts` — pass gemini key through (if needed).

**Shared:**
9. `shared/constants/aiEnrichment.constants.ts` — Gemini model IDs + combined allowlist.
10. `shared/types/ai/aiEnrichmentPlayground.types.ts` — widen provider + model unions.

**Renderer:**
11. `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts` — combined
    model list, client resolve helpers.
12. Playground component/hook — neutralize reasoning control for Gemini (small).

**Tests:**
- New `resolveProviderTarget.test.ts`.
- Extend playground + provider tests for a `gemini-*` model (body omits `reasoning_effort`,
  targets Google base URL, provider reported as `google`).

## Out of scope
- Renaming `openai_*` error codes / log event keys.
- Any new UI beyond the existing model dropdown + reasoning-control gating.
- Provisioning `GEMINI_API_KEY`, Firebase deploy, or any console action (user handles the secret).

## Testing plan
- `npx tsx --test` on new/changed function test files (per project convention — no `test` script).
- `npx tsc --noEmit` (functions + root), `npm run lint`, `npm run build`.
- Manual authenticated playground smoke with a `gemini-2.5-flash-lite` selection is a
  **post-deploy** step gated on the user provisioning the secret and deploying — documented,
  not performed by the agent.

## Human checkpoints
- **Secret provisioning** (`GEMINI_API_KEY`) — user performs in Firebase console.
- **Functions deploy** — human approval required per workflow.
- Neither is performed during implementation.
