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
    - Load categories (cached 60s)
    - Fetch thumbnail/preview from Storage
    - Call OpenAI vision (openAiVisionEnrichmentProvider)
    - Parse response (catalogEnrichmentResponse.ts)
    - Validate visible text (visibleTextValidation.ts)
    - Resolve category (catalogCategoryResolver.ts)
    - Apply title rules (catalogTitleRules.ts)
    - Retry if needed (catalogEnrichmentRetry.ts)
    ↓
Write aiSuggestions + update aiReviewStatus
```

## Prompt versioning

Current target: **`catalog-enrich-openai-v15`**

- Prompt text in `functions/src/ai/providers/openAiVisionEnrichmentProvider.ts`
- Dev provider emits `catalog-enrich-dev-v15` when `OPENAI_API_KEY` secret is empty
- UI displays `aiSuggestions.promptVersion` in AI Review workspace

**If UI shows v12:** likely undeployed functions — not a code regression.

## OpenAI configuration

| Setting | Location |
|---------|----------|
| API key | Firebase Secret Manager (`OPENAI_API_KEY`) — **never client-side** |
| Vision model | Firestore `settings/aiEnrichment.visionModelId` |
| Allowlist | `functions/src/ai/aiEnrichmentConfig.ts` |
| Default model | `gpt-5-nano-2025-08-07` |
| Alternate | `gpt-5.4-nano-2026-03-17` |

GPT-5 nano models use `reasoning_effort: "minimal"` (fallback `"low"` on retry).

Settings UI (owner/admin): `/settings` → calls `updateAiEnrichmentSettings`.

## Key AI modules

| Module | Role |
|--------|------|
| `aiEnrichmentPipeline.ts` | Main orchestrator |
| `catalogEnrichmentResponse.ts` | JSON parse + coercion |
| `visibleTextValidation.ts` | OCR quality heuristics |
| `catalogCategoryResolver.ts` | Category match + keyword remap |
| `catalogTitleRules.ts` | Title formatting, suffix rules |
| `catalogEnrichmentRetry.ts` | Quality + empty-output retry |
| `pipelineTiming.ts` | Latency observability logs |
| `aiEnrichmentRuntimeCache.ts` | Settings/categories cache |

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
- Without OpenAI key: development provider returns placeholder suggestions

## Deploy checklist (Phase 0 gate)

1. Deploy functions to Firebase project
2. Confirm `OPENAI_API_KEY` secret set in production
3. Re-run AI on one design in Studio
4. Verify UI shows `catalog-enrich-openai-v15` and `provider: openai`
