# Deployment

> Fresh Prints deployment. **Human approval required for production releases.**

---

## Overview

Fresh Prints consists of:

- **Fresh Prints Studio** — Electron build via `npm run build:studio`
- **Fresh Prints Portal** — Next.js on Firebase App Hosting (`apps/portal`)
- **Firebase backend** — Auth, Firestore, Storage, Cloud Functions

---

## Environments

| Environment | Purpose | URL | Branch / trigger |
|-------------|---------|-----|------------------|
| Local | Development | Studio: Electron dev; Portal: `localhost:3100` | `npm run dev` (both), or `dev:studio` / `dev:portal` |
| Firebase dev | Development backend | `fresh-prints-dev` (`.firebaserc`) | local / manual deploy |
| Production | Live users | Portal App Hosting `[TBD]` | human approval required |

---

## Hosting & Infrastructure

| Component | Provider | Notes |
|-----------|----------|-------|
| Desktop app | Electron distributable | `npm run build:studio` → `apps/studio/release/${version}/` |
| Portal web | Firebase App Hosting | `firebase.json` → `apphosting.rootDir: ./apps/portal` |
| Backend | Firebase | See `docs/architecture/FIREBASE.md` |
| Database | Cloud Firestore | Security rules in repo |
| Storage | Firebase Cloud Storage | Security rules in repo |
| Functions | Firebase Cloud Functions | `functions/` |

---

## Build Process

### Desktop Build (Studio)

```bash
npm run build:studio
```

Artifacts: Electron distributable from electron-builder → `apps/studio/release/${version}/` locally (gitignored).

### Portal Build

```bash
npm run build:portal
```

Deploy to Firebase App Hosting (human approval required for production):

```bash
firebase deploy --only apphosting --project fresh-prints-dev
```

Portal backend config: `apps/portal/apphosting.yaml`. App root: `apps/portal` in `firebase.json`.

### Portal Cloud Functions (customer flows)

Deploy after Portal feature changes:

```bash
firebase deploy --only functions:registerCustomer,functions:createPortalPrintRequest,functions:listPortalAllocatableShows,functions:queuePortalPrintRequestToShow,functions:wipeOperationalTestData --project fresh-prints-dev
```

**Test Data Reset (2026-07-10 / policy 2026-07-13):** Deploy `wipeOperationalTestData` to **`fresh-prints-dev` only**. Callable refuses non-allowlisted projects and requires **owner** (not admin). Studio UI is exposed only in **development builds** connected to the allowlisted project — not in production Studio packages.

**Staff inbox acks (2026-07-10):** Deploy `firestore:rules` (new `staffInboxAcks` collection) and redeploy `wipeOperationalTestData` (clears `staffInboxAcks` with print-request / show-queue / upcoming-show wipes) before relying on Done sync or wipe clearing inbox history:

```bash
firebase deploy --only firestore:rules,functions:wipeOperationalTestData --project fresh-prints-dev
```

Adjust function list to match changed exports.

### Provider-neutral email and proof-ready notices

Repository implementation adds `updateEmailProviderSettings` and
`onEmailDeliveryJobCreated`, refactors invitation callables, and changes Firestore rules. No email
deployment is authorized by the implementation phase. After explicit human approval, deploy only
the reviewed dev slice (never bare `--only functions` while the orphan remote function warning
remains):

```bash
firebase deploy --only functions:createTeamUser,functions:createCustomerWithPortalInvite,functions:staffAddAssistedCreationProof,functions:updateEmailProviderSettings,functions:onEmailDeliveryJobCreated,firestore:rules --project fresh-prints-dev
```

Prerequisites: existing `RESEND_API_KEY`; optional `BREVO_API_KEY` when using Brevo (see
`docs/workflow/setup/brevo-email-setup.md`); verified sender
`Fresh Prints <noreply@myprintrequest.com>` for both sender parameters in the selected provider;
canonical dev Portal URL `https://myprintrequest.dev`.

**From-address params (ADR-FP-111):** Code defaults are
`Fresh Prints <noreply@myprintrequest.com>`. If a project-specific
`functions/.env.<projectId>` (e.g. `.env.fresh-prints-dev`) still sets the old
`team@funkyfreshprints.com` values, those override defaults on deploy — update both lines to
the noreply sender before soft-deploy, then redeploy. Do not invent alternate CLI param-set
commands; use dotenv files per Firebase parameterized config. Secret/parameter changes and every
production action require a separate human checkpoint.

### Gitignored build outputs (2026-06-24, paths updated 2026-07-08 for `apps/studio/` move)

These paths are **not tracked** and should not be committed:

| Path | Contents |
|------|----------|
| `apps/studio/dist/` | Vite renderer build |
| `apps/studio/dist-electron/` | Compiled main/preload bundles |
| `apps/studio/release/` | electron-builder installers and unpacked apps |
| `build/` | Local packaging assets (e.g. icons); directory gitignored |

### Packaging icons

`apps/studio/electron-builder.json5` references `icon.ico` (Windows) and `icon.png` (Linux), resolved relative to `apps/studio/`. As of 2026-07-08 neither file exists in the repo (never tracked in git) — electron-builder falls back to its default Electron icon. If custom icons are added, place them at `apps/studio/icon.ico` / `apps/studio/icon.png` or under `apps/studio/build/` (gitignored) `[INFERRED]`.

### Firebase Storage rules deploy

Rules file: `storage.rules` (referenced in `firebase.json`).

Default project: `fresh-prints-dev` (see `.firebaserc`).

```bash
firebase use fresh-prints-dev
firebase deploy --only storage
```

Dry run (compile only, no deploy):

```bash
firebase deploy --only storage --dry-run
```

**Deployed status cannot be confirmed from the repo alone.** Verify in Firebase Console → Storage → Rules (last published time vs repo). Required for Phase 3C signoff condition C1.

Other Firebase deploys (human approval required):

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

**Phase 5B AI pipeline:** Deploy rules first, then **all** functions (preferred after entrypoint/export changes). Set `OPENAI_API_KEY` in Secret Manager before functions deploy — see `FIREBASE.md` (never store in Firestore or desktop Settings).

Verify functions build before deploy:

```bash
npm --prefix functions run build
node -e "console.log(Object.keys(require('./functions')))"
```

Expected exports include `enqueueAiEnrichment` and `onDesignAiEnrichmentQueued`.

---

## Environment Variables

See `docs/architecture/FIREBASE.md`. Never commit secrets.

### Portal Open Graph / social meta (2026-07-20; updated 2026-07-21)

Portal site-wide OG / Twitter tags use Next.js `metadataBase` so image URLs are absolute. Root
metadata omits a hard-coded `og:url` so Next.js uses the request path (deep links no longer
advertise the home origin as `og:url`).

| Host | Origin used for absolute OG URLs |
|------|----------------------------------|
| Dev App Hosting | `https://myprintrequest.dev` when `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev`, or set `NEXT_PUBLIC_PORTAL_ORIGIN` |
| Production | Prefer `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com` on App Hosting; non-dev project ids fall back to that host when `NODE_ENV=production` |
| Local | `http://localhost:3100` (crawlers will not use this for real shares) |

**Site-wide default OG image:** Studio toggle `globalOgImageSource`:
- `library` (default) — interval-rotated ready design via `getPortalGlobalOpenGraph`
- `logo` — uploaded Portal full logo (`settings/brandLogos.portalFull.downloadUrl`) when set; else `/brand/fresh-prints-request-portal-logo.png`

**Letterbox (`letterboxOgImages`, default on):** `og:image` points at
`getPortalOgShareImage?designId=…&fit=contain&bg=<hex>` (1200×630 JPEG). Canvas color comes from
the design’s `artworkBackgroundHex` (fallback Portal artwork grey `#e5e7eb`). The `bg` query is a
Facebook/CDN cache-bust; the Function paints from the design document. When off, signed Storage
preview URLs.

**Library rotation:** Global library OG picks a ready design via `pickLibraryOgRotatedIndex` using
`libraryOgRotationInterval` (`daily` | `hourly` | `5min` | `1min` | `30s`, default `hourly`).
Studio **Pick next library preview** bumps `libraryOgRotationSalt` to force a different design
without waiting for the next interval bucket; then **Scrape Again** in Facebook Debugger.
There is no “every share” mode — social apps cache OG by page URL.

**Global OG title/description:** Studio → **Settings** → **Social sharing** →
`updatePortalSocialMetaSettings` → `settings/portalSocialMeta`. Portal prefers
`getPortalGlobalOpenGraph` (hourly revalidate on root layout).

**Per-design share:**

| Purpose | URL |
|---------|-----|
| Share / crawler OG | `/share/design/{designId}` — `getPortalDesignShareOpenGraph` (+ letterbox image URL when enabled) |
| Deep link (modal) | `/catalog?designId={designId}` (also honored on `/`) |

**Facebook Debugger note:** “This URL hasn't been shared on Facebook before” means Facebook has no
cache yet — click **Fetch new information**. Non-root app paths (e.g. `/requests/artwork`,
`/catalog`) already emit the same global OG tags as home (HTTP 200); they are not auth-blocked for
crawlers.

**Soft-deploy (dev only):**

```bash
firebase deploy --only functions:updatePortalSocialMetaSettings,functions:getPortalDesignShareOpenGraph,functions:getPortalGlobalOpenGraph,functions:getPortalOgShareImage,functions:finalizeBrandLogoSlot,functions:updateBrandLogoDisplaySizes,firestore:rules,storage --project fresh-prints-dev
```

Brand logos also need Firestore + Storage rules for `settings/brandLogos` and `brand/**` (same soft-deploy command). Production rules/Functions still require separate owner approval.

**Verify after soft-deploy to fresh-prints-dev:**

```bash
curl -sL https://myprintrequest.dev/login | findstr /i "og:title og:image twitter:card"
curl -sL https://myprintrequest.dev/catalog | findstr /i "og:title og:image"
curl -sL https://myprintrequest.dev/share/design/READY_DESIGN_ID | findstr /i "og:title og:image og:description"
curl -sL "https://us-central1-fresh-prints-dev.cloudfunctions.net/getPortalGlobalOpenGraph"
```

Or paste URLs into [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and
**Scrape Again** after toggle changes (`fit=contain` separates letterbox cache from raw images).

---

## Production Release Checklist

- [ ] Human approval obtained
- [ ] `npm run lint` passed
- [ ] `npm run build` passed
- [ ] Firebase rules reviewed
- [ ] Signoff doc completed

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-07-08 | Phase 8 closeout — Portal App Hosting, build commands, Portal functions deploy note |
| 2026-07-16 | Provider-neutral Resend invitations + proof-ready outbox; selective dev deploy checkpoint |
| 2026-06-24 | Git artifact cleanup; Storage deploy commands; packaging icon note |
| 2026-06-24 | Initial Fresh Prints deployment doc |
