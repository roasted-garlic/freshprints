# Test Report: Portal registration loading-ownership fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` / Portal registration loading-ownership |
| Status | **passed** (automated); hosted.app QA pending App Hosting rollout |

## Commands

```text
npx tsx --test apps/portal/features/auth/utils/completeProfileLoadingOwnership.test.ts
  apps/portal/features/auth/utils/completeProfileProvisioning.test.ts
  apps/portal/features/auth/utils/requirePortalLogin.test.ts
  apps/portal/features/auth/utils/guestAuthGateCopy.test.ts
  apps/portal/features/auth/utils/portalPublicBrowsePath.test.ts
  apps/portal/features/auth/utils/portalReturnUrl.test.ts
  apps/portal/features/auth/types/auth.types.test.ts
→ 27/27 pass (exit 0)

npm run typecheck --workspace @fresh-prints/portal → exit 0
npm run lint → exit 0
npm run build:portal → exit 0
git diff --check (auth + globals + workflow docs) → exit 0
```

## Composed regression

`completeProfileLoadingOwnership.test.ts` covers:

- Sticky Google `isAuthActionLoading` + missing-profile/customer → interactive, no provision overlay
- Overlay only after `isSubmitting`
- Hung provision + timeout → all authorities clear, terminal error, overlay gone
- Concurrent Continue → single provision; subsequent retry allowed
- Bootstrap restore after `loading-profile` failure

## Manual / production

Hosted.app QA deferred until
`APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: LOADING-OWNERSHIP FIX`.
