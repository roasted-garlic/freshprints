# Phase 9A Etsy Recommendations Foundation — Test Report

Date: 2026-07-15  
Status: automated mocked verification complete with documented pre-existing blockers

## Commands and results

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Focused shared | `npx tsx --test "packages/shared/src/utils/etsyRecommendation*.test.ts"` | 0 | PASS 16/16 |
| Focused Functions Etsy | `npx tsx --test "functions/src/lib/etsy/*.test.ts"` | 0 | PASS 8/8 |
| Shared full sweep | `npx tsx --test "packages/shared/src/**/*.test.ts"` | 0 | PASS 485/485 |
| Functions build | `npm --prefix functions run build` | 0 | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | PASS |
| Portal build | `npm run build:portal` | 0 | PASS (includes `/custom-designs`) |
| Functions full sweep | `npx tsx --test "functions/src/**/*.test.ts"` | 1 | 285/286 — **pre-existing** fail |
| Root lint | `npm run lint` | 1 | **pre-existing** blockers + fixed our img eslint-disable |

## Pre-existing blockers

1. **`functions/src/lib/customerUploadValidation.test.ts` — `rejects oversized declared zip`**  
   Assertion expects throw; current validation does not throw for `51 * 1024 * 1024`. Unrelated to Phase 9A.

2. **Root lint**  
   Pre-existing: `@next/next/no-img-element` rule missing (AccountArtworkGallery, CurrentRequestDrawer), unused `_limit` in catalogStorageService, react-hooks warnings. Phase 9A file no longer references that rule.

## Live / emulator

Not run during mocked phase.

### Dev deploy + live smoke (2026-07-15, after owner `ETSY SECRET CONFIGURED`)

| Step | Result |
|------|--------|
| `firebase deploy --only firestore:rules,firestore:indexes,functions:submitEtsyRecommendationRequest,functions:searchEtsyRecommendations,functions:completeEtsyRecommendationRequest,functions:cancelEtsyRecommendationRequest --project fresh-prints-dev` | PASS (exit 0) |
| Active listings smoke | HTTP 200; 3 results; price keys `amount`/`divisor`/`currency_code`; images **not** inline |
| Batch hydration smoke | HTTP 200; images + shop present |
| Rate-limit headers observed | `x-limit-per-day: 5000`, `x-limit-per-second: 5` |
| Portal App Hosting | Skipped (interactive backend create prompt); use local Portal |
| Production | Untouched |
| Secret values | Never logged |

## Next

Owner visual smoke on local Portal → `fresh-prints-dev`. Reply `PASS` / `FAIL` / `PASS WITH NOTES`.
