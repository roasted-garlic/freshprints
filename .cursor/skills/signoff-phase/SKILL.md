---
name: signoff-phase
description: Create signoff documentation and close the workflow. Use after tests complete or failures are documented.
---

# Signoff Phase

## Purpose

Formalize completion with summary, test results, risks, and approval status.

## When to Use

- Test phase complete with acceptable test status
- Intake/bootstrap documentation workflows completing
- End of managed phase

## Inputs

- Plan, review, test report
- `.cursor/workflow/signoff-template.md`
- `.cursor/workflow/state.md`

## Steps

1. Verify test gate: passed, passed_with_notes, or failed_documented per rules
2. Verify no outstanding human checkpoints
3. Create `docs/workflow/reviews/[name]-signoff.md` from template:
   - Summary of changes
   - Files touched
   - Tests run and results
   - Manual tests and human approvals
   - Risks and known issues
   - Final status: approved | approved_with_notes | blocked
4. Update ROADMAP (done items, follow-ups)
5. Update workflow state:
   - `Signoff Status: [status]`
   - `DONE: yes` if approved
   - `Last Completed Step: Signoff`

## Outputs

- Signoff document in `docs/workflow/reviews/`
- Updated workflow state and roadmap
- User summary

## Stop Conditions

- Tests incomplete undocumented → return to test phase
- Outstanding checkpoints → blocked
- Approved → workflow complete
