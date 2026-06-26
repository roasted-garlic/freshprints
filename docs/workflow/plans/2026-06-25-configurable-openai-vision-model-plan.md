# Plan: Configurable OpenAI vision model switch

**Date:** 2026-06-25  
**Goal:** Owner/admin selects between two dated nano snapshots via Settings; pipeline uses resolved model per run.

## Models (allowlist)

| ID | Role |
|----|------|
| `gpt-5-nano-2025-08-07` | Default |
| `gpt-5.4-nano-2026-03-17` | Alternate for A/B testing |

## Backend

- `aiEnrichmentConfig.ts`: `DEFAULT_OPENAI_VISION_MODEL_ID`, `ALLOWED_OPENAI_VISION_MODEL_IDS`, `resolveOpenAiVisionModelId()`
- `loadAiEnrichmentSettings.ts`: read `settings/aiEnrichment`, resolve model
- Provider accepts per-run `visionModelId`; pipeline loads settings before OpenAI call
- Callable `updateAiEnrichmentSettings` (owner/admin, allowlist enforced)
- Firestore rules: staff read `settings/aiEnrichment`; no client write

## Desktop

- Settings page: vision model Select (owner/admin)
- `useAiEnrichmentSettings` + service (Firestore subscribe + callable update)
- AI Processing: read-only model label in intro header

## Security

- No API keys in settings
- Server allowlist only; invalid stored value → default

## Testing

- Unit: `resolveOpenAiVisionModelId`
- Manual: switch in Settings, process design, verify `aiSuggestions.model`

## Out of scope

- Per-request client override without settings doc
- Third model without plan update
- Auto escalation
