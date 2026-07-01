# Test Report — AI Processing / Playground Enrichment Parity

- **Date:** 2026-07-01
- **Goal slug:** `ai-processing-playground-parity`
- **Plan:** `docs/workflow/plans/2026-07-01-ai-processing-playground-parity-plan.md`

## Commands run and results

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `cd functions && npx tsx --test src/ai/simpleCatalogEnrichmentResponse.test.ts src/ai/catalogTitleRules.test.ts src/ai/catalogTagResolver.test.ts src/ai/promptParity.test.ts` | 0 | **70 pass / 0 fail** — includes all new parity/title/category/description/tag tests |
| 2 | `cd functions && npx tsx --test src/ai/*.test.ts src/ai/providers/*.test.ts` | 1 | **137 pass / 2 fail** — the 2 failures are pre-existing and unrelated (see note) |
| 3 | `cd functions && npx tsc --noEmit` | 0 | Functions typecheck clean |
| 4 | `cd functions && npm run build` | 0 | Functions build clean |
| 5 | `npx tsc --noEmit` (root) | 0 | Root typecheck clean |
| 6 | `npm run lint` (root) | 0 | ESLint clean, 0 warnings |
| 7 | `npm run build` (root) | 0 | Vite + Electron packaging clean |
| 8 | `git diff --check` | 0 | No whitespace errors (CRLF info warnings only) |

## New / updated tests (all passing)

- **Prompt parity** (`promptParity.test.ts`, new): identical system + user prompts across both
  paths for identical settings/categories/tags/exclusions; placeholders fully replaced.
- **Title preservation** (`simpleCatalogEnrichmentResponse.test.ts`): `Motherhood Skeleton Rock On`
  survives a description that leads with the transcribed quote — no OCR-fragment rewrite.
- **Category no-flip** (`simpleCatalogEnrichmentResponse.test.ts` + `resolveLeanCatalogCategory`
  block): `Family` candidate stays `Family` with `Family` + `Pop Culture & Characters` both allowed.
- **Description preservation**: full `SOME DAYS I ROCK IT ... EITHER WAY WE'RE ROCKIN'` + `MOTHERHOOD`
  retained.
- **Lean title fallbacks** (`catalogTitleRules.test.ts`): trust-verbatim, tags fallback (not
  description), filename rejection, generic fallback.
- **Tag reuse** (`catalogTagResolver.test.ts`): `rock` maps to approved `rock-n-roll` via alias and
  emits no `suggestedNewTags: rock`.

## Pre-existing unrelated failure (documented, out of scope)

`src/ai/providers/resolveAiEnrichmentProvider.test.ts` — 2 tests fail with
`'google' !== 'openai'` (default-provider expectation vs working-tree config). **Verified
independent of this phase:** reverting both changed source files (`catalogTitleRules.ts`,
`simpleCatalogEnrichmentResponse.ts`) to HEAD leaves these 2 tests still failing. They stem from
earlier uncommitted changes to `aiEnrichmentConfig.ts` / `providers/resolveAiEnrichmentProvider.ts`
and are unrelated to enrichment post-processing. Not touched.

## Manual QA (documented, not executed — requires deployed Functions + OpenAI secret)

Run Settings AI Playground and AI Review → Re-run AI on the same motherhood-skeleton design with the
same prompt/model/reasoning. Compare provider, model, reasoning effort, prompt version, raw output,
and final displayed AI Suggestions. Expect:
- Title ≈ `Motherhood Skeleton Rock On`.
- Description contains all readable text (`SOME DAYS I ROCK IT ... EITHER WAY WE'RE ROCKIN'` + `MOTHERHOOD`).
- Category = `Family`.
- No new `rock` tag when an approved tag/alias covers it.
