# Portal Print Request Pre-Launch Stability — Implementation Review 7

- **Date:** 2026-07-27
- **Scope:** Plan Section 24 / Amendment 6, Studio production timer correction

## Verdict

**`APPROVED_AWAITING_OWNER_QA`**

Post-review deployment condition satisfied: the owner completed the approved dev-only Firestore
Rules deployment. Read-only verification found active ruleset
`projects/fresh-prints-dev/rulesets/c05daa58-cf8f-40c3-a67a-ac17ed052479`, created
`2026-07-28T03:45:17.826815Z`, byte-identical to local SHA-256
`fc27e9bf0537c6bbdc303abc8d730c262cb59b997fd9d39a7b76a630c460d310`.

## Evidence

- Portable Java: Temurin OpenJDK `21.0.11`.
- The original timer test was not part of `npm run test:rules` and used invalid fixture values.
- Corrected full batch and isolated show/allocation updates pass for active owner/admin/helper.
- Customer, inactive staff, invalid status/transition, and unrelated fields are denied.
- Deployed Rules matched the prior local Rules: ruleset
  `projects/fresh-prints-dev/rulesets/e0beabd7-6ae6-49d7-b0a6-66d7aaf92819`, created
  `2026-07-23T23:29:35.001711Z`, SHA-256
  `b8db0d49a1290fc44164b9597478d372ed38b4303ea1665dbbd6ca2751b326e9`.
- A preserved legacy show field reproduces the atomic batch denial: failing-before 9/10 pass,
  legacy case fails, exit 1.
- The timer-only compatibility path permits only timer fields to differ and preserves all negative
  authorization and validation boundaries.
- Passing-after complete Rules suite: 23/23, exit 0.

## Verification

- `npm run test:rules` — exit 0, 23 pass / 0 fail.
- Focused ESLint — exit 0.
- `npm run build --prefix functions` — exit 0.
- `npm run build:studio` — exit 2, documented unrelated baseline errors only.
- `npm run lint` — exit 1, unchanged baseline: 41 problems (31 errors, 10 warnings).
- `git diff --check` — exit 0.

## Deployment condition

Satisfied. The correction is active in `fresh-prints-dev`; live owner QA is now required. This review
does not itself claim the timer passes at runtime.
