# Plan — Tag Rerank Prompt Editor (Settings + Playground)

- **Date:** 2026-07-03
- **Mode:** Managed Phase
- **Goal slug:** `tag-rerank-prompt-editor`
- **Roadmap phase:** Phase 5 AI Processing maintenance
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a separate human checkpoint after approval
  and testing. No deploy is performed in this phase.

---

## 1. Goal

The tag reranker (second AI call, `catalogTagRerankProvider.ts`) currently uses a hardcoded prompt
with no owner-editable override, unlike the first-pass AI Processing prompt which already has a
Settings editor and a "Use current default" action. Add the same editing capability for the
reranker prompt:

- An owner-only editor in Settings for the live reranker prompt used by AI Processing.
- A separate, non-persisted editor for the reranker prompt used in the Playground, so staff can
  experiment with reranker wording against sample first-pass output without touching production
  behavior.

This follows directly from the 2026-07-03 investigation into the "ghostrider"/"motherhood"
mis-tagging incident, where a fix already landed for the shortlist-building bug
(`MIN_NEARBY_MATCH_TOKEN_LENGTH` in `catalogTagResolver.ts`) and a prompt-wording tightening already
landed in the hardcoded reranker prompt. This phase makes that prompt owner-editable going forward,
the same way the first-pass prompt already is.

---

## 2. Scope

### In scope

- Add a `tagRerankPromptTemplate` field to AI enrichment settings (Firestore
  `settings/aiEnrichment`), with required placeholders enforced the same way the existing
  `promptTemplate` field enforces `{{excluded_tags}}` / `{{approved_category_names}}`.
- Add a default reranker prompt constant (the current hardcoded text in
  `catalogTagRerankProvider.ts`, promoted to `shared/constants/aiEnrichment.constants.ts` alongside
  the existing default prompt).
- Wire `callTagRerank` / `buildCatalogTagRerankUserPrompt` to accept an optional custom template,
  falling back to the shared default — same pattern as `buildSimpleCatalogEnrichmentUserPrompt`.
- Add a Settings editor modal for the reranker prompt (mirrors the existing AI Processing prompt
  editor: draft state, "Use current default" action, required-placeholder validation, save via the
  existing Save AI enrichment settings button — no separate save action).
- Add a Playground-only reranker prompt editor: local component state only, not persisted to
  Firestore, feeds the existing tag-rerank playground call
  (`aiEnrichmentTagRerankPlaygroundService` / `testAiEnrichmentTagRerank`).
- Extend the tag-rerank playground callable (`testAiEnrichmentTagRerank.ts`) to accept an optional
  prompt override, validated server-side the same way.
- Tests covering: default fallback, custom template substitution, required-placeholder validation,
  and the playground override path.

### Out of scope

- No change to the shortlist-building logic in `catalogTagResolver.ts` (already fixed separately).
- No change to the suggestion-authoring merged-prompt section
  (`buildSuggestedTagAuthorInstructions`) beyond passing through whatever template substitution this
  phase adds.
- No Firebase Functions deploy.
- No automatic migration of existing settings documents — a missing `tagRerankPromptTemplate` field
  simply resolves to the default, same as the first-pass prompt's stale/missing handling.
- No change to `tagRerankMode` (off/auto/always) selection UI.

---

## 3. Design

Mirror the existing first-pass prompt architecture as closely as possible so the two editors behave
consistently for owners:

```txt
shared/constants/aiEnrichment.constants.ts
  DEFAULT_TAG_RERANK_PROMPT_TEMPLATE          (new, current hardcoded text)
  AI_ENRICHMENT_TAG_RERANK_REQUIRED_PLACEHOLDERS  (new — likely none required, since the rerank
                                                    prompt currently has no {{...}} substitution
                                                    points; confirm during implementation whether
                                                    any placeholder is worth exposing, e.g.
                                                    {{approved_tag_candidates}} is already
                                                    server-injected structurally, not templated)
  resolveTagRerankPromptTemplate(raw)          (new — same missing/invalid/stale fallback pattern)
```

Settings data shape addition:

```txt
settings/aiEnrichment.tagRerankPromptTemplate?: string
```

`catalogTagRerankProvider.buildCatalogTagRerankUserPrompt` takes an optional `promptTemplate`
parameter; when absent, uses `DEFAULT_TAG_RERANK_PROMPT_TEMPLATE`. The instructional text stays a
template string with the same structural sections (task, rules, response shape) so an owner can
tighten wording (e.g. the weak-nearby-match guidance added earlier) without code changes.

Settings UI: a second "AI Processing prompt" style modal, reusing the same modal shell/component
patterns already in `SettingsPage.tsx` (draft state, `Use current default`, Done/Close button
labeled the same clarified way as the fix just applied to the first-pass editor).

Playground UI: a lightweight, non-persisted textarea near the existing tag-rerank playground
trigger, defaulting to whatever the live default/custom prompt is, clearly labeled as a one-off test
override that does not save.

---

## 4. Expected Files

| File | Change |
|---|---|
| `shared/constants/aiEnrichment.constants.ts` | Add `DEFAULT_TAG_RERANK_PROMPT_TEMPLATE` and resolver helper. |
| `functions/src/ai/catalogTagRerankProvider.ts` | Accept optional custom prompt template; fall back to default. |
| `functions/src/ai/loadAiEnrichmentSettings.ts` | Load/resolve `tagRerankPromptTemplate` from settings. |
| `functions/src/updateAiEnrichmentSettings.ts` | Persist `tagRerankPromptTemplate` with validation. |
| `functions/src/testAiEnrichmentTagRerank.ts` | Accept optional prompt override for playground use. |
| `src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.ts` | Re-export new constant/helper. |
| `src/renderer/src/features/settings/pages/SettingsPage.tsx` | Add reranker prompt editor modal + trigger. |
| `src/renderer/src/features/settings/hooks/useAiEnrichmentTagRerankPlayground.ts` | Accept prompt override param. |
| `src/renderer/src/features/settings/services/aiEnrichmentTagRerankPlaygroundService.ts` | Pass prompt override through to the callable. |
| `shared/types/ai/aiEnrichmentPlayground.types.ts` | Add optional prompt override field to request type. |
| Corresponding `*.test.ts` files for each above | New/updated coverage. |
| `.cursor/workflow/state.md` | Track this managed phase. |

---

## 5. Acceptance Criteria

- [ ] Owners can view and edit the live reranker prompt in Settings, same gating as the first-pass
      prompt editor (owner-only, save via the existing Save button).
- [ ] "Use current default" restores the shipped reranker prompt text in the editor draft.
- [ ] A saved custom reranker prompt is used by `callTagRerank` in production AI Processing.
- [ ] Missing/invalid saved reranker prompt falls back to the shipped default without error.
- [ ] Playground has its own reranker prompt override, clearly labeled as not persisted.
- [ ] Playground override does not affect the saved Settings value or production AI Processing.
- [ ] Existing reranker behavior (tag validation against `approvedTagCandidates`, uncoveredConcepts,
      merged suggestion-authoring) is unchanged when using the default prompt.
- [ ] Focused tests pass for both the Functions and renderer paths.
- [ ] Root typecheck, lint, and `git diff --check` pass.

---

## 6. Testing Plan

- `npx tsx --test functions/src/ai/catalogTagRerankProvider.test.ts`
- `npx tsx --test functions/src/ai/loadAiEnrichmentSettings.test.ts`
- `npx tsx --test functions/src/testAiEnrichmentTagRerank.test.ts`
- `npx tsx --test src/renderer/src/features/settings/constants/aiEnrichmentSettingsConstants.test.ts`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`

Manual verification after approval (no deploy required for this — can be exercised against the
Firebase emulator if available, otherwise deferred to the post-deploy human checkpoint):
open Settings as an owner, edit the reranker prompt, save, confirm it persists on reload; open the
Playground reranker override, confirm it does not alter the saved Settings value.

---

## 7. Risks

- Two editable prompts (first-pass + reranker) increases the chance an owner edits one and forgets
  the other exists, especially since they are both entry points for tag-quality tuning. Mitigate
  with distinct, clear modal titles and hint text (matching the existing "This prompt is used by AI
  Processing only" pattern).
- If the reranker prompt template gains user-editable placeholder sections, a malformed edit could
  degrade tag-rerank quality silently (no crash, just worse output) — same class of risk already
  accepted for the first-pass prompt, mitigated by required-placeholder validation and the "Use
  current default" escape hatch.

---

## 8. Review Decision Needed

Approve this plan to implement the reranker prompt editor in both Settings (persisted, live) and
Playground (non-persisted, test-only), following the same pattern as the existing first-pass AI
Processing prompt editor.
