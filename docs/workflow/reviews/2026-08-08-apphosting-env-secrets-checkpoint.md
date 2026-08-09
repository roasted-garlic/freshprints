# Human Checkpoint: App Hosting Secret Manager cutover

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Plan | docs/workflow/plans/2026-08-08-apphosting-env-secrets-plan.md |
| Status | **PASS** |

---

## Why

Repo now references eight Cloud Secret Manager secrets from `apps/portal/apphosting.yaml`
instead of committed plaintext. The live Portal build is unchanged until the next App Hosting
rollout. That rollout will **fail** if the secrets are missing.

## Owner actions (production console / CLI)

Use values from gitignored `apps/portal/.env.production.local`. Do not paste values into chat.

1. For each secret name below, run (or create in Secret Manager + `grantaccess`):

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_VAPID_KEY --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_PORTAL_ORIGIN --project fresh-prints-prod
```

2. Ensure backend `fresh-prints-portal` can access each secret (`grantaccess` if needed).

3. Reply with one of:
   - `APP HOSTING SECRETS READY` — all eight created and granted
   - `FAIL: …` — what blocked

4. Only after that, approve a separate App Hosting rollout (do not auto-deploy).

## Pass criteria

- [x] All eight secrets exist on `fresh-prints-prod`
- [x] `fresh-prints-portal` has access
- [x] Owner confirms without pasting secret values into chat

## Owner feedback

| Date | Reply | Result |
|------|-------|--------|
| 2026-08-08 | `APP HOSTING SECRETS READY` | **PASS** — secrets create/grant checkpoint closed |

## Follow-up (separate gate)

Next App Hosting rollout that consumes the secret-backed `apphosting.yaml` still requires
explicit production deploy approval. Do not auto-deploy.
