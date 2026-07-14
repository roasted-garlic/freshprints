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
| 2026-06-24 | Git artifact cleanup; Storage deploy commands; packaging icon note |
| 2026-06-24 | Initial Fresh Prints deployment doc |
