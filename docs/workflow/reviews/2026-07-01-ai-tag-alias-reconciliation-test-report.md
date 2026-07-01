# Test Report — AI Tag Alias Reconciliation

- **Date:** 2026-07-01
- **Goal slug:** `ai-tag-alias-reconciliation`
- **Plan:** `docs/workflow/plans/2026-07-01-ai-tag-alias-reconciliation-plan.md`

## Commands run and results

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `cd functions && npx tsx --test src/ai/catalogTagResolver.test.ts` | 0 | **18 pass / 0 fail** — includes all 7 new alias/context tests |
| 2 | `cd functions && npx tsx --test src/ai/*.test.ts src/ai/providers/*.test.ts` | 0 | **147 pass / 0 fail** |
| 3 | `cd functions && npx tsc --noEmit` | 0 | Functions typecheck clean |
| 4 | `cd functions && npm run build` | 0 | Functions build clean |
| 5 | `npx tsc --noEmit` (root) | 0 | Root typecheck clean |
| 6 | `npm run lint` (root) | 0 | ESLint clean, 0 warnings |

## New tests (all passing)

1. Hyphenated candidate `rock-and-roll` → resolves to approved `music` via alias `rock and roll`.
2. Ampersand candidate `rock & roll` → resolves to approved `music`.
3. Apostrophe candidate `rock 'n' roll` → resolves to approved `music` via alias `rock n roll`.
4. Suggested tag `rock` with `preferredWhen` containing `rock-and-roll` → resolved to `music`, dropped from `suggestedNewTags`.
5. Suggested tag `rock` with stone/geology `preferredWhen` → NOT mapped to `music`; stays in `suggestedNewTags`.
6. Genuinely new tag `wednesday` (no alias match) → preserved in `suggestedNewTags`.
7. Regression: existing exact-name and direct-alias resolution still works.

## Manual QA (documented, not executed — requires deployed Functions + OpenAI/Gemini secret)

1. Confirm approved tag `music` has alias `rock and roll` (or equivalent) in the live tag library.
2. Re-run AI Processing on the motherhood-skeleton design.
3. Confirm `tags` includes `music`.
4. Confirm `suggestedNewTags` does not show `rock`.
5. Confirm title, category (`Family`), and description (all visible text) unchanged.
