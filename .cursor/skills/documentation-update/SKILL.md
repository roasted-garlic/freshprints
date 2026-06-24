---
name: documentation-update
description: Update project docs when behavior, architecture, data, backend, security, style, workflow, testing, or deployment changes.
---

# Documentation Update

## Purpose

Keep documentation aligned with the codebase and decisions after changes.

## When to Use

- Behavior or API change during implement phase
- Architecture or folder restructure
- Data model or schema change
- Backend, env, or integration change
- Security policy change
- Style guide update
- New test or deploy commands

## Inputs

- Description of what changed
- Affected doc list (from plan or diff)
- Conflict priority from `documentation.mdc`

## Steps

1. Identify which docs require updates:

   | Change type | Docs |
   |-------------|------|
   | Product behavior | PROJECT_BRIEF, ROADMAP |
   | Structure/layers | ARCHITECTURE, DECISIONS |
   | Entities/schema | DATA_MODEL |
   | APIs, auth, env | BACKEND, DEPLOYMENT |
   | Security | SECURITY, RISK_REGISTER |
   | UI patterns | STYLE_GUIDE |
   | Tests | TESTING |
   | Release | DEPLOYMENT |
   | Process | WORKFLOWS |

2. Update docs; resolve conflicts using priority order
3. Add ADR to DECISIONS.md for significant choices
4. Note doc updates in plan/signoff or workflow state `Files Modified`

## Outputs

- Updated doc files
- ADR entries if applicable
- Cross-reference consistency (architecture ↔ data model ↔ backend)

## Stop Conditions

- Business copy or policy needs human approval
- Doc update complete → continue current phase
