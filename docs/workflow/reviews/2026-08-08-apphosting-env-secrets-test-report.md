# Test Report: App Hosting env → Secret Manager refs

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Plan | docs/workflow/plans/2026-08-08-apphosting-env-secrets-plan.md |
| Status | **passed_with_notes** |

---

## Automated / static checks

| Check | Result | Notes |
|-------|--------|-------|
| `apphosting.yaml` has no plaintext API key / VAPID / project web IDs / portal origin | **PASS** | Grep for known prior literals empty; all eight entries use `secret:` |
| `availability` includes BUILD (+ RUNTIME) | **PASS** | Required for Next.js `NEXT_PUBLIC_*` |
| `DEPLOYMENT.md` documents secret list + sequencing | **PASS** | New "Portal App Hosting environment variables" section |
| `.env.example` points to Secret Manager for App Hosting | **PASS** | Comment-only |

App typecheck/lint/unit/build: **not required** (config + docs only; no application source changes).

## Manual / production

| Check | Result |
|-------|--------|
| Secret create + grant on `fresh-prints-prod` | **PASS** — owner `APP HOSTING SECRETS READY` (2026-08-08) |
| App Hosting rollout smoke | **pending** — separate production deploy approval |

## Notes

- Live production Portal remains on the last successful rollout until a new one is triggered.
- Historical plaintext in git (`60cff59`+) is unchanged (out of scope).
- Secrets checkpoint closed; rollout is intentionally gated.
