# Backend and AI Pipeline

## Firebase stack

| Service | Use |
|---------|-----|
| Firebase Auth | Team identity |
| Firestore | Metadata, settings, user profiles |
| Cloud Storage | Originals, thumbnails, previews |
| Cloud Functions | Team user provisioning, AI enrichment |

No custom REST API for core operations. Business logic in renderer services + Cloud Functions.

## Cloud Functions

| Function | Trigger | Location |
|----------|---------|----------|
| `createTeamUser` | Callable | `functions/src/createTeamUser.ts` |
| `updateTeamUser` | Callable | `functions/src/updateTeamUser.ts` |
| `enqueueAiEnrichment` | Callable | `functions/src/enqueueAiEnrichment.ts` |
| `updateAiEnrichmentSettings` | Callable | `functions/src/updateAiEnrichmentSettings.ts` |
| `testAiEnrichmentPlayground` | Callable | `functions/src/testAiEnrichmentPlayground.ts` |
| `onDesignAiEnrichmentQueued` | Firestore update | `functions/src/ai/` pipeline |

Deploy: `firebase deploy --only functions` (requires human approval for production).

## AI enrichment pipeline flow

```
Import completes OR staff clicks Re-run AI
    ↓
enqueueAiEnrichment (callable)
    ↓
Updates design aiReviewStatus → triggers onDesignAiEnrichmentQueued
    ↓
aiEnrichmentPipeline.ts orchestrates:
    - Load settings (cached 60s)
    - Load categories and approved tags (cached 60s)
    - Fetch thumbnail/preview from Storage
    - Call vision provider (small v18 vision-only prompt, no taxonomy injected)
    - Parse response (simpleCatalogEnrichmentResponse.ts) — raw category/tags are transient signals
    - Resolve approved tags + suggestedNewTags (catalogTagResolver.ts)
    - Resolve category from approved list using matched tags + raw signals (catalogThemeCategoryResolver.ts)
    - Apply title/description rules (catalogTitleRules.ts)
    ↓
Write aiSuggestions + update aiReviewStatus
```

## Prompt versioning

Current target: **`catalog-enrich-openai-v18`**

- v18 is a small, fixed-size, vision-only prompt (`shared/constants/aiEnrichment.constants.ts`
  `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, built by `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`).
  It no longer injects the full approved category list or full approved tag list — only
  `{{excluded_tags}}` remains a required placeholder. Approved-tag matching, `suggestedNewTags`
  generation, and category resolution all happen server-side after the model call
  (`catalogTagResolver.ts`, `catalogThemeCategoryResolver.ts`) instead of being requested from the
  model directly.
- Dev provider emits `catalog-enrich-dev-v18` when the API key secret is empty
- UI displays `aiSuggestions.promptVersion` in AI Review workspace

**If UI shows an older version:** likely undeployed functions — not a code regression.

## OpenAI configuration

| Setting | Location |
|---------|----------|
| API key | Firebase Secret Manager (`OPENAI_API_KEY`) — **never client-side** |
| Vision model | Firestore `settings/aiEnrichment.visionModelId` |
| Reasoning effort | Firestore `settings/aiEnrichment.reasoningEffort` |
| Allowlist | `functions/src/ai/aiEnrichmentConfig.ts` |
| Default model | `gpt-5.4-nano-2026-03-17` |
| Lowest-cost alternate | `gpt-5-nano-2025-08-07` |
| Stronger selective option | `gpt-5.4-mini-2026-03-17` |

Supported reasoning-effort values are `none`, `minimal`, `low`, `medium`, and `high`. Saved default is `medium`. If the current OpenAI Chat Completions path rejects the selected effort, the server retries once with `low` for that request only.

The server-side image payload currently sets `detail: "high"` for both catalog analysis and the Settings playground.

AI Review re-runs can send a one-off `visionModelIdOverride`; the callable validates it, the pipeline uses it for that run only, and `aiSuggestions.model` records the actual model used without mutating saved settings.

Settings UI (owner/admin): `/settings` → calls `updateAiEnrichmentSettings`.

Settings AI playground (owner/admin): `/settings` → calls `testAiEnrichmentPlayground` for one-off text + image tests. Playground requests do not write to `designs`, do not persist uploaded images, and fail safely if the OpenAI secret is missing.

## Key AI modules

| Module | Role |
|--------|------|
| `aiEnrichmentPipeline.ts` | Main orchestrator |
| `simpleCatalogEnrichmentPrompt.ts` | Builds the small v18 vision-only prompt |
| `simpleCatalogEnrichmentResponse.ts` | JSON parse + coercion (v18 lean schema) |
| `catalogTagResolver.ts` | Server-side approved tag/alias matching + `suggestedNewTags` generation |
| `catalogThemeCategoryResolver.ts` | Server-side category resolution with buyer-intent priority rules |
| `catalogTitleRules.ts` | Title/description formatting, tag normalization helpers |
| `pipelineTiming.ts` | Latency observability logs |
| `aiEnrichmentRuntimeCache.ts` | Settings/categories/approved tags cache |
| `aiEnrichmentPlayground.ts` | Settings playground validation + request builder |

## External integrations

| Service | Purpose | Secret location |
|---------|---------|-----------------|
| OpenAI | Vision enrichment | Firebase Secret Manager |
| Resend | Team invite emails | Functions / Secret Manager |

## Security rules

- `firestore.rules` — role helpers, users deny client writes
- `storage.rules` — staff checks via Firestore user lookup

UI permission gates are UX only — rules are the security boundary.

## Local development

- Firebase emulators optional — see `docs/workflow/setup/`
- Functions compile to `functions/lib/` (gitignored)
- Without OpenAI key: catalog enrichment falls back to the development provider; the Settings AI playground returns an unavailable error instead of fabricating a response

## Deploy checklist (Phase 0 gate)

1. Deploy functions to Firebase project
2. Confirm `OPENAI_API_KEY` secret set in production
3. Re-run AI on one design in Studio
4. Verify UI shows `catalog-enrich-openai-v16` and `provider: openai`
