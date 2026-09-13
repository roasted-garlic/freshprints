# Implementation Review: Category Dominant-Intent Calibration

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Implementation Review (post implement + test) |
| Plan | `docs/workflow/plans/2026-09-03-category-dominant-intent-calibration-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-review.md` (**approved_with_changes**) |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` (`development`) |
| Owner auth | `OWNER CATEGORY DOMINANT-INTENT CALIBRATION: AUTHORIZE IMPLEMENT` |
| Verdict | **approved_with_notes** |

---

## Summary

Source implements Formal Review required shape: lean prompt **`catalog-enrich-v33`** + thresholded resolver second-pass + optional revision-aware taxonomy cache peek. Automated owner-class fixtures (#1/#9/#12/#13) and Family/Faith/Teacher/exact-match regressions pass. **No DEV deploy, Gate A live #9, or four-design canary** in this phase. Gate A live attribution and WS4 remain blocked until owner-authorized deploy + canary.

---

## Required answers (1–50)

| # | Question | Answer |
|---|----------|--------|
| 1 | Root cause #1 | Exact-match short-circuit: model returned approved `Animals`; resolver trusted exact name and never applied humor>subject competition despite joke signals (`F-CAW-F`, funny/sarcastic). Lean prompt also lacked concrete humor-primary examples. |
| 2 | Root cause #12 | Same structural exact-match trust: model returned `Pop Culture & Characters` for Aries/zodiac art; no astrology-family second-pass; lean prompt lacked zodiac→`Astrology & Zodiac` guidance. Not a missing category (name already existed). |
| 3 | #9 cache attribution | **Not proven live.** Process-local 15m TTL without revision peek could serve pre-`Cannabis & 420` snapshots after category curation; also exact humor match could win if cannabis category absent from snapshot. Automated #9-class fixture PASSes when category is in approved list. **Gate A live verification pending DEV deploy** — do not claim pure resolver-only defect. |
| 4 | Prompt changed | **YES** |
| 5 | Final prompt version | **`catalog-enrich-v33`** |
| 6 | Normalizer changed | **NO** — remains `smart-profile-normalizer-v6` |
| 7 | Schema changed | **NO** — remains `smart-profile-v1` |
| 8 | Resolver before | Exact approved-name match returned immediately; competing dominant-intent families only influenced non-exact fallback scoring. |
| 9 | Resolver after | Exact match remains default; `resolveExactMatchWithDominantIntentOverride` may replace when competing family hits ≥2 and target family is present in approved list (cannabis>humor exact; astrology>pop when franchise weak; humor>animals). |
| 10 | Exact-match trust preserved | Exact match is still returned when no override fires; weak incidental words (<2 family hits) cannot overturn. Stable Animals portrait fixture retained. |
| 11 | Threshold / competition | `DOMINANT_OVERRIDE_MIN_SIGNAL_HITS = 2`. Ordered: cannabis-over-humor → astrology-over-pop (if franchise hits <2) → humor-over-animals. Life-role-dominant designs skip humor boost to protect Family. |
| 12 | Dominant-intent families | Added/extended: **HUMOR**, **CANNABIS**, **ASTROLOGY**, **FRANCHISE_POP**; preserved Family / Faith / Teacher priority families. |
| 13 | Signals used | Title, description, visibleText, subjects, objects, searchConcepts, matchedTags, model raw category, approved category name/description tokens from loaded snapshot. No extra AI call; no per-design full taxonomy reread. |
| 14 | Category alternatives | Prompt instructs alternatives when two intents are legitimately strong, `[]` when primary clear. Resolver selects primary only; alternatives still model/pipeline path (unchanged schema). |
| 15 | #1 automated | **PASS** → `Funny & Sarcastic` |
| 16 | #9 automated | **PASS** (fixture with Cannabis & 420 present) → `Cannabis & 420` |
| 17 | #12 automated | **PASS** → `Astrology & Zodiac` |
| 18 | #13 automated | **PASS** → `Pop Culture & Characters` |
| 19 | Family regression | **PASS** (motherhood / Family goldens) |
| 20 | Faith regression | **PASS** |
| 21 | Teacher regression | **PASS** |
| 22 | Generic exact-match | **PASS** (Animals portrait stable) |
| 23 | Category-gap | **PASS** (undefined when nothing clears min score; never invents raw name) |
| 24 | v31/v5 subject | **PASS** via `smartProfileQuality.contract.test.ts` / builder regressions (canonical bases, anti-glue) |
| 25 | v32 text-quality | **PASS** (`simpleCatalogEnrichmentResponse`, `visibleTextValidation`, contract text-dominant / dump guards retained in v33 prompt) |
| 26 | Cache changed | **YES** — revision-aware meta peek within TTL |
| 27 | Cache read-cost | **+1 small materialization-meta read per within-TTL cache-hit path** when revision ≠ `fs-fallback`. Not a full taxonomy corpus reread on hit. |
| 28 | Revision behavior | Same revision within TTL → hit; new revision within TTL → `taxonomy-cache-revision-changed` + reload; TTL expiry → reload; fail-safe / join-inflight preserved. |
| 29 | Previous-default migration | `PREVIOUS_DEFAULT_…_V32` recognized; `resolveAiEnrichmentPromptTemplate` upgrades v32/v31 previous defaults to current default. |
| 30 | Owner custom prompt | Preserved when not previous/default and within max length with required placeholders (**tested**). |
| 31 | Tags changed | **NO** |
| 32 | matchedTags changed | **NO** (still usable as input signal) |
| 33 | Algolia settings | **NO** |
| 34 | Firestore Rules | **NO** |
| 35 | Storage Rules | **NO** |
| 36 | Indexes | **NO** |
| 37 | Migration/backfill | **NO** |
| 38 | Exact files changed (this corrective) | See Files section below |
| 39 | Focused tests | Resolver owner classes + cache revision + prompt version/upgrade tests |
| 40 | Regression tests | Family/Faith/Teacher/exact/gap; v32 visible-text; quality contract; catalog reprocess snapshot |
| 41 | Functions build | **PASS** (`npm --prefix functions run build`) |
| 42 | Lint | **PASS** (eslint on touched AI/taxonomy/shared constant files) |
| 43 | git diff --check | **PASS** (touched corrective files) |
| 44 | ADR | **ADR-FP-161** accepted — source implemented; DEV deploy pending |
| 45 | DEV deploy inventory | `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob` (same allowlist pattern as WS1/v32; bundles prompt/resolver/cache) |
| 46 | Gate A live #9 still required | **YES** — after DEV deploy (or when TTL/revision-aware live cannot explain stale snapshot) |
| 47 | Four-design canary required | **YES** — after Gate A / as next owner step (#1 `7bVlWMFwxECdfHH8VNPB`, #9 `1Ws0T9fivryest6IUSbt`, #12 `7BjqFQIhkavo80sv5kCp`, #13 `E2fVUzTL8Smx0gXaGqUZ`) |
| 48 | WS4 readiness before canary | **NO** — WS4 remains blocked until owner category canary PASS |
| 49 | Unresolved anomaly | Live #9 attribution unknown until Gate A. v33 default length was **10559** (> prior 10k max); **fixed** by raising max to **12000** with a guard test. |
| 50 | [NEEDS OWNER DECISION] | **Authorize DEV deploy** of this corrective (then Gate A + canary). No normalizer/schema decision needed. |

---

## Files changed (this corrective)

| Area | Path |
|------|------|
| Resolver | `functions/src/ai/catalogThemeCategoryResolver.ts` |
| Resolver tests | `functions/src/ai/catalogThemeCategoryResolver.test.ts` |
| Taxonomy cache | `functions/src/ai/loadAiCatalogReferenceSnapshot.ts` |
| Cache tests | `functions/src/ai/aiTaxonomyCache.test.ts` |
| Materialization revision | `functions/src/taxonomy/rebuildTaxonomyMaterialization.ts` |
| Prompt default | `packages/shared/src/constants/aiEnrichment.constants.ts` (incl. max length **12000**) |
| Prompt upgrade tests | `packages/shared/src/constants/aiEnrichment.constants.test.ts` |
| Prompt version | `packages/shared/src/constants/smartProfile.constants.ts` |
| Reprocess snapshot | `packages/shared/src/constants/catalogReprocess.constants.ts` (+ test rename) |
| Functions prompt version | `functions/src/ai/catalogTitleRules.ts` (+ test assert v33) |
| Quality contract | `functions/src/ai/smartProfileQuality.contract.test.ts` |
| ADR | `docs/project/DECISIONS.md` (ADR-FP-161) |
| Testing docs | `docs/standards/TESTING.md` |
| WS3 cross-link | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-ws3-owner-shadow-sample-checkpoint.md` |
| This IR | `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-implementation-review.md` |

Note: Working tree may also contain prior WS1 automation/observability edits unrelated to this corrective’s verdict; deploy inventory above is the Functions surface that must receive **this** prompt/resolver/cache bundle.

---

## Verification commands run (this session)

```text
npx tsx --test functions/src/ai/catalogThemeCategoryResolver.test.ts
  + aiTaxonomyCache / catalogTitleRules / smartProfileQuality.contract / catalogReprocess.slice5.contract
  → 112 pass / 0 fail

npx tsx --test packages/shared catalogReprocess + aiEnrichment + catalogAutomationDecision + categoryDominantIntent
  → pass (incl. new v33 previous-default suite)

npx tsx --test smartProfileBuilder / smartProfileEnrichmentWrite → 25 pass
npx tsx --test simpleCatalogEnrichmentResponse / visibleTextValidation → 30 pass
npm --prefix functions run build → exit 0
eslint (touched files) → exit 0
git diff --check (touched corrective files) → exit 0
```

---

## Out of scope confirmed

- No WS4 Start / Ready reprocess
- Autonomous remains **OFF**
- No tag / matchedTags / Algolia / rules / indexes / migration / production
- No design-ID or title hardcodes
- Normalizer not bumped to v7; schema not changed

---

## Next owner checkpoint (after this IR)

1. **Authorize DEV deploy** of category corrective Functions allowlist  
2. **Gate A** controlled reprocess `#9` `1Ws0T9fivryest6IUSbt`  
3. Four-design canary `#1/#9/#12/#13`  
4. Owner: `OWNER CATEGORY CANARY: PASS | PASS WITH NOTES | FAIL`  
5. Only then consider **WS4 Start**

**STOP — NO DEPLOY in this phase.**
