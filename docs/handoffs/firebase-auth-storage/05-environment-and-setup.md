# 05 — Environment and Setup

Console setup, environment variables, `firebase.json`, and deploy commands.

Cross-references existing Fresh Prints setup guides — those remain valid for this project; this doc focuses on **portable replication**.

---

## Environment Variables — Portable

### Required client variables

From `src/renderer/src/config/env.ts`:

| Variable | Purpose |
|----------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `{project}.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `{project}.appspot.com` or regional bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID from SDK config |
| `VITE_FIREBASE_APP_ID` | Web app ID |

### File layout

| File | Purpose |
|------|---------|
| `.env.local` | Local dev secrets (gitignored) |
| `.env.production` | Production build values (gitignored or CI secrets) |
| `.env.example` | Committed placeholders only |

**Never commit** real API keys. Values are visible in client bundles — Firebase security relies on **rules**, not hidden API keys.

### Validation

`validateFirebaseEnv()` in `env.ts` throws on missing keys at startup.

### Vite

Fresh Prints uses Vite (`import.meta.env`). Other bundlers:

- **Webpack:** `process.env.REACT_APP_*` or `DefinePlugin`
- **Next.js:** `NEXT_PUBLIC_*`

Rename prefix consistently; keep validation logic.

---

## Firebase Console Setup — Portable

### Order of operations

1. Create project + web app → `docs/workflow/setup/firebase-project-setup.md`
2. Enable Authentication (Email/Password) → `docs/workflow/setup/auth-testing-guide.md`
3. Enable Firestore (production mode, choose region) → `docs/workflow/setup/firestore-setup.md`
4. Enable Storage (record bucket) → `docs/workflow/setup/firebase-storage-setup.md`
5. Bootstrap first `users/{uid}` document → `auth-testing-guide.md`

`[NEEDS HUMAN INPUT]` for:

- Firebase project name and ID
- Billing approval for Storage (if prompted)
- Firestore/Storage region selection per compliance needs

### Fresh Prints console name

Setup docs reference project display name **"Fresh Prints"** — your target app will use its own name.

---

## firebase.json — Portable

**Path:** `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

**Fresh Prints–specific** addition:

```json
{
  "functions": [{
    "source": "functions",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  }]
}
```

### CLI initialization

```bash
firebase login
firebase use --add    # link local repo to project
firebase init firestore storage
```

Select existing `firestore.rules` / `storage.rules` files when prompted.

---

## Deploy Commands

From `docs/standards/DEPLOYMENT.md` and `docs/architecture/FIREBASE.md`:

| Target | Command |
|--------|---------|
| Firestore rules | `firebase deploy --only firestore:rules` |
| Firestore indexes | `firebase deploy --only firestore:indexes` |
| Storage rules | `firebase deploy --only storage` |
| Storage dry run | `firebase deploy --only storage --dry-run` |
| Functions (optional) | `cd functions && npm run build && cd .. && firebase deploy --only functions` |
| Specific function | `firebase deploy --only functions:createTeamUser` |

**Human checkpoint:** Production deploys require explicit approval per FreshForge workflow.

### Minimal replication deploy

After first rules authoring:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

## Local Development

### Run Fresh Prints app

```bash
npm install
# ensure .env.local exists with VITE_FIREBASE_*
npm run dev
```

Electron + Vite — see project `package.json` scripts.

### Connection verification — Fresh Prints–specific

`src/renderer/src/features/firebase/services/firebaseConnectionService.ts` probes Auth, Firestore, Storage reachability. Permission-denied responses count as "reachable, protected by rules."

Optional to replicate in a new app's settings/debug page.

---

## Bootstrap Strategies

### Development: Manual (no Functions)

**Portable.** Documented in `docs/workflow/setup/auth-testing-guide.md`:

1. Create Auth user in console
2. Create `users/{uid}` with matching fields
3. Login in app

### Production: Cloud Functions (optional)

**Fresh Prints–specific** but recommended for team apps:

- `functions/src/createTeamUser.ts`
- `functions/src/updateTeamUser.ts`

Requires:

- Firebase Blaze plan for outbound email (Resend) — see `docs/workflow/setup/resend-email-setup.md`
- `firebase deploy --only functions`

**Finding:** Cloud Functions are **not required** for minimal auth replication.

---

## Existing Setup Guide Index

| Guide | Path | Covers |
|-------|------|--------|
| Project + web app + env | `docs/workflow/setup/firebase-project-setup.md` | `VITE_FIREBASE_*`, `.env.local` |
| Firestore enable + collections | `docs/workflow/setup/firestore-setup.md` | Collection list, initial rules |
| Storage enable + paths | `docs/workflow/setup/firebase-storage-setup.md` | Bucket, path layout, deploy |
| Auth manual testing | `docs/workflow/setup/auth-testing-guide.md` | Test users, negative cases |
| Functions (optional) | `docs/workflow/setup/firebase-functions-setup.md` | Build, deploy, secrets |
| Electron security | `docs/workflow/setup/electron-security-setup.md` | **Fresh Prints–specific** CSP/context |

---

## Doc Accuracy Notes

| Doc claim | Code reality |
|-----------|--------------|
| `FIREBASE.md`: single init in `firebase.ts` | ✅ Matches `src/renderer/src/config/firebase.ts` |
| `FIREBASE.md`: env in `.env` / `.env.local` | ✅ Matches `env.ts` using `import.meta.env` |
| `DATA_MODEL.md`: clients cannot write users | ✅ `firestore.rules` deny all writes |
| `DATA_MODEL.md`: `isActive` syncs with Auth disabled | ✅ Via `updateTeamUser` Function, not client |
| `FIREBASE.md`: exports auth, firestore, storage | ✅ Also exports `functions` (optional for replication) |

---

## .env.example Template — Portable

```env
# Firebase Web SDK (client-safe — security enforced via rules)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Do not add Admin SDK keys to client env files.

---

## Security Reminders

- API keys in client are expected; restrict with rules and App Check (future).
- Admin SDK / service accounts belong only in Cloud Functions or CI — never in renderer.
- See `docs/standards/SECURITY.md` for full baseline.
