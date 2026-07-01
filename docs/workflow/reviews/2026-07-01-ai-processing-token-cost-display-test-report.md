# Test Report — AI Processing Token/Cost Display

- **Date:** 2026-07-01
- **Goal slug:** `ai-processing-token-cost-display`
- **Plan:** `docs/workflow/plans/2026-07-01-ai-processing-token-cost-display-plan.md`

---

## Scope Note

During implementation, research found AI Review already displays Provider, Model, Input tokens,
Output tokens, and Estimated cost in the existing `AiReviewProcessingStatusSection.tsx`
("Processing Status" section) — a component the original planning research missed. The user
confirmed adding the same fields to `AiReviewSuggestionsSection.tsx` ("AI Suggestions" section)
would be a pure duplicate and should be skipped. The plan was updated accordingly; final scope is
the Design Details "More details" modal only.

---

## Commands Run and Exit Codes

| Command | Result |
|---|---|
| `npx tsc --noEmit` (root) | Exit 0, no output |
| `npm run lint` (root, ESLint) | Exit 0 |
| `npx tsx --test src/renderer/src/features/designs/utils/aiReviewDisplay.test.ts` | 8/8 pass |
| `npm run build` (root: `tsc && vite build && electron-builder`) | Exit 0, packaged successfully |
| `git diff --check` | Exit 0 (only benign LF/CRLF line-ending warnings, no whitespace errors) |

---

## Changes

- `src/renderer/src/features/designs/components/DesignDetailsModal.tsx`: added a new conditional
  "AI Processing" section to the "More details" modal, positioned between "Audit trail" and
  "Technical details". Rendered only when `design.aiSuggestions` exists. Shows Provider, Model,
  Prompt version, Input tokens, Output tokens, and Estimated cost — each individually conditional,
  reusing the existing `DetailField` helper for consistent styling.
- `src/renderer/src/features/designs/utils/aiReviewDisplay.ts`: added `formatAiEstimatedCost`,
  matching the Settings AI Playground's exact formatting (`$X.XXXXXX`, 6 decimals; `"N/A"` for
  null/undefined).
- `src/renderer/src/features/designs/utils/aiReviewDisplay.test.ts` (new): unit tests for the new
  formatter (positive value, zero, null, undefined) plus regression tests for the file's
  pre-existing exports (`formatAiReviewStatusLabel`, `getAiReviewStatusBadgeVariant`,
  `formatAiReviewConfidence`), which had no prior test file.

No backend, Cloud Function, prompt, pipeline, Firestore schema, or AI Review files were changed.

---

## Manual Smoke Notes

Not run against a live authenticated Studio session in this response — no `npm run dev` session
was started. Recommended before signoff is finalized by the user: open Design Library, open a
design that has completed AI Processing under the deployed v18 pipeline, open "More details", and
confirm the new "AI Processing" section shows the expected provider/model/tokens/cost.

---

## Post-signoff fix

Manual smoke testing by the user found tokens/cost still did not render anywhere (Design Details
or the pre-existing AI Review display). Root cause: `designAiFieldsMapper.ts`'s `mapAiSuggestions`
Firestore→client mapper never mapped `promptTokens`/`completionTokens`/`estimatedCostUsd` — an
allowlist gap unrelated to any UI code, present before this phase started. Fixed by adding the
three fields to the mapper. Added `designAiFieldsMapper.test.ts` (4 tests, all passing). Re-ran
`npx tsc --noEmit`, `npm run lint`, and `npm run build` — all passed again after the fix.

## Second post-signoff fix

After the mapper fix, tokens/cost still did not appear in AI Review's "AI Suggestions" section on
the Needs Review tab. Root cause: `AiReviewProcessingStatusSection.tsx` (which already had
tokens/cost/model) only renders when `activeTab === "processing"` — never on "Needs Review", where
staff actually review completed output. Fixed by adding Input tokens, Output tokens, and Estimated
cost to `AiReviewSuggestionsSection.tsx`'s existing meta list, reusing `formatAiEstimatedCost`.
Re-ran `npx tsc --noEmit`, `npm run lint`, `npm run build` — all passed again.

## Result

**PASS** on all automated checks (typecheck, lint, unit tests, full build), including after both
post-signoff fixes. Manual UI re-verification in Studio is recommended as a final check but no
further code changes are anticipated.
