---
name: safe-backend-change
description: Safely plan and implement backend, auth, API, storage, functions, queues, jobs, or webhook changes with security review and production gates.
---

# Safe Backend Change

## Purpose

Ensure backend-related changes follow security review and human approval for production.

## When to Use

- Auth provider or flow changes
- API endpoint additions or breaking changes
- Database security rules or RLS
- Storage bucket rules
- Serverless/edge functions
- Queues, jobs, schedulers
- Webhooks (inbound/outbound)
- Third-party service integration
- Backend environment configuration

## Inputs

- Plan with backend impact section
- `docs/architecture/BACKEND.md`, `docs/standards/SECURITY.md`, `docs/architecture/DATA_MODEL.md`
- Security Agent review

## Steps

1. Document change in plan: provider, endpoints, auth, env vars, rollback
2. Review phase must include Security Agent checks:
   - Least privilege
   - Input validation
   - Secret handling
   - Error and rate limit handling
3. Implementation:
   - No secrets in code
   - Update BACKEND.md and env documentation
   - Update TESTING.md with backend test commands
4. Test: integration and rules tests when applicable
5. **Production**: human checkpoint required before deploy or live config change

## Outputs

- Updated backend code/config (in scope)
- Updated BACKEND.md, SECURITY.md as needed
- Security review notes in review/signoff docs
- Human approval record for production

## Stop Conditions

- Production change without human approval → stop
- Security review blocked → stop
- Missing env documentation → complete before signoff
