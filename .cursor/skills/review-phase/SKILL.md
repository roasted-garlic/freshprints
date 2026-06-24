---
name: review-phase
description: Review plans or implementations for approval, changes required, or blocked status. Use after planning and before implementation.
---

# Review Phase

## Purpose

Validate plans (and optionally implementations) against project rules and docs. Produce explicit approval outcome.

## When to Use

- After plan phase completes
- After implementation when plan requested post-implementation review
- Intake/bootstrap doc review steps

## Inputs

- Plan in `docs/workflow/plans/`
- Implementation diff (if reviewing code)
- `.cursor/workflow/review-template.md`
- Rules: architecture, security, data-model, backend, testing, documentation
- Optional: Security Agent and Architecture Agent perspectives

## Steps

1. Confirm `Plan Status: complete`
2. Read plan and all referenced docs
3. Check:
   - [ ] Scope clear and bounded
   - [ ] Architecture alignment
   - [ ] Security impact addressed
   - [ ] Data model impact and migrations noted
   - [ ] Backend impact documented
   - [ ] Test strategy adequate
   - [ ] Human checkpoints identified
   - [ ] Roadmap alignment
   - [ ] No silent scope expansion
4. Create `docs/workflow/reviews/[name]-review.md` from template
5. Set verdict: **approved** | **approved_with_changes** | **blocked**
6. Update workflow state:
   - `Review Status: [verdict]`
   - If approved: allow implement phase
   - If blocked: `Blocked: yes`, `Blocker: [reason]`

## Outputs

- Review document in `docs/workflow/reviews/`
- Updated workflow state
- Required changes list for planning agent if not approved

## Stop Conditions

- `blocked` → stop; no implementation
- `approved_with_changes` → planning agent updates plan OR implement agent follows listed changes only
- High-risk security → flag human checkpoint before production steps
- Review complete → hand off per verdict
