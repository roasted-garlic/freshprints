# AppForge Command Aliases

> Short user messages map to full workflows. Agents must recognize aliases **case-insensitively** and treat a matching alias exactly like the full workflow command.

Matching: trim whitespace; ignore trailing punctuation (`.`, `!`, `?`); exact phrase or clear intent (e.g. user message is only the alias).

---

## Existing Project Intake

**Aliases** (any of these → start intake):

- Existing Project
- Existing Project Intake
- Project Intake
- Intake
- Intake this repo
- Analyze this repo
- Review this codebase
- Document this project
- Existing App

**Equivalent to:**

```
Start Existing Project Intake.

Goal:
Inspect this codebase, understand the application, identify the tech stack, map the architecture, assess project health, record findings and tech debt, and generate or update the project documentation.

Follow:
Plan → Repo Inspection → Documentation Generation → Project Health Review → Human Clarification List → Signoff

Read AGENTS.md and docs/AI_RULES.md first. Use actual repo inspection as the primary source. Tag inferred facts [INFERRED] and uncertain facts [NEEDS HUMAN INPUT].

Create or update:
docs/project/PROJECT_BRIEF.md, docs/architecture/ARCHITECTURE.md, docs/architecture/DATA_MODEL.md, docs/architecture/BACKEND.md,
docs/standards/STYLE_GUIDE.md, docs/project/ROADMAP.md, docs/standards/TESTING.md, docs/standards/DEPLOYMENT.md,
docs/project/DECISIONS.md, docs/project/RISK_REGISTER.md, docs/project/PROJECT_HEALTH.md,
docs/intake/INTAKE_FINDINGS.md, docs/project/TECH_DEBT.md

Autonomy:
Continue without asking me unless you need a business decision, design preference, production credential, external service access, or clarification that cannot be inferred from the repo.

Do not modify application code. Do not fix tech debt during intake. Recommend managed phases instead.
```

**Skill:** `project-intake`

---

## New Project Bootstrap

**Aliases** (any of these → start bootstrap):

- New Project
- Project Bootstrap
- New Project Bootstrap
- Bootstrap
- Start App
- Start New App
- Blank Project

**Equivalent to:**

```
Start New Project Bootstrap.

Goal:
Help the user define a new application and generate the project documentation needed before implementation.

Follow:
Questionnaire → Plan → Review → Create Docs → Signoff

Ask only essential questions.
Mark assumptions as [ASSUMED].
Mark unknowns as [TBD].
Do not implement app code until the user approves the first implementation phase.
```

**Skill:** `new-project-bootstrap`

---

## Managed Phase

**Aliases** (any of these → start or continue managed phase):

- Managed Phase
- Start Phase
- Run Phase
- Next Phase
- Continue Workflow
- Continue AppForge

**Equivalent to:**

```
Start or continue the managed phase workflow using .cursor/workflow/state.md.

Follow:
Plan → Review → Implement → Test → Signoff

Stop for human checkpoints.
```

**Behavior:**

1. Read `AGENTS.md`, `docs/AI_RULES.md`, `.cursor/workflow/state.md`
2. If workflow **in progress** (`DONE: no`, mode `managed-phase`) → continue from `Next Required Step`
3. If workflow **idle or DONE** and user gave phase/goal in the same message → start new managed phase with that scope
4. If workflow **idle or DONE** and no goal provided → ask for phase name and goal, or offer next item from `docs/project/ROADMAP.md`
5. Respect gates: no implement without plan + review; no signoff without tests

**Skill:** `managed-phase`

---

## Agent Rule

When the user's message matches an alias, **do not ask** which workflow they meant — execute the mapped workflow immediately (subject to human checkpoint and state gates).
