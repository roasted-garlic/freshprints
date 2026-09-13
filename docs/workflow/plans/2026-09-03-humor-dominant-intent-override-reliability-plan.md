# Plan: Humor Dominant-Intent Override Reliability

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (narrow corrective) |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Prior corrective | `category-dominant-intent-calibration` (v33 deployed; canary **FAIL**) |
| Related review | `docs/workflow/reviews/2026-09-03-humor-dominant-intent-override-reliability-review.md` |
| Trigger | `OWNER CATEGORY CANARY: FAIL` — #1 Animals ~9/10 |

---

## Goal

Make humor-primary / joke-product designs resolve to **Funny & Sarcastic** deterministically when the dominant commercial intent is the joke — even when the model’s exact approved category is **Animals**, **Food & Drink**, or another non-humor exact match — using **general** rules and full enrichment evidence available at resolve time.

Protect CASE B: animal-primary art with only incidental/mild humor must remain **Animals**.

Preserve cannabis / zodiac / franchise-pop / Family / Faith / Teacher goldens.

**Do not** unlock WS4, Autonomous, or tag retirement in this corrective.

---

## Background

v33 shipped a thresholded exact-match second-pass. Owner live #1 retests (~10) show **Animals ~9/10**. Automated canary also saw **Food & Drink** once. A single Funny success is not acceptance.

Repo-traced root causes (not guesses):

### RC1 — Humor override is Animals-gated

```455:466:functions/src/ai/catalogThemeCategoryResolver.ts
  const humorHits = countFamilySignalHits(HUMOR_PRIORITY, signalTokenSet);
  if (humorHits >= DOMINANT_OVERRIDE_MIN_SIGNAL_HITS && isAnimalsCategory(exactTokens)) {
    const humorCategory = findBestApprovedCategoryForFamily(
      HUMOR_PRIORITY,
      ...
    );
```

If exact match is **Food & Drink** (or any non-Animals category), humor override **never runs**, even with `funny`/`sarcastic` tags. Explains Food & Drink canary anomaly.

### RC2 — Resolver signals omit Smart Profile dimensions that already carry humor

`buildSignalTokens` only uses: `rawCategory`, `title`, `description`, `visibleText`, `matchedTags`.

It does **not** use enrichment-parse **themes / subjects / objects / interests / searchConcepts**, even though those exist on `result.analysis.smartProfileEnrichmentParse` **before** `resolveThemeCategory` in `aiEnrichmentCandidateCore.ts`.

Live #1 durable profile (Funny success sample) shows themes `humor`, `sarcasm`, `animal humor` and searchConcepts like `funny bird pun` / `animal pun` — but those were **not** resolver inputs.

### RC3 — Threshold ≥2 depends on lexical humor words in title/desc/tags

`HUMOR_PRIORITY.signalTokens` = funny, humor, humorous, joke, jokes, comedy, comedic, sarcastic, sarcasm, snark, witty, attitude.

`tokenize` drops tokens with length ≤ 2. **`F-CAW-F` / `caw` do not match any humor signal.** visibleText alone contributes **0** humor hits.

Unit fixture overfits success:

- description contains “humorous joke”
- matchedTags include `funny`, `sarcastic`, `attitude`

Live Animals-heavy runs typically use neutral copy (“illustrated raven…”) without those words; if tag resolution also omits funny/sarcastic, `humorHits < 2` → exact **Animals** survives.

### RC4 — Exact-match branch always runs second-pass, but second-pass is too narrow

`resolveThemeCategory` does call `resolveExactMatchWithDominantIntentOverride` on every exact match (no early return before competition). Failure is **inside** the override predicates (RC1–RC3), not a missing call.

### Classification

| Letter | Applies? |
|--------|----------|
| A prompt/model variance changing humor signals in title/desc/tags | **YES** (primary stochastic driver) |
| B threshold requiring signals sometimes absent from resolver inputs | **YES** |
| C signal extraction/token matching weakness (`F-CAW-F` unused; themes unused) | **YES** |
| D exact-match trust winning when override predicates false | **YES** (effect) |
| E family ordering | Secondary (cannabis before humor is correct) |
| F different persistence paths | **NO** — same `resolveThemeCategory` path |
| G other | Animals-only gate (RC1) |

---

## Scope

### In Scope

1. Feed enrichment-parse **themes, subjects, objects, interests, searchConcepts** into `ResolveThemeCategoryInput` / `buildSignalTokens` (pipeline wire in `aiEnrichmentCandidateCore.ts`).
2. Replace Animals-only humor override with a **general joke-primary vs incidental-humor** rule that can override **any non-humor exact match** when joke-primary evidence is strong (still blocked by life-role / cannabis-dominant).
3. Keep exact match as default when joke-primary evidence is weak.
4. Expand automated fixtures: Animals exact, Food & Drink exact, Funny exact, weak-humor Animals remain, plus #9/#12/#13/Family/Faith/Teacher goldens.
5. Optional lean prompt nudge (**v34** only if prompt text changes) reinforcing joke-product → Funny and themes/searchConcepts should name humor/joke when joke is primary — **resolver must not depend on model category**.
6. Docs: ADR + TESTING; owner canary = **10 consecutive #1** Funny required.

### Out of Scope

- WS4 / Ready Catalog reprocess
- Autonomous
- Tag / matchedTags retirement; Algolia; Rules; Storage; indexes; migration; production
- Design-ID / title / filename hardcodes
- Broad AI Review reprocess
- Normalizer bump (expected stay v6)
- Schema change (stay v1)

---

## Proposed deterministic general rule

### Joke-primary evidence (must be general)

Compute from expanded signal bag:

1. **`humorLexicalHits`** — count of distinct `HUMOR_PRIORITY` tokens in signals (title, description, visibleText, matchedTags, themes, interests, searchConcepts, subjects/objects phrases).
2. **`jokeStructureEvidence`** (boolean, general — not F-CAW-F-specific), true when ≥1 of:
   - themes/interests/searchConcepts contain joke-structure tokens such as `pun`, `puns`, `joke`, `jokes` (and existing humor lexical set), **or**
   - short slogan-like `visibleText` is present (bounded length) **and** `humorLexicalHits >= 1` from non-visibleText sources (themes/tags/desc/searchConcepts), **or**
   - matchedTags contribute ≥2 humor lexical hits.
3. **`lifeRoleDominant`** — existing Family/Faith/Teacher protection (unchanged).
4. **`cannabisDominant`** — existing cannabis ≥2 wins over humor exact (unchanged order).

### Override when (all):

- exact match exists and is **not** already a humor category
- not `lifeRoleDominant`
- not cannabis-override path
- **`jokePrimary`** := (`humorLexicalHits >= 2` **and** `jokeStructureEvidence`) **or** (`humorLexicalHits >= 3`)
- then select best approved humor category (Funny & Sarcastic preferred via existing family scorer)

### Do **not** override when:

- only mild/incidental humor: e.g. single `funny` tag, no pun/joke structure, animal portrait description → stay Animals (CASE B)
- Family/Faith/Teacher dominant
- Cannabis dominant over humor

### Why safer than current

| Current | Proposed |
|---------|----------|
| Humor override only if exact is Animals | Override any non-humor exact when joke-primary |
| Ignores themes/searchConcepts | Uses enrichment dimensions model already emits |
| Relies on description/tags luck for ≥2 hits | Dual gate: lexical strength **and** joke structure (or higher lexical bar) |
| Unit test overfitted to rich description | Fixtures cover Animals **and** Food & Drink exact with lean copy |

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/ai/catalogThemeCategoryResolver.ts`
- `functions/src/ai/catalogThemeCategoryResolver.test.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts` (pass parse fields)
- possibly playground path if it calls resolver with same input shape
- `packages/shared/.../aiEnrichment.constants.ts` **only if** prompt text changes → bump to **catalog-enrich-v34** + previous-default V33
- version constants / reprocess snapshot if prompt bumps
- `docs/project/DECISIONS.md`, `docs/standards/TESTING.md`

### Architecture Impact

- [x] Details: same lean prompt + server resolver; widen signal inputs + humor override predicate. No new AI call. No new Firestore reads per design.

### Security Impact

- [x] None

### Data Model Impact

- [x] None (schema stays `smart-profile-v1`)

### Backend Impact

- [x] Details: enrichment category resolution only; DEV Functions redeploy of same allowlist after implement

### UI Impact

- [x] None (unless Settings prompt default max-length already handled)

### Dependency Impact

- [x] None

### Documentation Impact

- [x] ADR + TESTING + canary/checkpoint cross-links

### Migration / Backfill Impact

- [x] None — profiles update only on re-enrich

### Rollback Plan

- Revert resolver/prompt source; redeploy prior Functions revisions; Autonomous remains OFF

---

## Test Strategy

### Automated (required)

| # | Fixture | Model exact | Expected primary |
|---|---------|-------------|------------------|
| 1 | F-CAW-F-class lean copy + themes/tags humor | Animals | Funny & Sarcastic |
| 2 | Same | Food & Drink | Funny & Sarcastic |
| 3 | Same | Funny & Sarcastic | Funny & Sarcastic |
| 4 | Animal portrait + weak/incidental humor only | Animals | Animals |
| 5 | Cannabis-primary humorous | Funny & Sarcastic | Cannabis & 420 |
| 6 | Zodiac | Pop Culture | Astrology & Zodiac |
| 7 | Star Wars + father | Pop Culture | Pop Culture |
| 8 | Motherhood golden | (fallback/exact as today) | Family |
| 9 | Faith golden | — | Faith |
| 10 | Teacher golden | — | Teacher |

Also: themes-only humor path (no funny tags in matchedTags); searchConcepts pun path; visibleText slogan alone must **not** flip Animals without other humor evidence.

### Live canary (post-implement / post-deploy)

- **#1** `7bVlWMFwxECdfHH8VNPB`: **10 consecutive** reprocesses → **10/10** Funny & Sarcastic (any Animals / Food & Drink / unrelated = FAIL)
- Retain #9 / #12 / #13 regression canaries (1 each sufficient unless regression)

### Commands

- Focused resolver + candidate/pipeline contract tests
- Functions build, lint touched files, `git diff --check`
- No Ready Catalog / no Autonomous

---

## Human Checkpoints

1. Formal Review approval before implement
2. Owner authorize implement / DEV deploy
3. Owner: **10/10 #1** canary + #9/#12/#13
4. WS4 remains blocked until that PASS

---

## Risks

| Risk | Mitigation |
|------|------------|
| Over-promoting Funny on mildly playful animal art | Dual gate jokeStructure + lexical; CASE B fixture |
| Breaking Family/Faith/Teacher | Keep lifeRoleDominant skip |
| Breaking cannabis > humor | Keep cannabis-before-humor order |
| Prompt-only fix insufficient | Resolver must be robust to Animals/Food exact |

---

## Open Questions

- None blocking plan; threshold constants (2 vs 3) may be tuned in implement within dual-gate shape — document final constants in IR.

---

## Implementation Outline (after review approval only)

1. Extend input + `buildSignalTokens`
2. Implement joke-primary override (non-Animals-gated)
3. Wire parse fields from candidate core
4. Tests per matrix
5. Prompt v34 only if needed
6. IR → owner deploy auth → 10× #1 canary

**This plan pass: no code changes beyond docs/state.**
