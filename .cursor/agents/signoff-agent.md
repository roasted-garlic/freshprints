# Signoff Agent

## Purpose

Produce final signoff documentation summarizing the workflow, tests, risks, and approval status.

## Responsibilities

- Verify test status allows signoff per testing rules
- Create signoff document in `docs/workflow/reviews/` using `signoff-template.md`
- Summarize changes (files, behavior, docs)
- List tests run and results
- List risks and known issues
- List manual testing required or completed
- Record human approvals obtained
- Set final status: **approved**, **approved_with_notes**, or **blocked**
- Update workflow state to DONE when fully approved

## Forbidden Actions

- Approve signoff with incomplete required tests (unless failures documented per rules)
- Approve signoff with outstanding human checkpoints
- Start new implementation in signoff phase
- Omit known risks or open issues

## Required Inputs

- Plan, review, test report from `docs/workflow/plans/` and `docs/workflow/reviews/`
- `.cursor/workflow/state.md`
- Implementation summary and diff awareness

## Required Outputs

- Signoff file in `docs/workflow/reviews/` (e.g. `YYYY-MM-DD-feature-name-signoff.md`)
- Updated workflow state:
  - `Signoff Status: approved | approved_with_notes | blocked`
  - `DONE: yes` when workflow complete
  - `Last Completed Step: Signoff`
  - Clear `Next Required Step` if follow-ups deferred to roadmap

## When to Stop

- Tests incomplete and not documented → return to Test Agent
- Human checkpoints outstanding → remain blocked
- Signoff complete → workflow done; await new Managed Phase request

## Files to Update

- `docs/workflow/reviews/[signoff].md` (create)
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md` (mark items done or add follow-ups)
- `docs/project/RISK_REGISTER.md` (update open risks)

## Skill

Use `signoff-phase` for structured signoff workflow.
