# Plan — AI Processing Token/Cost/Model Display

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `ai-processing-token-cost-display`
- **Roadmap phase:** Phase 5 AI Processing maintenance
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** None expected. UI-only display of already-persisted data; no Firebase deploy required.

---

## 1. Goal

Surface AI Processing input tokens, output tokens, and estimated cost (alongside the model already
shown) in the Design Details "More details" modal.

This closes the loop the user asked for before testing the v18 lean-prompt pipeline: being able to
see the actual token/cost impact of the new small prompt per design when reviewing an approved
design's details.

**Scope correction #1 (recorded during implementation):** the plan originally also targeted AI
Review's `AiReviewSuggestionsSection` ("AI Suggestions" section). During implementation it was
discovered that AI Review already displays Provider, Model, Input tokens, Output tokens, and
Estimated cost today, in a *different* section on the same workspace page —
`AiReviewProcessingStatusSection.tsx` ("Processing Status" section). The original research pass
(see §2) missed this file. Based on that finding, the AI Review change was initially dropped from
scope as a duplicate.

**Scope correction #2 (recorded after user smoke-testing, 2026-07-01):** correction #1 was
incomplete. `AiReviewProcessingStatusSection` only renders when `activeTab === "processing"`
(`AiReviewWorkspace.tsx`) — it never mounts on the "Needs Review" tab, which is where staff
actually review completed AI output before approving a design. So AI Review coverage existed only
on the Processing tab, not where it's actually needed. The AI Review change is **restored to
scope**: Input tokens, Output tokens, and Estimated cost were added to
`AiReviewSuggestionsSection.tsx`'s existing meta `<dl>` (the section visible on the Needs Review
tab), alongside the pre-existing Provider/Model/Prompt version/Confidence/Generated fields.

---

## 2. Current State (verified in code)

This is **not new backend work** — the data model and capture already exist end-to-end:

- `shared/types/ai/aiProcessing.types.ts` `DesignAiSuggestions` already has `provider`, `model`,
  `promptTokens`, `completionTokens`, `estimatedCostUsd` (all optional/nullable).
- Both the OpenAI and Gemini paths populate these fields identically — `resolveAiEnrichmentProvider.ts`
  routes both providers through the same `createOpenAiVisionEnrichmentProvider` request/response
  handling in `openAiVisionEnrichmentProvider.ts`, which extracts `usage.promptTokens`/
  `usage.completionTokens` and computes `estimatedCostUsd` via `estimateVisionCostUsd`
  (`shared/constants/aiEnrichment.constants.ts`, `VISION_MODEL_PRICING_USD_PER_1M` table).
- `aiEnrichmentPipeline.ts`'s `markAiSuccess` writes these fields to Firestore via
  `removeUndefinedFields` (which strips `undefined` but preserves `null` and numeric values) — no
  pipeline change needed.
- `Design` (`src/renderer/src/features/designs/types/design.types.ts`) already nests
  `aiSuggestions?: DesignAiSuggestions`, so the renderer already has this data available on any
  loaded design with no additional fetch.
- The **exact display pattern already exists** in the Settings AI Playground result modal
  (`src/renderer/src/features/settings/pages/SettingsPage.tsx:591-634`): a `<dl className="...result-meta">`
  with `<dt>`/`<dd>` pairs for Input tokens, Output tokens, and Estimated cost, using
  `?? "N/A"` for token nulls and `` `$${value.toFixed(6)}` `` for cost formatting.

**What's actually missing** is purely UI: `AiReviewSuggestionsSection.tsx` renders `provider`,
`model`, `promptVersion`, `confidence`, `generatedAt` in its `ai-review-suggestions-meta` `<dl>`
(lines 112-144) but omits tokens/cost; `DesignDetailsModal.tsx`'s "Audit & Technical Details" modal
has no AI section at all.

---

## 3. Scope

### In scope

- `src/renderer/src/features/designs/components/DesignDetailsModal.tsx`: add a new `<section>`
  titled "AI Processing" in the "More details" modal, positioned after "Audit trail" and before
  "Technical details" (chronological/logical grouping: who/when → AI metadata → technical/storage).
  Rendered only when `design.aiSuggestions` is present. Shows: Provider, Model, Prompt version,
  Input tokens, Output tokens, Estimated cost — reusing the existing `DetailField` helper component
  already defined in that file for consistent styling (`design-details-grid` / `design-detail-field`).
- Add or extend a small formatting helper (or inline the same one-line formatters used in
  `SettingsPage.tsx`) so the `$X.XXXXXX` cost format and `?? "N/A"` token fallback are expressed
  identically in both places. If a shared util does not already exist for this, add one small pure
  function (e.g. `formatAiEstimatedCost(value: number | null | undefined): string`) in a shared
  location such as `src/renderer/src/features/settings/utils/` or a small new
  `src/renderer/src/features/ai-review/utils/` (or `features/designs/utils/`) file, and reuse it
  from both components, rather than duplicating the ternary three times.
- Add/update focused unit tests for the new formatting helper and for the two components' rendering
  logic (present vs. absent token/cost data).

### Out of scope

- No backend, Cloud Function, prompt, pipeline, or Firestore schema changes — the data already
  flows end-to-end as described above.
- No new permission gating — tokens/cost render with the same visibility as the rest of the Design
  Details modal (per user decision: shown to everyone who can already see that view, not
  owner/admin-only).
- No changes to the Settings AI Playground itself (it already displays this correctly).
- No changes to `AiReviewProcessingStatusSection.tsx` (Processing tab) — it already displays this
  data correctly; only `AiReviewSuggestionsSection.tsx` (Needs Review tab) needed the addition, per
  scope correction #2.
- No Firebase Functions deploy (no backend changes).
- No historical backfill — designs processed before this UI change will simply show "N/A" for
  tokens/cost if those fields happen to be missing on older records (they should already be
  present for anything processed under the ADR-FP-035+ pipeline, including the just-deployed v18).

---

## 4. Design Detail

### 4.1 DesignDetailsModal.tsx

New section between "Audit trail" and "Technical details" in the more-details modal body:

```tsx
{design.aiSuggestions ? (
  <section aria-labelledby="design-details-ai-title" className="design-details-section">
    <h3 id="design-details-ai-title">AI Processing</h3>
    <dl className="design-details-grid design-details-columns">
      {design.aiSuggestions.provider ? (
        <DetailField label="Provider" value={design.aiSuggestions.provider} />
      ) : null}
      {design.aiSuggestions.model ? (
        <DetailField label="Model" value={design.aiSuggestions.model} />
      ) : null}
      {design.aiSuggestions.promptVersion ? (
        <DetailField label="Prompt version" value={design.aiSuggestions.promptVersion} />
      ) : null}
      {typeof design.aiSuggestions.promptTokens === "number" ? (
        <DetailField label="Input tokens" value={String(design.aiSuggestions.promptTokens)} />
      ) : null}
      {typeof design.aiSuggestions.completionTokens === "number" ? (
        <DetailField label="Output tokens" value={String(design.aiSuggestions.completionTokens)} />
      ) : null}
      {typeof design.aiSuggestions.estimatedCostUsd === "number" ? (
        <DetailField
          label="Estimated cost"
          value={formatAiEstimatedCost(design.aiSuggestions.estimatedCostUsd)}
        />
      ) : null}
    </dl>
  </section>
) : null}
```

### 4.2 Shared formatter

```ts
export function formatAiEstimatedCost(value: number | null | undefined): string {
  return value != null ? `$${value.toFixed(6)}` : "N/A";
}
```

Added to `src/renderer/src/features/designs/utils/aiReviewDisplay.ts`, alongside the existing
`formatAiReviewConfidence`/`formatAiReviewStatusLabel` helpers already used by this feature.

---

## 5. Files Touched

| File | Change |
|---|---|
| `src/renderer/src/features/designs/components/DesignDetailsModal.tsx` | Add new conditional "AI Processing" section to the more-details modal. |
| `src/renderer/src/features/designs/utils/aiReviewDisplay.ts` | Add `formatAiEstimatedCost`. |
| `src/renderer/src/features/designs/utils/aiReviewDisplay.test.ts` (new) | Unit tests for `formatAiEstimatedCost` plus regression coverage for the file's existing exports. |
| `src/renderer/src/features/designs/utils/designAiFieldsMapper.ts` | **Post-signoff fix:** add `promptTokens`/`completionTokens`/`estimatedCostUsd` to the Firestore→client `aiSuggestions` mapper (previously silently stripped these fields). |
| `src/renderer/src/features/designs/utils/designAiFieldsMapper.test.ts` (new) | **Post-signoff fix:** unit tests for the mapper's token/cost handling. |
| `src/renderer/src/features/ai-review/components/AiReviewSuggestionsSection.tsx` | **Post-signoff fix (scope correction #2):** add Input tokens / Output tokens / Estimated cost to the existing meta `<dl>`, since this is the section actually visible on the Needs Review tab. |
| `.cursor/workflow/state.md` | Track phase through signoff. |
| `docs/workflow/reviews/2026-07-01-ai-processing-token-cost-display-test-report.md` | Test report (updated with both post-signoff fixes). |
| `docs/workflow/reviews/2026-07-01-ai-processing-token-cost-display-signoff.md` | Signoff (updated with both post-signoff fixes). |

---

## 6. Acceptance Criteria

- [ ] Design Details "More details" modal shows a new "AI Processing" section with Provider,
      Model, Prompt version, Input tokens, Output tokens, and Estimated cost, only when
      `aiSuggestions` exists on the design.
- [ ] Missing/null token or cost fields render as "N/A" (tokens/cost) or are simply omitted (falsy
      individual fields render nothing, matching the existing `DetailField` conditional pattern),
      never as `undefined`, `null`, or a JS error.
- [ ] Estimated cost is formatted identically to the Settings AI Playground (`$X.XXXXXX`, 6 decimal
      places).
- [ ] AI Review "Needs Review" tab (`AiReviewSuggestionsSection.tsx`) shows Input tokens, Output
      tokens, and Estimated cost alongside the existing Provider/Model/Prompt version fields.
- [ ] AI Review "Processing" tab (`AiReviewProcessingStatusSection.tsx`) continues to show
      tokens/cost as it already did (unchanged, confirmed still correct).
- [ ] Firestore-to-client mapping (`designAiFieldsMapper.ts`) correctly passes through
      `promptTokens`/`completionTokens`/`estimatedCostUsd` (previously silently dropped).
- [ ] No new permission gating — fields are visible to the same audience as the surrounding modal
      or section.
- [ ] No backend, prompt, or pipeline files changed.
- [ ] Root TypeScript typecheck passes.
- [ ] Root lint passes.
- [ ] New/updated unit tests pass.
- [ ] Manual smoke: re-run AI on one design and confirm the "More details" modal shows the new AI
      Processing section with correct provider/model/tokens/cost.

---

## 7. Testing Plan

- `npx tsc --noEmit`
- `npm run lint`
- `npx tsx --test src/renderer/src/features/designs/utils/aiReviewDisplay.test.ts`
- `npm run build` (confirms Vite + Electron packaging still succeeds).
- Manual UI smoke in Studio (`npm run dev`): re-run AI on a design under the deployed v18 pipeline,
  open "More details" in Design Details, confirm the new AI Processing section renders correctly.

---

## 8. Risks

- Low risk: purely additive, conditionally-rendered UI reading fields that already exist on
  `DesignAiSuggestions` and are already flowing through Firestore. No behavior change to any
  existing field, no data model change, no migration.

---

## 9. Future Expansion (not this phase)

- Aggregate cost reporting (e.g. total AI spend per day/week) is a larger analytics feature and is
  explicitly out of scope here — this phase is per-design display only.
