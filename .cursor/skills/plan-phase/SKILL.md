---
name: plan-phase
description: Create a plan document in docs/workflow/plans/ before implementation. Use during managed phase or when planning any scoped work.
---

# Plan Phase

## Purpose

Produce an actionable plan that defines scope, impacts, risks, and test strategy before any implementation.

## When to Use

- Start of managed phase
- After review blocked and scope must be revised
- Intake/bootstrap planning steps
- Any work where `Plan Status` is not complete

## Inputs

- Goal from workflow state or user
- Docs per `documentation.mdc` reading order
- `.cursor/workflow/plan-template.md`
- `.cursor/workflow/risk-checklist.md`

## Steps

1. Read workflow state and confirm planning is allowed
2. Read relevant project docs (brief, architecture, data model, backend, roadmap)
3. Inspect affected areas of repo if needed (read-only)
4. Copy `plan-template.md` → `docs/workflow/plans/[descriptive-name]-plan.md`
5. Complete all template sections:
   - Goal, scope in/out, affected files
   - Architecture, security, data, backend, UI impacts
   - Migration notes if applicable
   - Test strategy (automated + manual)
   - Human checkpoints anticipated
   - Risks and rollback approach
6. Update workflow state:
   - `Current Phase: plan`
   - `Plan Status: complete`
   - `Review Status: pending`
   - `Next Required Step: Review plan`

## Outputs

- Plan file in `docs/workflow/plans/`
- Updated `.cursor/workflow/state.md`
- Open questions list → human checkpoint if blocking

## Stop Conditions

- Cannot plan without business decision → human checkpoint
- Intake/bootstrap docs missing for greenfield/existing unknown → run appropriate skill first
- Plan complete → do not implement; proceed to review phase
