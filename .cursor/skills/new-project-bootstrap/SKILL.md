---
name: new-project-bootstrap
description: Guide user through essential questions and generate project docs before any implementation. Use for New Project Bootstrap or aliases (Bootstrap, New Project, Start App, Blank Project, etc.).
---

# New Project Bootstrap

## Command Aliases

If the user says any of the following, **start this skill immediately** (case-insensitive):

`New Project` · `Project Bootstrap` · `New Project Bootstrap` · `Bootstrap` · `Start App` · `Start New App` · `Blank Project`

Equivalent full command: **Start New Project Bootstrap** — see `.cursor/workflow/command-aliases.md`.

## Purpose

Define a new application through a focused questionnaire and generate documentation before implementation begins.

## When to Use

- User sends a **bootstrap alias** (e.g. `Bootstrap`, `New Project`, `Start App`, `Blank Project`)
- Blank or greenfield project with starter installed
- User prompt: "Start New Project Bootstrap"
- Implementation must not start until docs and user approval exist

## Inputs

- User answers from `bootstrap-questionnaire.md` (ask only essential questions first)
- Empty or template docs in `docs/`
- `.cursor/workflow/state.md`

## Steps

1. **Initialize**
   - Set `Current Mode: new-project-bootstrap`
   - Set `Current Phase: questionnaire`

2. **Essential questionnaire** (minimal user input)
   Ask only what is needed for first doc version:
   - App name and one-line description
   - Primary users and core problem
   - Platforms (web, mobile, desktop, API-only, etc.)
   - Preferred stack if known (or "agent recommendation" after goals)
   - Backend preference if any (self-hosted, Firebase, Supabase, none yet)
   - Must-have features for v1 (3–7 items)
   - Non-goals for v1
   - Auth requirements (none, email, OAuth, enterprise)
   - Deployment target if known
   - Timeline or phase preference if stated

   Defer nice-to-have details to ROADMAP later phases.

3. **Create bootstrap plan**
   - `docs/workflow/plans/new-project-bootstrap-plan.md`
   - List docs to generate and assumptions

4. **Review plan** (lightweight)
   - Confirm scope is docs-only until user approves implementation

5. **Generate docs**
   - Fill templates: PROJECT_BRIEF, ARCHITECTURE, DATA_MODEL, BACKEND, STYLE_GUIDE, ROADMAP
   - Customize TESTING and DEPLOYMENT with placeholders and recommendations
   - Seed DECISIONS.md with initial stack/architecture choices
   - Seed RISK_REGISTER.md with greenfield risks

6. **Recommend roadmap**
   - Phases: setup → core feature → polish → launch
   - Exit criteria per phase
   - Explicit "Phase 0: documentation complete"

7. **Signoff**
   - Signoff doc for bootstrap
   - **Stop before implementation** unless user explicitly approves first implementation phase

## Outputs

- `docs/workflow/plans/new-project-bootstrap-plan.md`
- Populated project-specific docs
- Recommended `ROADMAP.md`
- Bootstrap signoff in `docs/workflow/reviews/`
- Workflow state: bootstrap complete, implementation forbidden until approval

## Stop Conditions

- Questionnaire incomplete for critical fields (users, problem, platform)
- User has not approved first implementation phase → do not scaffold app code
- Business/pricing/policy decisions → human checkpoint
- Do not install packages or generate app source during bootstrap
