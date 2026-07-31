# Checkpoint: Production Portal App Hosting rollout — registration loading-state fix

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approval | `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` |
| Source fix commit | `b882e5c` |
| Production merge | PR #12 → merge `8943d17` |
| Rollout | `firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit 8943d17 --force` → **Successfully created a new rollout** |
| Hosted URL | `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app` |
| Backend updated | 2026-07-31 15:36:10 (local) / post-rollout |
| Automatic rollouts | Remain **disabled** (explicit `rollouts:create` required; no auto-deploy from push) |

## Pre-rollout verification

| Check | Result |
|-------|--------|
| Runtime diff vs prior `production` | Only Portal auth: `AuthProvider.tsx`, `CompleteProfileForm.tsx`, `completeProfileProvisioning.ts` (+ test). Rest docs/workflow |
| Unrelated Firebase components in PR | **None** (no Functions/Rules/Auth Console/API-key/domains/Storage/CORS/data) |
| Portal auth tests | 20/20 pass |
| typecheck / lint / build:portal | pass |
| `git diff --check` | pass |

## Post-rollout verification

| Check | Result |
|-------|--------|
| `/complete-profile` HTTP | 200 |
| `[fp-portal-auth]` in served JS | **present** (layout chunk); stage-only logging, no tokens/emails/UIDs in marker vicinity |
| Homepage | 200 with Fresh Prints Request Portal title |

## Not done

- No Auth user delete
- No branding implement
- No Stage 2 smoke
- Owner registration QA **pending**

## Owner QA — reply format

Reply `PASS`, `PASS WITH NOTES: …`, or `FAIL: …` after:

1. Open hosted.app `/register` → Continue with Google (same account OK).
2. Complete profile (display name + username + bidding ack).
3. Confirm overlay exits and portal loads (not permanent “Setting up…”).
4. DevTools Console: `[fp-portal-auth]` stages through `callable_*` / `completed` (or timeout/error with Retry / Use a different account).
5. Confirm no tokens/emails/UIDs in those log lines.
6. Optional: force a failure path or wait for timeout messaging once if easy.
7. Stage 1 fixtures unchanged; do not start branding/Stage 2 until PASS.
