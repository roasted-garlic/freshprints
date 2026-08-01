# Checkpoint: Production Studio installer + Portal App Hosting — bundled brand assets

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approvals | `APPROVE PRODUCTION STUDIO INSTALLER: BUNDLED BRAND ASSETS` **and** `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: BUNDLED BRAND ASSETS` |
| Reviewed implement commit | `f0f555a` |
| Production promotion | PR #14 `development` → `production` |
| Production merge | `ac837b5d6a69237b68b91d8ed837d465fc94d2af` (`ac837b5`) |
| Automatic App Hosting rollouts | Remain **disabled** (backend `codebase` has repository + `rootDirectory` only; no automatic rollout policy; this pass used explicit `apphosting:rollouts:create`) |

---

## 1. Production merge verification

| Check | Result |
|-------|--------|
| `f0f555a` ancestor of `origin/production` | yes |
| Merge message | Bundled brand assets for Studio installer and Portal App Hosting rollout |
| Runtime vs prior production (`58aa0da`) | Branding assets, `AppLogo`/`PortalLogo` fallbacks, aspect-ratio constants + tests, favicon/icon generators, workflow docs / TD-029 notes |
| Functions / Rules / indexes | **unchanged** |
| Auth / Storage console config | **unchanged** |
| `apphosting.yaml` | **unchanged** |
| DNS / custom domain | **not touched** |
| Production data | **not modified** |

---

## 2. Studio production installer

Built on exact production tree at `ac837b5` with temporary `apps/studio/.env.local` pointing at `fresh-prints-prod` (WEB app `1:473623863375:web:524ec1a63f547e4d85ca3a`). Dev env restored afterward.

| Field | Value |
|-------|-------|
| Filename | `Fresh Prints-Windows-0.0.0-Setup-bundled-brand.exe` |
| Location | `apps/studio/release/0.0.0/` |
| Size | 106,245,714 bytes |
| SHA-256 | `E47B1776C6FA2FBA489094DB11EDA93BAD86C15AC9D8432F264291A6B3898D65` |
| Build | `npm run build:studio` → exit 0 |
| Embedded project | Built renderer embeds `VITE_FIREBASE_PROJECT_ID:"fresh-prints-prod"` (and matching prod auth domain / storage bucket / app id). `fresh-prints-dev` strings remain only as allowlist/error-copy literals — not the active config. |
| Packaged logos | `app.asar` contains `dist/assets/fresh-prints-studio-logo-*.png`, collapsed variant, and `dist/app-icon.png` |
| Packaged icon | `System.Drawing.Icon.ExtractAssociatedIcon` on both Setup and `win-unpacked\Fresh Prints.exe` yields the Fresh Prints Studio mark (FP + STUDIO); source `icon.ico` / `app-icon.png` present at packaging paths |
| Unsigned | yes — not uploaded publicly |

Also present (byte-identical installer before rename copy): `Fresh Prints-Windows-0.0.0-Setup.exe` from the same build.

---

## 3. Portal App Hosting rollout

| Field | Value |
|-------|-------|
| Command | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit ac837b5 --force` |
| Result | Successfully created a new rollout |
| Rollout id | `build-2026-07-31-005` |
| Full name | `projects/fresh-prints-prod/locations/us-central1/backends/fresh-prints-portal/rollouts/build-2026-07-31-005` |
| State | **SUCCEEDED** |
| Build commit | `ac837b5d6a69237b68b91d8ed837d465fc94d2af` |
| Deployed revision | `fresh-prints-portal-build-2026-07-31-005` |
| Backend updated | 2026-07-31 17:20:22 (local) / `updateTime` 2026-07-31T22:20:22Z |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` (HTTP 200) |

### Branding asset verification (hosted.app vs production tree)

| Asset | Match |
|-------|-------|
| `/brand/fresh-prints-request-portal-logo.png` | **yes** (SHA-256) |
| `/brand/fresh-prints-request-portal-logo-collapsed.png` | **yes** |
| `/favicon.ico` | **yes** |
| `/favicon-96x96.png` | **yes** |
| `/apple-touch-icon.png` | **yes** |
| `/web-app-manifest-192x192.png` | **yes** |
| `/web-app-manifest-512x512.png` | **yes** |
| `/favicon.svg` | Content equivalent; hash differs only by CRLF vs LF line endings |

---

## 4. Explicit non-changes this pass

- No Cloud Functions deploy
- No Firestore / Storage Rules or indexes deploy
- No Auth provider / authorized-domain changes
- No Storage bucket / CORS / IAM changes
- No production Firestore/Storage data writes for this release
- No DNS or custom-domain cutover
- No Stage 2 smoke testing started
- Automatic App Hosting rollouts **not** re-enabled

---

## 5. Owner QA (required — stop here)

### Manual Test Checkpoint

**Feature / area:** Production Studio installer + hosted Portal branding  
**Why automated tests are insufficient:** Installer UX, Windows shell icon, and live hosted logo/favicon rendering require human eyes.  
**Environment:** Local Windows install of the new Studio installer; Portal `hosted.app` URL above  
**Prerequisites:** Installer file above; browser to hosted Portal

### Steps — Studio

1. Install `Fresh Prints-Windows-0.0.0-Setup-bundled-brand.exe` → **Expected:** install completes  
2. Confirm Start Menu / taskbar / window icon shows Fresh Prints Studio mark → **Expected:** not default Electron icon  
3. Launch and confirm sidebar / login logos match approved bundled brand → **Expected:** wordmark + collapsed mark correct; no broken-image flash without fallback  
4. Confirm app talks to **production** (`fresh-prints-prod`) for sign-in → **Expected:** prod Auth, not `fresh-prints-dev`

### Steps — Portal

1. Open hosted URL → **Expected:** 200, site loads  
2. Confirm header/auth logos match approved Portal brand → **Expected:** full + collapsed assets  
3. Confirm favicon / tab icon / PWA icons updated → **Expected:** new mark, not prior assets

### Pass criteria

- [x] Studio installer branding + prod project OK  
- [x] Portal hosted branding OK  
- [x] No unrelated regressions noticed in this branding check  

### Owner QA result — **PASS** (2026-07-31)

Exact recorded result:

> PASS

Signoff: `docs/workflow/reviews/2026-07-31-production-bundled-brand-studio-and-portal-release-signoff.md`
(**approved**).

---

## Not done (deferred)

- Stage 2 hosted.app smoke checklist  
- Custom-domain cutover  
- Public distribution of the Studio installer  

