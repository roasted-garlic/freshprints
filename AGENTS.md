# AI Agents — FreshForge Entry Point

> **Read this file first** in any repository that uses the **FreshForge** workflow starter.

This project uses the FreshForge workflow starter. The active workflow surface is `AGENTS.md`, `.cursor/`, and `docs/`. FreshForge development and distribution documentation is not part of installed target projects.

---

## Start Every Session

1. Read **`docs/AI_RULES.md`** — detailed behavior, gates, and reading order
2. Read **`.cursor/workflow/state.md`** — current mode, phase, blockers, next step
3. Obey **Allowed Actions** and **Forbidden Actions** in workflow state

If `Human Checkpoint Required: yes`, `Blocked: yes`, or `DONE: yes` — follow state before starting new work.

---

## Mandatory Workflow

All scoped work follows:

**Plan → Review → Implement → Test → Signoff**

| Gate | Rule |
|------|------|
| Implement | Requires plan in `docs/workflow/plans/` **and** review approval |
| Signoff | Requires tests run **or** failures documented honestly |
| Scope | Never silently expand beyond approved plan |

---

## Human Approval Required

Stop and ask the user before:

- Production deploys
- Destructive migrations or data changes
- Secrets or shared environment variable changes
- External service setup (auth providers, DNS, SaaS accounts)
- Billing, pricing, payouts, or customer-facing policy
- Visual or UX approval when design impact is significant
- Any console action outside the repo
- Unclear requirements that change product behavior

See `.cursor/rules/human-checkpoints.mdc`.

---

## How This System Is Organized

| Layer | Location | Role |
|-------|----------|------|
| **Docs** | `docs/` | **Source of truth** — what the product is and how it works |
| **Rules** | `.cursor/rules/` | **Behavior instructions** — what to read, how to act, when to stop |
| **Agents** | `.cursor/agents/` | **Specialist roles** — planning, review, implement, test, signoff, etc. |
| **Skills** | `.cursor/skills/` | **Reusable workflows** — intake, bootstrap, managed phase, safe changes |
| **State** | `.cursor/workflow/state.md` | **Current progress** — phase, gates, blockers, next step |
| **Hooks** | `.cursor/hooks.json` | Session and tool safety reminders |

---

## Who Controls What

- **Managing Agent** owns the workflow, reads state, delegates, and advances phases
- **Specialist agents** do focused work within the current phase only
- **Specialist agents do not free-roam** or independently change project direction
- **Workflow state** determines what step comes next

---

## Operating Modes

| Mode | When | Skill | App code? |
|------|------|-------|-----------|
| **Existing Project Intake** | Established codebase | `project-intake` | **No** — docs only |
| **New Project Bootstrap** | Blank / greenfield | `new-project-bootstrap` | **No** until user approves |
| **Managed Phase** | Feature, fix, refactor | `managed-phase` | After review approval |

---

## Command Aliases

FreshForge supports **short natural commands**. When the user sends a message that matches an alias (case-insensitive), treat it as the full workflow — do not ask for confirmation.

Canonical mapping: `.cursor/workflow/command-aliases.md`

### Existing Project Intake

**Say any of:** `Existing Project` · `Existing Project Intake` · `Project Intake` · `Intake` · `Intake this repo` · `Analyze this repo` · `Review this codebase` · `Document this project` · `Existing App`

→ **Start Existing Project Intake** — repo inspection, health assessment, docs only, no app code changes.

### New Project Bootstrap

**Say any of:** `New Project` · `Project Bootstrap` · `New Project Bootstrap` · `Bootstrap` · `Start App` · `Start New App` · `Blank Project`

→ **Start New Project Bootstrap** — questionnaire, docs first, no app code until approval.

### Managed Phase

**Say any of:** `Managed Phase` · `Start Phase` · `Run Phase` · `Next Phase` · `Continue Workflow` · `Continue FreshForge`

→ **Start or continue** Plan → Review → Implement → Test → Signoff using `.cursor/workflow/state.md`. Stop for human checkpoints.

---

## Established Project: Existing Project Intake

Uses **actual repo inspection** (not user interviews alone):

- Stack, scripts, architecture from code
- Doc vs code mismatches
- Security, testing, dependency, accessibility, deployment gaps
- AI-discovered risks → `RISK_REGISTER.md`
- AI-discovered tech debt → `TECH_DEBT.md`
- Project health summary → `PROJECT_HEALTH.md`
- Inspection log → `INTAKE_FINDINGS.md`

Recommends future cleanup phases; **does not fix issues** during intake.

---

## Blank Project: New Project Bootstrap

Uses **user questionnaire** + clearly marked assumptions:

- Essential questions only
- Docs first (`PROJECT_BRIEF`, `ARCHITECTURE`, etc.)
- Assumptions tagged `[ASSUMED]` or `[NEEDS HUMAN INPUT]`
- **No app code** until user approves first implementation phase

---

## Specialist Agents (Quick Reference)

| Agent | Does | Does not |
|-------|------|----------|
| Managing Agent | Orchestrates workflow, state, gates | Implement code directly |
| Planning Agent | Creates plans | Implement |
| Review Agent | Approves / blocks | Implement |
| Implementation Agent | Code within approved scope | Production actions |
| Test Agent | Runs and records tests | Claim pass without running |
| Signoff Agent | Closes workflow | Skip test gates |
| Documentation Agent | Docs, intake, bootstrap | Change app code during intake |
| Security Agent | Security review | Weaken prod rules without approval |
| Architecture Agent | Structure review | Mandate out-of-scope rewrites |

Details: `.cursor/agents/`

---

## Key Docs

| Area | Path |
|------|------|
| Core workflow | `docs/AI_RULES.md`, `docs/WORKFLOWS.md` |
| Project context | `docs/project/PROJECT_BRIEF.md`, `ROADMAP.md`, `PROJECT_HEALTH.md`, `TECH_DEBT.md`, `DECISIONS.md`, `RISK_REGISTER.md` |
| Architecture | `docs/architecture/ARCHITECTURE.md`, `BACKEND.md`, `DATA_MODEL.md` |
| Standards | `docs/standards/CODING_STANDARDS.md`, `STYLE_GUIDE.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md` |
| Intake | `docs/intake/INTAKE_FINDINGS.md` |
| Workflow artifacts | `docs/workflow/plans/`, `docs/workflow/reviews/`, `docs/workflow/setup/` |

---

## Workflow Artifacts vs Permanent Docs

FreshForge separates **durable project documentation** from **temporary workflow artifacts**:

| Type | Location | Purpose |
|------|----------|---------|
| **Permanent docs** | `docs/project/`, `docs/architecture/`, `docs/standards/`, `docs/intake/` | Product context, architecture, standards — updated when behavior changes |
| **Workflow artifacts** | `docs/workflow/plans/`, `docs/workflow/reviews/`, `docs/workflow/setup/` | Active phase plans, reviews, test reports, signoffs, setup notes |

Rules:

- Create new plans in `docs/workflow/plans/` before implementation.
- Store reviews, test reports, and signoffs in `docs/workflow/reviews/`.
- Use `docs/workflow/setup/` for project-specific setup notes after intake or bootstrap.
- Keep workflow artifact folders clean between phases (README + `.gitkeep` only when idle).
- Do not archive FreshForge development history in workflow artifact folders — that belongs in `docs/freshforge-development/` (development repo only).

---

## Safety Summary

- Docs are source of truth; rules tell you how to behave
- Prefer narrow, reversible changes
- Never commit secrets
- Never claim tests passed without running them
- Never perform production actions without human approval

**Next:** Read `docs/AI_RULES.md`, then `.cursor/workflow/state.md`.

---

## Upgrading an Existing Installation

If the project already has an older AppForge or FreshForge workflow install:

```bash
npx github:roasted-garlic/freshforge doctor
npx github:roasted-garlic/freshforge migrate --dry-run
npx github:roasted-garlic/freshforge migrate
```

Migrate preserves project-specific docs under `docs/project/`, `docs/architecture/`, `docs/standards/`, and `docs/intake/`. Installation metadata lives in `.freshforge/version.json`.

---

## Starter Surface Awareness

FreshForge is used to build itself, but it also distributes a **starter surface** into target projects. Before changing behavior, classify the impact:

| Area | Location | Affects installed projects? |
|------|----------|----------------------------|
| **Starter Surface** | `AGENTS.md`, `.cursor/`, `docs/` (not `docs/freshforge-development/`) | **Yes** |
| **Development Tooling** | `scripts/`, `package.json`, `.github/`, `.markdownlint-cli2.jsonc` | Only with `--include-validation` |
| **Distribution/Installer** | `bin/`, install/export scripts | Delivery mechanism only |
| **Development History** | `docs/freshforge-development/` | **No** |

Rules:

- If a change should affect **installed projects**, update **starter surface** files — not development-only docs or scripts alone.
- Do not put FreshForge development history in starter-facing `docs/workflow/plans/` or `docs/workflow/reviews/`.
- Do not install or export `docs/freshforge-development/`.

Source of truth: `docs/freshforge-development/distribution/STARTER_SURFACE.md`.
