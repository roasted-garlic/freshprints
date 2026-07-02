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
    - Call Gemini vision provider (small v20 vision-only prompt + approved category names)
    - Parse response (simpleCatalogEnrichmentResponse.ts) — raw category/tags are transient signals
    - Resolve approved tags + suggestedNewTags (catalogTagResolver.ts)
    - Resolve category from approved list using matched tags + raw signals (catalogThemeCategoryResolver.ts)
    - Apply title/description rules (catalogTitleRules.ts)
    ↓
Write aiSuggestions + update aiReviewStatus
```

## Prompt versioning

Current target: **`catalog-enrich-v20`**

- v20 is a small, fixed-size, vision-only prompt plus approved category **names only**
  (`shared/constants/aiEnrichment.constants.ts` `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, built by
  `functions/src/ai/simpleCatalogEnrichmentPrompt.ts`). `{{excluded_tags}}` and
  `{{approved_category_names}}` are the required placeholders. It does NOT inject the full approved
  category list (descriptions) or the full approved tag list (names/aliases/preferredWhen) —
  testing showed full tag-name injection costs ~4.4x per image versus category-names-only, so that
  stays gated behind a real accuracy test (ADR-FP-041). Approved-tag matching, `suggestedNewTags`
  generation, and category resolution all happen server-side after the model call
  (`catalogTagResolver.ts`, `catalogThemeCategoryResolver.ts`). The category resolver trusts an
  exact (case/punctuation-tolerant) match between the model's answer and an approved category name
  directly; the token-overlap/priority-boost scorer only runs as a fallback when there's no exact
  match.
- Dev provider emits `catalog-enrich-dev-v20` when the Gemini API key secret is empty
- UI displays `aiSuggestions.promptVersion` in AI Review workspace

**If UI shows an older version:** likely undeployed functions — not a code regression.

## Gemini configuration

| Setting | Location |
|---------|----------|
| API key | Firebase Secret Manager (`GEMINI_API_KEY`) — **never client-side** |
| Vision model | Firestore `settings/aiEnrichment.visionModelId` |
| Allowlist | `functions/src/ai/aiEnrichmentConfig.ts` |
| Default model | `gemini-2.5-flash-lite` |
| Newer alternate | `gemini-3.1-flash-lite` |

OpenAI and reasoning-effort controls were removed by ADR-FP-040.

The server-side image payload currently sets `detail: "high"` for both catalog analysis and the Settings playground.

AI Review re-runs can send a one-off `visionModelIdOverride`; the callable validates it, the pipeline uses it for that run only, and `aiSuggestions.model` records the actual model used without mutating saved settings.

Settings UI (owner/admin): `/settings` → calls `updateAiEnrichmentSettings`.

Settings AI playground (owner/admin): `/settings` → calls `testAiEnrichmentPlayground` for one-off text + image tests. Playground requests do not write to `designs`, do not persist uploaded images, and fail safely if the Gemini secret is missing.

## Key AI modules

| Module | Role |
|--------|------|
| `aiEnrichmentPipeline.ts` | Main orchestrator |
| `simpleCatalogEnrichmentPrompt.ts` | Builds the small v20 vision-only prompt + approved category names |
| `simpleCatalogEnrichmentResponse.ts` | JSON parse + coercion (v20 lean schema) |
| `catalogTagResolver.ts` | Server-side approved tag/alias matching + `suggestedNewTags` generation |
| `catalogThemeCategoryResolver.ts` | Server-side category resolution with buyer-intent priority rules |
| `catalogTitleRules.ts` | Title/description formatting, tag normalization helpers |
| `pipelineTiming.ts` | Latency observability logs |
| `aiEnrichmentRuntimeCache.ts` | Settings/categories/approved tags cache |
| `aiEnrichmentPlayground.ts` | Settings playground validation + request builder |

## External integrations

| Service | Purpose | Secret location |
|---------|---------|-----------------|
| Google AI (Gemini) | Vision enrichment | Firebase Secret Manager |
| Resend | Team invite emails | Functions / Secret Manager |

## Security rules

- `firestore.rules` — role helpers, users deny client writes
- `storage.rules` — staff checks via Firestore user lookup

UI permission gates are UX only — rules are the security boundary.

## Local development

- Firebase emulators optional — see `docs/workflow/setup/`
- Functions compile to `functions/lib/` (gitignored)
- Without Gemini key: catalog enrichment falls back to the development provider; the Settings AI playground returns an unavailable error instead of fabricating a response

## Deploy checklist (Phase 0 gate)

1. Deploy functions to Firebase project
2. Confirm `GEMINI_API_KEY` secret set in production
3. Re-run AI on one design in Studio
4. Verify UI shows `catalog-enrich-v20` and `provider: gemini`
