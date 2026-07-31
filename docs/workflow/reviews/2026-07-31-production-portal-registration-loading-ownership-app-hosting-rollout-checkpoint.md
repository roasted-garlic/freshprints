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

## Owner QA — reply format

Reply `PASS`, `PASS WITH NOTES: …`, or `FAIL: …` after:

1. Open hosted.app `/register` → Continue with Google (same Google account OK; do not require a new account).
2. Confirm `/complete-profile` is **interactive** (form usable; no permanent “Creating your customer account…” before Continue).
3. Complete profile (display name + username + bidding ack).
4. Confirm overlay exits and portal loads as customer — **or** terminal error ≤ ~45s with Retry + Use a different account usable.
5. Optional DevTools: Console → enable **Info** → filter `fp-portal-auth` → stage names only (no tokens/emails/UIDs).
6. Stage 1 fixtures unchanged; do not start branding/Stage 2 until PASS.
