# Signoff: Production customer show-schedule visibility

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Portal build | `build-2026-08-01-001` |
| Revision | `fresh-prints-portal-build-2026-08-01-001` |
| Production commit | `11960852f45f948e37a1a5aeb3b09699882cd1fd` |
| Owner QA | **PASS** |
| Final status | **approved** (schedule-visibility slice only) |

## Owner results

Tests 1 through 9: **PASS**. Schedule visibility passed across all tested request cards, My Print Requests tabs, request statuses, details layouts (including terminal/null-progress layouts), refresh/navigation persistence, queue lifecycle refresh, multiple-show behavior, privacy requirements, and existing limit-callout sanity.

## Automated and rollout evidence

- Focused schedule/limit suite: 60/60 pass before Portal rollout.
- Portal typecheck, production build, repository lint, and `git diff --check`: pass.
- Production Functions: approved nine-Function allowlist ACTIVE.
- Hosted Portal: HTTP 200; deployed schedule client chunk present; callable reachable and authentication-required.

## Scope and remaining checkpoints

- Automatic App Hosting rollouts remain disabled.
- Domain cutover remains deferred.
- Dual-limit Studio Settings UI installation/QA and intentional production settings save remain pending and are not signed off here.
- No deployment, settings/data mutation, Stage 2 action, or domain action occurred during owner QA/signoff.

