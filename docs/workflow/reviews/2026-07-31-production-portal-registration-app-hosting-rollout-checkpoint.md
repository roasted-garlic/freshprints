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

## Owner QA result — **FAIL** (2026-07-31)

Exact recorded result:

> FAIL: Google Auth succeeds, but complete-profile remains permanently stuck after the production rollout. No Firestore user/customer/username records are created, and the expected 45-second timeout/error/retry state never appears.

| Observation | Status |
|-------------|--------|
| Google Authentication | Succeeds |
| Reproducible `accounts:lookup` 400 | **No** |
| COOP `window.closed` | Still present — **not** classified as root cause without direct evidence |
| Setup spinner | Permanent |
| 45s timeout → terminal error / Retry | **Never appears** |
| Firestore `users` / customer / username | **Not created** |
| Portal as authenticated customer | **No** |

## Post-FAIL disposition

- Rollout of `8943d17` / `b882e5c` **remains** in place (no rollback this pass; automatic rollouts stay disabled)
- Diagnosis + plan amendment + Formal Review completed — **no** further runtime deploy this pass
- Next implementation phrase:
  `APPROVE PORTAL REGISTRATION LOADING-OWNERSHIP FIX IMPLEMENTATION`
- Do **not** reuse `APPROVE PRODUCTION PORTAL APP HOSTING ROLLOUT` until the new implementation is reviewed

See:

- `docs/workflow/plans/2026-07-31-production-portal-registration-post-rollout-amendment.md`
- `docs/workflow/reviews/2026-07-31-production-portal-registration-post-rollout-amendment-review.md`
- Updated incident

## Not done (still)

- No Auth user delete/disable
- No branding implement
- No Stage 2 smoke
- No custom-domain cutover
- No post-FAIL runtime fix deploy yet
