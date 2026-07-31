# Checkpoint: Bundled brand asset implementation complete (await visual + release)

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approval | `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` + `Brand sources ready` |
| Status | **Visual QA PASS** — implemented on `development` (`f0f555a`); production releases gated |

## Source inspection

| # | File | Result |
|---|------|--------|
| 1 | `01-studio-full-wordmark.png` | PNG 10800×2851 alpha 1.26 MB |
| 2 | `02-studio-collapsed-square.png` | PNG 5400×5400 alpha |
| 3 | `03-portal-full-wordmark.png` | PNG 9940×2430 alpha 1.07 MB (&lt;2 MB upload) |
| 4 | `04-portal-collapsed-square.png` | PNG 5400×5400 alpha |
| 5 | `05-favicon-app-mark.png` | PNG 5400×5400 — **byte-identical** to #2 (explicit source #5) |

## Delivered

- Replaced Studio/Portal bundled logos at mapped paths
- Regenerated Studio `icon.ico` / `icon.png` / `public/app-icon.png` via `generate-app-icon.mjs` (**8% padding**)
- Regenerated Portal favicon/manifest set via `apps/portal/scripts/generate-portal-favicons.mjs`
- `AppLogo` / `PortalLogo` `onError` → bundled fallback
- Updated display default aspect ratios for new Studio/Portal wordmarks

## Automated checks

| Check | Result |
|-------|--------|
| `brandLogoSettings.constants` tests | pass |
| Portal typecheck | pass |
| Studio `tsc --noEmit` | pass |
| `npm run lint` | pass |
| `npm run build:portal` | (recorded in implement session) |

## Owner visual QA — **PASS** (2026-07-31)

Local Studio/Portal bundled branding accepted. Signoff:
`docs/workflow/reviews/2026-07-31-production-bundled-brand-implementation-signoff.md`.

## Still gated (separate approvals)

| Next | Phrase |
|------|--------|
| Studio installer | `APPROVE PRODUCTION STUDIO INSTALLER: BUNDLED BRAND ASSETS` |
| Portal App Hosting | `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: BUNDLED BRAND ASSETS` |
| Stage 2 smoke | After branding releases (or owner resequences) |

## Sources retained

`docs/workflow/setup/brand-asset-sources/` kept for provenance.
