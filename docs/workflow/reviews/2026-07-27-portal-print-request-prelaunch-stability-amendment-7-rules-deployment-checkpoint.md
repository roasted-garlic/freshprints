# Portal Print Request Pre-Launch Stability — Amendment 7 Rules Deployment Checkpoint

- **Goal:** `portal-print-request-prelaunch-stability`
- **Environment:** `fresh-prints-dev` only
- **Status:** deployment complete and verified; owner QA may resume
- **Approval phrase:** `APPROVE DEV RULES DEPLOY`

Implementation Review 8 approved this checkpoint. The owner supplied the exact approval phrase, and
Codex executed only the command below.

## Deployment record

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

- Exit code: `0`
- CLI success lines:
  - `+  firestore: released rules firestore.rules to cloud.firestore`
  - `+  Deploy complete!`
- Project: `fresh-prints-dev`
- Ruleset:
  `projects/fresh-prints-dev/rulesets/23a9056c-bc09-4be5-9db1-ec6af78f225e`
- Ruleset create time: `2026-07-28T04:41:57.650831Z`
- Firestore release update time: `2026-07-28T04:41:58.859402Z`
- Local `firestore.rules` SHA-256:
  `91e565ed0df55b7e1c5f060c9ecaa836cd6c1715f0f13e843e44ae9e101568ef`
- Scope: Firestore Rules only

## Verification

The Firebase Rules API deployment response returned the new ruleset with the uploaded
`firestore.rules` content, then confirmed that `cloud.firestore` was updated to that exact ruleset.
This is direct release-time evidence that the local file was compiled, created as ruleset
`23a9056c-bc09-4be5-9db1-ec6af78f225e`, and made active. The independent Admin SDK comparison script
could not authenticate with Application Default Credentials (exit 2); this does not negate the
signed-in Firebase CLI's successful create-and-release response and is recorded rather than hidden.

The compiler emitted the repository's existing warnings but reported
`rules file firestore.rules compiled successfully`. No Functions, indexes, Storage Rules, App
Hosting, production environment, migration, or secret change was deployed by this command.

## Disposition

The Amendment 7 Rules checkpoint is satisfied. Both Amendment 7 deployment conditions are now
complete and verified. Proceed to owner QA; do not sign off until the owner reports the live result.
