---
name: safe-deployment
description: Safely handle production deploys, hosting, environment variables, CI/CD, and release process with human approval gates.
---

# Safe Deployment

## Purpose

Ensure deployments and release-related changes are planned, tested, and human-approved for production.

## When to Use

- Production deploy
- Staging/production environment config
- CI/CD pipeline changes
- Build configuration affecting release
- Environment variable changes in shared environments
- Hosting or DNS changes
- Release tagging and changelog

## Inputs

- Plan with deployment section
- `docs/standards/DEPLOYMENT.md`, `docs/architecture/BACKEND.md`
- Test report showing build success

## Steps

1. Document in plan:
   - Target environment
   - Deploy steps and owner
   - Env vars added/changed
   - Rollback procedure
   - Release checklist items
2. Review deployment impact
3. Implement CI/build changes in repo (not silent prod console edits)
4. Test build and deploy to non-production when possible
5. Update DEPLOYMENT.md
6. **Production release**: human checkpoint required
   - User executes or explicitly approves deploy
   - Record approval in signoff

## Outputs

- Updated DEPLOYMENT.md and CI config (in scope)
- Release checklist completion notes
- Human approval record for production

## Stop Conditions

- Production deploy without human approval → stop
- Build not verified → block signoff
- Secret rotation in prod → human checkpoint
