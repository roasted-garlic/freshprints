# Signoff — AI Tag Alias Reconciliation

- **Date:** 2026-07-01
- **Goal slug:** `ai-tag-alias-reconciliation`
- **Status:** PASS (local) — Firebase Functions deploy remains a human checkpoint
- **Plan:** `docs/workflow/plans/2026-07-01-ai-tag-alias-reconciliation-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-01-ai-tag-alias-reconciliation-test-report.md`

## What changed

`functions/src/ai/catalogTagResolver.ts` only. Three additions:

1. **`normalizeForAliasMatch`** — extends tag normalization with hyphens→spaces, `&`→`and`,
   apostrophes removed. Produces a punctuation-tolerant phrase for alias matching.

2. **`aliasLookup`** (second map in `buildApprovedTagLookup`) — built with `normalizeForAliasMatch`
   across all approved tag names and aliases, including multiword aliases previously excluded from
   the single-word `lookup`. Used for candidate matching and suggestion-coverage checks.

3. **`findAliasMatchInContext` + context check in `resolveAiCatalogTags`** — when a suggested new
   tag's name and aliases don't hit either lookup, the suggestion's `preferredWhen` and `reason`
   fields are n-gram scanned (up to 4-word phrases) against `aliasLookup`. A match resolves to
   the approved tag name and drops the suggestion. Context check is intentionally narrow: only the
   suggestion's own statement of purpose — not the full description or title — to avoid false
   positives from incidental word occurrences.

No hardcoding, no data migration, no prompt change, no other files changed.

## Acceptance criteria

- [x] `rock-and-roll` / `rock & roll` / `rock 'n' roll` candidates resolve to approved `music` via alias — tested.
- [x] Suggested `rock` with rock-and-roll `preferredWhen` → resolves to `music`, dropped — tested.
- [x] Suggested `rock` with stone/geology context → NOT mapped to `music` — tested.
- [x] Genuinely new tags preserved — tested.
- [x] Existing exact-name / alias candidate resolution unchanged — regression test passes.
- [x] All 7 new tests + 140 pre-existing tests pass (147 total, 0 fail).
- [x] Functions typecheck, build, root typecheck, lint — all clean.
- [x] No hardcoded `rock → music` mapping.
- [x] Single-word rule for approved tag names unchanged.

## Deploy / human checkpoint

No Firebase deploy, Functions deploy, Firestore rules change, secret change, seed write, or
environment change was performed. Firebase Functions deploy + authenticated smoke remain pending
human approval. The fix takes effect in production only after that deploy.

## Follow-up data note (not a code task)

For the motherhood-skeleton manual QA to pass, the approved `music` tag must have a rock-and-roll
alias (e.g. `rock and roll`) in the live Firestore tag library. This is a **data** decision for
the owner — the code will resolve correctly as soon as the alias exists.
