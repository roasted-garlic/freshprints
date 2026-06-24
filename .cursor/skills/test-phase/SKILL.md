---
name: test-phase
description: Run and record tests honestly before signoff. Use after implementation or for docs consistency checks.
---

# Test Phase

## Purpose

Execute applicable automated checks, record results, and determine signoff readiness.

## When to Use

- After implementation phase
- Intake/bootstrap documentation consistency verification
- Before signoff phase

## Inputs

- `docs/standards/TESTING.md`
- Implementation or docs under test
- `.cursor/workflow/test-report-template.md`
- `.cursor/workflow/state.md`

## Steps

1. Confirm implementation complete (or docs-only workflow scope)
2. Identify applicable checks from testing rules:
   - typecheck, lint, unit, build, integration, E2E, backend/rules
3. Run each command that exists; record command + exit code + summary
4. For missing commands: document in report; recommend in TESTING.md
5. Determine if manual testing required → `manual-test-checkpoint` skill
6. Create `docs/workflow/reviews/[name]-test-report.md`
7. Update state:
   - `Tests Run: [list]`
   - `Test Status: passed | passed_with_notes | failed | failed_documented | pending_manual`

## Outputs

- Test report in `docs/workflow/reviews/`
- Updated workflow state
- Manual test instructions if needed

## Stop Conditions

- **Never claim passed without running**
- Failures outside scope → `failed_documented`, block signoff
- `pending_manual` → human checkpoint before signoff
- All required checks pass → signoff phase
