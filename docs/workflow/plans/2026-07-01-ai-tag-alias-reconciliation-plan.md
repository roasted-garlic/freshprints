# Plan — AI Tag Alias Reconciliation

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `ai-tag-alias-reconciliation`
- **Roadmap phase:** Phase 5 maintenance — AI Processing & Catalog Approval
- **Prompt target:** `catalog-enrich-openai-v17` (no prompt change)
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** Firebase Functions deploy remains a human checkpoint (not part of this local phase).

---

## 1. Root cause — exact location

The bug is in `resolveAiCatalogTags` in
[catalogTagResolver.ts:163-179](../../../functions/src/ai/catalogTagResolver.ts#L163-L179).

When checking whether a `suggestedNewTag` is already covered by the approved library, the function
currently does this:

```ts
const suggestionAliases = [normalizedSuggestion.name, ...normalizedSuggestion.aliases];
const approvedMatch = suggestionAliases.some((value) => lookup.has(value));
```

It checks only the suggestion's **own `name` and `aliases` array** against the approved lookup.
It does **not** check:
- The suggestion's `preferredWhen` text
- The suggestion's `reason` text
- The raw model tags (`candidates` input)
- The design's title or description

Meanwhile, the approved lookup is built from approved tag names and aliases using
`normalizeTagCandidate` (trim + lowercase + collapse spaces) — but **no normalization of
punctuation differences**: hyphens, ampersands, apostrophes.

So for the motherhood-skeleton case:
- Model suggests `{name: "rock", preferredWhen: "Use when rock is a primary subject..."}`
- Approved tag `music` has alias `rock and roll`
- `lookup.has("rock")` → **false** (no approved tag named exactly "rock")
- `lookup.has("rock and roll")` is never tried because `suggestion.aliases` is empty
- Suggestion passes through as a new tag

The concept is clearly rock-and-roll music — visible in `preferredWhen`, in the description
(`SOME DAYS I ROCK IT`, `WE'RE ROCKIN'`), and in raw model tags — but the resolver never looks
there.

**Secondary issue:** Even when raw tag candidates include `rock-and-roll` or `rock and roll`,
`normalizeTagCandidate` normalizes `rock-and-roll` to `rock-and-roll` (hyphen kept) while the
approved alias is `rock and roll` (space). So `lookup.has("rock-and-roll")` also fails.

---

## 2. Fix direction — two complementary changes

### 2a. Normalize aliases and candidates consistently (punctuation normalization)

Add a `normalizeForAliasMatch` helper that extends `normalizeTagCandidate` with:
- hyphens → spaces
- ampersands (`&`) → `and`
- apostrophes removed
- multiple spaces collapsed

Build a **second lookup** (`aliasLookup`) using this stronger normalization alongside the existing
`lookup`. All existing exact-match paths stay first; the alias lookup is only an additional fallback.

This fixes: `rock-and-roll` candidate matching approved alias `rock and roll`.

### 2b. Check suggested-tag context against the approved alias lookup

In `resolveAiCatalogTags`, after the existing `name`/`aliases` check fails, also check the
suggestion's `preferredWhen` and `reason` text for phrases that match approved aliases using the
normalized alias lookup.

Strategy (deterministic, no fuzzy search):
- Extract all "word n-grams" up to length 4 from `preferredWhen` + `reason` text using the same
  normalization.
- Check each n-gram against the normalized alias lookup.
- If a match is found: add the matched approved tag name to `approvedResult`, mark the suggestion
  as covered, drop it from `suggestedResult`.

This fixes: `preferredWhen: "Use when rock-and-roll is the theme"` → n-gram `rock and roll` →
matches approved alias → resolves to `music` → suggestion dropped.

**Context check is intentionally narrow:** only `preferredWhen` and `reason` from the suggestion
object itself. We do **not** scan the full description or title here — that would create false
positives (the word "rock" in `SOME DAYS I ROCK IT` is incidental, not a thematic tag match).
The suggestion's own `preferredWhen`/`reason` is the model's explicit statement of the concept
it's trying to tag, making it the right signal.

### 2c. No changes to raw-candidate tag resolution

The raw-candidate path (`candidates: result.analysis.rawTags ?? suggestions.tags`) already
attempts multi-word matching. The punctuation normalization in §2a will fix cases where raw tags
like `rock-and-roll` miss an alias `rock and roll`. No further changes needed to candidate
resolution.

---

## 3. No hardcoding

The fix contains zero hardcoded mappings. `music` is resolved because:
- The approved tag library has alias `rock and roll` on `music` (data, set by the owner)
- The normalization makes `rock-and-roll` / `rock & roll` / `rock n roll` etc. all match that alias

If the alias is removed from the data, the mapping stops. If a future design tags `rock` (stone),
the context check (`preferredWhen`/`reason`) will not contain `rock and roll` language, so it
won't match `music`.

---

## 4. Files to change

| File | Change |
|---|---|
| `functions/src/ai/catalogTagResolver.ts` | Add `normalizeForAliasMatch`; build normalized alias lookup; extend suggestion-coverage check to include `preferredWhen`/`reason` n-gram scan |
| `functions/src/ai/catalogTagResolver.test.ts` | Add/update tests (see §5) |

No changes to: prompt template, pipeline orchestration, description/title/category logic,
Firestore rules, renderer, or any other file.

---

## 5. Tests to add

1. **Punctuation alias normalization** — approved alias `rock and roll`; candidate `rock-and-roll`
   → resolves to `music`.
2. **Ampersand alias normalization** — approved alias `rock & roll` (normalize → `rock and roll`);
   candidate `rock and roll` → resolves to `music`.
3. **Apostrophe alias normalization** — approved alias `rock 'n' roll`; candidate `rock n roll`
   → resolves to `music`.
4. **Suggested-tag context match via preferredWhen** — model suggests `{name: "rock",
   preferredWhen: "Use when rock-and-roll is a primary theme"}`, approved `music` has alias
   `rock and roll` → final tags include `music`, `suggestedNewTags` does not include `rock`.
5. **No bad mapping — stone context** — model suggests `{name: "rock",
   preferredWhen: "Use when a stone or boulder is shown"}`, approved `music` has alias
   `rock and roll` → `music` NOT added, `rock` stays in `suggestedNewTags` (genuinely new concept).
6. **Genuinely new tag preserved** — model suggests `{name: "wednesday",
   preferredWhen: "Use when Wednesday Addams is the subject"}`, no approved alias covers it
   → stays in `suggestedNewTags`.
7. **Existing exact-name/alias matching still works** — regression guard on the current multi-word
   candidate resolution path.

---

## 6. Acceptance criteria

- [ ] Approved tag `music` with alias `rock and roll` → candidate/context `rock-and-roll` resolves
      to `music`.
- [ ] Motherhood-skeleton sample: `suggestedNewTags` does not contain `rock` when `music` alias
      covers it; `tags` includes `music`.
- [ ] Stone/boulder `rock` context does NOT map to `music`.
- [ ] Genuinely new tags are preserved in `suggestedNewTags`.
- [ ] Existing exact-name and alias candidate resolution still works.
- [ ] Single-word rule for approved tag names unchanged.
- [ ] No hardcoded `rock → music` mapping.
- [ ] All new and existing AI tag tests pass.
- [ ] `npm run lint`, `npx tsc --noEmit` (root + functions), functions build pass.

---

## 7. Manual QA (post-deploy, human checkpoint)

1. Confirm approved tag `music` has alias `rock and roll` (or equivalent) in the live tag library.
2. Re-run AI Processing on the motherhood-skeleton design.
3. Confirm `tags` includes `music`.
4. Confirm `suggestedNewTags` does not show `rock`.
5. Confirm title, category (`Family`), and description (all visible text) are unchanged from the
   parity fix.

---

## 8. Out of scope

No prompt change, no hardcoded aliases, no tag library data migration, no lifecycle status change,
no Firebase deploy (human checkpoint), no Phase 7+ work.
