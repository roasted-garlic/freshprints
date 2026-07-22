# Plan: AI title multi-segment completeness follow-up

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (follow-up within `ai-text-title-completeness`) |
| Related | docs/workflow/plans/2026-07-21-ai-text-title-completeness-plan.md; ADR-FP-113 |
| Goal id | `ai-text-title-completeness` (same goal — owner FAIL / remaining Sarcasm cases) |

---

## Goal

Close the remaining text-dominant title gap: when the description correctly captures multiple visible lines (e.g. `"Sarcasm"` … `"Just one of my many talents"`), the persisted title must be the full phrase in reading order — not only the dominant headline word.

## Background

ADR-FP-113 (`catalog-enrich-v25`) fixed apostrophe collapse and added `isIncompleteTitleVsDescription`, but wording extraction still uses **only the first** double-quoted phrase. Real Gemini descriptions often narrate multi-line text as separate quotes:

> Large text reads "Sarcasm". Below it, in smaller lettering, it says "Just one of my many talents."

Then:
- extracted wording = `Sarcasm`
- title = `Sarcasm`
- completeness check sees equal strings → **no fallback**

This is a post-model code gap, not a new product feature. Continues the open `ai-text-title-completeness` goal (manual checkpoint was open; treat owner report of remaining Sarcasm failures as FAIL WITH NOTES → implement follow-up). No Assisted Creation work is interrupted.

Note: lean prompt target remains **`catalog-enrich-v25`** (intake “v21” is outdated).

## Scope

### In Scope
- Enhance description → readable-wording extraction to join **multiple** slogan-like quoted segments (and slash-joined first-sentence transcriptions when needed)
- Keep / tighten completeness detection so title matching only the first segment triggers fallback
- Minimal prompt clarification if needed (prefer code fix; avoid bloat)
- Regression tests for Sarcasm-style multi-quote descriptions + existing apostrophe/one-word fixtures
- Update plan/review/test artifacts + ADR amendment note

### Out of Scope
- Providers, OCR, category/tag rerank, UI, production deploy, new packages
- Blindly replacing all titles from full description prose
- Changing `aiSuggestions` contract

## Affected Areas

### Files
- `functions/src/ai/catalogTitleRules.ts`
- `functions/src/ai/catalogTitleRules.test.ts`
- Optionally `simpleCatalogEnrichmentResponse.test.ts` if end-to-end case helpful
- `docs/project/DECISIONS.md` (short amendment to ADR-FP-113)
- Workflow review/test report updates

### Impacts
- Architecture / security / data model: none
- Backend: lean title resolve only
- Migration: none (reprocess to refresh titles)

## Approach

1. Add `extractQuotedReadablePhrases(description)` collecting all straight (then curly) double-quoted spans.
2. Filter out non-slogan quotes (banned style/meta single tokens like `bold`, generic tokens).
3. If ≥1 kept phrase: `normalizeCatalogTitle(phrases.join(" "), maxWords)` — this becomes primary wording.
4. Else keep first-sentence path (already handles `Line1 / Line2` when in sentence 1).
5. Completeness logic unchanged in spirit: if title is a proper prefix of the **joined** wording with ≥2 remaining words (or single-token prefix of multiword wording), treat incomplete and fall back.
6. Prompt: only if needed, one bullet that multi-line text may appear as separate quoted lines in the description but the title must still join them — prefer skipping if code covers it.
7. Do **not** bump prompt version unless the default prompt text changes.

## Preserve
- One-word designs with a single quoted word (`"Faith"`) stay one word
- Motherhood-style mixed titles that are not prefixes of description wording stay trusted
- Decorative nouns not appended by this path

## Test Strategy

| Check | Command | Required |
|-------|---------|----------|
| Title/AI unit tests | `npx tsx --test` on `functions/src/ai/*.test.ts` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Diff check | `git diff --check` on touched files | yes |

Manual: same Sarcasm reprocess checklist after soft-deploy.

## Human Checkpoints
- Manual AI Review reprocess after `fresh-prints-dev` Functions deploy

## Risks

| Risk | Mitigation |
|------|------------|
| Joining unrelated quotes | Filter style/generic single-token quotes; only join slogan-like phrases |
| Over-expanding one-word titles | Single quote + matching title → no incompleteness |

## Rollback
Revert extractor/completeness changes; redeploy Functions.

## Open Questions
- [x] None — true one-word vs incomplete distinguished by number of slogan-like quoted segments / wording length.

## Approval
- Verdict: pending
