# Test Report: Library OG rotation interval + per-design artwork backgrounds

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-plan.md |
| Implementation | Session implement + soft-deploy fresh-prints-dev |
| Overall | **passed_with_notes** |

---

## Summary

Automated unit tests and Functions build passed. Portal typecheck passed. Studio `tsc --noEmit` blocked by pre-existing `tsconfig.json` `ignoreDeprecations` error (unrelated). Soft-deploy of four OG/settings Functions to **fresh-prints-dev** succeeded. Manual Studio/Portal UI + Facebook Debugger scrapes required before signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit — shared + Functions OG | `npx tsx --test packages/shared/src/constants/portal/portalSocialMetaSettings.constants.test.ts packages/shared/src/constants/design/artworkBackground.constants.test.ts functions/src/lib/portalOgUrls.test.ts functions/src/lib/portalOgImageCompose.test.ts` | 0 | pass | 23 tests |
| Functions build | `npm --prefix functions run build` | 0 | pass | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Studio typecheck | `cd apps/studio; npx tsc --noEmit` | 2 | skip/notes | Pre-existing `TS5103: Invalid value for '--ignoreDeprecations'` in tsconfig |
| Lint | not run | — | skip | Narrow change; typecheck + unit covered logic |
| Soft-deploy | `firebase deploy --only functions:updatePortalSocialMetaSettings,functions:getPortalDesignShareOpenGraph,functions:getPortalGlobalOpenGraph,functions:getPortalOgShareImage --project fresh-prints-dev` | 0 | pass | All four Successful update |

---

## Failures (if any)

None in scope. Studio tsc config issue is pre-existing and outside this phase.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full lint | Optional for this slice; unit + typecheck + Functions build sufficient for gate |
| E2E | Not configured for OG/UI mats |
| Studio tsc | Blocked by existing tsconfig deprecation flag |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Studio rotation interval + Pick next | **PASS** | Owner 2026-07-21 |
| Studio design artwork background presets/custom | **PASS** | Owner 2026-07-21 |
| Portal catalog mats | **PASS** | Owner 2026-07-21 |
| Facebook Debugger design share letterbox bg | **PASS** | Owner 2026-07-21 |

Manual test instructions: docs/workflow/reviews/2026-07-21-library-og-rotation-interval-and-per-design-artwork-bg-manual-checkpoint.md

---

## Recommendations

- Fix Studio `tsconfig.json` `ignoreDeprecations` in a follow-up so Studio typecheck is runnable again.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete — owner **PASS** 2026-07-21
- [x] Ready for signoff phase

**Next step:** signoff (complete)
