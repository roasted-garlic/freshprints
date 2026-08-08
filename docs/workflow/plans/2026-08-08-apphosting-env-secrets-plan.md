# Plan: Move Portal App Hosting env out of committed plaintext

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-08-apphosting-env-secrets-review.md |

---

## Goal

Remove hardcoded production Firebase Web App / Portal origin values from
`apps/portal/apphosting.yaml` and replace them with Cloud Secret Manager references
(`secret:`), so committed App Hosting config declares variable names only. Values stay in
gitignored `apps/portal/.env.production.local` (local) and Secret Manager (production), matching
the original production-release plan intent.

## Background

Bug verified 2026-08-08: `apps/portal/apphosting.yaml` contains plaintext
`NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_PORTAL_ORIGIN` values (introduced in commit
`60cff59`). These are browser-exposed by Firebase design (not cryptographic secrets), but
committing environment-specific identifiers violates config-management practice and permanently
embeds them in git history.

The production-release plan
(`docs/workflow/plans/2026-07-30-production-release-plan.md` §3.5) originally specified
`firebase apphosting:secrets:set` / Console — not committed plaintext. Implementation later
chose an `env:` `value:` block for expediency; this phase corrects that.

## Scope

### In Scope

- Replace `value:` entries in `apps/portal/apphosting.yaml` with `secret:` references
- Document required secret names, CLI setup, grant-access, and rollout sequencing in
  `DEPLOYMENT.md` (and brief notes in `.env.example` if helpful)
- Record residual risk (values already in git history) without rewriting history
- Human checkpoint for creating/granting production secrets and any subsequent App Hosting
  rollout

### Out of Scope

- Git history rewrite / secret scrubbing of past commits
- Rotating Firebase Web API keys or VAPID keys
- Setting `NEXT_PUBLIC_GA_MEASUREMENT_ID` (still deferred)
- Algolia / other Portal env vars
- Creating a `fresh-prints-dev` App Hosting backend
- Any production Firebase deploy or console action performed by the agent
- Application code changes (Portal already reads `process.env.NEXT_PUBLIC_*`)

---

## Affected Areas

### Files / Modules (expected)

- `apps/portal/apphosting.yaml`
- `docs/standards/DEPLOYMENT.md`
- `apps/portal/.env.example` (setup comments only)
- Workflow artifacts: plan, review, checkpoint, test/signoff as needed

### Architecture Impact

- [x] None (config delivery mechanism only; same env var names at build/runtime)

### Security Impact

- [x] Details: Stops new commits of production project identifiers in plaintext YAML.
  Residual: values remain in git history (`60cff59`+). Firebase Web config remains
  browser-visible after build (by design). Secret Manager holds the same non-crypto values
  for config hygiene, not for confidentiality of true secrets.

### Data Model Impact

- [x] None

### Backend Impact

- [x] Details: Production App Hosting backend `fresh-prints-portal` must have eight Secret
  Manager secrets created and access granted before the next rollout that consumes the
  updated YAML. Live rollout is unchanged until a new release is triggered.

### UI / UX Impact

- [x] None (until a broken rollout — mitigated by sequencing)

### Migration Impact

- [x] Forward steps:
  1. Owner creates secrets from gitignored `.env.production.local` via
     `firebase apphosting:secrets:set` (or Console + `grantaccess`)
  2. Merge YAML `secret:` refs
  3. Approved App Hosting rollout
- [x] Rollback / compatibility: Revert YAML to prior `value:` block **or** set equivalent
  Console override env vars (Console takes precedence over YAML). Live site keeps last
  successful build until next rollout.

---

## Approach

1. Change each `env` entry from `value: <plaintext>` to `secret: <SECRET_NAME>` with the same
   `availability: [BUILD, RUNTIME]` (required for Next.js `NEXT_PUBLIC_*` inlining).
2. Use secret IDs matching env var names for clarity, e.g.
   `NEXT_PUBLIC_FIREBASE_API_KEY` → `secret: NEXT_PUBLIC_FIREBASE_API_KEY`.
3. Update `DEPLOYMENT.md`: mark the 2026-07-30 plaintext approach superseded; document CLI
   commands, required secret list, grant-access, and “secrets before rollout” gate.
4. Add short comments to `.env.example` pointing production App Hosting at Secret Manager.
5. Do **not** print or commit values from `.env.production.local`.
6. Stop for human checkpoint before any production secret create or App Hosting deploy.

Suggested secret set commands (owner runs; values from local production env file — do not
echo values into chat/logs):

```bash
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_PROJECT_ID --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_VAPID_KEY --project fresh-prints-prod
firebase apphosting:secrets:set NEXT_PUBLIC_PORTAL_ORIGIN --project fresh-prints-prod
# If secrets were created outside the App Hosting CLI flow:
# firebase apphosting:secrets:grantaccess <SECRET> --backend fresh-prints-portal --project fresh-prints-prod
```

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | n/a (config/docs only) | no |
| Lint | n/a | no |
| Unit tests | n/a | no |
| Build | n/a (no app code) | no |
| YAML sanity | Confirm `apphosting.yaml` has no plaintext prod identifiers; each env entry uses `secret:` | yes |
| Docs consistency | `DEPLOYMENT.md` / `.env.example` match secret names | yes |

### Manual

- [x] Details: After secrets exist, next approved App Hosting rollout must serve Portal with
  correct `fresh-prints-prod` web config and `NEXT_PUBLIC_PORTAL_ORIGIN=https://myprintrequest.com`
  (homepage 200, no `fresh-prints-dev` strings). Separate human checkpoint.

---

## Human Checkpoints Anticipated

- [x] Secrets / env vars — create eight App Hosting secrets + grant access on
  `fresh-prints-portal` / `fresh-prints-prod`
- [x] Production deploy — next App Hosting rollout only after secrets verified

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rollout before secrets exist → build fails missing env | High | Human gate; document order |
| Console overrides conflict with YAML secrets | Low | Prefer one source; document Console precedence |
| Values remain in git history | Low (web config is public by design) | No history rewrite; optional future key rotation is out of scope |
| Secret name mismatch | Medium | Mirror env var names exactly |

---

## Rollback Plan

1. Revert `apphosting.yaml` to last known-good commit with `value:` block, **or**
2. Set the eight variables as Console backend env overrides (highest precedence), then redeploy.
3. Live traffic unaffected until a new rollout.

---

## Documentation Updates Required

- [x] DEPLOYMENT.md
- [x] Other: `apps/portal/.env.example` comments; workflow review/checkpoint

---

## Open Questions

- [x] None blocking repo change. Owner must perform secret create (external console/CLI).

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-08-apphosting-env-secrets-review.md
- Verdict: approved
