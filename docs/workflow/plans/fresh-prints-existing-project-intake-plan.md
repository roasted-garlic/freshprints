# Plan: Fresh Prints Existing Project Intake

| Field | Value |
|-------|-------|
| Date | 2026-06-24 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | existing-project-intake |
| Related | docs/workflow/reviews/fresh-prints-existing-project-intake-review.md |

---

## Goal

Analyze the Fresh Prints app after AppForge migration, verify migration cleanliness, refresh project documentation from repository inspection, and recommend the next safe development phase — **documentation only**, no app code changes.

## Scope

### In Scope
- Migration verification checklist
- Stale path fixes in active workflow files
- Repository inspection (stack, features, rules, tests, git tracking)
- Update project docs, intake findings, health, tech debt, risks, decisions
- Recommend next managed phases
- Validation: `npm run lint` (and other package.json scripts if present)

### Out of Scope
- Application source code changes
- Firebase deploy, rules changes, secrets, production config
- Deleting tracked build artifacts (recommend only)
- Implementation of recommended phases

---

## Approach

1. Verify AppForge migration artifacts and folder structure
2. Grep and fix stale paths in `AGENTS.md`, `AI_RULES.md`, `WORKFLOWS.md`, `.cursor/**`, active setup guides
3. Inspect `package.json`, `electron/`, `src/renderer/`, `functions/`, rules, routes, tests
4. Populate `INTAKE_FINDINGS.md`, `PROJECT_HEALTH.md`, `TECH_DEBT.md`, `RISK_REGISTER.md`, `DECISIONS.md`
5. Align `ROADMAP.md` current phase with signoffs and code
6. Fix doc/code mismatches (Electron paths)
7. Document git-tracked build output risk
8. Recommend P0 `git-generated-output-cleanup`, P1 Phase 3D DPI normalization
9. Review and signoff

---

## Test Strategy

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Build | skip (docs-only; build is slow and not required for doc intake) | no |
| Test | N/A in package.json | no |

---

## Human Checkpoints Anticipated

- Firebase environment confirmation `[NEEDS HUMAN INPUT]`
- Storage rules deploy verification
- Priority between git cleanup vs feature work

---

## Approval

- Review doc: docs/workflow/reviews/fresh-prints-existing-project-intake-review.md
- Verdict: pending
