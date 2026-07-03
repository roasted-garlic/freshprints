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
| `testAiEnrichmentTagRerank` | Callable | `functions/src/testAiEnrichmentTagRerank.ts` |
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

## Optional tag reranker (second call)

An optional, text-only second Gemini call (`catalogTagRerankProvider.ts`, prompt version
`catalog-tag-rerank-v1`) can run after `catalogTagResolver.ts` builds the initial tag set. It
never receives the image and never receives the full approved tag database — only the first
call's JSON response, the pre-rerank resolved category name, and a compact `approvedTagCandidates`
shortlist (matched approved tags plus nearby matches for unmatched raw candidates, capped ~30
entries, built by an extension to `resolveAiCatalogTags`).

- Controlled by owner/admin setting `tagRerankMode: "off" | "auto" | "always"`, persisted on
  `settings/aiEnrichment` via `updateAiEnrichmentSettings`. **Shipped default: `off`.**
- `auto` triggers per-design on cheap heuristics computed from the resolver's own output:
  `unmatchedCandidateCount >= 3`, fewer than 5 of 8 tag slots filled, or 2+ `suggestedNewTags`
  generated (`shouldRunTagRerank` in `aiEnrichmentPipeline.ts`).
- `always` runs on every design — intended as a temporary comparison/testing mode, not a standing
  production setting.
- Server-side validation is authoritative: reranker output outside `approvedTagCandidates` is
  discarded individually (a mix of valid/invalid tags is not a whole-response failure); any
  failure (network, invalid JSON, empty output, all-invalid tags) falls back to the pre-rerank
  server-ranked tags. The reranker can never invent a persisted final tag and never overrides
  category resolution. Its `uncoveredConcepts` output only ever feeds the existing
  `suggestedNewTags` generation path — never a direct persisted tag.
- Because category resolution uses matched tags as a scoring signal, a design that triggers the
  reranker gets `resolveThemeCategory` called twice (best-effort pre-rerank, final post-rerank) —
  both calls are free/deterministic. A design that does not trigger the reranker (including the
  default `off` mode) gets exactly one category resolution call, unchanged from before.
- `aiSuggestions` gains optional fields: `tagRerankStatus` (`"skipped" | "succeeded" | "failed"`),
  `tagRerankFailureReason`, `tagRerankPromptTokens`/`tagRerankCompletionTokens`/
  `tagRerankEstimatedCostUsd`, `tagRerankPromptVersion`, `tagRerankUncoveredConcepts`.
- Settings AI Playground has a matching "Run tag rerank" button (new callable
  `testAiEnrichmentTagRerank`, same owner/admin gate as `testAiEnrichmentPlayground`) so staff can
  test the reranker against real designs and compare cost/quality before enabling `auto` in
  production. Does not write to `designs` or persist the uploaded image.

See ADR-FP-042 for full rationale.

## Suggested tags as a last resort + AI-authored suggestion quality

`suggestedNewTags` generation is gated behind a server-side "last-resort" check
(`isSuggestedTagsLastResort` in `catalogTagResolver.ts`), evaluated before the pre-existing
remaining-room cap: suggestions are only generated when approved-tag coverage is genuinely thin.

- Eligible when 0-2 approved tags matched, or exactly 3 matched but all three were weak
  (per-token-fallback-only match, never exact name/alias) **and** at least 2 raw candidates went
  fully unmatched. Never eligible with 3 matches that include a strong match, and never eligible
  with 4+ approved matches at all — regardless of match quality or remaining room under the 8-tag
  cap. A design with 5+ solid approved tags ships with exactly those tags, not padded to 8.
- `resolveAiCatalogTags` tracks match strength per approved tag (upgrades weak → strong if a later
  candidate confirms it, never downgrades) and returns `allMatchesAreWeak` alongside the existing
  `unmatchedCandidateCount`.

When the gate fires, an optional text-only second call — the "suggestion author"
(`catalogSuggestedTagAuthorProvider.ts`, prompt version `catalog-suggested-tag-author-v1`) —
authors a real `preferredWhen` sentence and 1-3 real aliases per candidate, matching the
specificity of hand-written approved tags, replacing the previous generic template. The model may
omit a candidate entirely to decline suggesting it.

- Controlled by owner/admin setting `suggestionAuthorMode: "off" | "auto" | "always"`, persisted on
  `settings/aiEnrichment`, **independent from `tagRerankMode`**. Shipped default: `off`. `auto` and
  `always` behave identically — there is no separate trigger beyond the last-resort gate itself.
- When both `tagRerankMode` and `suggestionAuthorMode` are enabled and both triggers fire for the
  same design, the two jobs **share one physical Gemini call** (the reranker prompt already carries
  the context the author needs) instead of making two requests. When the reranker is off or not
  triggered, the suggestion author runs as its own standalone call, so suggestion quality never
  depends on the reranker setting.
- Up to 4 real approved tags are sent as calibration examples (name + up to 3 aliases +
  `preferredWhen` only, never the full tag database), selected deterministically — never randomly —
  by relevance to the current design first, then tag quality (2+ aliases, non-generic
  `preferredWhen`), with alphabetical tie-breaking.
- Server-side validation (`validateAuthoredSuggestions`) rejects any authored name outside the
  original candidate list, caps aliases at 5 and `preferredWhen` at 300 characters. On any failure
  (network error, invalid JSON, or the call disabled), suggestions still generate via the
  pre-existing server-templated fallback — never silently dropped once the gate decided they're
  needed.
- `aiSuggestions` gains optional fields: `suggestionAuthorStatus` (`"skipped" | "succeeded" |
  "failed"`), `suggestionAuthorFailureReason`, `suggestionAuthorPromptTokens`/
  `suggestionAuthorCompletionTokens`/`suggestionAuthorEstimatedCostUsd`,
  `suggestionAuthorPromptVersion`. When the merged call path runs, combined cost/tokens are
  recorded on both `tagRerank*` and `suggestionAuthor*` fields for display purposes (not a
  per-call billing split).
- Playground support is deferred to a fast-follow phase — this phase is backend/pipeline only,
  verified with unit tests plus a manual AI Review smoke test.

See ADR-FP-043 for full rationale.

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

Settings AI playground (owner/admin): `/settings` → calls `testAiEnrichmentPlayground` for one-off text + image tests, plus `testAiEnrichmentTagRerank` to test the optional tag reranker against a prior playground result. Playground requests do not write to `designs`, do not persist uploaded images, and fail safely if the Gemini secret is missing.

## Key AI modules

| Module | Role |
|--------|------|
| `aiEnrichmentPipeline.ts` | Main orchestrator |
| `simpleCatalogEnrichmentPrompt.ts` | Builds the small v20 vision-only prompt + approved category names |
| `simpleCatalogEnrichmentResponse.ts` | JSON parse + coercion (v20 lean schema) |
| `catalogTagResolver.ts` | Server-side approved tag/alias matching + last-resort-gated `suggestedNewTags` generation + `approvedTagCandidates` shortlist |
| `catalogTagRerankProvider.ts` | Optional text-only tag reranker second call — prompt, request, response validation; can merge in suggestion-authoring |
| `catalogSuggestedTagAuthorProvider.ts` | Optional text-only suggestion-authoring call (standalone path) + calibration example selection + shared validation |
| `catalogThemeCategoryResolver.ts` | Server-side category resolution with buyer-intent priority rules |
| `catalogTitleRules.ts` | Title/description formatting, tag normalization helpers |
| `pipelineTiming.ts` | Latency observability logs |
| `aiEnrichmentRuntimeCache.ts` | Settings/categories/approved tags cache |
| `aiEnrichmentPlayground.ts` | Settings playground validation + request builder + tag rerank playground flow |

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
