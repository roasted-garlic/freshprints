# Test Report: Prelaunch companion designs + Explicit / Censored Content

| Field | Value |
|-------|-------|
| Date | 2026-08-09 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-08-09-prelaunch-companion-designs-and-censored-content-plan.md` |
| Review | `docs/workflow/reviews/2026-08-09-prelaunch-companion-designs-and-censored-content-review.md` |
| Overall | **pending_manual** (automated **passed_with_notes**) |

---

## Summary

Implementation complete for companion sets + Explicit/Censored Content. Automated unit/typecheck/rules checks passed. Dev-only deploys to `fresh-prints-dev` completed (Rules, indexes, `getPortalGlobalOpenGraph`). **STOP for owner manual QA on fresh-prints-dev.** No production promotion. Algolia schema/reconcile untouched. myprintrequest.com not touched.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck Portal | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Typecheck Studio | `npx tsc --noEmit -p apps/studio/tsconfig.json` | 0 | pass | After Explicit toggle tone fix |
| Unit (feature) | `npx tsx --test` companion helpers, AI Review form, suggested tags, Portal catalog/explicit pref, OG | 0 | pass | 38 tests |
| Unit (library filters) | designLibraryFilters + designLibrarySearch | 0 | pass | 31 tests |
| Backend/rules | `npm run test:rules` with `JAVA_HOME=%USERPROFILE%\.local-jdk\jdk-21.0.11+10` | 0 | pass | **65/65** including new companionSets suite (6) |
| Lint | not re-run full monorepo | — | skip | Scoped ESLint previously clean on designs; full lint optional |
| Build | not run | — | skip | Manual QA uses `dev:studio` / `dev:portal` |
| E2E | not run | — | skip | Manual QA covers UI |
| Algolia | n/a | — | skip | No schema change |

---

## Failures

None in automated scope.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full monorepo lint | Not required for this stop; recommend before prod promotion |
| Production builds | Dev-first; no prod package/rollout this stage |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Dev QA checklist (companion + censored) | **pending** | Owner checkpoint |

Manual checklist: `docs/workflow/reviews/2026-08-09-prelaunch-companion-designs-and-censored-content-owner-qa-checklist.md`

---

## fresh-prints-dev deployments performed

| Deployable | Command | Result |
|------------|---------|--------|
| Firestore Rules + indexes | `firebase deploy --only firestore:rules,firestore:indexes --project fresh-prints-dev --non-interactive` | **success** |
| Function `getPortalGlobalOpenGraph` | `firebase deploy --only functions:getPortalGlobalOpenGraph --project fresh-prints-dev --non-interactive` | **success** |

**Not deployed:** fresh-prints-prod anything; Studio prod package; Portal App Hosting; Algolia reconcile.

---

## Signoff Readiness

- [x] Automated checks pass (or documented)
- [ ] Manual tests complete — **awaiting owner**
- [ ] Ready for signoff — **no** until owner QA PASS

**Next step:** manual-test-checkpoint → owner reply → then production promotion matrix (separate approval)
