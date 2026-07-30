# Portal Print Request Pre-Launch Stability — Dev Rules Deployment Checkpoint

- **Goal:** `portal-print-request-prelaunch-stability`
- **Environment:** `fresh-prints-dev` only
- **Status:** deployment complete; awaiting owner live QA

## Deployment record

- Command: `firebase deploy --only firestore:rules --project fresh-prints-dev`
- Owner-reported result: completed
- Exact local CLI exit code: `[NEEDS OWNER CONFIRMATION — not present in the supplied session record]`
- CLI success message: `[NEEDS OWNER CONFIRMATION — not present in the supplied session record]`
- Active project: `fresh-prints-dev`
- Active ruleset:
  `projects/fresh-prints-dev/rulesets/c05daa58-cf8f-40c3-a67a-ac17ed052479`
- Ruleset create time: `2026-07-28T03:45:17.826815Z`
- Local/deployed SHA-256:
  `fc27e9bf0537c6bbdc303abc8d730c262cb59b997fd9d39a7b76a630c460d310`
- Read-only verification result: `IDENTICAL`, exit 0 through the signed-in Firebase CLI
- Scope: Firestore Rules on `fresh-prints-dev` only
- No production, Functions, indexes, Storage Rules, or App Hosting deployment occurred.

The timer denial is reproduced when a show preserves a legacy field because the prior Rule
revalidated the entire post-update document. The least-privilege correction permits only the exact
timer field diff, requires active staff, validates timer values/transitions, and keeps unrelated
writes denied. Complete Rules suite: 23/23 pass.

The deployment condition in Implementation Review 7 is satisfied. Do not deploy again unless
post-deploy evidence proves the active release is wrong. Proceed to the owner Test checkpoint.
