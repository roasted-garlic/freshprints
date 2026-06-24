---
name: implement-phase
description: Implement approved plan scope only. Use after review approval in managed phase.
---

# Implement Phase

## Purpose

Execute approved changes with narrow scope, doc updates, and checkpoint discipline.

## When to Use

- `Review Status` is `approved` or `approved_with_changes`
- `Implementation Status` is pending or in_progress
- User explicitly forbids implement before review (default)

## Inputs

- Approved plan and review in `docs/workflow/plans/` and `docs/workflow/reviews/`
- `.cursor/workflow/state.md` with implement allowed
- Architecture, coding, security, backend, data model rules

## Steps

1. **Gate check**
   - Plan exists? Review approved? If no → stop
2. **Scope lock**
   - List files to touch from plan; reject drive-by changes
3. **Implement**
   - Follow layer and quality rules
   - Use `safe-backend-change` / `safe-database-change` when applicable
4. **Docs**
   - Update docs when behavior changes (skill: `documentation-update` as needed)
5. **State**
   - Track `Files Created`, `Files Modified`
   - `Implementation Status: complete` when done
   - `Next Required Step: Run tests`

## Outputs

- Code changes within approved scope
- Updated docs for behavior changes
- Updated workflow state

## Stop Conditions

- Human checkpoint (migration, deploy, auth, secrets, console)
- Scope insufficient → stop, replan, re-review
- Implementation complete → test phase; do not signoff yet
