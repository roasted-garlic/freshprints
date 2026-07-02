# Plan: Remove OpenAI support — Google (Gemini) only

**Date:** 2026-07-01
**Phase:** signoff
**Status:** signed off — user confirmed manual smoke test passes ("everything is working great"). Functions deploy is a separate human-approved step, not yet run.

## Goal

Fresh Prints will no longer use OpenAI models for AI Processing / AI Playground. Remove all
OpenAI-specific code paths, config, secrets wiring, and UI, keeping only the Google (Gemini) vision
path. Replace any "OpenAI" text visible in the app UI with "Google AI" (or remove it where it no
longer applies, e.g. reasoning effort).

## Context / what we found

- Gemini is already called through Gemini's OpenAI-compatible Chat Completions endpoint
  (`resolveProviderTarget.ts`), reusing the exact same request-building/parsing code as the OpenAI
  path (`openAiVisionEnrichmentProvider.ts`, `openAiVisionCompletion.ts`, `openAiRetry.ts`). This is
  **not** two independent implementations — it's one HTTP client used with two base URLs/keys.
- `reasoning_effort` is a genuinely OpenAI-only request field. Gemini never uses it
  (`supportsReasoningEffort: false` in `resolveProviderTarget.ts`). Per user decision, the entire
  reasoning-effort setting (UI, config, defaults) is being removed, not just hidden.
- Per user decision, `OPENAI_API_KEY` usage is being removed from function code
  (`functions/src/lib/secrets.ts`, `enqueueAiEnrichment.ts`, `testAiEnrichmentPlayground.ts`,
  `aiEnrichmentPipeline.ts`, `aiEnrichmentPlayground.ts`). The underlying GCP secret itself is not
  deleted from Secret Manager as part of this phase (that would require a separate deploy/human
  checkpoint); only code stops referencing it.
- `docs/workflow/plans/`, `docs/workflow/reviews/`, and `project-chatgpt-handoff/` contain many
  historical OpenAI references. These are historical records of past work and are **out of scope** —
  they are not rewritten.

## Scope

### 1. `functions/src/ai/` — provider/config layer

| File | Change |
|---|---|
| `providers/resolveProviderTarget.ts` | Remove `OPENAI_CHAT_COMPLETIONS_URL` / OpenAI branch; function always returns the Gemini target. Likely collapses to a constant, but keep the shape simple — no need to keep a resolver if there's only one provider. |
| `providers/resolveAiEnrichmentProvider.ts` | Drop `openAiApiKey` param and the OpenAI branch entirely; only Gemini key + development fallback remain. |
| `providers/openAiVisionEnrichmentProvider.ts` | Rename to `geminiVisionEnrichmentProvider.ts`. Strip reasoning-effort branch/fallback-retry logic (400 "unsupported reasoning_effort" handling) since it's dead once OpenAI is gone. Rename exported symbols (`createOpenAiVisionEnrichmentProvider` → `createGeminiVisionEnrichmentProvider`, etc). Keep `OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION`'s *value* stable in behavior but rename the constant/bump if needed (see prompt version note below). |
| `openAiVisionCompletion.ts` | Rename to `visionCompletion.ts`. Rename `OpenAi*` types/functions to provider-neutral names (`ChatCompletionPayload`, `extractCompletionChoice`, etc). Drop reasoning-token-budget logic only if it was OpenAI-specific — confirm during implementation whether Gemini usage payloads ever populate `reasoning_tokens`; if not, simplify `resolveEmptyOutputErrorCode`/`isReasoningBudgetExhausted` accordingly. |
| `openAiRetry.ts` | Rename to `visionRequestRetry.ts` (or similar). Rename `OpenAiRequestError` → generic `VisionRequestError`, `resolveOpenAiErrorCode` → `resolveVisionErrorCode`, drop `openai_*` error code strings in favor of neutral ones (or keep string values as-is if they're stored/queried in Firestore and renaming would be a breaking data change — **check Firestore usage before renaming string literals**, only rename symbol/function names freely). |
| `aiEnrichmentConfig.ts` | Remove `DEFAULT_OPENAI_REASONING_EFFORT`, `resolveOpenAiReasoningEffort`, `ALLOWED_OPENAI_REASONING_EFFORTS`, `isAllowedOpenAiReasoningEffort`, `OPENAI_VISION_REASONING_EFFORT_FALLBACK`, and the `@deprecated` OpenAI-model aliases (`DEFAULT_OPENAI_VISION_MODEL_ID`, `ALLOWED_OPENAI_VISION_MODEL_IDS`, `isAllowedOpenAiVisionModelId`, `resolveOpenAiVisionModelId`, `resolveEffectiveOpenAiVisionModelId`, `OPENAI_VISION_MODEL_ID`). Keep `resolveVisionModelId`/`resolveEffectiveVisionModelId` (Gemini-only allowlist now). Rename remaining `OPENAI_VISION_MAX_COMPLETION_TOKENS*` constants to neutral names if desired (optional, low-risk either way). |
| `aiEnrichmentPipeline.ts` | Update import of `resolveOpenAiErrorCode` to the renamed export; drop `openAiApiKey` plumbing into `resolveAiEnrichmentProvider()`. |
| `aiEnrichmentPlayground.ts` | Drop `openAiApiKey` parameter from `runAiEnrichmentPlayground`; Gemini-only from here down. |
| `catalogTitleRules.ts` | `OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION` — rename constant to something neutral (e.g. `CATALOG_ENRICHMENT_PROMPT_VERSION`). Confirm whether the stored *value* (`"catalog-enrich-openai-v18"`) is read/matched elsewhere (Firestore records, tests) before deciding whether to also change the string value — if it's just a version tag, updating to `"catalog-enrich-v19"` is reasonable and should be called out to the user as a behavior-adjacent change (new prompt version marker), not silent. |
| `loadAiEnrichmentSettings.ts`, `simpleCatalogEnrichmentResponse.ts` | Update any `openAiApiKey`/reasoning-effort field references to match the trimmed provider signature. |

### 2. Firebase Functions wiring

| File | Change |
|---|---|
| `functions/src/lib/secrets.ts` | Remove `openAiApiKeySecret` export. |
| `functions/src/enqueueAiEnrichment.ts` | Remove `openAiApiKeySecret` from `secrets: [...]` and from the `runAiEnrichmentPipeline(...)` call args. |
| `functions/src/testAiEnrichmentPlayground.ts` | Same: drop `openAiApiKeySecret` from `secrets` and the `runAiEnrichmentPlayground(...)` call. |

### 3. `shared/` — constants & types

| File | Change |
|---|---|
| `shared/constants/aiEnrichment.constants.ts` | Remove `OPENAI_VISION_MODEL_IDS`, `OpenAiVisionModelId`, `DEFAULT_OPENAI_VISION_MODEL_ID`, `OPENAI_REASONING_EFFORT_VALUES`, `OpenAiReasoningEffort`, `DEFAULT_OPENAI_REASONING_EFFORT`, `OPENAI_REASONING_EFFORT_FALLBACK`. `ALLOWED_VISION_MODEL_IDS`/`AllowedVisionModelId`/`DEFAULT_VISION_MODEL_ID` become Gemini-only. Remove `gpt-5.4-*` entries from `VISION_MODEL_PRICING_USD_PER_1M`. |
| `shared/types/ai/aiEnrichmentPlayground.types.ts` | Remove `"openai"` from `AiEnrichmentProviderId` union (becomes `"google" \| "development"` or similar — confirm exact existing union first). |

### 4. Renderer — Settings UI

| File | Change |
|---|---|
| `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts` | Remove `OPENAI_VISION_MODEL_OPTIONS`, `OPENAI_REASONING_EFFORT_OPTIONS`, `OpenAiReasoningEffortOption`, `DEFAULT_OPENAI_REASONING_EFFORT`, `DEFAULT_OPENAI_VISION_MODEL_ID` alias, `resolveClientReasoningEffort`, `getReasoningEffortOption`, `formatReasoningEffortLabel`, `isGeminiModelId` (no longer needed once every model is Gemini). `ALL_VISION_MODEL_OPTIONS` becomes just `GEMINI_VISION_MODEL_OPTIONS`. Update `VisionModelOption.provider` type to drop `"openai"`. |
| `src/renderer/src/features/settings/pages/SettingsPage.tsx` | Remove reasoning-effort `<Select>` block and the `isGeminiModelId` conditional (lines ~215-240ish) — always show the (now Gemini-only) vision model picker. Update the section description text "Choose the OpenAI vision model..." → "Choose the Google AI vision model...". |
| `src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts`, `useAiEnrichmentSettings.ts`, `services/aiEnrichmentSettingsService.ts` | Remove reasoning-effort state/fields and any `openAiApiKey`-adjacent plumbing found during implementation. |

### 5. Renderer — AI Review UI

| File | Change |
|---|---|
| `src/renderer/src/features/ai-review/components/AiProcessingSettingsModal.tsx` | Remove `OPENAI_REASONING_EFFORT_OPTIONS` usage/reasoning-effort control. |
| `src/renderer/src/features/ai-review/components/AiReviewRerunModal.tsx` | Remove `OPENAI_VISION_MODEL_OPTIONS`/`OPENAI_REASONING_EFFORT_OPTIONS` usage; model list becomes Gemini-only, reasoning-effort control removed. |
| `src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx` | Line ~327: "Finishes the current image, then stops. OpenAI cannot be cancelled" → "...Google AI cannot be cancelled" (or similar neutral phrasing — confirm exact copy during implementation). |

### 6. Tests

Update/remove test fixtures and assertions referencing OpenAI:
- `functions/src/ai/providers/openAiVisionEnrichmentProvider.test.ts` → rename/rewrite for the renamed Gemini-only provider file; drop reasoning-effort-fallback test cases.
- `functions/src/ai/providers/resolveAiEnrichmentProvider.test.ts`, `resolveProviderTarget.test.ts` → drop OpenAI branch cases.
- `functions/src/ai/openAiVisionCompletion.test.ts`, `openAiRetry.test.ts` → rename to match renamed source files; drop OpenAI-specific error-code assertions that no longer apply (keep generic retry/error-parsing coverage).
- `functions/src/ai/aiEnrichmentConfig.test.ts`, `simpleCatalogEnrichmentResponse.test.ts`, `catalogTitleRules.test.ts`, `aiEnrichmentPlayground.test.ts`, `enqueueAiEnrichmentValidation.test.ts` → drop OpenAI-only assertions/fixtures.
- `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts` → drop OpenAI option/reasoning-effort coverage.
- `src/renderer/src/features/designs/utils/designAiFieldsMapper.test.ts`, `src/renderer/src/features/ai-review/utils/aiReviewInbox*.test.ts`, `aiReviewRerunSession.test.ts` → these use `provider: "openai"` as a fixture value for a *stored* Firestore field on **existing/historical** designs data shape. Decision needed: since past designs may have `provider: "openai"` already persisted in Firestore, the type/rendering code should likely still tolerate reading that value even though it can no longer be *produced* going forward (display-only backward compatibility for old data). Flagging this explicitly for review — see Open Question below.

### 7. Docs (non-workflow-artifact)

Update stale architecture/security docs (these are current-state docs, not historical records):
- `docs/architecture/BACKEND.md` (lines ~77-105, 161: provider list, `OPENAI_API_KEY` secret, model allowlist, `openai.*` log event names)
- `docs/standards/SECURITY.md` (lines ~786-796, "AI Provider Secrets" section names `OPENAI_API_KEY`)
- `docs/architecture/FIREBASE.md` (check for `OPENAI_API_KEY` secret documentation)

Do **not** touch `docs/workflow/plans/`, `docs/workflow/reviews/`, `docs/project/DECISIONS.md` (past ADRs are historical), or `project-chatgpt-handoff/` — add one new forward-looking entry to `DECISIONS.md` recording this removal (new ADR, not editing old ones) and update `project-chatgpt-handoff/07-backend-and-ai-pipeline.md` + `CURRENT-STATE.md` only if the user wants the handoff package kept current (confirm — these are explicitly meant to be regenerable/removable).

## Decision: historical Firestore data with `provider: "openai"`

User decided: remove `"openai"` from `AiEnrichmentProviderId` / `DesignAiSuggestions.provider` types
entirely (no legacy-tolerant value kept). Existing designs processed before this change may still
have `provider: "openai"` stored in Firestore. Implementation must confirm the display code path
(Design Details "AI Processing" section, AI Review suggestions/processing-status sections) degrades
gracefully for that now-untyped string value — e.g. falling back to displaying the raw stored string
or a generic label — rather than crashing or silently hiding the field. No Firestore migration/backfill
is in scope for this phase (that's excluded by workflow rules without separate approval); this is
purely about the display layer not breaking on old data.

## Out of scope

- Deleting the `OPENAI_API_KEY` secret from GCP Secret Manager / Firebase (human checkpoint, separate deploy).
- Any Firebase Functions deploy (human checkpoint per this repo's rules).
- Rewriting `docs/workflow/plans/`, `docs/workflow/reviews/`, or `project-chatgpt-handoff/` historical content.
- Backfilling/migrating existing Firestore `aiSuggestions.provider` values.

## Test plan

- `npx tsx --test` targeted runs for every touched/renamed test file under `functions/src/ai/**` and `src/renderer/src/features/{settings,ai-review,designs}/**`.
- Root TypeScript (`tsc --noEmit`), root lint, functions typecheck/build.
- Full root build (Electron packaging) to catch any stale import path after file renames.
- `git diff --check`.
- No Firebase/Functions deploy as part of this phase; deploy remains a separate human-approved follow-up once the user wants the change live.

## Risks

- File renames (`openAiVisionEnrichmentProvider.ts`, `openAiVisionCompletion.ts`, `openAiRetry.ts`) touch many import sites — must grep after rename to confirm no stale imports remain.
- Removing reasoning-effort end-to-end touches Firestore-write fields (`aiRequestedReasoningEffort`) in `enqueueAiEnrichment.ts` / `enqueueAiEnrichmentValidation.ts` — need to confirm whether that field should be dropped entirely or just always empty going forward.
