---
name: project-intake
description: Inspect an existing codebase and generate or update project documentation without modifying app code. Use for Existing Project Intake mode or aliases (Intake, Analyze this repo, Document this project, etc.).
---

# Project Intake

## Command Aliases

If the user says any of the following, **start this skill immediately** (case-insensitive):

`Existing Project` · `Existing Project Intake` · `Project Intake` · `Intake` · `Intake this repo` · `Analyze this repo` · `Review this codebase` · `Document this project` · `Existing App`

Equivalent full command: **Start Existing Project Intake** — see `.cursor/workflow/command-aliases.md`.

## Purpose

Onboard an established codebase into AppForge by **inspecting actual repo files** and producing accurate documentation, health assessment, findings, and tech debt register — without modifying application code.

## When to Use

- User sends an **intake alias** (e.g. `Intake`, `Analyze this repo`, `Existing Project`)
- AppForge copied into an existing project
- User prompt: "Start Existing Project Intake"
- Project-specific docs are empty templates, outdated, or misaligned with code
- Need AI-discovered risks, gaps, and recommended cleanup phases

## Inputs

- Full repository access (read-only for app code)
- Existing docs in `docs/`
- `.cursor/workflow/state.md`
- `AGENTS.md` and `.cursor/rules/project-intake.mdc`
- Checklist: `.cursor/workflow/existing-project-intake-checklist.md`

## Steps

### 1. Initialize

- Read `AGENTS.md`, `docs/AI_RULES.md`, `.cursor/workflow/state.md`
- Set `Current Mode: existing-project-intake`
- Set phase flow: Plan → Repo Inspection → Documentation Generation → Project Health Review → Human Clarification List → Signoff

### 2. Create intake plan first

- Create **`docs/workflow/plans/project-intake-plan.md`** before any other doc work
- List inspection areas, docs to produce/update, and review criteria

### 3. Inspect repository (read-only)

**Must inspect actual files before writing project docs. Do not rely only on user input.**

Use `.cursor/workflow/existing-project-intake-checklist.md`.

Inspect and record:

| Area | Actions |
|------|---------|
| Structure | Folders, monorepo, entry points |
| Stack | Languages, frameworks, runtime, package manager |
| Scripts | dev, build, test, lint, typecheck from manifests |
| Architecture | Layers from code — UI, services, data access |
| Doc vs code | Mismatches between docs and implementation |
| Backend | APIs, BaaS, functions, integrations |
| Data layer | Schemas, models, migrations, rules |
| Auth | Provider, middleware, client-only checks |
| Routing | Routes, pages, navigation |
| Styling | CSS approach, component libraries |
| Testing | Test files, CI steps, gaps |
| Deployment | CI/CD, hosting, environments |
| Dependencies | Outdated, vulnerable, duplicate packages |
| Security | Secrets in repo, validation gaps, exposure |
| Accessibility | Keyboard, labels, semantics when UI exists |

Tag facts:
- **`[INFERRED]`** — from code/docs, not human-confirmed
- **`[NEEDS HUMAN INPUT]`** — cannot determine safely

### 4. Generate or update documentation

**Project docs:**

- `docs/project/PROJECT_BRIEF.md`
- `docs/architecture/ARCHITECTURE.md` — from **actual** code structure
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/standards/STYLE_GUIDE.md`
- `docs/project/ROADMAP.md` — include **recommended cleanup phases** (not implemented during intake)
- `docs/standards/TESTING.md` — actual commands from scripts/CI
- `docs/standards/DEPLOYMENT.md`
- `docs/project/DECISIONS.md` — `[INFERRED]` where applicable
- `docs/project/RISK_REGISTER.md` — AI-discovered risks

**Intake-specific docs:**

- `docs/project/PROJECT_HEALTH.md` — use `.cursor/workflow/project-health-template.md`
- `docs/intake/INTAKE_FINDINGS.md` — full inspection record
- `docs/project/TECH_DEBT.md` — use `.cursor/workflow/tech-debt-template.md`

### 5. Identify issues — do not fix

Document but **do not implement** fixes for:

- Architecture issues and layer violations
- Doc vs code mismatches
- Security concerns
- Testing gaps
- Dependency concerns
- Accessibility concerns (when UI exists)
- Deployment gaps

Add tech debt rows to `TECH_DEBT.md`. Add risks to `RISK_REGISTER.md`. Recommend managed phases on `ROADMAP.md` and `PROJECT_HEALTH.md`.

### 6. Project Health Review

- Complete `PROJECT_HEALTH.md` domain ratings and priority concerns
- List recommended next phases (P0, P1, P2)
- Cross-check doc consistency: architecture ↔ data model ↔ backend ↔ testing

### 7. Human Clarification List

- Populate **Human input needed** in `INTAKE_FINDINGS.md`
- Set human checkpoint only for blocking business/design questions
- Continue autonomously for inferable technical facts

### 8. Review phase

- Review Agent or self-review: doc consistency, conflict resolution per `documentation.mdc` priority
- Fix doc conflicts only — no app code

### 9. Signoff

- Create **`docs/workflow/reviews/project-intake-signoff.md`**
- Summarize: docs updated, health summary, top risks/debt, human input needed, recommended next phases
- Set workflow state `DONE: yes`

## Outputs

- `docs/workflow/plans/project-intake-plan.md`
- Updated project docs (list above)
- `docs/project/PROJECT_HEALTH.md`
- `docs/intake/INTAKE_FINDINGS.md`
- `docs/project/TECH_DEBT.md`
- `docs/workflow/reviews/project-intake-signoff.md`
- Updated `.cursor/workflow/state.md`

## Stop Conditions

- Business/product questions that cannot be inferred → human checkpoint
- Cannot determine auth or data model safely → document as `[NEEDS HUMAN INPUT]`, continue other docs
- **Must not modify application code during intake**
- **Must not install packages or run destructive commands**
- **Must not fix tech debt during intake** — recommend managed phases only
