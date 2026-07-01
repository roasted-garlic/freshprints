# Plan — AI Processing / Playground Enrichment Parity

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `ai-processing-playground-parity`
- **Roadmap phase:** Phase 5 maintenance — AI Processing & Catalog Approval
- **Prompt target:** `catalog-enrich-openai-v17` (unchanged by this plan)
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a human checkpoint (not part of this local phase).

---

## 1. Root cause — the exact divergence

Both paths already share the enrichment core the task asked for. The divergence is **not** the prompt, model, reasoning, or image — it is **legacy post-processing that only AI Processing runs.**

### What is genuinely shared (verified)

| Concern | Playground (`aiEnrichmentPlayground.ts`) | AI Processing (`openAiVisionEnrichmentProvider.ts`) | Same? |
|---|---|---|---|
| System prompt | `buildSimpleCatalogEnrichmentSystemPrompt()` | `buildSimpleCatalogEnrichmentSystemPrompt()` | ✅ identical |
| User prompt builder | `buildSimpleCatalogEnrichmentUserPrompt(...)` | `buildSimpleCatalogEnrichmentUserPrompt(...)` | ✅ identical fn |
| Category/tag/exclusion injection | via that builder | via that builder | ✅ identical |
| Image prep | `prepareAiAnalysisImage` | `prepareAiAnalysisImage` | ✅ identical |
| Request body / `detail:"high"` / no `response_format` | ✅ | ✅ | ✅ equivalent |
| Reasoning-effort 400 fallback | ✅ | ✅ | ✅ |

So the **raw model JSON is equivalent** for the same image + settings. The Playground returns that raw text **verbatim** (`outputText`) with **zero parsing**.

### Where AI Processing diverges (the bug)

AI Processing feeds the raw model output through `buildSimpleCatalogEnrichmentResult`
([simpleCatalogEnrichmentResponse.ts:237-297](../../../functions/src/ai/simpleCatalogEnrichmentResponse.ts#L237-L297)),
then through a second round of pipeline guards
([aiEnrichmentPipeline.ts:194-240](../../../functions/src/ai/aiEnrichmentPipeline.ts#L194-L240)).

The v17 prompt asks the model for **only five fields**: `description`, `category`,
`title`, `tags`, `suggestedNewTags`
([aiEnrichment.constants.ts:94-142](../../../shared/constants/aiEnrichment.constants.ts#L94-L142)).
It does **not** ask for `visibleText`, `theme`, `primarySubject`, `artworkContainsText`,
`textOnlyArtwork`, or `colorPalette`.

But `buildSimpleCatalogEnrichmentResult` calls **legacy v16-era resolvers** that were
designed for that rich schema, now fed empty/undefined rich fields:

1. **Title mangling (primary reported symptom).**
   `resolveCatalogTitle({ candidateTitle: parsed.title, tags, uploadFileStem, description })`
   is called with `visibleText: undefined`.
   - `buildTitleFromVisibleText` returns `""` (no visibleText) → skipped.
   - `textIndicated` is `true` because `description` is non-empty.
   - So `extractPrimaryWordingFromDescription(description)` runs
     ([catalogTitleRules.ts:522-540](../../../functions/src/ai/catalogTitleRules.ts#L522-L540)).
   - The v17 description **leads with the transcribed quote**
     (`SOME DAYS I ROCK IT - SOME DAYS IT ROCKS ME - ...`), so this extracts the first
     sentence / first 6 words → `Some Days I Rock It`-style OCR fragment, **overwriting**
     the model's clean `Motherhood Skeleton Rock On`.
   - **This is the exact "partial quote" title bug.**
   - Latent proof: the existing test at
     [simpleCatalogEnrichmentResponse.test.ts:191-218](../../../functions/src/ai/simpleCatalogEnrichmentResponse.test.ts#L191-L218)
     only passes because its description has no leading quote.

2. **Category override.**
   `resolveCatalogCategory({ candidate: parsed.category, allowedNames, primarySubject: title })`
   ([simpleCatalogEnrichmentResponse.ts:262-269](../../../functions/src/ai/simpleCatalogEnrichmentResponse.ts#L262-L269))
   runs remap scoring using the (now-mangled) title as `primarySubject`, with `theme`/`visibleText`
   empty. A good `Family` candidate can be out-scored and remapped toward
   `Pop Culture & Characters`. Even when kept, the resolver is doing model-second-guessing the
   Playground never does.

3. **Description repair.**
   `resolveCatalogDescription` runs both inside the result builder (with `visibleText` empty)
   and again in the pipeline placeholder guard
   ([aiEnrichmentPipeline.ts:222-240](../../../functions/src/ai/aiEnrichmentPipeline.ts#L214-L240)).
   With rich fields absent, its fallback tiers cannot reconstruct full visible text, so a
   description that trips any guard degrades instead of being preserved.

4. **Tags.** `normalizeSimpleCatalogEnrichment` tokenizes to single words, then the pipeline
   re-resolves via `resolveAiCatalogTags` against approved names/aliases. This path is closer to
   correct, but is still a second transform the Playground does not run and can drop approved
   multi-word matches when `rawTags` handling and alias coverage disagree.

**Summary root cause:** AI Processing runs v16 rich-schema title/category/description resolvers
on a v17 lean-schema response that lacks the fields those resolvers need. Starved of
`visibleText`/`theme`/etc., the resolvers fall back to description-derived heuristics that
**degrade** the model's already-correct output. The Playground looks better simply because it does
**none** of this.

---

## 2. Fix direction — share the Playground-quality core; stop degrading model output

The core is already shared. The fix is to **stop AI Processing from post-transforming fields the
model already returns correctly**, while keeping only the parts of post-processing that are
legitimately Processing-specific (tag resolution against the approved library, category **ID**
resolution, empty-field safety nets, persistence, workflow state).

### 2a. Trust the model's title (remove OCR-fragment rewriting)

In `buildSimpleCatalogEnrichmentResult`, stop calling `resolveCatalogTitle` for the v17 lean
schema. Instead:
- Use `parsed.title` as-is after **light, non-destructive** normalization only:
  trim, collapse whitespace, strip a filename extension, strip trailing separators, reject the
  upload filename, and reject a purely generic title (`Text`, `Design`, etc.).
- Only fall back to a derived title when `parsed.title` is empty/filename-like/generic — and even
  then prefer tags over description-quote extraction, so we never manufacture an OCR fragment.
- Concretely: introduce a `resolveLeanCatalogTitle(...)` helper (or a `mode: "lean"` branch) that
  does **not** run `extractPrimaryWordingFromDescription` or `buildTitleFromVisibleText`. Keep the
  old `resolveCatalogTitle` intact for any remaining rich-schema/dev-provider callers.

### 2b. Trust the model's category candidate; resolve ID only

Replace the remap-scoring call in the result builder with **deterministic ID resolution only**:
- Exact (case-insensitive) match of `parsed.category` against `allowedNames` → set
  `categoryId` + canonical `categoryName`.
- No match → leave `categoryId`/`categoryName` undefined for staff to set (current behavior when
  unmatched).
- **Do not** run keyword remap that can flip `Family` → `Pop Culture & Characters`. The prompt
  already instructs the model on Family-vs-Pop-Culture preference; second-guessing it with a
  starved scorer is the defect. (Keep `resolveCatalogCategory` for rich-schema callers/tests.)

### 2c. Preserve the model's description

- In the result builder, use `parsed.description` directly (already required-non-empty by
  `normalizeSimpleCatalogEnrichment`). Apply only `sanitizeCatalogDescription` (canvas-phrase
  scrub) + length cap — **no** synthesis, since synthesis cannot reconstruct full visible text
  from the lean schema.
- In the pipeline, keep the placeholder guard **only** as a true empty/placeholder safety net
  (it already gates on `isPlaceholderCatalogDescription`, which a real transcription never trips),
  but ensure the non-placeholder path is a pure pass-through. Verify the guard does not fire for
  the motherhood description.

### 2d. Tags — keep approved-library resolution, verify no regression

The tag path (`normalizeSimpleCatalogEnrichment` → `resolveAiCatalogTags`) is the one transform
that is legitimately Processing-specific (it maps to the **approved** library, which the Playground
does not enforce). Keep it, but:
- Add a regression test proving `rock-n-roll` (approved name or alias) is retained and **not**
  emitted as a `suggestedNewTags: rock`.
- Confirm alias coverage: if `rock` should map to `rock-n-roll`, that must be an approved alias in
  the tag library (data, not code). Document this as a QA/data check; do **not** hardcode.

### 2e. suggestedNewTags contract parity

`DesignAiSuggestions.suggestedNewTags` already exists and is persisted, and the AI Review UI
consumes adjustments. Confirm the parser keeps `suggestedNewTags` (it does) so the Playground
contract and Processing contract match. No schema change expected; add a contract test.

---

## 3. Files to change

| File | Change |
|---|---|
| `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | Add lean title resolution + deterministic category-ID-only resolution + description pass-through; stop calling `resolveCatalogTitle`/`resolveCatalogCategory`/synthesizing `resolveCatalogDescription` for the lean path. |
| `functions/src/ai/catalogTitleRules.ts` | Add `resolveLeanCatalogTitle` (non-destructive) if not colocated; keep existing exports for rich-schema/dev callers. No prompt text change. |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Verify description placeholder guard is pass-through for real descriptions; no title/category re-resolution added. |
| `functions/src/ai/simpleCatalogEnrichmentResponse.test.ts` | Add/adjust tests (see §4). |
| `functions/src/ai/catalogTitleRules.test.ts` | Add lean-title preservation tests. |
| (new) `functions/src/ai/promptParity.test.ts` | Prove Playground and Processing resolve identical prompt content for identical inputs. |

No changes to: renderer AI provider calls (none exist — correct), Firestore rules, secrets, prompt
template text, design lifecycle/status, or the Playground callable.

---

## 4. Tests to add / update

1. **Prompt parity** — given identical settings/categories/tags/exclusions/template,
   `buildSimpleCatalogEnrichmentUserPrompt` + `buildSimpleCatalogEnrichmentSystemPrompt` produce
   byte-identical strings for both call sites (assert on the shared builder output).
2. **Title preservation** — raw title `Motherhood Skeleton Rock On` with a description that
   **leads with the transcribed quote** must survive; assert result is **not**
   `Some Days It Rocks Me Either` / not a description-derived fragment.
3. **Category no-flip** — candidate `Family`, description containing `MOTHERHOOD`, allowed list
   including both `Family` and `Pop Culture & Characters` → resolves to `Family`.
4. **Description visible-text preservation** — raw description containing the full
   `SOME DAYS I ROCK IT - ... - EITHER WAY WE'RE ROCKIN'` + `MOTHERHOOD` is persisted intact
   (only canvas-phrase scrub + cap applied).
5. **Tag reuse** — candidate/raw tags including `rock-n-roll` map to the approved tag and do **not**
   produce `suggestedNewTags: rock` when an approved alias covers it.
6. **suggestedNewTags contract** — parser + result builder retain `suggestedNewTags`.
7. Update the existing latent test at
   `simpleCatalogEnrichmentResponse.test.ts:191-218` so its assertion reflects trust-the-model.

---

## 5. Acceptance criteria

- [ ] Root cause names the exact divergence (legacy resolvers on lean schema) — **done above**.
- [ ] Prompt parity proven by test.
- [ ] AI Processing no longer rewrites good titles into OCR fragments.
- [ ] Motherhood sample: title similar to `Motherhood Skeleton Rock On`.
- [ ] Motherhood sample: description includes all readable text.
- [ ] Motherhood sample: category resolves to `Family`.
- [ ] Motherhood sample: no new `rock` tag when an approved tag/alias covers it.
- [ ] New/updated tests pass; existing AI tests still pass.
- [ ] `npm run lint`, `npx tsc --noEmit`, functions typecheck/build, `npm run build` pass.
- [ ] Manual QA steps documented for Settings Playground vs AI Review Re-run AI on the same image.

## 6. Manual QA (post-approval, local)

Run Settings AI Playground and AI Review Re-run AI on the motherhood skeleton design with the same
prompt/model/reasoning; compare provider, model, reasoning, prompt version, raw output, and final
displayed AI Suggestions. Confirm Processing quality now matches Playground.

## 7. Out of scope

No prompt-text change, no rich v16 schema revival, no deploy, no client-side AI, no Phase 7+ work,
no design-lifecycle changes, no tag-library data migration (alias data checks are QA notes only).

## 8. Deploy / human checkpoint

Firebase Functions deploy + authenticated smoke remain a **human checkpoint** and are **not** part
of this phase. Signoff will document deploy as still pending human approval.
