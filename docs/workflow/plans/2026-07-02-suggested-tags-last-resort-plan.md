# Plan — Suggested Tags as Last Resort + AI-Authored Suggestion Quality

- **Date:** 2026-07-02
- **Mode:** Managed Phase
- **Goal slug:** `suggested-tags-last-resort`
- **Roadmap phase:** Phase 5 AI Processing maintenance, supporting the current Phase 6 accepted baseline
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a human checkpoint after approval and testing. No deploy is performed in this phase.
- **Independent of:** `ai-tag-rerank-second-call` (still open at test phase, pending manual smoke test). This phase does not depend on that phase's signoff, though it reuses the same "small text-only follow-up call" pattern that phase established.

---

## 1. Goal

Two related problems with `suggestedNewTags` today:

1. **Suggestions fire too often.** `catalogTagResolver.ts`'s `resolveAiCatalogTags` currently generates suggestions to fill *any* remaining room up to the 8-tag cap — e.g. 3 approved matches on an 8-tag cap leaves room for 5 suggestions, and the resolver will try to fill all 5 from unmatched candidates. The user wants suggestions treated as a genuine last resort: only offered when approved-tag coverage is thin (0-2 confident matches, or borderline at 3 if those 3 don't describe the design well), not as routine filler alongside a design that already has 5+ good approved tags.
2. **When suggestions do fire, their quality is poor.** `buildSuggestedNewTag` writes a single generic templated `preferredWhen` (`Use when "X" is a primary searchable subject, theme, style, or occasion for the design.`) identically for every candidate, with zero design-specific context, and a single-alias `aliases` array containing only the raw candidate phrase. The user's approved tags have detailed, specific `preferredWhen` text and multiple real aliases, written with judgment — the server-side template cannot match that quality because it has no design context and no judgment, just a bare candidate string.

This phase (a) tightens the trigger threshold so suggestions are rare, and (b) when they do fire, has the AI — which has already seen the image, title, description, and tags — write a real `preferredWhen` and a small set of real aliases for each suggestion, the same way a human would when adding a new tag in Tag Management. Server validation remains authoritative over what gets persisted.

---

## 2. Current State (verified in code)

### 2.1 Trigger/threshold logic today (`functions/src/ai/catalogTagResolver.ts`)

- `remainingSuggestionRoom()` (line 444-445): `maxApprovedTags - approvedResult.length - suggestedResult.length`, floored at 0. This is the *only* gate on suggestion generation — it fills any leftover room, regardless of how many approved tags already matched.
- Two suggestion sources both respect this same room check:
  - The AI's own `suggestedNewTags` field from the first call (loop at line 447-504) — checked against approved names/aliases/context first; only kept as a suggestion if nothing matches.
  - Unmatched raw candidates (loop at line 506-517) — each reduced via `buildSuggestedNewTag`/`reduceToSafeSuggestedTag` to a safe single-word name with the original phrase as its one alias.
- `maxApprovedTags` is passed in by the pipeline as `SIMPLE_ENRICHMENT_MAX_TAGS` (= 8, `aiEnrichmentConfig.ts`).
- **No concept of "how many approved tags did we actually find" as a distinct trigger** — the resolver only ever asks "is there room left," never "did we find enough."

### 2.2 Suggestion quality today

- `buildSuggestedNewTag` (`catalogTagResolver.ts:165-179`): fully deterministic, server-only, given just the raw unmatched candidate string. `preferredWhen` is one fixed sentence template. `aliases` is `[rawCandidate]` only if the reduced name differs from the candidate (via `reduceToSafeSuggestedTag`), otherwise empty.
- The AI's own `suggestedNewTags` (when the model provides them in its first-call JSON — the current v20 default prompt does not explicitly solicit this field, but the parser/resolver still accept and reconcile it if present) get a *real* `preferredWhen`/`reason` from the model at that point, but that path is not currently exercised by the shipped default prompt, and even when populated, the model wrote it without knowing whether the candidate would ultimately need to become a suggestion — it's not a purpose-built "explain why this new tag deserves inclusion" request.
- No mechanism exists today to give the AI design context (title/description/tags) specifically to author a suggestion's `preferredWhen`/aliases after the server has already determined a suggestion is needed.

### 2.3 Reusable infrastructure from the `ai-tag-rerank-second-call` phase

- `catalogTagRerankProvider.ts` establishes the exact pattern this phase needs: a small, text-only, second Gemini call built from `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`'s transport helpers (`fetchVisionWithRetry`, retry constants), with tolerant JSON parsing (`extractJsonObject`) and strict server-side validation of the response.
- `resolveAiCatalogTags` already returns `unmatchedCandidateCount` (added in that phase) — directly reusable as one of this phase's threshold inputs.
- `DesignAiSuggestions` already has a precedent for tracking a second call's own tokens/cost/status (`tagRerankStatus`, `tagRerankPromptTokens`, etc.) — this phase will add an analogous, distinctly-named set of fields for the suggestion-authoring call, not reuse the tag-rerank fields (they are different calls with different purposes and must be independently observable/costed).
- `aiEnrichmentPipeline.ts` already has the established pattern for a settings-gated, try/catch-wrapped optional second call with graceful fallback (the tag reranker wiring) — this phase's suggestion-authoring call follows the same shape.

### 2.4 Merge decision: suggestion-authoring rides the tag-rerank call when both fire

The tag-rerank call already sends the exact context suggestion-authoring needs — first response, matched/shortlisted approved candidates, and (via `uncoveredConcepts`) a sense of what wasn't covered. Rather than always making two separate second-calls when a design has both borderline approved matches (rerank's trigger) and thin overall coverage (this phase's trigger), the two jobs share one call when the rerank call is going to run anyway:

- **When `tagRerankMode` is on (`auto`/`always`) and the last-resort gate (§4.1) fires:** a single call does both jobs — reranks approved tags AND authors suggestions for the unmatched candidates — using one extended prompt/response schema (§4.2). One request, one round-trip, one cost line for the combined work.
- **When `tagRerankMode` is off (or the rerank call doesn't fire) but the last-resort gate still fires:** suggestion-authoring runs as its own standalone, smaller text-only call (authoring-only prompt, no rerank-specific instructions/output). Suggestion quality must never silently depend on an unrelated setting — a shop that keeps tag-rerank off entirely should still get well-written suggestions when coverage is thin.
- These are controlled by **independent settings** (§4.5 resolved: distinct `suggestionAuthorMode`, not folded into `tagRerankMode`). The pipeline decides at runtime whether both jobs can ride one call (both enabled and both triggered) or whether suggestion-authoring needs its own call (only it is enabled/triggered).
- Cost/status tracking stays distinctly named (`suggestionAuthor*` fields) regardless of which physical call produced the data, so the UI can always show "suggestion authoring cost" whether or not it happened to share a request with the rerank call.

---

## 3. Scope

### In scope

- **Threshold change:** Add a concrete, testable "last resort" trigger to `resolveAiCatalogTags` (or a wrapper the pipeline calls) so that generating `suggestedNewTags` requires genuinely thin approved-tag coverage:
  - Suggestions are only generated when `approvedResult.length <= 2`, **or** `approvedResult.length === 3` and none of the 3 matched tags came from a high-confidence match (exact/alias match; a run of only weak/partial-token matches at exactly 3 approved tags still qualifies as thin coverage).
  - Above that, no suggestions are generated at all, regardless of remaining room up to the 8-tag cap — a design with 5 solid approved tags ships with 5 tags, not 5 tags padded to 8 with weak suggestions.
  - This changes `remainingSuggestionRoom()`'s role: it still caps *how many* suggestions can be added once the last-resort gate has already decided suggestions are wanted, but a new gate decides *whether* to enter suggestion generation at all.
- **AI-authored suggestion quality (only invoked when the last-resort gate fires):** New text-only second call, `catalogSuggestedTagAuthorProvider.ts` (or similarly named, sibling to `catalogTagRerankProvider.ts`), that sends the AI: the first call's response (title/description/category/matched approved tags), and the list of raw unmatched candidates that are about to become suggestions. Asks the AI to write, for each candidate that's still worth suggesting, a real `preferredWhen` (matching the specificity of the approved-tag examples already in the database) and 1-3 real aliases — and explicitly permits the AI to say a candidate is *not* worth suggesting at all (further shrinking output, consistent with "we don't always need 8").
- Server-side validation of the authoring call's output: reject any candidate name not in the original unmatched-candidate list, enforce the existing single-word/length/character rules on names (reusing `isUsableTagCandidate`/existing normalization), sanitize/cap `preferredWhen` length and alias count, cap total suggestions returned at whatever room remains under the 8-tag cap.
- Fallback behavior: if the authoring call fails, returns invalid JSON, or is disabled, fall back to today's server-templated `buildSuggestedNewTag` output for the same last-resort-gated candidates — suggestions still ship (server-templated, lower quality) rather than being silently dropped, since a last-resort case is exactly when staff need *something* to review, even if imperfect.
- Provide up to 4 concrete example `preferredWhen`/alias pairs from real approved tags (already in the database) in the authoring prompt so the AI has a calibration reference for the expected specificity/style — pulled from `loadCachedApprovedTags()`, already available in the pipeline, selected deterministically per §4.2's selection rule (never random).
- **Merged-call path (resolved, see §2.4):** when `tagRerankMode` is on and both the rerank call and the last-resort gate fire for the same design, one call does both jobs via an extended prompt/response schema — no duplicate request. When tag-rerank is off (or didn't fire) but suggestions are still needed, a standalone authoring-only call runs instead.
- Settings-gated via a **distinct** `suggestionAuthorMode: "off" | "auto" | "always"` setting, independent from `tagRerankMode` (§4.5, §8 resolved) — the last-resort trigger (thin coverage) and the rerank trigger (borderline matches) are different situations and shops should be able to enable one without the other.
- New `DesignAiSuggestions` fields for the authoring call's own status/tokens/cost, distinctly named from `tagRerank*` (e.g. `suggestionAuthorStatus`, `suggestionAuthorPromptTokens`, etc.) — mirrors the `ai-tag-rerank-second-call` phase's tracking pattern.
- **Playground support is deferred (resolved, confirmed by user 2026-07-02) — out of scope for this phase.** The `ai-tag-rerank-second-call` Playground work is still pending manual signoff; this phase stays backend/pipeline-focused with strong unit tests plus a manual AI Review smoke test (not a Playground smoke test). Suggestion-author Playground support becomes a fast-follow phase once the tag-rerank Playground pattern is signed off.
- Unit tests per §7.
- Update `docs/project/DECISIONS.md` with a new ADR, `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, and `CURRENT-STATE.md`.

### Out of scope

- No change to how approved tags themselves are matched (exact/alias/token matching in `resolveAiCatalogTags` is unchanged).
- No change to the 8-tag cap on approved tags.
- No image sent to the suggestion-authoring call — text-only, same guarantee as the tag reranker.
- No full approved tag database sent to the authoring call — only up to 4 real examples for calibration, selected deterministically (§4.2a).
- No automatic creation of new approved tags from suggestions — suggestions remain staff-reviewed proposals, same as today; this phase only improves their quality and reduces their frequency.
- No changes to Tag Management, Design Library, Imports, Print Requests, Print Runs, or Portal.
- No Firebase Functions deploy in this phase.
- No change to the first vision call's prompt, model, or cost profile.

---

## 4. Design Detail

### 4.1 Last-resort threshold — concrete rule

**Resolved (final rule, confirmed by user 2026-07-02):**

```
suggestionsAllowed =
  approvedResult.length <= 2
  || (
    approvedResult.length === 3
    && allThreeMatchesAreWeak
    && unmatchedCandidateCount >= 2
  )
```

Where "weak match" means the approved tag was reached only via the per-token fallback match (`"Matched via partial token match"` reason, matching the shortlist-reason vocabulary already established in `ai-tag-rerank-second-call`'s `approvedTagCandidates` shortlist), not an exact name/alias match. This reuses match-quality information the resolver already tracks internally (via `matchInfoByApprovedName` from the reranker phase) rather than introducing a new signal. `unmatchedCandidateCount` is already returned by `resolveAiCatalogTags` (added in the tag-rerank phase) — reused directly, no new signal needed there either.

Explicit boundaries (all confirmed):
- **3 approved tags, at least one strong (exact/name/alias) match:** suggestions never fire, regardless of how many unmatched candidates exist.
- **3 approved tags, all weak, but fewer than 2 unmatched candidates:** suggestions do not fire — there's nothing meaningful left to suggest even though the 3 matches are weak.
- **3 approved tags, all weak, 2+ unmatched candidates:** suggestions fire (the last-resort edge case) — the app found 3 tags but they don't actually describe the design well, and there's real unmatched material to draw from.
- **4 or more approved tags (any match quality):** suggestions never fire.
- **0-2 approved tags (any match quality):** suggestions always eligible to fire (subject to the AI-authoring call still being able to decline individual candidates by omitting them from its output, §4.2).

If `suggestionsAllowed` is false, `resolveAiCatalogTags` returns `suggestedNewTags: []` unconditionally, regardless of remaining room — a 5-approved-tag design ships with 5 tags, not padded to 8.

### 4.2 New module: `catalogSuggestedTagAuthorProvider.ts`

Shared types, used by both the merged and standalone paths:

```ts
export interface SuggestedTagAuthorInput {
  firstResponse: { title: string; description: string; category: string };
  approvedMatchedTags: string[];
  candidateNames: string[]; // unmatched candidates about to become suggestions, pre-reduction
  exampleApprovedTags: { name: string; aliases: string[]; preferredWhen: string }[]; // calibration examples
}

export interface AuthoredSuggestedTag {
  name: string; // must be one of candidateNames (post server-side single-word reduction)
  aliases: string[];
  preferredWhen: string;
  // No explicit "decline" flag — the prompt instructs the model to omit candidates it decided
  // are not worth proposing, so absence from the output array IS the decline signal.
}

export interface SuggestedTagAuthorResult {
  suggestions: AuthoredSuggestedTag[];
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
}
```

The authoring instructions (candidate list, calibration examples, output fields, "decide if worth suggesting") are built by one shared prompt-fragment function, `buildSuggestedTagAuthorInstructions(input)`, so the wording is identical whether it's appended to the rerank prompt or sent standalone — no drift between the two paths.

### 4.2a Calibration example selection (resolved, confirmed by user 2026-07-02)

`exampleApprovedTags` is capped at **4 examples maximum**, selected **deterministically** — never random — so output and tests stay comparable across runs for the same input. A new pure function, `selectCalibrationExampleTags(approvedTags, { matchedTagNames, candidateNames }, maxCount = 4)`, in `catalogSuggestedTagAuthorProvider.ts`, implements this selection order:

1. **Relevance first:** prefer approved tags whose name/aliases/`preferredWhen` text relates to the currently-matched approved tags or the unmatched candidate concepts for this design (simple case-insensitive substring/token-overlap check against `matchedTagNames`/`candidateNames` — no AI call needed for this step, it's a deterministic pre-filter).
2. **Quality filter within relevant tags:** among relevant tags, prefer ones with **at least 2 aliases** and a **non-generic `preferredWhen`** (i.e. not empty/placeholder-like — reuse a simple length/content heuristic, e.g. non-empty after trim and longer than a short fixed threshold).
3. **Fill remaining slots:** if fewer than 4 relevant+high-quality tags are found, fill remaining slots from the full approved-tag set ordered by the same quality filter (rich `preferredWhen`, 2+ aliases) regardless of relevance, so the calibration set is never smaller than necessary just because this design's concepts don't overlap much with existing tags.
4. **Stable ordering:** ties broken by approved-tag name (alphabetical) so the same input always produces the same 4 examples — required for deterministic tests.

Each example sent to the model is reduced to exactly three fields — **name, up to 3 aliases, and `preferredWhen`** — even if the source approved tag has more aliases stored; no other tag metadata (id, category links, usage stats, etc.) is included.

```ts
interface CalibrationExampleTag {
  name: string;
  aliases: string[]; // capped at 3, even if the source tag has more
  preferredWhen: string;
}
```

**Standalone path** (`callSuggestedTagAuthorStandalone`): text-only request, no image, reusing `fetchVisionWithRetry` and retry constants exactly as `catalogTagRerankProvider.ts` does. Prompt:

```
You are writing catalog tag entries for a DTF apparel design database, matching the style and
detail level of existing approved tags.

Design context:
Title: {{title}}
Description: {{description}}
Category: {{category}}
Already-matched approved tags: {{approvedMatchedTags}}

Examples of existing approved tags, for calibration on style and detail:
{{exampleApprovedTags as JSON}}

Candidate concepts that did not match any approved tag or alias:
{{candidateNames}}

For each candidate, decide if it is genuinely worth proposing as a new approved tag for this
design. Skip candidates that are redundant with an already-matched tag, too narrow/one-off to
reuse across designs, or not a meaningful searchable concept.

For each candidate worth proposing, write:
- name: the same candidate, reduced to one clean lowercase word if it is a phrase
- aliases: 1 to 3 real alternate search terms someone might use for this concept, matching the
  style of the example aliases above — do not just repeat the candidate phrase
- preferredWhen: one clear, specific sentence describing exactly when staff should use this tag,
  matching the detail level of the example preferredWhen text above — not a generic template

Return exactly this JSON and nothing else:
{"suggestions": [{"name": "...", "aliases": ["..."], "preferredWhen": "..."}]}
```

**Merged path** (`callTagRerank` in `catalogTagRerankProvider.ts`, extended): when `suggestionAuthorMode` is also enabled and the last-resort gate fired for this design, the rerank prompt (§ existing `buildCatalogTagRerankUserPrompt`) appends the same authoring instructions block from `buildSuggestedTagAuthorInstructions`, and the requested return JSON gains the `suggestions` array alongside `tags`/`uncoveredConcepts`:

```
Return exactly this JSON and nothing else:
{"tags": ["approvedtag"], "uncoveredConcepts": ["concept not covered"], "suggestions": [{"name": "...", "aliases": ["..."], "preferredWhen": "..."}]}
```

`validateTagRerankTags` continues to validate `tags`; a new `validateAuthoredSuggestions` (shared by both paths) validates the `suggestions` array against the candidate list exactly as it would for the standalone response. One combined `promptTokens`/`completionTokens`/`estimatedCostUsd` is split conceptually between "rerank" and "suggestion author" cost fields for display purposes only (see §4.6) — Gemini bills the merged call as a single request, so an even/estimated split (or simply duplicating the combined total onto both fields, whichever is simpler to implement correctly) is acceptable; the important invariant is the *combined* total shown to staff is never wrong, not that the per-call split is billing-accurate.

### 4.3 Pipeline wiring (`aiEnrichmentPipeline.ts`)

After `resolveAiCatalogTags` runs and produces `approvedResult`/candidate data, and after the last-resort gate (§4.1) has decided whether suggestions are wanted at all:

```
lastResortFires = suggestionsAllowed(resolvedTags)
rerankWillRun = tagRerankMode is "always", or "auto" and rerank's own trigger condition is met
authorWillRun = lastResortFires and suggestionAuthorMode is "always", or "auto" and lastResortFires

if authorWillRun and rerankWillRun:
  # Merged path — one call does both jobs
  try:
    result = callTagRerank(apiKey, providerTarget, visionModelId, {
      ...existing rerank input,
      suggestionAuthorInput: { candidateNames: <unmatched candidates>, exampleApprovedTags: <calibration set> },
    })
    suggestions.tags = result.tags  # existing rerank behavior
    suggestions.suggestedNewTags = result.suggestions.length > 0 ? result.suggestions : <server-template fallback>
    suggestions.tagRerankStatus = "succeeded"
    suggestions.suggestionAuthorStatus = "succeeded"
    track combined tokens/cost onto both tagRerank* and suggestionAuthor* fields (see §4.2 note on split)
  catch (error):
    suggestions.suggestedNewTags = <server-template fallback>
    suggestions.tagRerankStatus = "failed"
    suggestions.suggestionAuthorStatus = "failed"
    log failure

elif authorWillRun:
  # Standalone path — rerank is off/not triggered, but suggestions are still needed
  try:
    authored = callSuggestedTagAuthorStandalone(apiKey, providerTarget, visionModelId, {
      firstResponse: {...}, approvedMatchedTags: resolvedTags.tags,
      candidateNames: <unmatched candidates about to become suggestions>,
      exampleApprovedTags: selectCalibrationExampleTags(approvedTags, {...}, 4),
    })
    validated = validateAuthoredSuggestions(authored.suggestions, <allowed candidate names>)
    suggestions.suggestedNewTags = validated.length > 0 ? validated : <server-template fallback>
    suggestions.suggestionAuthorStatus = "succeeded"
    track tokens/cost onto suggestionAuthor* fields only
  catch (error):
    suggestions.suggestedNewTags = <server-template fallback, i.e. today's buildSuggestedNewTag output>
    suggestions.suggestionAuthorStatus = "failed"
    log failure

elif lastResortFires:
  # Suggestions wanted but suggestionAuthorMode is off — server template only, no AI call
  suggestions.suggestedNewTags = <server-template fallback>
  suggestions.suggestionAuthorStatus = "skipped"

else:
  suggestions.suggestedNewTags = undefined  # last-resort gate did not fire — no suggestions at all
  suggestions.suggestionAuthorStatus = "skipped"
```

Failure/fallback behavior mirrors `ai-tag-rerank-second-call`'s established pattern exactly: any failure degrades to the existing (lower-quality but functional) server-templated suggestion, never to an empty suggestion when one was actually warranted, and never to an invented tag name outside the candidate list. A failure in the merged call's suggestion half never blocks the rerank half's own established fallback (existing approved-tag matches survive), and vice versa — the two concerns fail independently even when they share a request.

### 4.4 Server-side validation of authored suggestions

- `name` must exactly match (post the same single-word reduction rules already in `reduceToSafeSuggestedTag`) one of the candidate names sent — the AI cannot invent a suggestion for a concept it wasn't given.
- `name` must pass existing `isUsableTagCandidate` checks (length, no `/`, non-empty).
- `aliases`: each trimmed/lowercased/deduped, capped at a small max (e.g. 5), must not equal `name` itself, must pass basic sanity checks (length, no slashes) — reusing existing alias-sanitization logic from `normalizeSuggestedTag`.
- `preferredWhen`: trimmed, non-empty required, capped at a reasonable max length (e.g. 300 chars) to prevent runaway output.
- Candidates the model decided not to propose are simply absent from the `suggestions` array (no explicit decline flag) — the prompt instructs the model to omit skipped candidates entirely, keeping the output schema and validation surface smaller.
- Total suggestions returned still capped by remaining room under the 8-tag cap, same as today.

### 4.5 Settings control

**Resolved (was open question, see §8):** distinct setting, `suggestionAuthorMode: "off" | "auto" | "always"`, independent from `tagRerankMode` — since the last-resort threshold change (§4.1) is unconditional/always-on server logic with no cost, while the AI-authoring call is the only part that's optional/costed, and conflating it with the tag-reranker's toggle would make it impossible to enable one without the other even though they solve different problems and fire in different (usually non-overlapping) situations — a design with few approved matches (suggestion-authoring's trigger) is a different case from a design with ambiguous/borderline matches (tag-reranker's trigger).

Both settings can be enabled independently; the pipeline (§4.3) decides at runtime whether they share one physical call (both enabled and both triggered for the same design) or run separately (only one enabled/triggered). `"auto"` for `suggestionAuthorMode` means "run whenever the last-resort gate fires"; there is no separate "trigger condition" beyond the gate itself (unlike `tagRerankMode`'s `"auto"`, which has its own borderline-match trigger) — so for this setting, `"auto"` and `"always"` behave identically whenever `lastResortFires` is true, and identically to `"off"` whenever it's false. `"always"` is kept for symmetry with `tagRerankMode` and to leave room for a future stricter always-run behavior, but is not expected to differ from `"auto"` in this phase's implementation.

### 4.6 Firestore/data model impact

Additive-only fields on `DesignAiSuggestions`: `suggestionAuthorStatus`, `suggestionAuthorFailureReason`, `suggestionAuthorPromptTokens`, `suggestionAuthorCompletionTokens`, `suggestionAuthorEstimatedCostUsd`, `suggestionAuthorPromptVersion`. Possibly a new field on `settings/aiEnrichment` for the mode toggle (pending §4.5 decision). No migration required — all optional/defaulted.

### 4.7 Security impact

None beyond the existing tag-reranker precedent: stays inside Cloud Functions, uses the same `GEMINI_API_KEY` secret, no new external service.

---

## 5. Files Touched (expected)

| File | Change |
|---|---|
| `functions/src/ai/catalogTagResolver.ts` | Add last-resort threshold gate before suggestion generation; expose match-quality info needed for the "3 weak matches" rule. |
| `functions/src/ai/catalogSuggestedTagAuthorProvider.ts` (new) | Shared authoring-instructions builder + standalone text-only call (prompt, request, response validation) for when tag-rerank is off/not triggered. |
| `functions/src/ai/catalogTagRerankProvider.ts` | Extend prompt/response schema to optionally carry suggestion-authoring instructions and output when both `tagRerankMode` and `suggestionAuthorMode` are enabled and both triggers fire for the same design (merged-call path, §2.4/§4.2). |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Decide merged-vs-standalone-vs-server-template path per §4.3; wire whichever call is appropriate; fallback to server-templated suggestions on any failure. |
| `functions/src/updateAiEnrichmentSettings.ts` / `loadAiEnrichmentSettings.ts` | Add distinct `suggestionAuthorMode` setting, independent from `tagRerankMode` (§4.5, resolved). |
| `shared/types/ai/aiProcessing.types.ts` | Add `suggestionAuthor*` fields to `DesignAiSuggestions`. |
| `functions/src/ai/catalogTagResolver.test.ts` | Tests for the last-resort threshold (0/1/2/3-weak/3-strong/5+ approved matches). |
| `functions/src/ai/catalogSuggestedTagAuthorProvider.test.ts` (new) | Prompt building, response validation, failure/fallback tests. |
| `functions/src/ai/aiEnrichmentPipeline.test.ts` | Extend with authoring-call trigger/fallback tests. |
| `docs/project/DECISIONS.md` | New ADR documenting the threshold change and AI-authored suggestion quality approach. |
| `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, `CURRENT-STATE.md` | Document the new behavior. |
| `.cursor/workflow/state.md` | Track phase through signoff. |

---

## 6. Acceptance Criteria

- [ ] A design with 5+ solid approved tag matches never generates `suggestedNewTags`, regardless of remaining room under the 8-tag cap.
- [ ] A design with 0-2 approved matches can generate suggestions (last-resort case).
- [ ] The "3 weak matches" edge case behavior is explicitly decided during review and tested accordingly.
- [ ] When the last-resort gate fires and the authoring call succeeds, suggested tags carry AI-authored `preferredWhen` text and real aliases, not the generic template.
- [ ] When the authoring call fails/is disabled/returns invalid output, suggestions still generate via the existing server-template fallback — never silently dropped when genuinely needed.
- [ ] The authoring call (merged or standalone) is text-only, never receives the image, never receives the full approved tag database (only a small calibration example set).
- [ ] Authored suggestion names are validated against the original candidate list — the AI cannot invent a name outside what it was given.
- [ ] The AI can decline to suggest a candidate by omitting it from its output, further reducing suggestion volume.
- [ ] When both `tagRerankMode` and `suggestionAuthorMode` are enabled and both triggers fire for the same design, only one Gemini call is made (merged path) — not two.
- [ ] When `tagRerankMode` is off (or not triggered) but `suggestionAuthorMode` is enabled and the last-resort gate fires, the standalone authoring call runs and produces the same quality of output as the merged path.
- [ ] A failure in the suggestion half of a merged call does not affect the rerank half's own tags/fallback behavior, and vice versa.
- [ ] `suggestionAuthorMode` and `tagRerankMode` can be set independently (e.g. rerank off + suggestion-author auto) and each setting's behavior is unaffected by the other's value.
- [ ] Lint, root typecheck, functions typecheck, functions build all pass.
- [ ] All new and existing `functions/src/ai/*.test.ts` files pass.
- [ ] No Firebase Functions deploy performed.

---

## 7. Testing Plan

- `npm run lint`
- `npx tsc --noEmit` (root and functions)
- `npm run build` (functions)
- `npx tsx --test functions/src/ai/catalogTagResolver.test.ts` (last-resort threshold cases)
- `npx tsx --test functions/src/ai/catalogSuggestedTagAuthorProvider.test.ts` (new)
- `npx tsx --test functions/src/ai/aiEnrichmentPipeline.test.ts` (extended)
- Full `functions/src/ai/*.test.ts` sweep for regressions
- Full root build

Manual smoke test (AI Review, not Playground — Playground support is deferred per §3): re-run AI on a design with few approved-tag matches and confirm the resulting suggested tags read like real Tag Management entries, not generic templates. This replaces (does not add to) any Playground-based verification for this phase.

Add `catalogSuggestedTagAuthorProvider.test.ts` coverage for `selectCalibrationExampleTags` specifically: deterministic output for the same input (run twice, assert identical result), relevance-then-quality-then-fill ordering, alphabetical tie-break, and the 3-alias-per-example cap.

---

## 8. Open Questions — All Resolved (2026-07-02)

1. ~~Exact last-resort threshold~~ **Resolved (§4.1):** `approvedResult.length <= 2`, OR `=== 3` with all three matches weak (partial-token only) AND `unmatchedCandidateCount >= 2`. 3 approved tags with at least one strong match never triggers suggestions; 4+ approved tags never triggers suggestions regardless of match quality.
2. ~~Shared vs. distinct settings toggle~~ **Resolved (§4.5):** distinct `suggestionAuthorMode` setting, independent from `tagRerankMode`. When both are enabled and both triggers fire for the same design, the two jobs share one physical Gemini call (§2.4/§4.3); otherwise suggestion-authoring runs its own standalone call so it never depends on `tagRerankMode` being on.
3. ~~Playground support~~ **Resolved (§3):** deferred entirely for this phase. Backend/pipeline only, verified with unit tests plus a manual AI Review (not Playground) smoke test. Suggestion-author Playground support is a fast-follow once the tag-rerank Playground pattern is signed off.
4. ~~Calibration example count/selection~~ **Resolved (§4.2a):** capped at 4 examples, selected deterministically (relevance → quality filter → fill remainder → alphabetical tie-break), never random. Each example capped to name + up to 3 aliases + `preferredWhen` only.

Plan approved in direction; all four open questions resolved by user decision on 2026-07-02. Implementation may proceed under the FreshForge gate.

---

## 9. Risks

- **Threshold miscalibration.** Too strict (`<=2` only) may leave some genuinely-thin-but-3-tag designs under-suggested; too loose keeps the current noisy behavior. Mitigated by making the exact rule a named, testable function reviewers can adjust before implementation, and by the fallback path ensuring nothing breaks either way.
- **New cost/latency for the last-resort case specifically** — but this is the case where fewer designs qualify (by design), so aggregate cost impact should be lower than the tag-reranker's `auto` mode, not higher.
- **Prompt-engineering risk**: getting the AI to reliably match the calibration examples' style/specificity is inherently softer than the tag-reranker's strict validation (which only ever selects from a fixed list) — this call is asking for free-text generation, which is harder to bound. Mitigated by strict length caps and the server-template fallback as a safety net.

---

## 10. Future Expansion (not this phase)

- Playground support for testing the suggestion-authoring call, deferred pending `ai-tag-rerank-second-call` Playground pattern signoff.
- Possible future reuse of the same "calibration examples" pattern for other AI-authored content (e.g. category descriptions).
