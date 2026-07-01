# Plan: Add GPT-5.4 Mini as Selectable Stronger Model and One-Off Re-run Override

## Goal

Add `gpt-5.4-mini-2026-03-17` as:

* a persistent selectable AI enrichment model in `/settings`
* a one-off override model for AI re-runs in AI Review

without changing the current default from `gpt-5.4-nano-2026-03-17`.

## Workflow

FreshForge managed phase:

```txt
Plan → Review → Implement → Test → Signoff
```

Implementation must not begin until this plan is reviewed and approved.

## Repo Findings Before Planning

Verified from current repo state on 2026-06-29:

* Server default is already `gpt-5.4-nano-2026-03-17`.
* Server allowlist currently contains:
  * `gpt-5-nano-2025-08-07`
  * `gpt-5.4-nano-2026-03-17`
* Client settings options currently expose only those two models.
* OpenAI image payload already sets `detail: "high"` in `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts`.
* Current repo prompt target is `catalog-enrich-openai-v16` and must remain unchanged.
* Current re-run flow (`enqueueAiEnrichment` callable + AI Review services/hooks) does not support passing a one-off model override today.
* Current pipeline resolves the model from settings/default only:
  * callable enqueue writes queue state
  * pipeline loads cached AI enrichment settings
  * provider resolves the vision model from the saved settings/default path

## Scope

In scope:

* add `gpt-5.4-mini-2026-03-17` to the server allowlist
* add `gpt-5.4-mini-2026-03-17` to client settings constants with a stronger/manual label
* allow `/settings` to save and persist the mini option through the existing settings flow
* add a one-off AI Review re-run override path that can select `gpt-5.4-mini-2026-03-17` without changing global settings
* ensure backend respects the override for that single run only
* preserve existing `detail: "high"` image payload behavior
* keep prompt target `catalog-enrich-openai-v16`
* add or update tests for allowlist/default behavior, settings options, and per-run override behavior
* update durable docs to remove the old `[NEEDS REPO CHECK]` note

Out of scope:

* changing the default away from `gpt-5.4-nano-2026-03-17`
* removing `gpt-5-nano-2025-08-07`
* automatic fallback routing
* prompt rewrites
* OCR/title/tag/category/retry logic changes unless a tiny compatibility fix is proven necessary
* production deploy without explicit approval

## Architecture Approach

### 1. Server allowlist and settings persistence

Update the existing allowlist/default-resolution path:

* `functions/src/ai/aiEnrichmentConfig.ts`
* `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts`

Required behavior:

* default stays `gpt-5.4-nano-2026-03-17`
* saved settings may now persist:
  * `gpt-5.4-nano-2026-03-17`
  * `gpt-5-nano-2025-08-07`
  * `gpt-5.4-mini-2026-03-17`

### 2. One-off re-run override contract

Extend the existing re-run path narrowly instead of creating a new workflow.

Likely touchpoints:

* `functions/src/ai/enqueueAiEnrichmentValidation.ts`
* `functions/src/enqueueAiEnrichment.ts`
* `functions/src/ai/aiEnrichmentPipeline.ts`
* `functions/src/ai/providers/resolveAiEnrichmentProvider.ts`
* `src/renderer/src/features/ai-review/services/aiEnrichmentEnqueueService.ts`
* `src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts`
* relevant AI Review components for the override selector

Planned contract:

* renderer may optionally pass `visionModelIdOverride` on re-run requests only
* callable validates override against the existing server allowlist
* backend stores the override only as short-lived queue metadata for that run, not in settings
* pipeline prefers:
  1. per-run override if present and allowlisted
  2. saved settings model if present
  3. default model

### 3. Queue metadata design

Use the existing design queue/pipeline document path rather than global settings.

Planned approach:

* attach a temporary allowlisted model override field to the queued design document or existing AI queue metadata during enqueue
* pipeline reads it when resolving the provider model
* success/failure cleanup should avoid leaving stale override state behind after the run

This keeps the override per-run and prevents it from persisting to global settings.

### 4. AI Review UI

Add a narrow selector for re-run actions only.

Requirements:

* visible only where re-run is already allowed
* clearly labeled as a one-off override
* includes all three models, with labels:
  * `GPT-5.4 Nano, recommended high-volume default`
  * `GPT-5 Nano, lowest cost`
  * `GPT-5.4 Mini, stronger manual option`
* does not silently save to settings

### 5. Tests

Update or add targeted tests for:

* allowlist/default resolution with all three models
* client settings constants include the mini option
* enqueue request validation accepts/rejects override model ids correctly
* pipeline/provider resolution prefers one-off override when present
* override does not mutate saved settings flow
* `detail: "high"` remains present in the server-side image payload

## Files Expected To Change If Approved

Primary implementation files:

* `functions/src/ai/aiEnrichmentConfig.ts`
* `functions/src/ai/aiEnrichmentConfig.test.ts`
* `functions/src/ai/enqueueAiEnrichmentValidation.ts`
* `functions/src/ai/enqueueAiEnrichmentValidation.test.ts`
* `functions/src/enqueueAiEnrichment.ts`
* `functions/src/ai/aiEnrichmentPipeline.ts`
* `functions/src/ai/providers/resolveAiEnrichmentProvider.ts`
* `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts` only if needed for tests/types, not for model logic changes
* `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts`
* `src/renderer/src/features/ai-review/services/aiEnrichmentEnqueueService.ts`
* `src/renderer/src/features/ai-review/hooks/useAiReviewInbox.ts`
* AI Review components that render the re-run controls

Durable docs:

* `docs/architecture/BACKEND.md`
* `docs/architecture/DATA_MODEL.md`
* `docs/project/DECISIONS.md`
* `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`
* `project-chatgpt-handoff/CURRENT-STATE.md` at signoff

## Risks

* The cleanest one-off override requires temporary per-design queue metadata; if implemented sloppily it could persist beyond the run.
* Re-run UI wiring spans renderer hook + service + callable + pipeline, so scope discipline is important.
* Model override must stay server-validated; client-side labels alone are not sufficient.

## Test Plan

If approved and implemented, run and record exact exit codes for:

* `cd functions && npx tsx --test src/ai/aiEnrichmentConfig.test.ts src/ai/enqueueAiEnrichmentValidation.test.ts`
* any new targeted test files added for override logic
* `npm run lint`
* `npx tsc --noEmit`
* `npm run build`
* `git diff --check`

Manual smoke to document after implementation:

1. Open `/settings`.
2. Confirm all three selectable models appear.
3. Save `GPT-5.4 Mini`.
4. Re-run AI on one design and confirm `aiSuggestions.model` is `gpt-5.4-mini-2026-03-17`.
5. Switch settings back to `GPT-5.4 Nano`.
6. In AI Review, trigger a one-off re-run using `GPT-5.4 Mini` override.
7. Confirm the run uses mini.
8. Confirm global settings remain `GPT-5.4 Nano`.
9. Confirm prompt version remains `catalog-enrich-openai-v16`.

## Acceptance Mapping

This plan satisfies the requested acceptance criteria by:

* adding the verified mini model id through the existing allowlist/settings pattern
* preserving the nano default and lowest-cost option
* introducing a one-off override path that is per-run only
* preserving server-side AI calls, prompt version, and current `detail: "high"` behavior
