# Plan — Provider Default Test Reconcile

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `provider-default-test-reconcile`
- **Roadmap phase:** Phase 5 maintenance — AI Processing & Catalog Approval
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** none for this local code-only fix

---

## 1. Root cause

`functions/src/ai/providers/resolveAiEnrichmentProvider.test.ts` has 2 tests that fail with
`'google' !== 'openai'`. The test was written for an older 3-argument signature:

```ts
resolveAiEnrichmentProvider(apiKey, modelId, reasoningEffort)
```

The working-tree `resolveAiEnrichmentProvider.ts` (from the prior Gemini provider phase) now has a
6-argument signature:

```ts
resolveAiEnrichmentProvider(
  openAiApiKey?, geminiApiKey?, configuredVisionModelId?,
  configuredReasoningEffort?, overrideVisionModelId?, overrideReasoningEffort?
)
```

The test calls `resolveAiEnrichmentProvider("test-key", "gpt-5.4-nano-2026-03-17", "medium")`,
so the args land as:
- `openAiApiKey = "test-key"` ✓
- `geminiApiKey = "gpt-5.4-nano-2026-03-17"` ← model ID in the wrong position
- `configuredVisionModelId = "medium"` ← reasoning effort in the wrong position

With `configuredVisionModelId = "medium"` (not a valid model ID), `resolveEffectiveVisionModelId`
falls through to `DEFAULT_VISION_MODEL_ID = "gemini-2.5-flash-lite"`. `resolveProviderTarget`
routes any `gemini-*` model to `google`, so `providerId = "google"` — causing the `'google' !==
'openai'` assertion failure.

The second test passes `"gpt-5.4-mini-2026-03-17"` as the 4th arg (now `configuredReasoningEffort`,
not the override model), producing the same mismatch.

**Nothing is broken in the production code.** `enqueueAiEnrichment.ts` calls
`resolveAiEnrichmentProvider(openAiKey, geminiKey, settings.visionModelId, settings.reasoningEffort, ...)` correctly. The test just uses the old positional contract.

---

## 2. Fix

Update the two test call sites to match the current 6-argument signature:

```ts
// Before (old 3-arg):
resolveAiEnrichmentProvider("test-key", "gpt-5.4-nano-2026-03-17", "medium")

// After (correct 6-arg):
resolveAiEnrichmentProvider("test-key", /*geminiApiKey*/ "", "gpt-5.4-nano-2026-03-17", "medium")
```

```ts
// Before (old 3-arg with override in wrong slot):
resolveAiEnrichmentProvider("test-key", "gpt-5.4-nano-2026-03-17", "medium", "gpt-5.4-mini-2026-03-17")

// After (correct 6-arg with override):
resolveAiEnrichmentProvider("test-key", /*geminiApiKey*/ "", "gpt-5.4-nano-2026-03-17", "medium", "gpt-5.4-mini-2026-03-17")
```

While here, add one new test covering the Gemini path to prevent future drift: when
`configuredVisionModelId` is a `gemini-*` model and a Gemini key is provided, `providerId`
should be `google`.

---

## 3. Files to change

| File | Change |
|---|---|
| `functions/src/ai/providers/resolveAiEnrichmentProvider.test.ts` | Fix 2 call sites; add 1 Gemini-path test |

No production code change — the call sites in `enqueueAiEnrichment.ts` and the pipeline are
already correct.

---

## 4. Acceptance criteria

- [ ] `resolveAiEnrichmentProvider.test.ts` — all tests pass with no failures.
- [ ] Full AI test suite passes (or any remaining failures are pre-existing and unrelated).
- [ ] `npx tsc --noEmit` (functions + root) passes.
- [ ] `npm run lint` passes.
- [ ] No production code changed.
