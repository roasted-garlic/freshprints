# Plan — Text-Only Gemini Tag Reranker (Second Call) + Playground Support

- **Date:** 2026-07-02
- **Mode:** Managed Phase
- **Goal slug:** `ai-tag-rerank-second-call`
- **Roadmap phase:** Phase 5 AI Processing maintenance, supporting the current Phase 6 accepted baseline
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a human checkpoint after approval and testing. No deploy is performed in this phase.
- **Builds on:** ADR-FP-039 (lean vision-only prompt, server-side taxonomy resolution), ADR-FP-041 (approved category names only in prompt; full tag-name injection measured ~4.4x cost, gated behind a real accuracy test). This phase is that accuracy test, run cheaply via a second text-only call instead of by expanding the first call's payload.
- **Review round 1 notes (addressed below, implementation still blocked):** approved in direction; see §4.1 (note 1 — default/auto/always wording clarified), §4.10 (note 2 — explicit owner/admin gate requirement for the Playground rerank callable), §4.6 (note 3 — `tagRerankStatus` tri-state replaces a single `tagRerankRan` boolean), §3/§4.4 (note 4 — `uncoveredConcepts` boundary clarified), and updated acceptance criteria / test list / manual smoke plan for notes 5, 6, and 7 (mixed valid/invalid reranker response, `off`-mode zero-request assertion, and a full manual Playground comparison smoke test).

---

## 1. Goal

Staff report the v20 pipeline surfaces too many `suggestedNewTags` — the deterministic server-side matcher (`catalogTagResolver.ts`) is good at string/alias matching but has no way to judge buyer intent, so it under-matches phrase-y or ambiguous candidates that a human (or a second look from Gemini) would resolve correctly.

Add an **optional** second, text-only Gemini call — a tag reranker — that runs after the existing vision call and existing server-side approved-tag shortlist matching. It receives the first call's JSON response and a compact shortlist of approved-tag candidates (not the full tag database, not the image) and picks the best final tags from that shortlist using judgment the server-side matcher doesn't have.

Per the user's explicit follow-up request, this phase also adds a way to **exercise this workflow from the Settings AI Playground** — a second-prompt button on the first response that runs the reranker call referencing the first response — so the team can compare quality/cost before deciding whether to turn it on in production at all.

---

## 2. Current State (verified in code)

### 2.1 Pipeline call sequence today (`functions/src/ai/aiEnrichmentPipeline.ts`)

1. Load design, settings, categories, approved tags (cached).
2. **Call #1 (vision):** `provider.enrichDesign(input)` → Gemini, image + small v20 prompt + approved category names + excluded tags → `{ suggestions, analysis }`. `analysis.rawTags` (untokenized phrases) and `analysis.rawCategory` are transient signals.
3. `resolveAiCatalogTags({ approvedTags, candidates: analysis.rawTags ?? suggestions.tags, maxApprovedTags: SIMPLE_ENRICHMENT_MAX_TAGS (8), suggestedNewTags: suggestions.suggestedNewTags })` — deterministic, no AI. Binary matching only: exact normalized name/alias → punctuation-tolerant alias → per-token → else `unmatchedCandidates` → reduced to safe single-word `suggestedNewTags`. **No score or match-reason is currently exposed** in `ResolveAiCatalogTagsResult` (`{ tags: string[]; suggestedNewTags: SuggestedNewTag[] }`) — this must be extended (§4.2).
4. `resolveThemeCategory(...)` — deterministic scoring, sets `categoryName`/`categoryId` using matched tags as a signal.
5. `delete analysis.rawTags; delete analysis.rawCategory;` (never persisted).
6. Description-quality fallback, then `markAiSuccess` writes `aiSuggestions` + `aiAnalysis` to Firestore.

Cost/token fields (`promptTokens`, `completionTokens`, `estimatedCostUsd`) are set once, inside `buildSimpleCatalogEnrichmentResult` (`simpleCatalogEnrichmentResponse.ts`), from the single vision call's usage. The pipeline passes them through unchanged.

### 2.2 Why the server-side matcher under-matches

`catalogTagResolver.ts` has no scoring/confidence concept — a candidate either matches an approved name/alias exactly (post-normalization) or it doesn't. Phrase candidates like "mom life", "rock on", "messy bun" only resolve if an approved tag happens to carry that exact phrase as an alias. There is nothing between "exact/alias match" and "give up and suggest a new tag" — no fuzzy judgment step. This is precisely the gap the user wants Gemini to fill on a second pass, using the shortlist the server already narrowed down.

### 2.3 Reuse available for a second call

- `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`: `postVisionCompletion`/`requestVisionCompletion`/`fetchVisionWithRetry` are transport-level and image-agnostic — a text-only request body (omit the `image_url` content part) can reuse the same retry wrapper, constants (`VISION_REQUEST_MAX_RETRIES = 3`, `VISION_REQUEST_BASE_DELAY_MS = 2000`), and the same `GEMINI_CHAT_COMPLETIONS_URL`/`providerTarget.baseUrl`. `extractVisionCompletionUsage`, `assertVisionCompletionHasContent`, `extractJsonObject` are all directly reusable for parsing the second response.
- `simpleCatalogEnrichmentPrompt.ts` already has `formatTagContext`/`formatTagNamesOnly` helpers for rendering `CatalogTag[]` into prompt text — a starting point (not a straight reuse, since the reranker needs match reasons, not full alias/preferredWhen text) for rendering the compact shortlist.
- `aiEnrichmentPlayground.ts` (`runAiEnrichmentPlayground`) already loads `categories`/`approvedTags`/image in parallel and returns raw `outputText` (unparsed) plus timing/cost — it does **not** currently run `normalizeSimpleCatalogEnrichment`/`resolveAiCatalogTags`/`resolveThemeCategory` at all. Extending it to also run the shortlist step and a second call is additive, not a rework.
- `updateAiEnrichmentSettings` Cloud Function + `settings/{AI_ENRICHMENT_SETTINGS_DOC_ID}` Firestore doc is the existing owner/admin-gated settings surface. A reranker mode toggle plugs into this document via a new field, no new settings surface needed.
- `DesignAiSuggestions.confidence`/`fieldConfidence` and most of `DesignAiAnalysis` (`overallConfidence`, etc.) exist on the shared type but are **never populated** by the current v20 pipeline — free capacity if we want to record something here, though this phase does not require using them (see §4.6).

### 2.4 What does not exist yet (must be built)

- No concept of a "compact approved-tag candidate shortlist with match reasons" — `resolveAiCatalogTags` must be extended to also return this (§4.2).
- No text-only request path in `geminiVisionEnrichmentProvider.ts` (§4.3).
- No second-call prompt builder (§4.3).
- No reranker response schema/parser (§4.3).
- No wiring in `aiEnrichmentPipeline.ts` to call it, validate its output, and fall back safely (§4.4).
- No settings field to control when it runs (§4.5).
- No Playground support for a second "rerank" step referencing the first response (§4.7 — new, per user's follow-up request).
- No cost/latency observability comparing reranked vs. non-reranked runs beyond what already exists per-call (§4.8).

---

## 3. Scope

### In scope

- Extend `resolveAiCatalogTags` (or add a sibling function) to also produce a compact `approvedTagCandidates` shortlist: `{ name, matchedBy: string[], reason: string }[]`, capped at roughly 20–30 entries, built from the same lookup data the resolver already has (approved matches plus near-miss/unmatched candidates worth showing Gemini), without including the full tag database or full `preferredWhen` text.
- Add a text-only reranker call to `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts` (or a new sibling module, e.g. `catalogTagRerankProvider.ts`) that sends: the first call's `{ title, description, category, tags }` JSON, the resolved category name, and the compact shortlist — no image, no full tag database.
- New reranker prompt builder and response parser (JSON: `{ tags: string[], uncoveredConcepts: string[] }`), following the same tolerant-JSON-extraction pattern as the first call.
- Server-side validation of reranker output: discard any tag not in the shortlist, discard aliases unless also an approved tag name, dedupe, enforce exclusions, cap at 8. **Wording clarified per review note 4:** the reranker cannot invent *final approved tags* under any circumstance — its `tags` output is strictly filtered to `approvedTagCandidates` membership. Its `uncoveredConcepts` output is a separate, lower-trust channel that may only ever feed the existing server-side `suggestedNewTags` generation path (as additional candidate input, subject to the exact same normalization/rejection rules as any other unmatched candidate) — `uncoveredConcepts` strings must never be written directly as persisted final tags or bypass `suggestedNewTags` normalization. The reranker also never overrides category resolution.
- Wire the reranker into `aiEnrichmentPipeline.ts` after tag-shortlist generation, before Firestore write, **gated by a settings-controlled mode** (§4.5, exposed via an owner/admin setting: `off` / `auto` / `always`). **Shipped default setting is `off`.** `auto` (confidence-heuristic-triggered) is the mode recommended for the team to switch to once Playground-based comparisons (§4.7) validate quality/cost. `always` is a temporary comparison/testing mode only, not intended as a standing production setting.
- Failure handling: any failure (network, empty output, invalid JSON, all-invalid tags) falls back to the current server-ranked `tags` output — for final approved tags, the reranker can only ever select a subset of what the server-side shortlist already produced (never invent new final tags), so it never breaks the pipeline. See §4.4 for how `uncoveredConcepts` is handled separately (review note 4).
- Extend cost/token tracking so a reranked design's `aiSuggestions` records the second call's tokens/cost separately from the first (new fields — see §4.6), so cost comparisons are possible per design, not just estimated in aggregate.
- **Playground reranker support (per user request):** add a second, explicit action in the Settings AI Playground result view — after the first response renders, a "Run tag rerank" button becomes available. Clicking it sends the already-computed shortlist + first response as a second text-only call and displays its own result (output, tokens, cost, elapsed) alongside the first, so staff can manually inspect and compare quality without touching production designs.
- Add metrics/logging: whether the reranker ran, candidate count, final tag count, discarded invalid reranker tags, `uncoveredConcepts` count, second-call latency, second-call cost — via the existing `logPipelineEvent`/`PipelinePhaseTimer` pattern already used for the first call.
- Unit tests per §7.
- Update `docs/project/DECISIONS.md` (next ADR: **ADR-FP-042**), `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, and `CURRENT-STATE.md` for the new optional second-call architecture.

### Out of scope

- No full approved tag database injected into any call.
- No image in the second call, no second vision/image-analysis call.
- No embeddings, no vector search.
- No category creation, no reranker override of category resolution.
- No direct tag creation from reranker output (only existing `suggestedNewTags` server path creates suggestions, from `uncoveredConcepts` at most — see §4.4).
- No UI rebuild of AI Review or Design Details beyond whatever minimal display is needed for the two new per-call cost fields (display wiring only if trivial; if it requires new layout decisions, flag as a fast follow-up rather than bundling here).
- No changes to Imports, Design Library, Print Requests, Print Runs, or Portal.
- No Firebase Functions deploy in this phase.
- No change to the first call's prompt, model, or cost profile — v20 stays exactly as-is; this phase only ever adds a second, optional, cheaper call after it.

---

## 4. Design Detail

### 4.1 Decision: which trigger option (Option A/B/C from the task)

**Recommendation: Option C wrapping Option B — an owner/admin setting with three values (`off` / `auto` / `always`), where `auto` uses a confidence heuristic to decide per-design.** This is not "pick one," it's the union: B defines *when* auto fires, C is the control surface that lets the team choose B's behavior, A's behavior, or disable it, without a code change.

Why, concretely:

- **Reject pure Option A (always-on).** Doubling model round-trips on every single design guarantees paying the second call's cost even on designs the server already resolves cleanly (most of them, per the existing v20 baseline). The user's own reasoning is that the second call is only *cheap in aggregate* if it's not run needlessly — always-on defeats that.
- **Reject pure Option B with no control surface.** Confidence heuristics on a brand-new signal will need tuning after real usage data comes in (exactly like the category resolver's `MIN_RESOLVE_SCORE` needed no changes but *tag* ambiguity is a new, unvalidated heuristic). Shipping it as a hardcoded always-auto path with no way to force `always` for a testing period, or force `off` if it misbehaves, removes the team's ability to operationally tune it — which is exactly the flexibility Option C exists to provide.
- **Therefore: ship the setting (`tagRerankMode: "off" | "auto" | "always"`).**

**Mode behavior, stated unambiguously (review note 1):**
  - **`off` — shipped default setting.** This is what production ships with on deploy day. This is a new, unvalidated cost/quality tradeoff — the team should not silently start double-billing every design the day this deploys.
  - **`auto` — recommended mode to switch to after Playground validation.** Once the team has used the Playground reranker support (§4.7) to compare real designs' before/after tags and cost, and is satisfied with the tradeoff, `auto` is the recommended production mode going forward. It uses a confidence heuristic to decide per-design (below), not a hardcoded always-run.
  - **`always` — temporary comparison/testing mode only.** Intended for a short, deliberate window (e.g., "run it on everything for a week so we can compare quality/cost at scale" or reproduce a specific staff report), not a standing production setting. It is provided as an operational escape hatch for testing, not as the recommended steady state.
- **`auto` heuristic (concrete, not vague "ambiguity"):** trigger the second call when *any* of the following holds after tag-shortlist generation:
  - `unmatchedCandidates.length >= 3` (server-side matcher had at least 3 raw candidates it couldn't confidently place — the exact symptom in the user's report).
  - `resolvedTags.tags.length < 5` (fewer than 5 of the 8 slots filled — a design where the deterministic matcher clearly ran out of material).
  - `suggestedNewTags.length >= 2` (multiple new-tag suggestions being generated, which is the visible symptom staff are complaining about — "too many suggested tags").
  These three conditions are cheap booleans computed from data `resolveAiCatalogTags` already produces (once extended per §4.2) — no new AI call is needed to *decide* whether to run the reranker, keeping the decision itself free.

### 4.2 Extend `catalogTagResolver.ts` to expose a compact shortlist

Current `ResolveAiCatalogTagsResult` is `{ tags: string[]; suggestedNewTags: SuggestedNewTag[] }` with no per-candidate metadata. Add a new exported type and either extend the existing function's return or add a sibling pure function that reuses the same lookup-building internals (`buildApprovedTagLookup`, `normalizeForAliasMatch`):

```ts
export interface ApprovedTagCandidate {
  name: string;            // approved tag name only
  matchedBy: string[];     // raw candidate string(s) that pointed at this tag
  reason: string;          // short, human-readable, generated deterministically (not AI) —
                            // e.g. "Matched via alias" | "Partial token match" | "Unmatched candidate, nearby approved tag"
}

export interface ResolveAiCatalogTagsResult {
  tags: string[];
  suggestedNewTags: SuggestedNewTag[];
  approvedTagCandidates: ApprovedTagCandidate[]; // NEW — capped ~20-30, always returned
  unmatchedCandidateCount: number;               // NEW — feeds the §4.1 auto trigger
}
```

`approvedTagCandidates` construction (deterministic, no AI):
1. All approved tags already matched (exact/alias/token) are included with `reason: "Matched via <exact|alias|token> match"`.
2. For each `unmatchedCandidate`, do a lightweight nearby-match pass against the approved tag/alias lookup (reuse `normalizeForAliasMatch`'s tokenization to find approved tags sharing at least one non-stopword token with the candidate) and include up to N nearby approved tags per unmatched candidate with `reason: "Unmatched candidate '<candidate>' shares a token with this approved tag"`.
3. Cap total list length (~20–30) by taking matched tags first, then filling remaining slots with the highest-token-overlap nearby matches. Never includes tags with zero relation to any candidate — this is not "the whole library," it's specifically candidate-adjacent.
4. This is purely additive to the existing function's behavior — `tags`/`suggestedNewTags` computation is unchanged, so this is a low-risk extension, not a rewrite.

**Test requirement:** `catalogTagResolver.test.ts` gets new cases asserting `approvedTagCandidates` is non-empty and reasonably capped for the existing "mom life"/"rock on"/"messy bun"-style phrase-candidate test fixtures already in the suite, and that `unmatchedCandidateCount` matches the number of genuinely unmatched raw candidates.

### 4.3 Second call: provider, prompt, response contract

**New module `functions/src/ai/catalogTagRerankProvider.ts`** (keeps `geminiVisionEnrichmentProvider.ts` focused on the vision call; reuses its exported transport helpers rather than duplicating them):

```ts
export interface CatalogTagRerankInput {
  firstResponse: { title: string; description: string; category: string; tags: string[] };
  resolvedCategoryName: string | undefined;
  approvedTagCandidates: ApprovedTagCandidate[]; // from §4.2
}

export interface CatalogTagRerankResult {
  tags: string[];               // subset of approvedTagCandidates[].name only, validated
  uncoveredConcepts: string[];
  promptTokens: number | null;
  completionTokens: number | null;
  estimatedCostUsd: number | null;
}

export async function callTagRerank(
  apiKey: string,
  providerTarget: ProviderTarget,
  visionModelId: AllowedVisionModelId,
  input: CatalogTagRerankInput,
): Promise<CatalogTagRerankResult>
```

Request body: same `buildVisionRequestBody`-style JSON shape but **no `image_url` content part** — text-only `messages[].content` — reusing `fetchVisionWithRetry`/`requestVisionCompletion`'s retry constants. Prompt is the one specified in the task (verbatim, adapted to reference the actual field names above):

```
You are choosing the best final approved catalog tags for a DTF design.

You are not analyzing the image directly. Use the previous image analysis as your source of truth.

Previous image analysis:
{{first_ai_response_json}}

Resolved category:
{{resolved_category}}

Approved tag candidates:
{{approved_tag_candidates_json}}

Task:
Choose the best final tags from the approved tag candidates only.

Rules:
Return only tag names that appear in approvedTagCandidates.
Do not invent final tags.
Do not use aliases unless the alias is also an approved tag name.
Choose tags that best help staff find this design later.
Prioritize buyer intent, main subject, audience, occasion, recognizable property, visible text theme, and searchable design theme.
Do not over-prioritize colors, decorative accents, or minor background elements unless they are important to finding the design.
Avoid duplicate or near-duplicate tags.
Use fewer than 8 tags if fewer are truly useful.
If an important concept from the previous image analysis is not covered by the approved candidates, put it in uncoveredConcepts.

Return exactly this JSON and nothing else:
{"tags": ["approvedtag"], "uncoveredConcepts": ["concept not covered"]}
```

Response parsing reuses `extractJsonObject` (tolerant extraction) then validates: `tags` must be an array of strings, each checked against `approvedTagCandidates.map(c => c.name)` — anything else silently dropped (not an error; logged as a discard count). `uncoveredConcepts` optional string array, capped at a small length (e.g. 5) and sanitized the same way tag names are (trim/lowercase/length cap) since these strings are only ever used as *input* to the existing `suggestedNewTags` path, never persisted directly (§4.4).

New prompt version constant: `CATALOG_TAG_RERANK_PROMPT_VERSION = "catalog-tag-rerank-v1"` in `catalogTitleRules.ts` alongside the existing v20 constant, recorded on `aiSuggestions` only when the reranker actually ran (§4.6).

### 4.4 Pipeline wiring and fallback behavior

In `aiEnrichmentPipeline.ts`, after step 3 (`resolveAiCatalogTags`) and before step 4 (`resolveThemeCategory`) — category resolution already uses `suggestions.tags` as an input signal, so it must run **after** any reranking, not before, so a reranked tag set feeds category resolution the same way the original resolved set does today:

```
resolvedTags = resolveAiCatalogTags(...)   // existing, now also returns approvedTagCandidates
if not shouldRunTagRerank(mode, resolvedTags):   // §4.1 heuristic, or mode === "always"
  suggestions.tagRerankStatus = "skipped"
  suggestions.tags = resolvedTags.tags
else:
  try:
    rerankResult = callTagRerank(apiKey, providerTarget, visionModelId, {
      firstResponse: { title, description, category: rawCategoryCandidate, tags: suggestions.tags },
      resolvedCategoryName: undefined,   // category not yet resolved at this point — see note below
      approvedTagCandidates: resolvedTags.approvedTagCandidates,
    })
    finalTags = validateRerankTags(rerankResult.tags, resolvedTags.approvedTagCandidates)  // discard non-shortlist tags, dedupe, cap 8
    track rerank tokens/cost on suggestions regardless of outcome (§4.6)
    if finalTags.length > 0:
      // at least one valid tag survived validation — success, even if some tags were discarded (review note 5)
      suggestions.tags = finalTags
      suggestions.tagRerankStatus = "succeeded"
      feed rerankResult.uncoveredConcepts into suggestedNewTags generation (review note 4) — never a direct final tag
    else:
      // reranker returned nothing usable — fall back, do not blank out existing tags
      suggestions.tags = resolvedTags.tags
      suggestions.tagRerankStatus = "failed"
      suggestions.tagRerankFailureReason = "all_tags_invalid"
      log discard
  catch (error):
    suggestions.tags = resolvedTags.tags
    suggestions.tagRerankStatus = "failed"
    suggestions.tagRerankFailureReason = classify(error) // "network_error" | "invalid_json" | "empty_output"
    log failure — pipeline continues exactly as it does today
... continue to resolveThemeCategory using suggestions.tags (reranked or not) ...
```

**Category-name-not-yet-resolved note:** per the task's Step 3 spec, the reranker is supposed to receive "the resolved category." But today's pipeline resolves category *after* tags specifically because category resolution uses matched tags as a scoring signal (per ADR-FP-039/§4.4 of that phase's plan). Running category resolution before the reranker would mean using *pre-rerank* tags as the category signal, then re-running category resolution again after rerank would double the deterministic (non-AI, cheap) category step — acceptable, since it's free. **Resolution:** call `resolveThemeCategory` twice — once before the reranker (to give the reranker a best-effort resolved category name, using pre-rerank tags), and once after (final, using post-rerank tags) — both calls are pure/deterministic/free, so this is not a cost concern, just a minor pipeline restructure. If `tagRerankMode === "off"` or the heuristic doesn't fire, only the single (existing) resolution runs — zero behavior change for the non-reranked path.

`uncoveredConcepts` handling (review note 4 — explicit boundary): fed as additional raw candidates into the *existing* `suggestedNewTags` generation path in `resolveAiCatalogTags` (re-run once, cheaply, with `uncoveredConcepts` appended to `unmatchedCandidates` if room remains under `maxApprovedTags`) — **this is the only path `uncoveredConcepts` may ever take.** It is not a new persistence path, it is never written directly as a final tag, and it never bypasses the single-word-safe-reduction/rejection normalization `catalogTagResolver.ts` already applies to every other unmatched candidate (per ADR-FP-039 review note 4). This keeps "server remains authoritative" intact: the reranker's `uncoveredConcepts` can only ever become a *suggestion* for staff review, exactly like today's unmatched-candidate suggestions — never a persisted final tag.

**Failure/status behavior (explicit, matches task requirements, mapped to `tagRerankStatus` per review note 3):**
- Second call throws/network fails → `tagRerankStatus = "failed"`, `tagRerankFailureReason = "network_error"`, fall back to current server-ranked tags. Pipeline does not fail the whole run.
- Second call returns invalid/unparseable JSON → `tagRerankStatus = "failed"`, `tagRerankFailureReason = "invalid_json"`, same fallback.
- Second call returns a **mix of valid and invalid tags** (review note 5) → invalid (non-shortlist) tags are discarded individually; the valid subset is kept and applied; `tagRerankStatus = "succeeded"` (not `"failed"`) as long as at least one valid tag survives — a partially-invalid response is not treated as a whole-response failure. Discard count is logged (§4.8).
- Second call returns **only** invalid tags (zero valid survivors) → `tagRerankStatus = "failed"`, `tagRerankFailureReason = "all_tags_invalid"`, fall back entirely to `resolvedTags.tags`.
- Second call returns fewer than 8 useful tags (but all valid) → keep fewer, `tagRerankStatus = "succeeded"` (this is by design per the reranker's own prompt — "use fewer than 8 if fewer are truly useful"). No deterministic backfill is added in this phase (task explicitly allows backfill "only if safe" — deferred as a future enhancement, not required for acceptance).
- `tagRerankMode === "off"` or `auto` heuristic doesn't trigger → `tagRerankStatus = "skipped"`, the new code path (including request construction) is never entered; behavior is byte-for-byte identical to today's pipeline (review note 6 — see test list).

### 4.5 Settings: `tagRerankMode`

Extend `functions/src/updateAiEnrichmentSettings.ts`:
- `UpdateAiEnrichmentSettingsRequest`/`Response` gain `tagRerankMode: "off" | "auto" | "always"`.
- Validation: must be one of the three literal values, default `"off"` if omitted (backward compatible with any client not yet updated).
- Persisted in the same `settings/{AI_ENRICHMENT_SETTINGS_DOC_ID}` doc merge — no new document, no new permission gate (existing owner/admin `assertOwnerAdminCaller` check already covers this).
- `loadCachedAiEnrichmentSettings()`'s return shape extends to include `tagRerankMode`, read by the pipeline.
- Minimal Settings UI addition: a 3-way selector (Off / Auto / Always) next to the existing AI Processing settings fields — small, reuses existing form patterns in `src/renderer/src/features/settings/`. This is the only renderer change required for the production toggle; kept intentionally small.

### 4.6 Cost/token tracking additions

`DesignAiSuggestions` (`shared/types/ai/aiProcessing.types.ts`) gains, all optional (no migration — existing designs simply won't have them):
```ts
tagRerankStatus?: "skipped" | "succeeded" | "failed";
tagRerankFailureReason?: string; // set only when tagRerankStatus === "failed" — e.g. "network_error" | "invalid_json" | "empty_output" | "all_tags_invalid"
tagRerankPromptTokens?: number | null;
tagRerankCompletionTokens?: number | null;
tagRerankEstimatedCostUsd?: number | null;
tagRerankPromptVersion?: string;
tagRerankUncoveredConcepts?: string[];
```

**Review note 3 — explicit attempted/succeeded/failed tracking, not a single boolean.** A single `tagRerankRan` boolean cannot distinguish "mode was off / heuristic didn't trigger" from "we tried and it failed" from "we tried and it worked" — all three are operationally distinct and needed for later cost/quality review, especially once `auto` mode is live and the team wants to know how often the second call is actually firing versus failing silently into fallback. Replacing with a single tri-state `tagRerankStatus` field (`"skipped" | "succeeded" | "failed"`) rather than three separate booleans, since the three states are mutually exclusive and a single field is simpler to query/aggregate than reconciling `tagRerankAttempted`/`tagRerankSucceeded` combinations:
- `"skipped"` — `tagRerankMode === "off"`, or `auto` heuristic did not trigger for this design. No second call was made, no tokens/cost recorded.
- `"succeeded"` — second call was made and produced at least one valid tag that was applied (§4.4's "valid tags kept" fallback path also counts as `"succeeded"`, not `"failed"`, since server validation working as designed is a success case, not a failure — see review note 5's test).
- `"failed"` — second call was attempted but produced nothing usable (network/timeout error, invalid JSON, empty output, or every returned tag was outside `approvedTagCandidates`); `tagRerankFailureReason` records why. Pipeline falls back to `resolvedTags.tags` exactly as before.

No changes to the base `promptTokens`/`completionTokens`/`estimatedCostUsd` fields — those continue to reflect call #1 only, so existing dashboards/comparisons stay valid; total cost per design is `estimatedCostUsd + (tagRerankEstimatedCostUsd ?? 0)`. Token/cost fields are only populated when `tagRerankStatus !== "skipped"` (a failed call may still have consumed tokens before failing parse/validation, so cost is recorded on both `"succeeded"` and `"failed"`, just not `"skipped"`).

Display: if trivial, add these fields to the existing "AI Processing" section in `DesignDetailsModal.tsx` (which already has an Input/Output tokens + Estimated cost pattern from the `ai-processing-token-cost-display` phase) as a conditional second row shown only when `tagRerankStatus && tagRerankStatus !== "skipped"`. If this proves non-trivial during implementation (e.g. layout doesn't have room), defer to a fast-follow UI-only phase rather than blocking this phase's core pipeline/Playground work — flagged as an open question in §8, not a scope commitment.

### 4.7 Playground support (per user's follow-up request)

This is the concrete answer to "if there is a way we can implement this workflow into the playground somehow to test the theory."

Extend `AiEnrichmentPlaygroundRequest`/`Response` (`shared/types/ai/aiEnrichmentPlayground.types.ts`) and `testAiEnrichmentPlayground`/`aiEnrichmentPlayground.ts`:

- **First call is unchanged.** Playground continues to run exactly as today (raw `outputText`, no parsing) — this stays the baseline, cost-free-to-change surface.
- **New second callable action**, e.g. `testAiEnrichmentTagRerank` (or a `mode: "vision" | "rerank"` discriminator on the existing callable — implementation detail decided during build, but a **separate callable is recommended** to keep the existing `testAiEnrichmentPlayground` contract untouched and avoid regressing `promptParity.test.ts`, which asserts the production/playground vision-call prompts stay identical).
- New request shape:
  ```ts
  export interface AiEnrichmentTagRerankPlaygroundRequest {
    firstResponseOutputText: string; // raw text from the prior playground vision call, re-parsed here
    visionModelId: AllowedVisionModelId;
  }
  export interface AiEnrichmentTagRerankPlaygroundResponse {
    elapsedMs: number;
    outputText: string;
    approvedTagCandidates: ApprovedTagCandidate[]; // shown to staff so they can see exactly what the reranker was given
    promptTokens: number | null;
    completionTokens: number | null;
    estimatedCostUsd: number | null;
    version: string; // CATALOG_TAG_RERANK_PROMPT_VERSION
  }
  ```
- Server-side flow for this callable: parse `firstResponseOutputText` with the *existing* `normalizeSimpleCatalogEnrichment` (so playground staff must first get a valid first-call JSON response before rerank is available — same validation the real pipeline applies), load approved tags (already-cached loader, reused), run the extended `resolveAiCatalogTags` to build `approvedTagCandidates`, then call `callTagRerank` — returns raw `outputText` (not auto-applied to anything) plus the shortlist, tokens, and cost, exactly mirroring how the first call already just displays raw output for staff to eyeball.
- **Renderer change (Settings AI Playground):** after a first-call result renders, show a "Run tag rerank" button (disabled until the first result is valid parseable JSON with `title`/`description`/`category`/`tags` — reuse existing validation feedback patterns already in the playground UI). Clicking it calls the new callable and renders a second result card below/beside the first, in the same visual style as the existing result modal (Provider/Model/Elapsed row, Input/Output tokens/Estimated cost row per the `ai-processing-token-cost-display` phase's established 3-column grid pattern), plus the returned `outputText` and the `approvedTagCandidates` list that was sent (so staff can audit exactly what the reranker saw).
- This lets the team run real designs through Playground, compare `tags` before/after rerank plus the delta in cost, entirely outside of production `designs` writes (playground already guarantees "does not write to designs, does not persist uploaded images" — this second call must uphold the exact same guarantee).

### 4.8 Observability

Reuse `logPipelineEvent`/`PipelinePhaseTimer` (`pipelineTiming.ts`) exactly as the first call does:
- `"tag_rerank.started"` / `"tag_rerank.completed"` / `"tag_rerank.skipped"` (with reason: `mode_off` | `heuristic_not_triggered`) / `"tag_rerank.failed"` (with error code) / `"tag_rerank.discarded_invalid_tags"` (count).
- These are structured Cloud Functions logs (same as today's `"vision.request.started"`/`"vision.completion.usage"`), not a new dashboard — sufficient for the "local debug metrics" requirement in the task without building new infrastructure this phase.

### 4.9 Firestore/data model impact

Additive-only fields on `DesignAiSuggestions` (§4.6) and a new field on the `settings/{AI_ENRICHMENT_SETTINGS_DOC_ID}` doc (§4.5). No migration required — both are optional/defaulted. No changes to `categories`, `tags`, or any other collection.

### 4.10 Security impact

None beyond what already exists: the reranker call stays inside Cloud Functions, uses the same `GEMINI_API_KEY` Secret Manager secret, no new external service, no new client-exposed key.

**Playground rerank callable authorization — explicit requirement (review note 2).** `testAiEnrichmentTagRerank` triggers a real Gemini call (cost) and reads internal approved-tag data (`approvedTagCandidates` is built from the live approved tag library, not public data). Before implementation, confirm exactly what caller check currently gates `testAiEnrichmentPlayground` (owner/admin via `assertOwnerAdminCaller`, the same check `updateAiEnrichmentSettings` uses, or a looser/implicit authenticated-staff check). Whatever that check turns out to be:

- The new rerank callable **must use that same check or a stricter one.** It must never ship with weaker authorization than the existing Settings AI Playground controls.
- If the existing playground callable turns out to be gated only by "any authenticated user" rather than owner/admin, that is a pre-existing condition this phase does not need to fix for the *first* call — but the **new rerank callable specifically must still be owner/admin-gated at minimum**, since it is new surface being added in this phase and the task's own settings toggle (`tagRerankMode`) is already owner/admin-only; it would be inconsistent to let a broader audience trigger the same underlying capability through Playground than through Settings.
- This must be verified with a concrete code citation (the actual auth check function/line) in the implementation, not assumed from this plan text, and covered by a test asserting a non-owner/admin caller is rejected.

---

## 5. Files Touched (expected)

| File | Change |
|---|---|
| `functions/src/ai/catalogTagResolver.ts` | Extend `resolveAiCatalogTags` to also return `approvedTagCandidates`/`unmatchedCandidateCount`. |
| `functions/src/ai/catalogTagRerankProvider.ts` (new) | Text-only second-call request builder, invocation, response parsing/validation. |
| `functions/src/ai/catalogTagRerankPrompt.ts` (new, or folded into the provider file) | Reranker prompt builder from `firstResponse`/`resolvedCategoryName`/`approvedTagCandidates`. |
| `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts` | Export transport helpers (`fetchVisionWithRetry` etc.) for reuse if not already exported; no behavior change to the existing vision call. |
| `functions/src/ai/aiEnrichmentPipeline.ts` | Wire reranker after tag resolution, gated by `tagRerankMode`/heuristic; restructure category resolution to run twice only when reranking (§4.4); fallback handling. |
| `functions/src/ai/catalogTitleRules.ts` | Add `CATALOG_TAG_RERANK_PROMPT_VERSION = "catalog-tag-rerank-v1"`. |
| `functions/src/updateAiEnrichmentSettings.ts` | Add `tagRerankMode` field, validation, persistence. |
| `functions/src/ai/loadAiEnrichmentSettings.ts` (or equivalent cache loader) | Expose `tagRerankMode` in the cached settings shape. |
| `functions/src/testAiEnrichmentPlayground.ts` / `functions/src/ai/aiEnrichmentPlayground.ts` | Add new reranker playground callable/mode + request/response validation. |
| `functions/src/testAiEnrichmentTagRerank.ts` (new, if separate callable chosen) | New callable entry point. Must apply the same owner/admin (or stricter) authorization check as the existing Settings AI Playground / `updateAiEnrichmentSettings` gate (review note 2). |
| `shared/types/ai/aiProcessing.types.ts` | Add `tagRerankStatus`/`tagRerankFailureReason`/`tagRerankPromptTokens`/`tagRerankCompletionTokens`/`tagRerankEstimatedCostUsd`/`tagRerankPromptVersion`/`tagRerankUncoveredConcepts` to `DesignAiSuggestions`. |
| `shared/types/ai/aiEnrichmentPlayground.types.ts` | Add `AiEnrichmentTagRerankPlaygroundRequest`/`Response`, `ApprovedTagCandidate`. |
| `src/renderer/src/features/settings/...` | Add `tagRerankMode` selector to AI Processing settings form; add "Run tag rerank" button + second result card to Playground result view. |
| `src/renderer/src/features/settings/services/aiEnrichmentSettingsService.ts` | Thread `tagRerankMode` through the existing settings update call. |
| `src/renderer/src/features/designs/...` (DesignDetailsModal or equivalent) | Conditional second cost/token row when `tagRerankStatus !== "skipped"` — only if trivial (§4.6). |
| `functions/src/ai/catalogTagResolver.test.ts` | New tests for `approvedTagCandidates`/`unmatchedCandidateCount`. |
| `functions/src/ai/catalogTagRerankProvider.test.ts` (new) | Prompt building, response parsing, tag validation (in/out of shortlist), failure/fallback paths. |
| `functions/src/ai/aiEnrichmentPipeline.test.ts` (new or extended, confirm existing coverage pattern) | Integration-style tests for heuristic trigger, always/off modes, fallback on failure, double category resolution correctness. |
| `functions/src/aiEnrichmentPlayground.test.ts` | New tests for the reranker playground path. |
| `docs/project/DECISIONS.md` | Add ADR-FP-042. |
| `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`, `CURRENT-STATE.md` | Document optional second-call architecture, settings field, playground support. |
| `.cursor/workflow/state.md` | Track phase through signoff. |
| `docs/workflow/reviews/2026-07-02-ai-tag-rerank-second-call-test-report.md` | Test report. |
| `docs/workflow/reviews/2026-07-02-ai-tag-rerank-second-call-signoff.md` | Signoff. |

---

## 6. Acceptance Criteria

- [ ] The plan (this document) states the trigger decision and rationale (§4.1: setting-controlled, `auto` uses a concrete heuristic, default `off`).
- [ ] The second call is text-only and never receives the image (enforced in `catalogTagRerankProvider.ts` — no `image_url` content part in the request body, verified by a test asserting the request body shape).
- [ ] The second call receives the first Gemini response as context (`firstResponse` field in `CatalogTagRerankInput`).
- [ ] The second call receives only the compact `approvedTagCandidates` shortlist, never the full approved tag database (verified by a test asserting the shortlist stays capped even when the approved tag library is large).
- [ ] Final tags are validated server-side and only ever drawn from `approvedTagCandidates` — any reranker output outside that set is discarded (test).
- [ ] Failure behavior implemented and tested for all four cases: network/call failure, invalid JSON, out-of-shortlist tags, fewer-than-8 useful tags.
- [ ] `tagRerankMode: "off"` produces byte-identical pipeline behavior to today (regression test against the pre-existing `aiEnrichmentPipeline` test fixtures, if any exist, or a new equivalence test).
- [ ] Motherhood skeleton example (title "Motherhood Rocks Skeleton", raw tags including "mom life"/"rock on"/"messy bun") is covered as a rerank-path test fixture, matching the task's worked example.
- [ ] Invalid tag returned by reranker (not in shortlist) is discarded, not persisted (test).
- [ ] **(Review note 5)** Reranker response containing a mix of valid shortlist tags and invalid (non-shortlist) tags: valid tags are kept, invalid tags are discarded, and the response is treated as `tagRerankStatus: "succeeded"` (not rejected/failed) as long as at least one valid tag remains (test).
- [ ] `uncoveredConcepts` output is captured and only ever flows into the existing `suggestedNewTags` server-side path, never persisted directly as a tag (test) — final approved tags never include an invented/uncovered-concept string directly (review note 4).
- [ ] Second-call failure fallback returns to server-ranked tags, with `tagRerankStatus: "failed"` and a populated `tagRerankFailureReason` (test).
- [ ] **(Review note 6)** `tagRerankMode: "off"` is verified, via a mock/spy on the request-construction or fetch layer, to never construct or send a second-call request body at all — not just "the result is discarded," but the call is never attempted (test).
- [ ] Playground supports running the reranker against a first-call result, displaying its own tokens/cost/output without writing to `designs` or persisting the uploaded image (test + manual smoke note).
- [ ] **(Review note 2)** The Playground rerank callable is confirmed, with a code citation, to use the same owner/admin (or stricter) authorization check as the existing Settings AI Playground/`updateAiEnrichmentSettings` gate; a non-owner/admin caller is rejected (test).
- [ ] Settings gains a `tagRerankMode` field, persisted and validated, defaulting to `off` for any client/request that omits it. Setting semantics are unambiguous: `off` = shipped default, `auto` = recommended mode after Playground validation, `always` = temporary comparison/testing only (review note 1).
- [ ] Cost/latency logging exists for: whether reranker ran, candidate count, final tag count, discarded invalid reranker tags, uncoveredConcepts count (structured log assertions or code-review confirmation, since full log-pipeline testing is out of scope for unit tests).
- [ ] Lint passes.
- [ ] Root TypeScript typecheck passes.
- [ ] Functions typecheck/build passes (exact command confirmed and recorded in the test report).
- [ ] All new and existing `functions/src/ai/*.test.ts` files pass via `npx tsx --test`.
- [ ] `promptParity.test.ts` still passes unmodified in spirit — the first call's prompt/contract is untouched by this phase.
- [ ] No Firebase Functions deploy performed.

---

## 7. Testing Plan

Run and record exact commands and exit codes at implementation/test phase:

- `npm run lint`
- `npx tsc --noEmit`
- Functions typecheck/build command (confirm exact script in `functions/package.json`, matching the pattern used in prior AI phases)
- `npx tsx --test functions/src/ai/catalogTagResolver.test.ts` (shortlist/candidate tests)
- `npx tsx --test functions/src/ai/catalogTagRerankProvider.test.ts` (new — prompt shape, no-image assertion, response validation, failure modes, **review note 5: mixed valid/invalid tag response keeps valid subset and status `succeeded`**)
- `npx tsx --test functions/src/ai/aiEnrichmentPipeline.test.ts` (new or extended — heuristic trigger, off/auto/always modes, fallback, double category resolution, **review note 6: `tagRerankMode: "off"` asserted via spy to never construct/send a second-call request**)
- `npx tsx --test functions/src/testAiEnrichmentTagRerank.test.ts` (new, if separate callable chosen — **review note 2: non-owner/admin caller is rejected**)
- `npx tsx --test functions/src/ai/aiEnrichmentPlayground.test.ts` (extended — reranker playground path)
- `npx tsx --test functions/src/ai/promptParity.test.ts` (confirm no regression to the first call)
- Full `functions/src/ai/*.test.ts` sweep to check for regressions in unrelated AI tests
- Full root build if renderer type changes affect shared types (`DesignAiSuggestions`, playground types)

Manual smoke (documented, not executed against production — no deploy in this phase):
- **(Review note 7)** Settings AI Playground end-to-end comparison smoke test: run a first-call vision test on a sample image (ideally the motherhood-skeleton-style example with phrase candidates), click "Run tag rerank," and record/compare side by side in the test report:
  1. the first call's raw `tags` output,
  2. the `approvedTagCandidates` shortlist that was sent to the reranker,
  3. the reranker's returned `tags` output,
  4. any discarded invalid tags (tags the reranker returned that were not in the shortlist, if any occurred),
  5. the second call's `promptTokens`/`completionTokens`/`estimatedCostUsd`.
  This is the concrete "test the theory" comparison the Playground feature exists to enable — the test report must capture actual observed values, not just "it worked."
- Confirm Settings `tagRerankMode` selector persists and round-trips via `updateAiEnrichmentSettings`.
- Confirm a non-owner/admin account cannot trigger the Playground rerank action (review note 2), consistent with whatever gate the existing Playground vision call uses or stricter.

Do not claim tests passed unless actually run; exit codes recorded in the test report before signoff.

---

## 8. Open Questions / Confirmations Needed Before Implementation

1. **Separate callable vs. mode discriminator for Playground rerank** (§4.7) — recommending a separate `testAiEnrichmentTagRerank` callable to avoid any risk to `promptParity.test.ts`/the existing playground contract. Confirm during review, not a blocker to approval.
2. **Auto-heuristic thresholds** (§4.1: `unmatchedCandidateCount >= 3`, `resolvedTags.tags.length < 5`, `suggestedNewTags.length >= 2`) are a reasonable starting point derived directly from the user's stated symptom ("too many missed tags... suggesting too many") but are not empirically tuned yet — expect these to need adjustment after real `auto`-mode usage data comes in. Not a blocker; flagged as a known future-tuning point.
3. **Design Details UI display of rerank cost fields** (§4.6) — included as "if trivial," may be deferred to a fast-follow phase depending on how the existing modal layout accommodates a second cost row. Confirm scope tolerance during review.
4. **Category-resolved-twice restructure** (§4.4) — this is the one real control-flow change to the existing pipeline in this phase (beyond pure addition). It only executes when reranking actually fires (`off` mode = zero behavior change), but reviewers should confirm this restructure is acceptable before implementation, since `aiEnrichmentPipeline.ts` is sensitive, well-tested code from the immediately prior phase (ADR-FP-039).

None of these block starting implementation once the plan itself is approved; flagging for visibility per FreshForge review gate norms.

---

## 9. Risks

- **New unvalidated cost/quality tradeoff.** This is explicitly why the default is `off` and why Playground support ships in the same phase — the team should be able to see real before/after comparisons (tags, cost, `uncoveredConcepts`) before ever enabling `auto` in production, let alone `always`.
- **Pipeline control-flow change** (double category resolution when reranking) touches recently-hardened code (ADR-FP-039, ADR-FP-041). Mitigated by scoping the restructure narrowly — only the reranked path changes; the `off` path (default) is provably identical to today.
- **Reranker output trust boundary.** Mitigated by strict server-side validation (§4.4): reranker output can only ever narrow the existing candidate set, never introduce new final tags, never touch category resolution directly, and any malformed/invalid response degrades gracefully to today's behavior rather than failing the whole enrichment run.
- **Second-call latency** adds real wall-clock time to reranked designs (network round-trip + Gemini inference, even though it's a small text-only payload). Not zero-cost in time even if cheap in dollars — acceptable since AI Processing is already an async background pipeline, not a blocking UI action, but worth noting for the `always` mode's aggregate impact on the AI queue.

---

## 10. Future Expansion (not this phase)

- Deterministic backfill when the reranker returns fewer than 8 tags but slots remain and it's "safe" to do so (explicitly deferred per task instructions).
- Auto-heuristic threshold tuning based on real `auto`-mode telemetry once shipped.
- Dashboard-level cost/quality reporting beyond structured logs, if the team wants aggregate reranked-vs-not comparisons over time rather than reading logs/Playground one design at a time.
- Possible reuse of the same text-only-call transport pattern for other future server-judgment tasks (e.g. a title/description quality pass) — not proposed here, just noting the infrastructure would generalize.
