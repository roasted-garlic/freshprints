# Security Essentials

> Full doc: `docs/standards/SECURITY.md`

## Core principles

1. **Never trust client input** — validate server-side or in security rules
2. **Least privilege** — minimum permissions for users and services
3. **Default deny** — explicit allow rules only
4. **No secrets in client** — API keys, tokens never in renderer bundle, logs, or chat
5. **UI is not security** — `ProtectedRoute` and `RoleGate` are UX; Firestore/Storage rules enforce access

## Roles

| Role | Studio access | Typical capabilities |
|------|---------------|---------------------|
| `owner` | Yes | Full admin, settings, all users |
| `admin` | Yes | Designs, imports, AI review, helpers |
| `helper` | Yes | Imports, AI review (limited admin) |
| `customer` | **No** — Portal only | Catalog browse, print requests (Phase 8) |

Use `permissionService.ts` — never hardcode role checks in components.

## Authentication flow

```
Firebase Auth sign-in
    ↓
Load users/{uid} from Firestore
    ↓
Check isActive === true
    ↓
Bootstrap app with role + permissions
```

Deactivated users: Auth `disabled` + Firestore `isActive: false` synced via Cloud Functions.

## Secrets handling

| Secret | Where | Never in |
|--------|-------|----------|
| `OPENAI_API_KEY` | Firebase Secret Manager | Client, Firestore, Settings UI |
| Firebase config | `VITE_FIREBASE_*` env vars | Committed `.env` files |
| Resend API key | Functions / Secret Manager | Client |

## Firestore rules highlights

- `users` collection: client **cannot** create/update/delete (Functions only)
- Role helpers in rules reference `users/{uid}.role`
- Design writes require staff role checks

## Storage rules highlights

- Originals, thumbnails, previews: staff-only read/write
- Path structure enforced — no arbitrary paths

## File uploads

- Validate type, size, dimensions server-side or in main process before upload
- Store in canonical paths only (`designStoragePaths.ts`)
- Never execute user uploads

## Production changes require human approval

- Auth provider changes
- Relaxing security rules
- New public endpoints with sensitive data
- Secret rotation
- Production dependency upgrades (security-sensitive)

## AI-specific security

- OpenAI calls **only** from Cloud Functions
- Thumbnail/preview URLs fetched server-side — not raw user-supplied URLs
- AI output validated before persisting — reject placeholder/garbled content (v15 Phases 8–12)

## Incident posture

- Fail closed when validation is uncertain
- New risks → `docs/project/RISK_REGISTER.md`
- Architectural security decisions → `docs/project/DECISIONS.md`
