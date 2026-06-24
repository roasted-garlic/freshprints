# Architecture Decision Records (DECisions)

> Log significant technical and process decisions. Universal format; project-specific entries below.

---

## How to Use

When a decision affects architecture, security, data, backend, or workflow:

1. Add a new ADR entry below (newest first)
2. Reference in plans and signoff docs
3. Update related docs (`ARCHITECTURE.md`, `BACKEND.md`, etc.)

---

## ADR Template

```markdown
### ADR-NNN: [Title]

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Status | proposed / accepted / deprecated / superseded |
| Deciders | [names or roles] |

**Context**
[What problem or constraint led to this decision?]

**Options considered**
1. [Option A] — pros/cons
2. [Option B] — pros/cons

**Decision**
[What was chosen]

**Consequences**
- Positive: ...
- Negative: ...
- Follow-ups: ...
```

---

## Decisions

### ADR-004: Separate development archive from clean starter package

| Field | Value |
|-------|-------|
| Date | 2026-06-23 |
| Status | accepted |
| Deciders | Project team |

**Context**
AppForge developed inside its own workflow left completed plans, reviews, and signoffs in starter-facing folders, confusing adopters copying the kit.

**Decision**
Archive AppForge development artifacts under `docs/appforge-development/`. Keep `docs/workflow/plans/`, `docs/workflow/reviews/`, and `docs/workflow/setup/` clean (README + `.gitkeep` only) before copying. Document process in `docs/appforge-development/distribution/PACKAGING.md`.

**Consequences**
- Positive: Clear separation between maintainer history and adopters' workflow folders
- Negative: Maintainers must run cleanup before shipping a copy
- Follow-ups: `validate:structure` enforces clean starter folders

---

### ADR-003: Lightweight validation for starter repo

| Field | Value |
|-------|-------|
| Date | 2026-06-23 |
| Status | accepted |
| Deciders | Project team |

**Context**
The AppForge starter is markdown-only with no application tests. Contributors and adopters need a simple way to verify required workflow files, markdown quality, and internal links.

**Options considered**
1. Shell-only scripts — no Node dependency but weak markdown linting
2. Minimal Node `package.json` for validation scripts only — one devDependency (`markdownlint-cli2`) plus stdlib link/structure scripts
3. Full monorepo tooling — overkill for a copy-paste starter

**Decision**
Add a private `package.json` with `validate`, `validate:structure`, `validate:markdown`, and `validate:links` scripts. Use GitHub Actions to run `npm run validate` on push/PR. Validation is optional when copying the starter into app repos (adopters may omit `package.json`).

**Consequences**
- Positive: CI catches doc/structure regressions; clear local commands in TESTING.md
- Negative: Requires Node 18+ for local validation
- Follow-ups: None

---

### ADR-002: Canonical project name is AppForge

| Field | Value |
|-------|-------|
| Date | 2026-06-23 |
| Status | accepted |
| Deciders | Project team |

**Context**
The workflow starter was referenced as both AppForge and BuildPilot, causing confusion in docs and agent prompts.

**Options considered**
1. Keep dual naming (AppForge / BuildPilot) — familiar to early adopters but ambiguous
2. Standardize on AppForge — single canonical name; BuildPilot retained only as historical folder label

**Decision**
Use **AppForge** as the canonical name everywhere the starter is described. **BuildPilot** may appear only in historical notes (e.g. local folder name), clearly labeled.

**Consequences**
- Positive: Consistent branding in README, AGENTS.md, and workflow docs
- Negative: Local clone folder may still be named BuildPilot until manually renamed
- Follow-ups: None required for workflow behavior

---

### ADR-001: Adopt managed AI workflow (Plan → Review → Implement → Test → Signoff)

| Field | Value |
|-------|-------|
| Date | YYYY-MM-DD |
| Status | accepted |
| Deciders | Project team |

**Context**
Need a repeatable, safe agent-driven development process that works across project types.

**Options considered**
1. Ad-hoc agent prompts — fast but inconsistent, risky for production
2. Full workflow starter with gates and docs — more structure, safer

**Decision**
Adopt the Cursor workflow starter with mandatory phases, human checkpoints, and documentation as source of truth.

**Consequences**
- Positive: Safer changes, clearer audit trail, less scope creep
- Negative: More overhead for trivial changes
- Follow-ups: Customize docs during intake or bootstrap

---

<!-- Add project-specific ADRs below -->
