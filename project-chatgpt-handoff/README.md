# Fresh Prints — External AI Handoff Package

Portable documentation for **ChatGPT, Claude, or other external AI assistants** that help you plan prompts and scoped work on Fresh Prints **without uploading the full source code**.

> **Safe to delete:** This folder is not imported by the app. Remove `project-chatgpt-handoff/` anytime without affecting builds or runtime.

---

## What This Package Is For

| Use case | How to use it |
|----------|---------------|
| Build prompts for Cursor / Claude / ChatGPT | Upload `CURRENT-STATE.md` + relevant topic files |
| Onboard an external agent on product context | Start with `00-START-HERE-PROMPT.md` |
| Plan a feature without code access | Read `03-roadmap-and-phases.md` + `04-features-inventory.md` |
| Understand AI enrichment (current focus) | Read `07-backend-and-ai-pipeline.md` |

---

## Quick Start (3 steps)

1. **Upload** `CURRENT-STATE.md` to your chat (refresh it before each session — see [Updating CURRENT-STATE](#updating-current-state)).
2. **Paste** the contents of `00-START-HERE-PROMPT.md` as your first message.
3. Let the agent read files in the order listed in that prompt.

---

## Read Order

| # | File | Purpose |
|---|------|---------|
| 0 | [00-START-HERE-PROMPT.md](./00-START-HERE-PROMPT.md) | **Paste this** — tells the agent what to read and how to behave |
| ★ | [CURRENT-STATE.md](./CURRENT-STATE.md) | **Upload every session** — phase, blockers, recent work, active goal |
| 1 | [01-project-brief.md](./01-project-brief.md) | What the app is, users, business workflow |
| 2 | [02-architecture-overview.md](./02-architecture-overview.md) | Two apps, layers, Firebase, workspaces |
| 3 | [03-roadmap-and-phases.md](./03-roadmap-and-phases.md) | Phase history, current phase, future phases |
| 4 | [04-features-inventory.md](./04-features-inventory.md) | Feature list by route/workspace |
| 5 | [05-workflows-summary.md](./05-workflows-summary.md) | Import → AI Review → Library flow |
| 6 | [06-data-model-essentials.md](./06-data-model-essentials.md) | Key entities, statuses, rules |
| 7 | [07-backend-and-ai-pipeline.md](./07-backend-and-ai-pipeline.md) | Firebase, Cloud Functions, AI enrichment |
| 8 | [08-tech-stack-repo-map.md](./08-tech-stack-repo-map.md) | Stack, folder layout, key file paths |
| 9 | [09-coding-standards.md](./09-coding-standards.md) | TypeScript, layers, naming |
| 10 | [10-security-essentials.md](./10-security-essentials.md) | Auth, rules, secrets, roles |
| 11 | [11-testing-commands.md](./11-testing-commands.md) | Lint, build, test file locations |
| 12 | [12-decisions-and-constraints.md](./12-decisions-and-constraints.md) | ADRs, non-goals, hard rules |
| 13 | [13-recent-completed-work.md](./13-recent-completed-work.md) | Recently shipped sub-features (June 2026) |
| 14 | [14-prompt-building-guide.md](./14-prompt-building-guide.md) | How to craft good prompts for this project |
| — | [MANIFEST.md](./MANIFEST.md) | File count, update checklist |

**Total: 18 files** (under the 25-file limit).

---

## Updating CURRENT-STATE

Before each external AI session:

1. Open `.cursor/workflow/state.md` in the repo (authoritative workflow state).
2. Update the **Workflow Snapshot** and **Active Goal** sections in `CURRENT-STATE.md`.
3. Add any newly completed features to **Recently Completed**.
4. Upload the refreshed `CURRENT-STATE.md`.

If you use Cursor with FreshForge, also read repo-root `CLAUDE.md` or `AGENTS.md` for in-repo agents.

---

## Relationship to In-Repo Docs

This package **summarizes** the real source of truth in `docs/`. When the repo is available:

| Handoff file | Authoritative repo doc |
|--------------|------------------------|
| 01 | `docs/project/PROJECT_BRIEF.md` |
| 02 | `docs/architecture/ARCHITECTURE.md` |
| 03 | `docs/project/ROADMAP.md` |
| 06 | `docs/architecture/DATA_MODEL.md` |
| 07 | `docs/architecture/BACKEND.md`, `docs/architecture/FIREBASE.md` |
| 12 | `docs/project/DECISIONS.md` |

When handoff and repo docs disagree, **repo docs win**.

---

## Labels

- **Portable** — safe to upload to external AI
- **Refresh required** — update before each session (`CURRENT-STATE.md`)
- **Repo-only** — exists in the codebase but not duplicated here
