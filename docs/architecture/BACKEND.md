# Backend

> **Fresh Prints** — backend overview. Firebase-specific details live in `FIREBASE.md`.

---

## Overview

Fresh Prints uses **Firebase** as the primary backend platform for authentication, Firestore data, Cloud Storage, and Cloud Functions. The desktop admin app (Electron) and future customer surfaces share Firebase services through documented service layers.

---

## Backend Provider

| Topic | Value |
|-------|-------|
| Primary provider | Firebase (Google Cloud) |
| Region(s) | See Firebase console / `FIREBASE.md` |
| Account / project ID | `[NEEDS HUMAN INPUT — do not store secrets here]` |

### Project-Specific Backend Docs

| Doc | Purpose |
|-----|---------|
| **`FIREBASE.md`** | Firebase Auth, Firestore, Functions, Storage, rules, env vars — **source of truth** |
| `DATA_MODEL.md` | Collections, entities, status values, relationships |

---

## Authentication

| Topic | Value |
|-------|-------|
| Provider | Firebase Authentication |
| Flows | Email/password (team accounts); see `FIREBASE.md` |
| Session / token | Firebase client SDK session |
| Local dev auth | Firebase emulators or project dev credentials — see `docs/workflow/setup/` |

---

## Database / Primary Store

| Topic | Value |
|-------|-------|
| Type | Cloud Firestore |
| Access pattern | Firebase SDK via renderer services; security rules enforced server-side |
| Local development | Firestore emulator — see `docs/workflow/setup/firestore-setup.md` |

See `DATA_MODEL.md` for entities.

---

## Storage (Files / Media)

| Topic | Value |
|-------|-------|
| Provider | Firebase Cloud Storage |
| Public vs private | Staff-only paths for originals, thumbnails, previews |
| Access control | Storage security rules — see `FIREBASE.md` and `docs/workflow/setup/firebase-storage-setup.md` |

---

## APIs

### Internal API

Fresh Prints does not expose a separate REST API for core operations. Business logic runs in:

- Electron renderer services (Firebase SDK)
- Firebase Cloud Functions (server-side operations)

### External Integrations

| Service | Purpose | Auth method | Doc |
|---------|---------|-------------|-----|
| Resend | Team invitation email | API key (Functions) | `docs/workflow/setup/resend-email-setup.md` |

---

## Serverless / Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `createTeamUser` | Callable | Create team user + invitation flow |
| `updateTeamUser` | Callable | Update team user fields |

Location: `functions/src/` — compiled to `functions/lib/` (gitignored). See `docs/workflow/setup/firebase-functions-setup.md`.

---

## Environment Variables

> Document **names and purpose only**. Never commit values.

See `FIREBASE.md` and `docs/workflow/setup/` for Firebase and Resend configuration.

---

## Local Development

### Prerequisites

- Node.js 18+
- Firebase CLI
- Electron dev environment

### Start Backend

Use Firebase emulators or connect to a dev Firebase project per setup guides in `docs/workflow/setup/`.

### Desktop App

```bash
npm run dev
```

---

## Production Considerations

- Rate limits: Firebase quotas apply
- Monitoring: Firebase console
- **Human approval** required for production rule changes, auth config, and secret rotation

---

## Security Notes

See `docs/standards/SECURITY.md`. Firebase rules and Electron IPC security are documented in `FIREBASE.md` and `docs/workflow/setup/electron-security-setup.md`.

---

## Revision History

| Date | Summary |
|------|---------|
| 2026-06-24 | Initial Fresh Prints backend overview; links to FIREBASE.md |
