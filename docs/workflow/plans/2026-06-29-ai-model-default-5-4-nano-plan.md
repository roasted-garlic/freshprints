# Plan: Make GPT-5.4 Nano the Recommended Default Vision Model

## Goal

Update Fresh Prints AI enrichment so `gpt-5.4-nano-2026-03-17` becomes the default and recommended high-volume OpenAI vision model for catalog image analysis, while keeping `gpt-5-nano-2025-08-07` available as the lowest-cost option.

## Workflow

FreshForge managed phase:

```txt
Plan → Review → Implement → Test → Signoff
```

Implementation must not begin until this plan is reviewed and approved.

## Repo Findings Before Planning

Verified from current repo state on 2026-06-29:

* Server default is currently `gpt-5-nano-2025-08-07` in `functions/src/ai/aiEnrichmentConfig.ts`.
* Server allowlist already contains:
  * `gpt-5-nano-2025-08-07`
  * `gpt-5.4-nano-2026-03-17`
* Client settings default and labels still present `gpt-5-nano-2025-08-07` as default in `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts`.
* AI enrichment provider currently uses Chat Completions with `messages[].content` image input via Base64 `image_url`.
* Current provider payload does not set image `detail`.
* The inspected repo does not contain a verified exact snapshot ID for `gpt-5.4-mini`.
* Important state correction: the repo is already on prompt version `catalog-enrich-openai-v16`, not `catalog-enrich-openai-v15`, due to the 2026-06-29 prompt-contract update.

## Scope

In scope:

* Promote `gpt-5.4-nano-2026-03-17` to server default when no saved override exists.
* Promote `gpt-5.4-nano-2026-03-17` to client default and recommended settings label/hint.
* Preserve `gpt-5-nano-2025-08-07` as a selectable lowest-cost option.
* Inspect whether `detail: "high"` can be added safely to the existing server-side OpenAI image payload.
* Add or update tests covering default resolution and settings option behavior.
* Update durable docs that describe default model behavior.

Out of scope:

* Prompt rewrites in this phase.
* Queue behavior changes.
* AI category/tag/title/OCR rule changes unless required by a tiny compatibility fix.
* Endpoint migration away from the current server-side OpenAI call path.
* Production deploy without explicit human approval.

## Open Questions / Needs Repo Check

* `gpt-5.4-mini` exact supported dated snapshot ID is not verified in the current repo.
* Plan treatment: mark `gpt-5.4-mini` as `[NEEDS REPO CHECK]` and do not invent or add a model ID unless a verified ID is found in current repo configuration or approved official project docs already checked into the repo.

## Files To Change If Approved

Expected primary files:

* `functions/src/ai/aiEnrichmentConfig.ts`
* `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts`
* `functions/src/ai/aiEnrichmentConfig.test.ts`
* `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts`
* `src/renderer/src/features/settings/` related tests or hooks if needed
* `docs/project/DECISIONS.md`
* `docs/architecture/DATA_MODEL.md` or `docs/architecture/BACKEND.md` if default model docs need correction
* `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`
* `project-chatgpt-handoff/CURRENT-STATE.md` only at signoff, not during implementation

## Implementation Plan

### 1. Server default promotion

Change the server default model constant from `gpt-5-nano-2025-08-07` to `gpt-5.4-nano-2026-03-17`.

Required outcomes:

* Missing settings doc falls back to `gpt-5.4-nano-2026-03-17`.
* Invalid configured values still resolve safely through the existing allowlist.
* Existing saved settings for `gpt-5-nano-2025-08-07` continue to work unchanged.

### 2. Settings UI recommendation update

Update the client settings constants so labels/hints clearly communicate:

* `GPT-5.4 Nano, recommended high-volume default`
* `GPT-5 Nano, lowest cost`
* `GPT-5.4 Mini, stronger/manual option` only if a verified ID exists

Keep the existing pattern where the UI uses constants and hooks/services rather than embedding logic in the page component.

### 3. OpenAI image detail review

Inspect the current `image_url` request payload and, if compatible with the existing request shape, add:

* `detail: "high"`

Only do this if it is supported safely by the current Chat Completions request path and local typing/usage pattern.

If adding `detail` would require speculative or unsupported request changes, do not add it in implementation and document why.

### 4. Test coverage

Update or add targeted tests for:

* default model resolution in `functions/src/ai/aiEnrichmentConfig.test.ts`
* client default resolution and settings option labels if test coverage exists or can be added narrowly
* provider payload shape only if `detail: "high"` is added in a testable, low-friction way

### 5. Docs

Update durable docs to reflect:

* new default model
* preserved lowest-cost option
* prompt version remains unchanged from current repo state unless implementation unexpectedly requires prompt edits

Important correction to carry through implementation:

* current repo prompt target is `catalog-enrich-openai-v16`

## Test Plan

If approved and implemented, run and record exact exit codes for:

* `npm run lint`
* `npx tsc --noEmit`
* `npm run build`
* `git diff --check`
* relevant targeted AI config/provider tests, likely:
  * `cd functions && npx tsx --test src/ai/aiEnrichmentConfig.test.ts`
  * additional targeted tests only if implementation adds them

Manual smoke test to document after implementation:

1. Open `/settings`.
2. Confirm `gpt-5.4-nano-2026-03-17` is shown as the recommended/default option.
3. Confirm `gpt-5-nano-2025-08-07` remains selectable and labeled as lowest cost.
4. Re-run AI on one existing design.
5. Confirm AI Review shows:
   * `provider: openai`
   * `model: gpt-5.4-nano-2026-03-17` unless intentionally overridden
   * current prompt version from repo state

## Risks

* Stale docs currently referencing `v15` could confuse QA if not corrected alongside the model-default change.
* A provider payload change for `detail: "high"` may be unsupported in the current request shape if not validated carefully.
* Adding an unverified `gpt-5.4-mini` ID would be unsafe and is explicitly out of scope unless verified.

## Acceptance Mapping

This plan satisfies the requested acceptance criteria by:

* promoting `gpt-5.4-nano-2026-03-17` only where already present in the allowlist
* preserving `gpt-5-nano-2025-08-07`
* treating `gpt-5.4-mini` as `[NEEDS REPO CHECK]`
* keeping OpenAI server-side only
* preserving the current prompt version unless implementation changes prompt text
* documenting the real current repo state where the prompt is already `catalog-enrich-openai-v16`
