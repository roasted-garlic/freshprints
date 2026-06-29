# Path Verification: AI catalog enrichment v15

| Field | Value |
|-------|-------|
| Date | 2026-06-26 |
| Plan | docs/workflow/plans/2026-06-26-ai-catalog-enrichment-v15-plan.md |
| Trigger | AI Review UI still shows `catalog-enrich-openai-v12` on re-run |

---

## Executive summary

**Local repo code is on v15.** There is **no v12 prompt path in executable TypeScript**. The UI reads `aiSuggestions.promptVersion` from Firestore after each enrichment run. Seeing **v12 strongly indicates either (a) Firebase Functions were never redeployed after the v15 merge, or (b) the design document still holds suggestions from a prior run and re-run did not complete with fresh output.**

Do **not** judge v15 prompt quality until Phase 0 passes: deploy + re-run shows `catalog-enrich-openai-v15`.

---

## Checklist (10 items)

| # | Check | Repo result | Production result |
|---|-------|-------------|-------------------|
| 1 | Prompt constant is `catalog-enrich-openai-v15` | **PASS** — `functions/src/ai/catalogTitleRules.ts` line 27 | **UNKNOWN** — requires deployed function |
| 2 | Latest Firebase function build deployed | N/A (repo) | **LIKELY FAIL** — prior signoff deferred deploy |
| 3 | OpenAI provider uses updated `catalogTitleRules.ts` | **PASS** — `openAiVisionEnrichmentProvider.ts` imports v15 prompts | Depends on deploy |
| 4 | Re-run AI calls live OpenAI provider | **PASS** — `rerunFromReview` → `enqueueAiEnrichment` → `onDesignAiEnrichmentQueued` → `runAiEnrichmentPipeline` → `resolveAiEnrichmentProvider` | Depends on deploy + API key |
| 5 | Re-run does not return cached suggestions | **PASS** — enqueue deletes `aiSuggestions` / `aiAnalysis` before queueing (`enqueueAiEnrichment.ts` L144–145) | Verify `generatedAt` changes after re-run |
| 6 | Old suggestions cleared on re-run | **PASS** — `FieldValue.delete()` on suggestions/analysis | Human: confirm Firestore doc after re-run |
| 7 | UI shows prompt version from latest enrichment | **PASS** — `AiReviewSuggestionsSection.tsx` renders `suggestions.promptVersion` | If still v12, data is stale or function is stale |
| 8 | No alternate v12 prompt path in code | **PASS** — grep finds v12 only in stale docs (`DATA_MODEL.md`) | N/A |
| 9 | Mock/dev provider not used in production | **PASS when API key set** — `resolveAiEnrichmentProvider.ts` uses `development` only when `openAiApiKey` is empty; logs `provider.selected` | Human: check logs for `providerId: "development"` |
| 10 | No placeholder/example text in production prompts | **PASS** — searched strings not in prompts | Dev provider description contains "placeholder" — must not run in prod |

---

## Code path trace: Re-run AI (Needs Review)

```
AiReviewSuggestionsSection "Re-run AI"
  → useAiReviewInbox.executeRerunAiSuggestions
  → aiEnrichmentEnqueueService.rerunFromReview(designId)
  → Firebase callable enqueueAiEnrichment({ designId, rerunFromReview: true })
  → designRef.update({ aiProcessingStage: "queued", aiReviewStatus: "pending",
                       aiSuggestions: delete, aiAnalysis: delete, ... })
  → onDesignAiEnrichmentQueued (Firestore trigger)
  → runAiEnrichmentPipeline(designId, openAiApiKeySecret.value())
  → resolveAiEnrichmentProvider(apiKey) → openai if key present
  → provider.enrichDesign → parse/validate/retry pipeline
  → markAiSuccess → aiSuggestions.promptVersion + aiReviewVersion
```

**Rerun session guard:** `aiReviewRerunSession.ts` treats unchanged `generatedAt` as stale during re-run overlay — UI should not show old suggestions as "complete" if Firestore updated.

**Pipeline guard:** `runAiEnrichmentPipeline` returns early if `aiReviewStatus !== "pending"`. Re-run sets `pending` before trigger — OK.

---

## String search (leakage audit)

Searched repo for:

| String | Found in executable enrichment path? |
|--------|-------------------------------------|
| `catalog-enrich-openai-v12` | **No** — only `docs/architecture/DATA_MODEL.md` (stale) |
| `example transcription placeholder` | **No** |
| `transcribed as visible` | **No** |
| `DRINKING COFFEE` | **No** |
| `TO KEEP GOING` | **No** |
| `MOTHERH OOD` | **No** |
| `SI Epr` | **No** |
| `Sl Eep` | **No** |

**Risk:** `developmentAiEnrichmentProvider.ts` uses description text *"Replace the placeholder title after reviewing the image."* — only emitted when OpenAI API key is missing. Production must have `OPENAI_API_KEY` secret configured.

---

## Phase 0 human verification steps

Run **before** further prompt tuning:

1. **Deploy functions**
   ```bash
   cd functions && npm run build && firebase deploy --only functions
   ```
2. **Pick one test design** (e.g. Sleep Deprived skeleton) in Needs Review showing v12.
3. **Re-run AI** and wait for `ready_for_review`.
4. **Confirm in AI Review UI:**
   - Prompt version = `catalog-enrich-openai-v15`
   - Provider = `openai` (not `development`)
   - `generatedAt` timestamp is new
5. **Confirm in Firebase logs** (or pipeline events):
   - `provider.selected` with `providerId: "openai"`
   - `catalog.enrich.retry` / `catalog.enrich.category_remapped` if applicable
6. **Confirm in Firestore** `designs/{id}`:
   - `aiSuggestions.promptVersion` = v15
   - `aiReviewVersion` = v15

If v12 persists after confirmed deploy + successful re-run, escalate: capture function log bundle and design doc snapshot.

---

## Gaps in current v15 implementation (plan revision required)

The merged v15 baseline does **not yet** include:

- Placeholder phrase rejection (`placeholder`, `transcribed as visible`, etc.)
- Extended garbled OCR heuristics (`MOTHERH OOD`, 3+ single-letter tokens, mid-word spacing)
- Confidence tiers (0.85 / 0.70) with manual-review-only save below 0.70 after retry
- Model escalation to `gpt-5.4-nano` on fallback
- Description sentence-1 ⊆ visibleText validation before save
- Prompt anti-placeholder / anti-garbled-OCR sections
- Pipeline logging: retry count, model used per pass

See revised plan Phase 8–12.

---

## Recommended immediate actions

1. **Human:** Deploy functions (checkpoint).
2. **Human:** Re-run one known test design; confirm v15 in UI.
3. **Agent:** Implement plan Phase 8–12 after Phase 0 passes.
4. **Docs:** Update `DATA_MODEL.md` v12 reference → v15.
