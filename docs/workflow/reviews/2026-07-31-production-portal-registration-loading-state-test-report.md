# Test Report: Portal registration loading-state fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Goal | `production-release` / Portal registration loading-state |
| Status | **passed** (automated); hosted.app QA pending rollout |

## Commands

```text
npx tsx --test apps/portal/features/auth/utils/completeProfileProvisioning.test.ts
  apps/portal/features/auth/utils/requirePortalLogin.test.ts
  apps/portal/features/auth/utils/guestAuthGateCopy.test.ts
  apps/portal/features/auth/utils/portalPublicBrowsePath.test.ts
  apps/portal/features/auth/utils/portalReturnUrl.test.ts
  apps/portal/features/auth/types/auth.types.test.ts
→ 20/20 pass

npm run typecheck --workspace @fresh-prints/portal → exit 0
npm run lint → exit 0
npm run build:portal → exit 0
git diff --check (auth touch set) → exit 0
```

## Manual / production

Hosted.app QA deferred until `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT`.
