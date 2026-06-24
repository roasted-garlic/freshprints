# Deployment

> Fresh Prints deployment. **Human approval required for production releases.**

---

## Overview

Fresh Prints consists of:

- **Desktop admin app** — Electron build via `npm run build`
- **Firebase backend** — Auth, Firestore, Storage, Cloud Functions

---

## Environments

| Environment | Purpose | URL | Branch / trigger |
|-------------|---------|-----|------------------|
| Local | Development | localhost (Electron) | n/a |
| Firebase dev | Development backend | `fresh-prints-dev` (`.firebaserc`) | local / manual deploy |
| Production | Live users | `[TBD]` | `[TBD]` |

---

## Hosting & Infrastructure

| Component | Provider | Notes |
|-----------|----------|-------|
| Desktop app | Electron distributable | Built locally or CI |
| Backend | Firebase | See `docs/architecture/FIREBASE.md` |
| Database | Cloud Firestore | Security rules in repo |
| Storage | Firebase Cloud Storage | Security rules in repo |
| Functions | Firebase Cloud Functions | `functions/` |

---

## Build Process

### Desktop Build

```bash
npm run build
```

Artifacts: Electron distributable output from electron-builder → `release/${version}/` locally (gitignored).

### Gitignored build outputs (2026-06-24)

These paths are **not tracked** and should not be committed:

| Path | Contents |
|------|----------|
| `dist/` | Vite renderer build |
| `dist-electron/` | Compiled main/preload bundles |
| `release/` | electron-builder installers and unpacked apps |
| `build/` | Local packaging assets (e.g. icons); directory gitignored |

### Packaging icons

`electron-builder.json5` references `icon.ico` (Windows) and `icon.png` (Linux) at the **repository root**. Local copies may exist under `build/` (gitignored). Before `npm run build`, ensure root-level icon files exist or copy from `build/` `[INFERRED]`.

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
| 2026-06-24 | Git artifact cleanup; Storage deploy commands; packaging icon note |
| 2026-06-24 | Initial Fresh Prints deployment doc |
