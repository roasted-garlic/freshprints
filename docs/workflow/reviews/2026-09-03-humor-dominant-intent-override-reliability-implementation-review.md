# Implementation Review: Humor Dominant-Intent Override Reliability

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Implementation Review (post implement + test) |
| Plan | `docs/workflow/plans/2026-09-03-humor-dominant-intent-override-reliability-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-03-humor-dominant-intent-override-reliability-review.md` (**approved_with_changes**) |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` (`development`) |
| Owner auth | `AUTHORIZE IMPLEMENT — humor-dominant-intent override reliability corrective` |
| Verdict | **approved_with_notes** |

---

## Summary

Resolver now feeds enrichment-parse **themes/subjects/objects/interests/searchConcepts** into category resolution and applies a **joke-primary dual-gate** that can override **any non-humor** exact match (Animals, Food & Drink, etc.). Animals-only gate removed. Prompt remains **catalog-enrich-v33** (resolver-first). Normalizer **v6**, schema **v1**. Automated matrix including Food & Drink parity, CASE B, visibleText-alone negative, and goldens: **PASS**. **No DEV deploy / no 10× live canary** in this phase. WS4 remains blocked.

---

## Required answers (1–50)

| # | Question | Answer |
|---|----------|--------|
| 1 | Exact files changed | See Files section |
| 2 | Signal bag before | rawCategory, title, description, visibleText, matchedTags |
| 3 | Signal bag after | + subjects, objects, themes, interests, searchConcepts |
| 4 | Themes wired | **YES** |
| 5 | Subjects wired | **YES** |
| 6 | Objects wired | **YES** |
| 7 | Interests wired | **YES** |
| 8 | searchConcepts wired | **YES** |
| 9 | humorLexicalHits | Distinct hits from `HUMOR_PRIORITY.signalTokens` over full signal token set |
| 10 | jokeStructureEvidence | Profile themes/interests/searchConcepts contain `JOKE_STRUCTURE_PROFILE_TOKENS` (pun/joke/humor family); **or** matchedTag humor hits ≥2; **or** short slogan visibleText **and** ≥1 non-visibleText humor lexical hit |
| 11 | jokePrimary predicate | `(humorLexicalHits ≥ 2 ∧ jokeStructureEvidence) ∨ (humorLexicalHits ≥ 3)` |
| 12 | Final thresholds | `JOKE_PRIMARY_LEXICAL_WITH_STRUCTURE=2`, `JOKE_PRIMARY_LEXICAL_ALONE=3`, slogan max tokens=6 |
| 13 | Animals-only gate removed | **YES** |
| 14 | Any non-humor exact overridable | **YES** (when jokePrimary and not life-role / not cannabis-dominant) |
| 15 | visibleText-alone protection | **YES** — fixture stays Animals |
| 16 | lifeRole protection | **YES** — `isLifeRoleDominant` blocks humor override |
| 17 | cannabis-before-humor | **YES** — cannabis≥2 over humor exact unchanged; humor path skipped when cannabisHits≥2 |
| 18 | #1 Animals exact | **PASS** → Funny & Sarcastic |
| 19 | #1 Food & Drink exact | **PASS** → Funny & Sarcastic (same lean bag) |
| 20 | #1 Funny exact | **PASS** → Funny & Sarcastic |
| 21 | CASE B Animals | **PASS** → Animals |
| 22 | themes-fed | **PASS** |
| 23 | searchConcepts-fed | **PASS** |
| 24 | visibleText-only negative | **PASS** → Animals |
| 25 | #9 | **PASS** → Cannabis & 420 |
| 26 | #12 | **PASS** → Astrology & Zodiac |
| 27 | #13 | **PASS** → Pop Culture |
| 28 | Family | **PASS** |
| 29 | Faith | **PASS** |
| 30 | Teacher | **PASS** |
| 31 | generic exact-match | **PASS** → Animals portrait |
| 32 | Prompt changed | **NO** |
| 33 | Live prompt target | **catalog-enrich-v33** (after deploy of this source) |
| 34 | Owner custom prompt | Unchanged (no prompt bump) |
| 35 | Normalizer | **smart-profile-normalizer-v6** |
| 36 | Schema | **smart-profile-v1** |
| 37 | Tags changed | **NO** |
| 38 | matchedTags changed | **NO** |
| 39 | Firestore read behavior | **NO** new reads |
| 40 | Migration/backfill | **NO** |
| 41 | Focused tests | Resolver matrix 21 + pipeline wiring contract |
| 42 | Regression tests | Quality contract, title rules, visible-text, slice5, automation decision |
| 43 | Functions build | **PASS** |
| 44 | Lint | **PASS** |
| 45 | diff-check | **PASS** |
| 46 | ADR | **ADR-FP-162** |
| 47 | DEV deploy inventory | `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob` |
| 48 | 10× live #1 canary still required | **YES** (after owner-authorized DEV deploy) |
| 49 | WS4 readiness before live canary | **NO** |
| 50 | Anomalies / decisions | **[NEEDS OWNER DECISION]** authorize DEV deploy then 10× #1 + #9/#12/#13 |

---

## Files changed

| Path | Change |
|------|--------|
| `functions/src/ai/catalogThemeCategoryResolver.ts` | Dual-gate joke-primary; expanded signals |
| `functions/src/ai/catalogThemeCategoryResolver.test.ts` | Full matrix + Food parity + CASE B + VT negative |
| `functions/src/ai/aiEnrichmentCandidateCore.ts` | `buildThemeCategoryResolveInput` wires parse fields |
| `functions/src/ai/aiEnrichmentPlayground.ts` | Pass parse dimensions to resolver |
| `functions/src/ai/smartProfileQuality.contract.test.ts` | Pipeline wiring contract |
| `docs/project/DECISIONS.md` | ADR-FP-162 |
| `docs/standards/TESTING.md` | 10× canary note |
| This IR | `docs/workflow/reviews/2026-09-03-humor-dominant-intent-override-reliability-implementation-review.md` |

---

## Formal Review required changes — disposition

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Food & Drink same lean bag as Animals | **Done** (`JOKE_PRIMARY_LEAN_SIGNALS`) |
| 2 | Strict CASE B documented | **Done** |
| 3 | visibleText-alone negative | **Done** |
| 4 | Prompt only if needed → kept v33 | **Done** |
| 5 | No design-specific tokens | **Done** |

---

## Verification (this session)

```text
npx tsx --test catalogThemeCategoryResolver + smartProfileQuality.contract + catalogTitleRules
  + simpleCatalogEnrichmentResponse + visibleTextValidation + catalogReprocess.slice5
  → 136 pass / 0 fail
shared automation + reprocess constants → 45 pass
npm --prefix functions run build → 0
eslint touched files → 0
git diff --check → 0
```

---

## Next owner checkpoint

1. Authorize **DEV deploy** of humor-override reliability Functions allowlist  
2. Live canary: **10 consecutive** `#1` → 10/10 Funny & Sarcastic  
3. Re-canary `#9` / `#12` / `#13` once each  
4. Only then consider WS4 Start (still blocked until PASS)

**STOP — NO DEPLOY in this phase.**
