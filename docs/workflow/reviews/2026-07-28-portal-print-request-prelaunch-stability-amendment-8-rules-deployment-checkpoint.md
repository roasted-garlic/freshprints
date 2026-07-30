# Portal Print Request Pre-Launch Stability — Amendment 8 Rules Deployment Checkpoint

- **Goal:** `portal-print-request-prelaunch-stability`
- **Environment:** `fresh-prints-dev` only
- **Status:** deployment complete; owner QA may resume
- **Approval phrase:** `APPROVE DEV RULES DEPLOY`
- **Approved by:** Implementation Review 9
- **Local Rules SHA-256:** `bbf3da6f5a5159f486b2fce0a6f0459c20ac586f0395c0e7941ab934fb50c978`

## Deployment record

```text
firebase deploy --only firestore:rules --project fresh-prints-dev
```

This checkpoint authorizes only the checked-in Firestore Rules for `fresh-prints-dev`. It does not
authorize Functions, indexes, Storage Rules, App Hosting, production, migrations, secrets, or any
combined deployment.

- Owner supplied the exact approval phrase.
- Command exit code: `0`.
- Firebase reported `rules file firestore.rules compiled successfully`.
- Firebase reported `released rules firestore.rules to cloud.firestore`.
- Firebase reported `Deploy complete!`.
- Project: `fresh-prints-dev`.
- Scope: Firestore Rules only.
- No Function, index, Storage Rules, App Hosting, production, migration, or secret deployment
  occurred.

## Verification evidence

- Formal Review: `approved_with_changes`; all constraints applied.
- Implementation Review 9: `APPROVED`.
- Failing-before exact Finish fixture: 17 tests, 16 pass, 1 expected fail.
- Passing-after full Rules suite: 34/34 under Temurin Java 21.0.11.
- Targeted Amendment 8 behavior suite: 21/21.
- Portal production build: exit 0.
- Post-deploy comparison script was attempted read-only but could not obtain Application Default
  Credentials (`metadata.google.internal` lookup failure). This is recorded honestly and does not
  negate the signed-in Firebase CLI's successful compile, upload, release, and completion response.

## Next step

Resume the Amendment 8 owner QA checkpoint. Do not sign off before the owner reports the live result.
