# Checkpoint: Production Portal App Hosting rollout — loading-ownership fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approval | `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT: LOADING-OWNERSHIP FIX` |
| Source fix commit | `7a88e6b` |
| Production merge | PR #13 → merge `58aa0da` |
| Rollout | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 58aa0da --force` → **Successfully created a new rollout** |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Backend updated | 2026-07-31 16:13:00 (local) / post-rollout |
| Automatic rollouts | Remain **disabled** |

## Pre-rollout verification

| Check | Result |
|-------|--------|
| Auth-focused tests | 27/27 pass |
| Portal typecheck | pass |
| `git diff --check` (auth touch set vs production) | pass |
| Runtime vs prior production | Portal auth loading-ownership + docs; no Functions/Rules/Auth Console |

## Post-rollout verification

| Check | Result |
|-------|--------|
| `/complete-profile` HTTP | 200 |
| New layout chunk | `layout-2fcf553bc38b7304.js` (replaces prior layout hash) |
| `[fp-portal-auth]` + timeout strings | present in served JS |
| `7a88e6b` ancestor of `origin/production` | yes |

## Not done

- No Auth user delete/disable
- No branding implement
- No Stage 2 smoke
- No custom-domain cutover
- Owner registration QA **pending**

## Owner QA result — **PASS WITH NOTES** (2026-07-31)

Exact recorded result:

> PASS WITH NOTES: Google registration completed successfully. The complete-profile form was interactive before Continue, submission completed, and the Portal loaded normally with no stuck spinner.

Non-blocking notes:

1. Username HTML `pattern` `[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]` reported invalid by browser (may disable native validation) — narrow follow-up / tech debt.
2. Asynchronous-listener console message — extension noise; no Portal failure.
3. COOP `window.closed` during Google popup — non-blocking; Auth + provisioning succeeded.

Signoff: `docs/workflow/reviews/2026-07-31-production-portal-registration-loading-ownership-signoff.md`
(**approved_with_notes**).

## Owner QA — reply format (closed)

Superseded by PASS WITH NOTES above.
