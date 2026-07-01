# Signoff — AI Processing Token/Cost Display

- **Date:** 2026-07-01
- **Goal slug:** `ai-processing-token-cost-display`
- **Status:** PASS
- **Plan:** `docs/workflow/plans/2026-07-01-ai-processing-token-cost-display-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-01-ai-processing-token-cost-display-test-report.md`

## What changed

- Added a new "AI Processing" section to the Design Details "More details" modal
  (`DesignDetailsModal.tsx`), shown only when a design has `aiSuggestions`. Displays Provider,
  Model, Prompt version, Input tokens, Output tokens, and Estimated cost.
- Added `formatAiEstimatedCost` to `features/designs/utils/aiReviewDisplay.ts`, matching the
  Settings AI Playground's existing `$X.XXXXXX` cost formatting.
- Added `aiReviewDisplay.test.ts` covering the new formatter plus the file's previously-untested
  existing exports.

## Scope correction

AI Review was originally in scope but dropped after discovering `AiReviewProcessingStatusSection.tsx`
already displays Provider/Model/Input tokens/Output tokens/Estimated cost in its "Processing
Status" section. User confirmed skipping the duplicate addition to "AI Suggestions".

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npx tsx --test src/renderer/src/features/designs/utils/aiReviewDisplay.test.ts` — 8/8 passed.
- `npm run build` (incl. Vite + Electron packaging) passed.
- `git diff --check` passed (only benign LF/CRLF warnings).

## Scope boundaries

No backend, Cloud Function, prompt, pipeline, Firestore schema, or AI Review changes. No new
permission gating. No deploy required (renderer-only change).

## Post-signoff fix (2026-07-01)

User performed the recommended manual smoke test and reported tokens/cost were still not visible
anywhere (neither the new Design Details section nor the pre-existing AI Review "Processing
Status" section). Root cause: `src/renderer/src/features/designs/utils/designAiFieldsMapper.ts`'s
`mapAiSuggestions` is a Firestore→client field-by-field allowlist mapper that never included
`promptTokens`, `completionTokens`, or `estimatedCostUsd` — these fields existed correctly in
Firestore (per the earlier `ai-lean-vision-prompt-server-taxonomy-resolution` phase) but were
silently stripped before ever reaching `design.aiSuggestions` on the client, so no UI change alone
could have surfaced them. Fixed by adding the three fields to the mapper's return object (numeric
type guard, default `null`). Added `designAiFieldsMapper.test.ts` (4 new tests) covering mapped
values, missing values, non-numeric values, and absent `aiSuggestions`. Root typecheck, root lint,
and full build re-verified clean after the fix.

## Second post-signoff fix (2026-07-01)

After the mapper fix, user reported tokens/cost still did not appear on the AI Review "Needs
Review" tab under "AI Suggestions". Root cause: `AiReviewProcessingStatusSection.tsx` (which
already displayed tokens/cost/model) only renders when `activeTab === "processing"`
(`AiReviewWorkspace.tsx`) — it never mounts on the "Needs Review" tab, which is where staff
actually review completed AI output. The original "already covered, skip AI Review" scope
correction was therefore incomplete: coverage existed only on the Processing tab, not on Needs
Review. Fixed by adding Input tokens, Output tokens, and Estimated cost to
`AiReviewSuggestionsSection.tsx`'s existing `ai-review-suggestions-meta` list (same section
visible in the user's screenshot showing Provider/Model/Prompt version/Generated), reusing
`formatAiEstimatedCost` from `features/designs/utils/aiReviewDisplay.ts`. Root typecheck, root
lint, and full build re-verified clean.

## Styling pass (2026-07-01)

User confirmed the data now displays correctly and asked for layout polish: the meta `<dl>` grids
had a fixed 2-column layout that produced an orphaned/asymmetric last row once more optional fields
were added. Combined Input tokens and Output tokens into a single "Input / Output tokens" field
(e.g. "607 / 189") across all three display locations (`AiReviewSuggestionsSection.tsx`,
`AiReviewProcessingStatusSection.tsx`, `DesignDetailsModal.tsx`), reducing the field count and
avoiding a lone unpaired token cell. User then requested a 3-column ("2 rows of 3") layout instead
of 2 columns, specifically so longer labels like "Prompt version" have enough width and don't wrap
awkwardly. Updated `.ai-review-suggestions-meta` (ai-review.css) and added a new
`.design-details-columns--ai` modifier (design-library.css, scoped to the new AI Processing section
only, not the pre-existing Audit trail grid) to `grid-template-columns: repeat(3, minmax(0, 1fr))`
with a single-column mobile breakpoint at 640px matching existing repo convention. Root typecheck,
root lint, and full build re-verified clean after each change.

## Outstanding

None. All fixes and styling adjustments are in place. A final visual re-check in Studio is
recommended to confirm the 3-column layout and combined token field look correct, but no further
code changes are anticipated.

## Next recommended step

Authenticated smoke-test the deployed v18 AI pipeline end to end (re-run AI on a design, confirm
`promptVersion: catalog-enrich-openai-v18`, then open that design's Design Details "More details"
to see the new AI Processing section populated), or start the next approved managed phase.
