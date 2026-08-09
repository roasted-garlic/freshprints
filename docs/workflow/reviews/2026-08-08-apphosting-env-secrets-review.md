# Review: Move Portal App Hosting env out of committed plaintext

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Plan | docs/workflow/plans/2026-08-08-apphosting-env-secrets-plan.md |
| Verdict | **approved** |
| Reviewer | Agent (Review phase) |

---

## Summary

Plan correctly verifies the bug (plaintext `NEXT_PUBLIC_*` in `apphosting.yaml` since
`60cff59`) and restores the original production-release intent: Secret Manager references in
YAML, values only in gitignored local env / Secret Manager. Scope is appropriately narrow
(config + docs; no app code; no agent-run production actions).

## Checklist

| Area | Result | Notes |
|------|--------|-------|
| Scope clarity | pass | Eight variables; GA4 still unset |
| Security | pass | Config hygiene; honest about residual git history |
| Sequencing | pass | Secrets before next rollout is mandatory |
| Rollback | pass | Revert YAML or Console overrides |
| Docs | pass | DEPLOYMENT + `.env.example` |
| Out of scope | pass | No history rewrite, no key rotation, no prod deploy by agent |

## Required changes before implement

None.

## Notes

- Firebase docs confirm `secret:` in `apphosting.yaml` + `firebase apphosting:secrets:set` /
  `grantaccess` is the supported pattern.
- Console env vars take precedence over YAML if both exist — document once; prefer secrets as
  the single production source after cutover.
- `availability: BUILD` (+ RUNTIME) must remain so Next.js can inline `NEXT_PUBLIC_*`.

## Verdict

**approved** — proceed to implementation of YAML + docs only. Do not create secrets or trigger
App Hosting rollout without human approval.
