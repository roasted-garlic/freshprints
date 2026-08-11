# Test report: Portal design-modal scroll position preservation

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Plan | docs/workflow/plans/2026-08-10-portal-design-modal-scroll-preservation-plan.md |
| Branch | `hotfix/portal-design-modal-scroll-preservation` |
| Base | `origin/production` @ `f5584451e8cff197e0dd1acc8ea747bc992a88a9` |
| Status | **passed** |

## Commands run

| Check | Command | Exit |
|-------|---------|------|
| Focused unit | `npx tsx --test` fingerprint + PortalScrollReset containment + search persistence + phase1a containment | **0** (11 pass) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **0** |
| Lint | `npm run lint` | **0** |
| `git diff --check` | `git diff --check` | **0** |
| Portal build | `npm run build:portal` | **0** |

## Notes

- No Functions/Rules/indexes/Algolia changes.
- Manual scroll QA deferred to owner after second App Hosting rollout.
