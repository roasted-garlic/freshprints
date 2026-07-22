# Test Report: Portal OG letterbox + global image toggles

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Plan | docs/workflow/plans/2026-07-21-portal-og-letterbox-and-global-image-toggles-plan.md |
| Review | docs/workflow/reviews/2026-07-21-portal-og-letterbox-and-global-image-toggles-review.md |
| Status | **passed_with_notes** (automated pass; Facebook Debugger **PASS** owner 2026-07-21) |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Shared settings | `cd packages/shared && npx tsx --test src/constants/portal/portalSocialMetaSettings.constants.test.ts` | **PASS** 8/8 |
| Portal brand | `cd apps/portal && npx tsx --test features/brand/pickDailyRotatedIndex.test.ts features/brand/portalSiteMeta.test.ts` | **PASS** 11/11 |
| Letterbox compose | `cd functions && npx tsx --test src/lib/portalOgImageCompose.test.ts` | **PASS** 2/2 |
| Functions soft-deploy | `firebase deploy --only functions:updatePortalSocialMetaSettings,functions:getPortalDesignShareOpenGraph,functions:getPortalGlobalOpenGraph,functions:getPortalOgShareImage --project fresh-prints-dev` | **PASS** (create global + image; update share + settings) |

## Probe notes

- Pre-deploy: `getPortalGlobalOpenGraph` returned **404** → Portal fell back to brand logo (expected).
- Non-root URLs (`/catalog`, `/requests/artwork?…`) already returned **200** with OG tags; Debugger “never shared” is cache-empty, not missing meta. Findings: `docs/workflow/reviews/2026-07-21-portal-og-non-root-debugger-findings.md`.

## Manual (owner)

Facebook Debugger letterbox scrape — **PASS** (owner 2026-07-21 via PASS ALL).  
Signoff: `docs/workflow/reviews/2026-07-21-portal-og-letterbox-and-global-image-toggles-signoff.md`
