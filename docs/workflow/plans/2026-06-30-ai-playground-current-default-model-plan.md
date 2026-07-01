# AI Playground Current Default Model Plan

## Goal

Make the Settings AI Playground default its model selection to the current shared default vision model instead of the legacy OpenAI default.

## Scope

In scope:

- Update the AI Playground hook initialization so it uses the current shared default model.
- Verify any local fallback/reset behavior tied to the playground model still resolves through the current default.
- Review the adjacent Settings hook initialization for consistency and adjust only if needed to avoid conflicting defaults in the same UI.

Out of scope:

- Changing saved Firestore settings values.
- Firebase deploys, Functions deploys, Firestore writes, or secret changes.
- Changing model allowlists or pricing.

## Current Finding

`useAiEnrichmentPlayground.ts` still initializes `visionModelId` from `DEFAULT_OPENAI_VISION_MODEL_ID`.

Current shared defaults:

- `shared/constants/aiEnrichment.constants.ts`
  - `DEFAULT_VISION_MODEL_ID = "gemini-2.5-flash-lite"`
  - `DEFAULT_OPENAI_VISION_MODEL_ID = "gpt-5.4-nano-2026-03-17"`

So the playground is explicitly opting into the legacy OpenAI default instead of the current cross-provider default.

## Proposed Implementation

1. Update `useAiEnrichmentPlayground.ts` to initialize from `DEFAULT_VISION_MODEL_ID`.
2. Keep `resolveClientVisionModelId()` as the fallback path so invalid values still collapse to the current default.
3. Review `useAiEnrichmentSettings.ts` initialization and default-reset behavior:
   - if it still uses the legacy OpenAI default in a way that affects unsaved local default display, align it to `DEFAULT_VISION_MODEL_ID`
   - do not change persisted Firestore data behavior beyond local fallback/default display

## Architecture Impact

Renderer-only change in the Settings feature:

- `src/renderer/src/features/settings/hooks/useAiEnrichmentPlayground.ts`
- possibly `src/renderer/src/features/settings/hooks/useAiEnrichmentSettings.ts`

No backend or shared model contract change expected.

## Data Model Impact

None.

## Firebase Impact

None.

## Security Considerations

None. This only changes local default selection behavior in the renderer.

## Risks

| Risk | Mitigation |
| --- | --- |
| Settings and playground defaults diverge | Review the adjacent Settings hook in the same phase |
| Existing saved model values appear to change unexpectedly | Do not touch persisted settings; only change local fallback/default initialization |

## Verification

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Manual QA:

- Open AI Playground and confirm the model defaults to the current shared default.
- Confirm the model selector still accepts manual changes.
- Confirm saved Settings values still load normally when present.
