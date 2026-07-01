# Plan: Advanced AI Enrichment Controls for Settings and AI Review

## Goal

Add three narrow AI enrichment maintenance improvements without changing the existing catalog enrichment baseline:

1. configurable reasoning effort in `/settings`
2. a Settings-only AI playground for text + image testing through Cloud Functions
3. a compact AI Review re-run button dropdown that preserves the existing one-off model override contract

This work must preserve:

* default model `gpt-5.4-nano-2026-03-17`
* lowest-cost option `gpt-5-nano-2025-08-07`
* stronger/manual option `gpt-5.4-mini-2026-03-17`
* prompt version `catalog-enrich-openai-v16`
* server-side image input `detail: "high"`
* server-side OpenAI calls only

## Workflow

FreshForge managed phase:

```txt
Plan → Review → Implement → Test → Signoff
```

Implementation must not begin until this plan is reviewed and approved.

## Repo Findings Before Planning

Verified from current repo state on 2026-06-29:

* Current managed goal `ai-model-mini-override` is signed off locally; no new deploy has been run.
* AI settings already persist `visionModelId` and `additionalTagExclusions` through:
  * renderer `aiEnrichmentSettingsService`
  * callable `updateAiEnrichmentSettings`
  * Firestore doc `settings/aiEnrichment`
* AI Review already supports a one-off `visionModelIdOverride` during re-run without mutating global settings.
* Current server allowlist is:
  * `gpt-5.4-nano-2026-03-17`
  * `gpt-5-nano-2025-08-07`
  * `gpt-5.4-mini-2026-03-17`
* Current provider path uses raw `fetch` to the Chat Completions endpoint. There is no installed `openai` SDK package in this repo today.
* Current reasoning behavior is hardcoded in repo config:
  * primary effort `minimal`
  * unsupported-effort / retry fallback `low`
* Current provider path already sends `detail: "high"` on the server-side `image_url` payload.
* `/settings` currently renders one AI Enrichment card with model selection and tag exclusions only.
* AI Review currently exposes a visible model select control for one-off re-runs in both Needs Review and Rejected states.

## Official OpenAI Reference Check

Verified against current official OpenAI docs on 2026-06-29:

* OpenAI Chat Completions reasoning effort supports values that can include:
  * `none`
  * `minimal`
  * `low`
  * `medium`
  * `high`
  * `xhigh`
* Current GPT-5 model docs indicate GPT-5 supports:
  * `minimal`
  * `low`
  * `medium`
  * `high`

Planning decision for this repo:

* Phase allowlist should start with `none`, `minimal`, `low`, `medium`, and `high`.
* Keep `xhigh` out of scope for now because the repo does not currently exercise it and it would add cost/latency risk without local runtime proof.

## Scope

In scope:

* extend `settings/aiEnrichment` with a validated reasoning effort field
* expose reasoning effort in `/settings`
* add a Settings AI playground for owner/admin users only
* implement a new callable function for playground execution
* keep all OpenAI calls in Cloud Functions only
* replace the visible AI Review re-run model selector with a compact button-triggered dropdown/menu
* keep one-off override behavior per run only
* add or update shared types/constants if both renderer and functions need them
* add or update tests
* update durable docs after implementation

Out of scope:

* changing the default model away from `gpt-5.4-nano-2026-03-17`
* changing prompt version away from `catalog-enrich-openai-v16`
* changing OCR/category/tag/title/validation logic except for tiny compatibility fixes required by the new settings field
* automatic fallback routing
* writing playground output to `designs`
* storing playground images permanently
* introducing client-side OpenAI calls
* production deploy without explicit human approval

## Architecture Approach

### Slice 1: Reasoning effort settings

Add reasoning effort through the existing settings flow instead of introducing a separate settings document.

Planned data shape:

* `settings/aiEnrichment.visionModelId`
* `settings/aiEnrichment.reasoningEffort`
* `settings/aiEnrichment.additionalTagExclusions`

Planned contract:

* renderer and functions share a strict reasoning-effort allowlist
* default remains `medium`
* callable rejects unsupported values
* loader coerces missing/invalid stored values to `medium`
* provider uses the saved effort for normal catalog enrichment runs

Fallback behavior to preserve and document:

* if OpenAI rejects the requested effort at runtime on the current Chat Completions path, provider falls back once to `low`
* this runtime fallback is not a settings mutation; it is a per-request compatibility fallback
* `minimal` remains available as a supported selectable option, but it is not required as the default for this slice

### Slice 2: Settings AI playground

Add a separate Settings section labeled clearly as a test tool, not catalog approval.

Planned UX:

* owner/admin only
* model picker
* reasoning effort picker
* prompt textarea
* one image input
* run test button
* result panel showing:
  * provider
  * model used
  * reasoning effort requested
  * reasoning effort applied
  * elapsed time
  * output text / JSON
  * safe error message

Planned backend:

* new callable function, likely `testAiEnrichmentPlayground`
* role/permission validation through current callable caller pattern
* no writes to `designs`
* no enqueueing into the normal AI review pipeline
* no Firestore persistence except optional audit logging only if already justified during implementation review

Planned image handling:

* use transient in-memory upload only
* validate file type and byte size client-side and server-side
* allow PNG/JPEG/WebP only if current request path accepts them safely
* do not store images in Storage for this slice
* do not log base64 payloads

Planned prompt contract:

* use a separate playground prompt/version marker such as `ai-playground-v1`
* do not reuse or modify `catalog-enrich-openai-v16`

### Slice 3: AI Review re-run dropdown

Keep the current one-off override backend contract and change only the visible UX.

Planned UX:

* visible control becomes a single compact `Re-run AI` button
* clicking opens a compact dropdown/menu with model actions:
  * `GPT-5.4 Nano`
  * `GPT-5 Nano`
  * `GPT-5.4 Mini`
* optional small helper labels if layout stays clean:
  * `Recommended`
  * `Lowest cost`
  * `Stronger`
* clicking a model immediately triggers the existing re-run path with `visionModelIdOverride`

This should remove the always-visible select control and reduce panel clutter in:

* Needs Review suggestions section
* Rejected actions area

### Shared contracts and constants

Current repo duplicates model allowlist knowledge between functions and renderer. This slice is a good candidate for a narrow shared contract.

Planned shared additions if approved:

* shared AI settings type for `visionModelId` + `reasoningEffort`
* shared reasoning-effort allowlist/type
* possibly shared model metadata if it can be added narrowly without broad refactor

Goal:

* avoid drift between `/settings`, AI Review, and callable validation
* keep friendly model labels centralized in renderer
* keep authoritative model/effort validation centralized on the server

## Files Expected To Change If Approved

Likely implementation files:

* `functions/src/ai/aiEnrichmentConfig.ts`
* `functions/src/ai/aiEnrichmentConfig.test.ts`
* `functions/src/ai/loadAiEnrichmentSettings.ts`
* `functions/src/ai/aiEnrichmentRuntimeCache.ts`
* `functions/src/updateAiEnrichmentSettings.ts`
* `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts`
* `functions/src/index.ts`
* new callable file for playground execution
* `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts`
* `src/renderer/src/features/settings/hooks/useAiEnrichmentSettings.ts`
* `src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts`
* `src/renderer/src/features/settings/pages/SettingsPage.tsx`
* `src/renderer/src/styles/components/settings.css`
* `src/renderer/src/features/ai-review/components/AiReviewWorkspace.tsx`
* `src/renderer/src/features/ai-review/components/AiReviewSuggestionsSection.tsx`
* `src/renderer/src/features/ai-review/components/AiReviewRerunModelOverrideControl.tsx`
* `src/renderer/src/styles/components/ai-review.css`
* `shared/types/ai/` and/or new shared constants if approved during implementation

Likely docs at implementation/signoff time:

* `docs/architecture/BACKEND.md`
* `docs/architecture/DATA_MODEL.md`
* `docs/project/DECISIONS.md`
* `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`
* `project-chatgpt-handoff/CURRENT-STATE.md`
* `.cursor/workflow/state.md`

## Risks

* Playground image payloads can become too large for callable requests if a conservative byte limit is not enforced.
* Reasoning-effort settings can drift from actual provider behavior if server-side allowlists and runtime fallback rules are not centralized.
* The repo does not use the OpenAI SDK today, so implementation must stay aligned with the current raw Chat Completions contract rather than assuming Responses API migration.
* The AI Review button-dropdown UX needs to stay compact without introducing focus or click-outside regressions.

## Test Plan

If approved and implemented, run and record exact exit codes for:

* targeted functions tests for AI config/settings/playground callables
* targeted renderer tests for settings constants or small pure helpers
* `npm run lint`
* `npx tsc --noEmit`
* `npm run build`
* `git diff --check`

Expected targeted test areas:

* reasoning-effort allowlist/default resolution
* settings callable validation for `reasoningEffort`
* loader coercion for invalid/missing reasoning effort
* provider request payload uses selected effort
* unsupported reasoning-effort runtime fallback behavior
* playground callable input validation and safe response mapping
* AI Review one-off re-run UX still passes correct override model
* image payload still keeps `detail: "high"`

## Manual Smoke Test To Run After Implementation

1. Open `/settings`.
2. Confirm the model selector still shows:
   * `GPT-5.4 Nano, recommended high-volume default`
   * `GPT-5 Nano, lowest cost`
   * `GPT-5.4 Mini, stronger manual option`
3. Confirm a reasoning-effort selector appears.
4. Save a non-default reasoning effort, refresh, and confirm persistence.
5. Use the AI playground with one image and a short prompt.
6. Confirm the result shows model, reasoning effort, timing, and response output.
7. Confirm no design record was created or modified.
8. Open `/ai-review`.
9. Click `Re-run AI`.
10. Confirm a compact model-action dropdown appears.
11. Click `GPT-5.4 Mini`.
12. Confirm the run starts with one-off override behavior.
13. Confirm `aiSuggestions.model` records `gpt-5.4-mini-2026-03-17`.
14. Confirm saved global settings did not change.
15. Confirm `provider: openai` and `promptVersion: catalog-enrich-openai-v16` still appear on the result.

## Acceptance Mapping

This plan satisfies the requested acceptance criteria by:

* extending the existing settings document and callable pattern rather than inventing a parallel configuration system
* keeping reasoning effort on a strict allowlist grounded in current repo behavior plus current official GPT-5 docs
* keeping playground execution server-side and isolated from production design records
* preserving the current one-off AI Review override contract while simplifying the visible UX
* preserving prompt version, default model, lowest-cost option, stronger option, and server-side `detail: "high"` behavior
