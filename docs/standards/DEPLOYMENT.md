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
| Firebase dev | Development/staging backend | Firebase console | `[TBD]` |
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

Artifacts: Electron distributable output from electron-builder.

### Firebase Deploy

`[TBD — document production deploy commands and human approval gates]`

Setup references: `docs/workflow/setup/firebase-project-setup.md`

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
| 2026-06-24 | Initial Fresh Prints deployment doc |
