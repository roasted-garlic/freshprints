# Plan: AI Processing Playground-Pattern Deltas

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Command | Managed Phase |
| Roadmap phase | Phase 5 maintenance — AI Processing and Catalog Approval |
| Status | plan — awaiting review approval |

## Goal

Update the real AI image processing flow in `/ai-review`, specifically the Processing tab, so it uses the same simple request pattern proven in the AI Playground while leaving the AI Playground UI and behavior unchanged.

This is **not** an AI Playground rebuild. The Playground remains a one-off testing tool. It is only a reference for the OpenAI image request shape:

- one image call
- short predefined prompt
- model and reasoning passed into the call
- no bloated enrichment prompt
- no extra response-format complexity
- no unnecessary retries or round trips
- server-side JSON extraction and validation
- staff review still required after processing

## Current Repo State Verified

`project-chatgpt-handoff/CURRENT-STATE.md` says `ai-processing-direct-run` is signed off locally with prompt v17. Code inspection confirms the following are already implemented or partially implemented:

- `enqueueAiEnrichment` runs `runAiEnrichmentPipeline` directly inside the callable, so the old Firestore-trigger round trip is already removed for staff-started processing.
- `openAiVisionEnrichmentProvider` already avoids `response_format: json_object`.
- `simpleCatalogEnrichmentPrompt` and `simpleCatalogEnrichmentResponse` already implement a lightweight prompt path.
- The current live simple contract is still five fields: `visibleText`, `description`, `title`, `tags`, `confidence`.
- Current tag cap is 10 through `OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS`.
- Settings currently persist model, reasoning effort, and additional tag exclusions, but not an editable prompt template.
- AI Review still has in-place Needs Review re-run support through `rerunFromReview`.
- Rejected/Needs Review re-run paths still pass override model/reasoning to immediate AI processing instead of only resetting the design back to Processing.
- Processing tab does not yet have the requested on-the-fly settings button beside Auto advance.

Therefore, this plan only covers missing deltas. Do not duplicate the already signed-off direct-run or v17 single-call work.

## Target Behavior

1. AI Processing uses the simple predefined prompt from Settings, with `{{excluded_tags}}` replaced server-side.
2. AI Processing asks the model for only four catalog suggestion fields:
   - `description`
   - `category`
   - `title`
   - `tags`
3. The Processing tab gets an on-the-fly settings button beside Auto advance for model and reasoning overrides.
4. Manual processing uses the current on-the-fly override or the Settings default.
5. Auto advance snapshots the selected model and reasoning when auto processing starts.
6. Completed AI Processing sends the design to Needs Review.
7. Re-run from Needs Review or Rejected does not run AI in place. It resets the design back to the Processing tab so staff can process it again.
8. The existing AI Playground remains unchanged unless a tiny shared helper extraction is necessary and preserves identical Playground behavior.

## Prompt Contract

Default AI Processing prompt stored in code and editable from Settings:

```txt
Analyze the provided image and return only valid JSON with these fields:
description: a clear, accurate 1 to 2 sentence description of the visual design, including visible text, style, colors, and main elements.
category: one broad reusable category for the image.
title: a short searchable title for the design.
tags: up to 8 lowercase single word tags only.

Tag rules:
Use broad reusable tags.
No hashtags, punctuation, duplicates, phrases, colors unless visually important, or near duplicate meanings.
Do not use any tag from this excluded tag list:
{{excluded_tags}}

Before returning the JSON, remove any tag that appears in the excluded tag list. Replace excluded tags with better allowed tags only when they still accurately describe the image.

Example Response:
{
  "description": "A black background design with bold curved text reading, \"Some days I rock it. Some days it rocks me. Either way we're rockin'\" around the edges. The center bottom says \"Motherhood\" in a large dripping gradient font, with scattered stars and faint lightning bolt accents.",
  "category": "Motherhood",
  "title": "Either Way We're Rockin Motherhood",
  "tags": [
    "motherhood",
    "parenting",
    "rockin",
    "stars",
    "drip",
    "gradient",
    "bold",
    "grunge"
  ]
}
```

Server behavior:

- Replace `{{excluded_tags}}` with merged built-in + Settings exclusions immediately before the OpenAI call.
- Keep OpenAI server-side in Cloud Functions.
- Keep tolerant JSON extraction for fenced or prose-wrapped output.
- Validate required fields and fail cleanly when output is unusable.
- Normalize tags server-side after model output: lowercase, single word, dedupe, max 8, remove excluded tags.
- Map `category` into `aiSuggestions.categoryName`; resolve `categoryId` only when it matches an active category.
- Persist `provider`, `model`, `promptVersion`, and `generatedAt`.
- Do not ask the model for `visibleText`, `confidence`, `fieldConfidence`, palette, audience, theme, complexity, trademark warnings, or rich analysis fields.

## Scope

In scope:

- Update AI Processing prompt rendering to use saved/default `promptTemplate` and server-side `{{excluded_tags}}` replacement.
- Change the live AI Processing output contract from current v17 five fields to the requested four fields.
- Change tag cap from 10 to 8 for this AI Processing contract.
- Extend `settings/aiEnrichment` with editable `promptTemplate`.
- Add Settings UI for viewing/editing the AI Processing prompt.
- Add Processing-tab on-the-fly model/reasoning modal beside Auto advance.
- Pass model/reasoning overrides into manual processing calls.
- Snapshot model/reasoning overrides when Auto advance starts.
- Replace Needs Review and Rejected re-run behavior with reset-to-Processing behavior.
- Remove or disconnect in-place Needs Review re-run session/overlay logic from the live flow.
- Update tests and docs for the changed contract and workflow.

Out of scope:

- Rebuilding, redesigning, or changing AI Playground UI/behavior.
- Duplicating the already signed-off `ai-processing-direct-run` callable execution work.
- Reintroducing Firestore-trigger round trips.
- Adding extra OpenAI calls, quality retries, OCR retries, model escalation, or response-format complexity.
- Production Firebase deploy. Deploy requires explicit human approval.
- API key handling changes. `OPENAI_API_KEY` stays in Firebase Secret Manager only.
- Automatic catalog approval. Staff approval remains required.
- New model IDs beyond the existing allowlist unless separately approved.
- Customer Portal behavior.

## Architecture Impact

Keep:

- Renderer calls Cloud Functions through services/hooks.
- OpenAI calls stay server-side in Cloud Functions.
- Firebase Secret Manager remains the only OpenAI key source.
- AI Processing stays in `/ai-review`.
- Design Library only shows approved `ready` catalog designs.
- AI Playground remains a separate transient testing surface.

Change:

- AI Processing prompt source becomes `settings/aiEnrichment.promptTemplate` with a code fallback.
- The live AI Processing mapper stores only the four requested catalog fields plus existing audit metadata.
- Re-run becomes a reset workflow that makes the design eligible in Processing, not an immediate AI call from Review.

## Data Model Impact

Update `settings/aiEnrichment`:

| Field | Type | Notes |
|-------|------|-------|
| `visionModelId` | string | Existing default model |
| `reasoningEffort` | string | Existing default reasoning |
| `promptTemplate` | string | New editable AI Processing prompt with `{{excluded_tags}}` placeholder |
| `additionalTagExclusions` | string[] | Existing team exclusions |
| `updatedAt` | Timestamp | Existing |
| `updatedBy` | string | Existing |

Design writes remain on existing fields:

- `aiSuggestions.title`
- `aiSuggestions.description`
- `aiSuggestions.categoryName`
- `aiSuggestions.categoryId`
- `aiSuggestions.tags`
- `aiSuggestions.provider`
- `aiSuggestions.model`
- `aiSuggestions.promptVersion`
- `aiSuggestions.generatedAt`
- `aiReviewStatus`
- `aiProcessingStage`
- `aiProcessed`

For new successful runs, do not require `aiSuggestions.confidence` or `aiAnalysis.visibleText`. Existing historical records and shared optional types remain backward compatible.

## Firebase Impact

- Update `updateAiEnrichmentSettings` validation to accept and validate `promptTemplate`.
- Update `loadAiEnrichmentSettings` and runtime cache to return `promptTemplate`, falling back to the default prompt when missing.
- Verify Settings writes still go through callable permissions only.
- No Storage rules changes.
- Functions deploy required after implementation, but not performed without human approval.

## Security Considerations

- Do not expose OpenAI keys in renderer, Firestore, preload, IPC, logs, or Settings.
- Validate prompt length server-side before saving.
- Require `{{excluded_tags}}` before saving the prompt, unless implementation intentionally appends exclusions server-side even when the placeholder is missing. Preferred behavior: require the placeholder.
- Keep image payload transient in Cloud Functions.
- Keep existing staff/owner/admin permission checks.
- Reset-to-Processing callable behavior must validate eligible statuses before clearing prior AI output.

## UI Considerations

Processing tab:

- Add an icon-only settings button immediately to the right of Auto advance.
- Use a `Settings` lucide icon with `aria-label="AI processing settings"`.
- Modal fields:
  - Vision model select
  - Reasoning effort select
  - Clear/use defaults action
  - Apply for this processing session
- Show the active selected session values compactly if needed, without turning the area into a large settings panel.
- Auto advance snapshots modal values at Start AI time.

Settings page:

- Add an editable AI Processing prompt textarea near the model/reasoning/tag exclusion controls.
- Require `{{excluded_tags}}` or show a validation error before save.
- Leave AI Playground controls and behavior unchanged.

Needs Review:

- Replace in-place `Re-run AI` behavior with a reset action.
- Action clears current AI output and navigates/selects the design on the Processing tab.
- Remove the Needs Review rerun overlay stepper/session path from the live flow.

Rejected:

- Re-run also sends the design back to Processing and does not immediately call OpenAI.
- Reopen for Review remains available and keeps existing suggestions.

## Implementation Steps

1. Add AI Processing prompt settings.
   - Add default prompt constant.
   - Add `promptTemplate` to shared settings types.
   - Add server/client validation with max length and placeholder requirement.
   - Load default prompt when existing settings documents do not have the field.

2. Update AI Processing live prompt contract.
   - Render the saved/default prompt with merged excluded tags.
   - Change simple parser from five-field v17 shape to four fields.
   - Remove model-requested `visibleText` and `confidence`.
   - Cap tags at 8.
   - Keep tolerant JSON extraction and clean failure handling.

3. Add Processing on-the-fly settings.
   - Add session state in AI Processing hooks.
   - Add icon button and modal beside Auto advance.
   - Pass selected model/reasoning into manual processing.
   - Snapshot selected model/reasoning at Auto advance start and use the snapshot for the run.

4. Replace review re-run behavior.
   - Add or adjust callable/service method to reset an eligible design for Processing without running AI.
   - Clear AI output/review metadata needed to make it pending again.
   - Navigate to Processing tab and select the reset design.
   - Remove live use of `rerunFromReview` from Needs Review.
   - Keep Reopen for Review unchanged.

5. Preserve AI Playground.
   - Do not alter Playground UI, copy, modal behavior, result modal, or one-off request behavior.
   - If extracting a shared prompt-render helper is useful, verify Playground output and request behavior remain unchanged.

6. Update docs.
   - `docs/architecture/DATA_MODEL.md`
   - `docs/architecture/FIREBASE.md`
   - `docs/architecture/BACKEND.md`
   - `docs/WORKFLOWS.md`
   - `docs/project/ROADMAP.md`
   - `docs/project/DECISIONS.md`
   - `project-chatgpt-handoff/` summaries if this repo continues using them.

## Risks

- Prompt editing can create invalid outputs. Mitigation: validate prompt length, require `{{excluded_tags}}`, and keep server-side JSON/tag validation.
- Removing `visibleText`/`confidence` from the requested output can affect current UI metadata display. Mitigation: treat those fields as optional historical metadata and ensure Suggestions UI handles absence cleanly.
- Re-run reset clears useful output. Mitigation: explicit action text and unsaved-edits confirmation where needed.
- Auto advance override behavior can surprise users if settings change mid-run. Mitigation: snapshot at Start AI and use that snapshot consistently until the run stops.
- Existing tests may assume the five-field v17 contract. Mitigation: update tests to assert the new four-field contract and keep backward-compatible optional types.

## Verification

Run after implementation:

```bash
npm run lint
npx tsc --noEmit
npx tsc --project functions/tsconfig.json --noEmit
cd functions && npm run build
npm run build
npx tsx --test functions/src/ai/*.test.ts
npx tsx --test src/renderer/src/features/ai-review/**/*.test.ts
git diff --check
```

Manual smoke after local implementation:

- Open AI Processing and confirm the settings icon sits to the right of Auto advance.
- Process one design manually with Settings defaults.
- Process one design manually with `gpt-5.4-mini-2026-03-17` and `high` reasoning selected on the fly.
- Start Auto advance with an on-the-fly model/reasoning and confirm processed designs record the snapshot model.
- Confirm completed designs land in Needs Review.
- Approve one design and confirm it appears in Design Library.
- Reject one design and confirm it lands in Rejected.
- Choose Re-run from Needs Review and Rejected, confirm the design returns to Processing and does not run until staff starts processing.
- Confirm saved Settings prompt injects excluded tags and no excluded tag persists in `aiSuggestions.tags`.
- Confirm AI Playground still opens, runs, and displays results exactly as before.

## Review Gate

This plan requires FreshForge review approval before implementation. No app code should be changed until the review document approves this scope.
