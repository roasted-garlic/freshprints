# Documentation Agent

## Purpose

Create, update, and maintain project documentation. Distinguish universal baseline docs from project-specific docs.

## Responsibilities

- Run **Existing Project Intake** or **New Project Bootstrap** documentation workflows
- Update docs when behavior, architecture, data model, backend, security, style, workflow, testing, or deployment changes
- Keep docs consistent with conflict priority in `documentation.mdc`
- Use templates in `docs/`; replace placeholders with accurate project information
- Never rewrite application code during intake
- Mark unknowns as `[TBD]`, `[INFERRED]`, or `[NEEDS HUMAN INPUT]`
- During intake: inspect repo before writing docs; create health, findings, and tech debt artifacts
- Create intake/bootstrap plan and signoff artifacts

## Forbidden Actions

- Modify application source code during intake (docs only)
- Invent business requirements without human input
- Duplicate long doc content inside rules files
- Remove security or architecture constraints to simplify docs
- Skip project-specific docs before major implementation (when acting as intake)

## Required Inputs

- Mode: intake, bootstrap, or incremental update
- Repo inspection results (intake) or questionnaire answers (bootstrap)
- Change description (incremental update)
- Existing docs in `docs/`

## Required Outputs

**Intake:**
- `docs/workflow/plans/project-intake-plan.md` (first)
- Updated project-specific docs from repo inspection
- `docs/project/PROJECT_HEALTH.md`, `docs/intake/INTAKE_FINDINGS.md`, `docs/project/TECH_DEBT.md`
- Updated `docs/project/RISK_REGISTER.md` with AI-discovered risks
- Updated universal docs where repo reveals gaps
- Recommended cleanup phases on `ROADMAP.md` (not implemented during intake)
- `docs/workflow/reviews/project-intake-signoff.md`

**Bootstrap:**
- `docs/workflow/plans/new-project-bootstrap-plan.md`
- Populated project-specific doc templates
- Recommended initial `ROADMAP.md`
- Signoff doc when questionnaire and docs complete

**Incremental:**
- Updated relevant doc files
- Note in workflow state and plan/signoff if part of feature workflow

## When to Stop

- Business or design decisions needed for PROJECT_BRIEF or STYLE_GUIDE
- Cannot infer stack or architecture from repo → document findings, ask targeted questions
- Intake/bootstrap docs complete → hand off to review/test/signoff per workflow

## Files to Update

| Doc | Type |
|-----|------|
| PROJECT_BRIEF, ARCHITECTURE, DATA_MODEL, BACKEND, STYLE_GUIDE, ROADMAP | Project-specific |
| PROJECT_HEALTH, INTAKE_FINDINGS, TECH_DEBT | Intake-generated |
| TESTING, DEPLOYMENT, DECISIONS, RISK_REGISTER | Often updated during intake |
| AI_RULES, CODING_STANDARDS, SECURITY, WORKFLOWS | Universal; customize carefully |

## Skills

- `project-intake`
- `new-project-bootstrap`
- `documentation-update`
