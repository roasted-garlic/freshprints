# Plan: Playground-Style AI Processing Rebuild

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Command | Managed Phase |
| Roadmap phase | Phase 5 maintenance — AI Review / AI Processing optimization |
| Status | plan (awaiting review approval) |
| Supersedes prompt | `catalog-enrich-openai-v16` → `catalog-enrich-openai-v17` |

## Goal

Make AI Processing a fast, single-call, playground-style enrichment path that reads the image,
extracts visible text, writes a short description, creates a usable title, and suggests reusable
single-word tags — while preserving tag exclusions and staff review in AI Review. OpenAI stays
server-side; staff approval still gates the Design Library.

## Playground vs AI Processing — why the playground performs better

| Aspect | Settings AI Playground (`aiEnrichmentPlayground.ts`) | Current AI Processing (`openAiVisionEnrichmentProvider.ts`) |
|--------|------------------------------------------------------|-------------------------------------------------------------|
| Prompt | One short system line + the user's freeform prompt | Large structured system prompt (now trimmed to v17 draft) demanding 15 JSON keys |
| Output shape | Freeform text | `response_format: json_object` with 15 keys + downstream consistency rules |
| Image input | `prepareAiAnalysisImage` + `detail: "high"` | Same |
| Reasoning effort | User-selected (often `low`/`minimal` for quick tests) | Settings-configured, default `medium` |
| OpenAI calls | One | One on success today (empty-output + quality retries already removed earlier this session) |
| Post-processing | None | Category resolver, title/description synthesis, visible-text validation, palette filtering |

Conclusion: with the same model + reasoning effort, the playground is faster mainly because it
asks the model to **produce far less** (freeform text vs a large structured object) and does
**no post-processing**. The remaining levers that fit this phase are: a smaller output contract
(4 fields instead of 15) and lighter parsing/post-processing. Reasoning effort and the model stay
configurable as today (default `medium`, unchanged).

## Root cause of the `OpenAI returned no visible output (reason: length)` error

Observed on AI Review Re-run. `finish_reason: "length"` with empty content means the model hit
the `max_completion_tokens` cap (2500) before emitting any visible JSON — the budget was consumed
by hidden reasoning. The earlier-session change removed the empty-output retry that previously
masked this, so it now surfaces to staff.

Direct comparison proves the cause is the **output demand, not reasoning effort**:

- The playground runs at **`medium` effort** and the **same 2500-token cap**, and returns quickly
  without `length` errors.
- The only material request differences are: catalog forces `response_format: { type:
  "json_object" }` and asks for a large structured object; the playground sets no `response_format`
  and asks for a short freeform answer.

So a complex image plus a heavy structured-output requirement pushes reasoning + output past 2500,
while the playground's light output fits comfortably at the same effort and cap. This rebuild fixes
the error at the source — not by raising the cap or lowering effort — by:

1. Shrinking the output to 4 fields (far fewer output tokens needed).
2. Dropping `response_format: json_object` to match the playground (it reliably returns valid JSON
   from instructions alone; this also removes the strict-JSON generation overhead). The parser
   already tolerates fenced/loose JSON via trimming, and we add a tolerant JSON extraction step.
3. Keeping a sane visible-output guard: if a run still returns empty `length` output, surface the
   existing clean `failed` state (no auto-retry) so staff Re-run — but with the lighter contract
   this should effectively stop occurring.

## Current state confirmed by inspection

- `enqueueAiEnrichment` runs the pipeline directly and returns the terminal result (single direct
  callable entry point — keep).
- `openAiVisionEnrichmentProvider.callOpenAiVision` already makes exactly one OpenAI call on
  success; the empty-output and quality retries were removed earlier. The reasoning-effort 400
  fallback and the 429/5xx network retry remain (both keep — neither fires on a normal run).
- AI Review UI (`AiReviewSuggestionsSection.tsx`) renders only `aiSuggestions.title`,
  `categoryName`, `tags`, `description`, plus meta (`provider`, `model`, `promptVersion`,
  `confidence`, `generatedAt`). It does **not** render `aiAnalysis` rich fields (visibleText,
  primarySubject, theme, style, audience, colorPalette). This means the simplified output covers
  everything the UI shows except `categoryName`.
- `designHasAiSuggestions` keys on `title || description || tags?.length`, so the "ready" gate
  works with the simplified contract.
- Reusable utilities exist and stay: `normalizeAiTags`, `filterExcludedAiTags`,
  `buildTagExclusionPromptSection`, `GENERIC_CATALOG_TAGS`, `mergeTagExclusions`,
  `resolveCatalogCategory`, `resolveCatalogDescription`/`resolveCatalogTitle` (fallbacks only).
- `normalizeAiTags` → `pushNormalizedTag` → `tokenizeTagCandidate` already splits multi-word
  candidates into single-word tokens, dedupes, drops `GENERIC_CATALOG_TAGS`, applies exclusions,
  and caps. We will reuse it (single-word enforcement comes for free).

## Output contract (new, simplified)

Model returns JSON only:

```json
{
  "visibleText": "string (exact visible text, or empty string)",
  "description": "string (one short paragraph)",
  "title": "string (short catalog title)",
  "tags": ["single", "word", "tags"],
  "confidence": 0.0
}
```

`confidence` is a single number 0–1 reporting the model's overall confidence (mainly text
legibility). It is intentionally one field, not the v16 per-field confidence map.

Server-side normalization (in a new parser, replacing the v16 catalog parser on the live path):

- Tolerant JSON extraction: parse the response; if it is fenced or has surrounding prose, extract
  the first `{...}` block before `JSON.parse` (covers dropping `response_format`).
- Trim all strings; missing `visibleText` → `""`; ensure `description` and `title` are strings.
- `tags`: run through `normalizeAiTags(rawTags, undefined, MAX, effectiveTagExclusions)` which
  enforces single words, lowercase, dedupe, drops generics, drops exclusions, and caps. Set the
  cap to **10** (within the requested 8–12) via a new constant.
- Title: if blank, fall back to `resolveCatalogTitle` using visibleText/tags (existing util);
  never the filename.
- Description: if blank/placeholder, fall back to `resolveCatalogDescription` (existing guard).
- `confidence`: coerce to a number clamped 0–1 (reuse the existing `coerceConfidence` logic);
  default to a documented heuristic (0.7) only when the model omits it or returns a non-number.

## Mapping into the existing `aiSuggestions` / `aiAnalysis` shape

`DesignAiSuggestions` (written for the UI):
- `title` ← normalized title
- `description` ← normalized description
- `tags` ← normalized single-word tags
- `categoryName` / `categoryId` ← **deterministic, no model call.** Use existing
  `resolveCatalogCategory` against the active category list with the model title/visibleText/tags
  as candidate signal; if nothing matches, leave category undefined (staff sets it in review).
  No second OpenAI call, no complex prompt category logic.
- `confidence` ← model-reported `confidence` (0–1, clamped); heuristic default 0.7 only when the
  model omits it. Surfaced in the AI Review meta as a percentage.
- `provider`, `model`, `promptVersion` (`catalog-enrich-openai-v17`), `generatedAt` ← as today.

`DesignAiAnalysis` (not rendered, but persisted for completeness/back-compat):
- `visibleText` ← `[visibleText]` when non-empty, else `[]`.
- `artworkContainsText` ← `Boolean(visibleText)`.
- `overallConfidence` / `textRecognitionConfidence` ← model `confidence` (same value).
- Other analysis fields become optional/omitted (UI does not use them). Keep the field types
  unchanged in `shared/types` for back-compat with historical records.

## Prompt (new, built-in, playground-style)

Replace the live catalog system + user prompt with a short prompt asking only for the 5-field
JSON above, including the tag exclusion section via `buildTagExclusionPromptSection`. **Drop**
`response_format: json_object` to match the playground (instruction-driven JSON, with tolerant
parsing server-side). Keep `detail: "high"` (do not lower in this phase). Draft:

```
Analyze this DTF apparel design image. Return valid JSON only, no markdown or extra text.

Read all visible text in the image exactly as best you can. If there is no readable text, use an empty string for visibleText.
Then describe the image in one short paragraph (description).
Then create a short, usable catalog title from the text and artwork (title). Never use a filename or a generic word like "design" or "graphic".
Then suggest concise single-word, lowercase, searchable tags (tags). Reuse broad obvious words, avoid near-duplicates and phrases.
Then give one overall confidence number from 0 to 1 (confidence), lower when text is blurry, curved, or hard to read.

<tag exclusion section>

Return exactly:
{"visibleText":"...","description":"...","title":"...","tags":["..."],"confidence":0.0}
```

## Implementation outline (files)

Backend (`functions/src/ai/`):
1. `aiEnrichmentConfig.ts` — add `OPENAI_SIMPLE_ENRICHMENT_MAX_TAGS = 10` (and keep token caps).
2. New `simpleCatalogEnrichmentPrompt.ts` (or extend `catalogTitleRules.ts`) — build the new
   system + user prompt; bump `OPENAI_CATALOG_ENRICHMENT_PROMPT_VERSION` to
   `catalog-enrich-openai-v17` and dev to `-dev-v17`.
3. New `simpleCatalogEnrichmentResponse.ts` — parse + normalize the 4-field contract into
   `AiEnrichmentResult` (reusing `normalizeAiTags`, `resolveCatalogCategory`,
   `resolveCatalogTitle`/`resolveCatalogDescription` fallbacks).
4. `providers/openAiVisionEnrichmentProvider.ts` — `callOpenAiVision` builds the new prompt,
   makes one call, parses with the new response module; remove dependence on the v16
   `parseCatalogEnrichmentResponse` path and `processCatalogEnrichmentPayload` for the live run.
   In `buildVisionRequestBody`, **remove** `response_format: { type: "json_object" }`. Keep the
   reasoning-effort fallback and the 429/5xx network retry. Keep `assertOpenAiCompletionHasContent`
   so a still-empty `length` result becomes a clean `failed` state (no auto-retry).
5. `providers/developmentAiEnrichmentProvider.ts` — keep producing the same `aiSuggestions` shape
   (already minimal); align promptVersion to v17.

No change required to: `enqueueAiEnrichment.ts`, `aiEnrichmentPipeline.ts` orchestration (it reads
`AiEnrichmentResult` and writes suggestions/analysis), settings callables, or renderer components.
The v16 modules (`catalogEnrichmentResponse.ts`, `catalogEnrichmentRetry.ts`, the long prompt body)
remain as tested utilities for history/back-compat but are no longer on the live path; full removal
can be a later cleanup.

Tests (`functions/src/ai/*.test.ts`):
- New tests for the simple response parser: visible-text empty/non-empty; description/title
  presence + fallback; tag single-word enforcement, dedupe, exclusion filtering, cap (10);
  `confidence` coercion/clamp + default when omitted; tolerant JSON extraction from fenced or
  prose-wrapped output (since `response_format` is dropped).
- New/updated provider test: `buildVisionRequestBody` no longer includes `response_format`; builds
  the v17 prompt; maps a sample JSON response into `aiSuggestions`
  (title/description/tags/confidence/provider/model/promptVersion) + `aiAnalysis.visibleText` and
  `overallConfidence`.
- Update `catalogTitleRules.test.ts` version assertion to v17.
- Confirm one OpenAI call on success (no retry) — assert via the existing single-call structure.

## Acceptance criteria mapping

All directive acceptance criteria are covered above: single call, simple prompt, exclusions in
prompt + server filter, single-word/deduped/capped tags, preserved `aiSuggestions` fields
(title/description/tags/confidence/model/provider/promptVersion/generatedAt) and `visibleText` in
analysis, model/override/reasoning settings unchanged, server-side-only OpenAI, secrets untouched,
no lifecycle status writes, no auto-approve, no out-of-scope features. Additionally fixes the
`reason: length` empty-output error so both the playground and AI Processing run without errors and
quickly at the same `medium` effort.

## Risks & mitigations

- **Quality regression vs v16** (v16 encoded many OCR/title/description rules). Mitigation: keep
  the high-value rules implicitly via fallbacks (`resolveCatalogTitle`/`resolveCatalogDescription`)
  and verify on real designs in smoke; revert is contained to the prompt/response modules.
- **Category accuracy drops** without prompt-driven category matching. Mitigation: deterministic
  resolver from title/visibleText/tags; staff finalize category in AI Review (already required).
- **`length` empty-output error recurs.** Primary fix is the smaller output contract + dropping
  `response_format` so reasoning + output fit the 2500 cap at `medium` (same conditions under which
  the playground already succeeds). Residual safety: a still-empty `length` run becomes a clean
  `failed` state and staff Re-run (no auto-retry, per scope).
- **Dropping `response_format: json_object` yields non-JSON or prose-wrapped output.** Mitigation:
  tolerant JSON extraction (first `{...}` block) before parse; the playground already returns valid
  JSON from instructions alone at the same model/effort, so risk is low. If parse fails, it is a
  clean `failed` state.
- **Latency / `length` still occurs on an extreme outlier at `medium`.** The playground proves
  `medium` is fine for light output, so this should be resolved; if an outlier persists, the
  remaining levers (reasoning effort / timeout / cap) are out of scope here — flag honestly rather
  than change silently.

## Verification (commands, run at signoff)

- `npm run lint`
- `npx tsc --noEmit`
- `npx tsc --project functions/tsconfig.json --noEmit`
- `cd functions && npm run build`
- `npm run build` (renderer/electron build; document existing warnings)
- `npx tsx --test functions/src/ai/*.test.ts`
- `git diff --check`

Record exact commands + exit codes in the test report.

## Manual smoke (after approved deploy — human)

Per directive: compare playground vs AI Processing on the same image (`What does this image say?`),
confirm visible text parity, short description, usable title, single-word tags, no excluded tags,
a confidence percentage, `provider: openai`, recorded model, prompt version `v17`, one
`openai.request.started` with no retries and **no `reason: length` error**; repeat with
`gpt-5.4-mini-2026-03-17` override (no global mutation); approve one design and confirm it moves to
Design Library as `status: ready`. Re-run the design from the screenshot that produced the
`length` error and confirm it now completes successfully.

## Workflow / approvals

- Prompt rewrite + new ADR superseding ADR-FP-034 item 6 (prompt version). The user issued this as
  a Managed Phase directive authorizing the prompt change.
- Production Firebase Functions deploy requires explicit human approval; not included here.
- Update `.cursor/workflow/state.md`, `docs/project/DECISIONS.md` (new ADR), `ROADMAP.md`,
  `docs/architecture/BACKEND.md`, and `project-chatgpt-handoff/` after signoff.
