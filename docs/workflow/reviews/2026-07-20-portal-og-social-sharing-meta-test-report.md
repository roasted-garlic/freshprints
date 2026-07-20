# Test Report: #11 Portal OG / social sharing meta

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Plan | docs/workflow/plans/2026-07-20-portal-og-social-sharing-meta-plan.md |
| Status | **passed_with_notes** (automated); **passed** (owner manual QA PASS 2026-07-20) |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Portal brand / share URL / return URL units | `cd apps/portal && npx tsx --test features/brand/portalSiteMeta.test.ts features/brand/pickDailyRotatedIndex.test.ts features/catalog/utils/portalDesignShareUrls.test.ts features/auth/utils/portalReturnUrl.test.ts` | **PASS** 18/18 |
| Shared social meta constants | `cd packages/shared && npx tsx --test src/constants/portal/portalSocialMetaSettings.constants.test.ts` | **PASS** 4/4 |
| Functions + rules soft-deploy | `firebase deploy --only functions:updatePortalSocialMetaSettings,firestore:rules --project fresh-prints-dev` | **PASS** — function **created**; rules released |
| App Hosting CLI soft-deploy | `firebase deploy --only apphosting --project fresh-prints-dev` | **SKIPPED / blocked** — CLI did not find backend `fresh-prints-portal` (would prompt to create). No production. |

## Smoke (live HTML)

`https://myprintrequest.dev/login` returns OG/Twitter tags (title/description defaults + brand logo image). Global meta loader path is active; when Admin Storage signing lacks credentials, image falls back to brand logo (expected local/ADC gap).

## Notes

- Studio **Settings → Social sharing** UI is local until Studio is reloaded; callable is live on fresh-prints-dev.
- Portal App Hosting soft-reload may need Firebase console / existing git pipeline if CLI backend binding is missing.
- Manual UI QA required before signoff (share open/close, card/modal share, Studio settings, OG preview).
- **2026-07-20 QA FAIL fix:** cold `/catalog?designId=` left param but modal closed — `loadingIdRef` stuck after effect cleanup (Strict Mode / AuthGate remount). Cleared on cleanup in `useCatalogDesignDeepLink`. Verify on local soft-reload (`http://localhost:3100`); **myprintrequest.dev will stay broken until App Hosting redeploy**.

## Manual QA

Owner **PASS** 2026-07-20 on manual checkpoint (share open/close, card/modal share, per-design OG, Studio Social sharing). Deep-link remount fix (`loadingIdRef` cleanup) included in PASS.

## Next

Signoff — `docs/workflow/reviews/2026-07-20-portal-og-social-sharing-meta-signoff.md`
