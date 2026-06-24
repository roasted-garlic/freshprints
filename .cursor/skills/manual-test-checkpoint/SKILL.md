---
name: manual-test-checkpoint
description: Create manual test instructions, wait for user feedback, and record pass/fail in workflow state and signoff docs.
---

# Manual Test Checkpoint

## Purpose

Handle testing that requires human eyes, interaction, or environment access.

## When to Use

- UI/UX or visual verification
- Cross-browser or device testing
- Flows without E2E coverage
- Staging/production smoke tests
- Accessibility manual checks
- Business workflow validation

## Inputs

- Feature area and acceptance criteria from plan
- `.cursor/workflow/human-checkpoint-template.md`
- `.cursor/workflow/state.md`

## Steps

1. Set workflow state:
   - `Human Checkpoint Required: yes`
   - `Human Checkpoint Reason: Manual test required for [area]`
   - `Test Status: pending_manual`
   - Restrict `Allowed Actions` to waiting/documentation
2. Create checkpoint doc or section using template:
   - Environment and prerequisites
   - Numbered steps with expected results
   - Pass criteria checklist
   - Reply format: PASS / FAIL / PASS WITH NOTES
3. Present instructions clearly to user; stop autonomous work
4. On user response:
   - Record in `Decision Log` with timestamp
   - Update test report and signoff with result
   - If FAIL: set blocked or return to implement/test per severity
   - If PASS: clear checkpoint, resume workflow

## Outputs

- Manual test instructions delivered to user
- Recorded result in workflow state and docs/workflow/reviews/
- Updated Test Status

## Stop Conditions

- Awaiting user → workflow paused
- User responds → resume per result
- Do not mark signoff approved until manual tests required by plan are complete or explicitly waived by human
