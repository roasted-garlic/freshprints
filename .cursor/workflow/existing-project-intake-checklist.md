# Existing Project Intake Checklist

> Use during repo inspection phase. Complete before writing project-specific docs. Read-only — no app code changes.

---

## Pre-Intake

- [ ] Read `AGENTS.md` and `docs/AI_RULES.md`
- [ ] Read `.cursor/workflow/state.md`
- [ ] Set `Current Mode: existing-project-intake`
- [ ] Create `docs/workflow/plans/project-intake-plan.md` **first**

---

## Repository Structure

- [ ] Identify monorepo vs single app vs multi-app
- [ ] Map top-level folders and purpose
- [ ] Find entry points (main, index, app bootstrap)
- [ ] Note config files (tsconfig, vite, webpack, docker, etc.)

---

## Stack & Tooling

- [ ] Detect language(s) and versions
- [ ] Detect package manager (npm/yarn/pnpm/cargo/pip/etc.)
- [ ] Read manifest scripts (dev, build, test, lint, typecheck)
- [ ] Detect frontend framework (if any)
- [ ] Detect backend style (API, serverless, BaaS, embedded)
- [ ] Detect build and bundler tooling

---

## Architecture (from code)

- [ ] Trace UI → state → services → data access layers
- [ ] Identify feature vs layer organization
- [ ] Note circular dependencies or layer violations
- [ ] Compare to existing `ARCHITECTURE.md` — record mismatches

---

## Backend & Data

- [ ] Locate API routes, handlers, functions
- [ ] Identify database/BaaS config and models/schemas
- [ ] Find migration files or schema definitions
- [ ] Identify storage (S3, Firebase Storage, etc.)
- [ ] Document env vars referenced (names only)

---

## Auth

- [ ] Identify auth provider and config
- [ ] Find middleware, guards, rules, RLS
- [ ] Note session/token patterns
- [ ] Flag client-only auth checks

---

## Routing & Features

- [ ] Map routes/pages/screens
- [ ] List major feature domains from modules
- [ ] Cross-reference README and issues if present

---

## Styling & UX

- [ ] CSS approach (modules, Tailwind, styled-components, etc.)
- [ ] Component library if any
- [ ] Sample UI for accessibility concerns (keyboard, labels, semantics)

---

## Testing

- [ ] Locate test files and frameworks
- [ ] Read CI test steps
- [ ] Identify gaps (no E2E, no integration, missing lint/typecheck)
- [ ] Update `TESTING.md` with actual commands

---

## Deployment & CI

- [ ] Find CI/CD configs (.github/workflows, etc.)
- [ ] Identify hosting/deployment targets
- [ ] Note environment separation (staging/prod)
- [ ] Check rollback documentation

---

## Dependencies

- [ ] Review manifest dependencies
- [ ] Note outdated, duplicate, or high-risk packages
- [ ] Check lockfile presence and consistency
- [ ] Record concerns in `TECH_DEBT.md`

---

## Security (inspection only)

- [ ] Secrets in repo? (flag, do not commit fixes during intake)
- [ ] Obvious client-side-only authorization
- [ ] Missing validation patterns
- [ ] Exposed API keys in client bundles (static search)
- [ ] Update `RISK_REGISTER.md`

---

## Existing Documentation

- [ ] Read all `docs/` files
- [ ] List stale vs accurate sections
- [ ] Record doc vs code mismatches in `INTAKE_FINDINGS.md`

---

## Generate / Update Docs

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md
- [ ] STYLE_GUIDE.md
- [ ] ROADMAP.md (include recommended cleanup phases)
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] DECISIONS.md
- [ ] RISK_REGISTER.md
- [ ] PROJECT_HEALTH.md (from template)
- [ ] INTAKE_FINDINGS.md (this inspection)
- [ ] TECH_DEBT.md (from template)

Tag inferred facts `[INFERRED]`. Tag uncertain facts `[NEEDS HUMAN INPUT]`.

---

## Review & Signoff

- [ ] Doc consistency check (architecture ↔ data ↔ backend ↔ testing)
- [ ] Project Health Review — priorities and next phases
- [ ] Human Clarification List in INTAKE_FINDINGS.md
- [ ] `docs/workflow/reviews/project-intake-signoff.md`
- [ ] Update workflow state `DONE: yes`
- [ ] **No application code modified**

---

## Explicitly Do NOT During Intake

- [ ] Fix tech debt
- [ ] Install packages
- [ ] Run migrations
- [ ] Refactor code
- [ ] Deploy anything
