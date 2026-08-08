# Signoff: Move Portal App Hosting env out of committed plaintext

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Plan | docs/workflow/plans/2026-08-08-apphosting-env-secrets-plan.md |
| Review | docs/workflow/reviews/2026-08-08-apphosting-env-secrets-review.md |
| Test report | docs/workflow/reviews/2026-08-08-apphosting-env-secrets-test-report.md |
| Status | **approved_with_notes** |

---

## Summary

Hardcoded production `NEXT_PUBLIC_*` values removed from `apps/portal/apphosting.yaml` and
replaced with Cloud Secret Manager `secret:` references. Deployment docs and `.env.example`
updated. Owner confirmed eight secrets exist and are granted on `fresh-prints-prod` /
`fresh-prints-portal`.

## Files touched

- `apps/portal/apphosting.yaml`
- `apps/portal/.env.example`
- `docs/standards/DEPLOYMENT.md`
- `docs/project/ROADMAP.md` (supersession note)
- Workflow plan / review / checkpoint / test report / this signoff

## Tests

| Check | Result |
|-------|--------|
| Static: no plaintext prod identifiers in `apphosting.yaml` | PASS |
| Docs consistency | PASS |
| Owner secrets create/grant | PASS (`APP HOSTING SECRETS READY`) |
| App typecheck/lint/build | N/A (config/docs only) |

## Manual tests and human approvals

| Item | Result |
|------|--------|
| Secrets checkpoint | PASS |
| App Hosting rollout | **Not performed** — separate production deploy gate |

## Risks / known issues / follow-ups

1. **Next App Hosting rollout** must happen only after merge of the secret-backed YAML to the
   branch the backend deploys from, under explicit owner deploy approval. Until then, live Portal
   continues on the previous build (still baked with prior config).
2. **Git history** still contains the old plaintext values (`60cff59`+); rewrite out of scope.
3. Prefer Secret Manager as the single production source; avoid duplicating the same vars as
   Console overrides unless intentional.

## Final status

**approved_with_notes** — repo config-hygiene goal complete; live secret-backed rollout deferred
to a separate production deploy approval.
