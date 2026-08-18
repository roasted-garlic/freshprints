# Plan: Repository development-first reconciliation

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `repository-development-first-reconciliation` |
| Related | ADR-FP-137; `docs/standards/DEPLOYMENT.md` |

---

## Goal

Restore `C:\coding\fresh-prints` to a clean `development` line that contains current live production source, document the owner’s development-first Git workflow so every future Cursor session follows it, and open a narrow `development` → `production` docs/policy sync PR. Do not implement `portal-design-engagement-analytics` in this goal.

## Background

`origin/development` (`3d44cea`) was one docs-only GA4 enablement closeout commit ahead of merge-base `124c6fa`. `origin/production` (`cb006bd`, PR #81) had the live GA4 transmission corrective. The main checkout was dirty on `fix/td-030-share-qty-parity`. Stale remote `docs/portal-ga4-enablement-closeout` matched `origin/development`.

Owner decision: sole developer; no per-goal branches or worktrees unless explicitly requested.

## Scope

### In Scope

- Preserve classified dirty/untracked work (stash; do not drop)
- Switch main checkout to `development` in place; fast-forward; merge `origin/production` without rewriting history
- Durable policy: session-start `docs/AI_RULES.md`, Git details in `docs/standards/DEPLOYMENT.md`, ADR in `docs/project/DECISIONS.md`, short pointer in `AGENTS.md` / `CLAUDE.md`
- Commit missing live GA4 corrective records that production never committed
- Commit FreshForge shell guard already in use locally
- Push `development`; open sync PR
- Prove and request deletion of stale `docs/portal-ga4-enablement-closeout`

### Out of Scope

- `portal-design-engagement-analytics` implementation
- Force-push, reset --hard, git clean, stash drop
- New feature/fix/docs branches or worktrees
- Production merge, App Hosting, secrets, GA4 console
- Deleting non-proven branches/worktrees (phase9, measurement, transmission leftovers)

## Affected Areas

- Docs / workflow / `.cursor/hooks*`
- No Portal/Studio application behavior except already-merged production GA4 bootstrap arriving via merge

## Approach

1. Stash dirty main checkout (`-u`), do not drop historical stashes
2. `git switch development` + ff `origin/development` + merge `origin/production`
3. Resolve genuine conflicts (state, ROADMAP, DEPLOYMENT) to live `cb006bd` / `build-2026-08-18-001` facts plus closeout history
4. Document ADR-FP-137
5. Push development; PR to production; STOP for independent audit / owner merge authorization

## Test Strategy

| Check | Required |
|-------|----------|
| Merge conflict-free tree | yes |
| `git merge-base --is-ancestor origin/production HEAD` | yes |
| `git diff --check` on policy files | yes |
| Portal typecheck/build | no (docs + already-signed-off production source) |

## Human Checkpoints Anticipated

- [x] Owner authorized this reconciliation procedure
- [ ] Independent development→production PR audit
- [ ] Owner merge authorization
- [ ] Owner runs `git push origin --delete docs/portal-ga4-enablement-closeout` (shell guard blocks agent)
- [ ] App Hosting: **not** required for this docs/policy sync unless owner later decides otherwise

## Rollback Plan

Revert the policy commit on development. The merge commit can remain (it only adds already-live production history). Do not reset production.

## Open Questions

- [x] Git policy owner: `docs/standards/DEPLOYMENT.md` (details); session-start rule in `docs/AI_RULES.md`
- [x] Stale closeout branch: proven identical to `origin/development` @ `3d44cea`
