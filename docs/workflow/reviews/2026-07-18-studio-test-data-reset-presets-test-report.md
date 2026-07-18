# Test Report: Studio Test Data Reset presets + wipe expansion

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-studio-test-data-reset-presets-plan.md |
| Review | docs/workflow/reviews/2026-07-18-studio-test-data-reset-presets-review.md |
| Verdict | **passed_with_notes** (owner manual QA **PASS** 2026-07-18) |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit tests | `npx tsx --test packages/shared/src/utils/operationalWipeTargets.test.ts packages/shared/src/utils/operationalWipeTargetsUiSafety.test.ts` | **pass** (21 tests) |
| Functions build | `npm run build` (functions/) | **pass** |
| Deploy wipe callable | `firebase deploy --only functions:wipeOperationalTestData --project fresh-prints-dev` | **pass** (Successful update) |

## Live wipe re-test

| Step | Result |
|------|--------|
| Deploy expanded wipe to `fresh-prints-dev` | Done |
| Admin SDK count/delete script | **Blocked** — no Application Default Credentials on this machine |
| `firebase firestore:delete … -r -f` for leftover collections | Exit 0 (silent); treat as best-effort, not proof |
| Studio preset wipe (Etsy + Custom Requests) | **Owner confirm** — soft-reload Studio, run presets, type `WIPE TEST DATA`, check Console collections |

### Collections that must be empty after Etsy + Custom presets

**Etsy:** `etsyRecommendationRequests`, `etsyRecommendationRateLimits`, `etsyRecommendationConfig`, `etsyWebsiteSearchCache`, `customRequestEtsySearchRateLimits`, `etsyRecommendationSuggestions`, `etsySuggestionRequests`

**Custom Requests:** `assistedCreationRequests`, `assistedCreationUpdateAcks`, `customerNotifications`, `emailDeliveryJobs`, `customRequests` (+ Storage `assisted-creation/`)

## Notes

- Studio UI presets/labels are local/HMR — no Studio Firebase deploy needed.
- Leftover clears require the **deployed** function; that deploy is complete.
