# Test Report: Admin-managed Etsy questionnaire suggestion lists

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-16-etsy-admin-managed-suggest-lists-plan.md |
| Implementation | session (uncommitted) |
| Overall | **pending_manual** |

---

## Summary

Automated unit tests (38) and Portal typecheck / Functions build passed. Callables + Firestore rules/indexes deployed to `fresh-prints-dev`. Owner manual QA required for Studio add → Portal dropdown path.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test` shared suggestion lists + etsy utils + functions validation | 0 | pass | 38 tests |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Functions build | `npm run build --prefix functions` | 0 | pass | |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | 2 | skip | Pre-existing `ignoreDeprecations` TS5103 — unrelated |
| Lint | — | — | skip | Not run (full-repo eslint heavy); no new lint script scoped |
| Deploy | `firebase deploy --only functions:addEtsyRecommendationSuggestion,functions:deactivateEtsyRecommendationSuggestion,firestore:rules,firestore:indexes --project fresh-prints-dev` | 0 | pass | Both callables created |

---

## Failures (if any)

None in scope.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Studio typecheck | Existing tsconfig `ignoreDeprecations` invalid for current tsc — document, do not expand scope |
| Firestore rules emulator | No rules test harness for this collection yet |
| Full monorepo lint | Optional; not required for this slice |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Admin add subject/tone → Portal autocomplete | pending | See manual QA doc |

Manual test instructions: `docs/workflow/reviews/2026-07-16-etsy-admin-managed-suggest-lists-manual-qa.md`

---

## Recommendations

- Optional follow-up: feed admin subject overlays into subject parser phrase index (ADR-FP-087k).
- Optional: fix Studio `ignoreDeprecations` tsconfig separately.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending
- [ ] Ready for signoff phase

**Next step:** manual-test-checkpoint
