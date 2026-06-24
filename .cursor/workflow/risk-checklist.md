# Risk Checklist

Use during **plan phase** and **review phase**. Copy relevant items into plan and review docs.

---

## Scope & Process
- [ ] Scope creep beyond stated goal
- [ ] Missing human checkpoint for known approval need
- [ ] Implementing before review approved
- [ ] Broad refactor disguised as small fix

## Architecture
- [ ] Layer violation (UI calling backend directly)
- [ ] Circular dependency introduced
- [ ] Shared types duplicated
- [ ] Feature boundaries unclear

## Security
- [ ] Client-only authorization
- [ ] Missing input validation
- [ ] Secrets in code or logs
- [ ] Over-privileged API keys or service accounts
- [ ] Unsafe file upload handling
- [ ] New dependency with unknown maintenance/security posture

## Data
- [ ] Schema change without migration notes
- [ ] Destructive migration without rollback
- [ ] Undocumented status values or transitions
- [ ] PII stored without classification
- [ ] Binary data in database

## Backend
- [ ] Missing error handling on external API
- [ ] No retry/timeout strategy
- [ ] Undocumented environment variables
- [ ] Webhook without signature verification
- [ ] Production config change without approval plan

## Testing
- [ ] No test strategy for changed behavior
- [ ] Security/rules change without rules tests
- [ ] UI change without manual test plan
- [ ] Claiming tests passed without running

## Deployment
- [ ] Production deploy without rollback plan
- [ ] CI change untested
- [ ] Environment drift between staging and production

## Documentation
- [ ] Behavior change without doc update
- [ ] Conflict between docs unresolved
- [ ] Placeholder docs treated as truth

---

## Severity Guide

| Level | Meaning |
|-------|---------|
| Critical | Must block until resolved |
| High | Must fix before signoff or require human acceptance |
| Medium | Document and mitigate |
| Low | Track on roadmap |

Record items in plan **Risks** table and `docs/project/RISK_REGISTER.md` when they persist beyond the workflow.
