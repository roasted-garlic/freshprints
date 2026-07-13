# Fresh Prints — External AI Handoff Package

Portable documentation for **ChatGPT, Claude, or other external AI assistants** that help you plan prompts and scoped work on Fresh Prints **without uploading the full source code**.

> **Safe to delete:** This folder is not imported by the app. Remove `references/project-chatgpt-handoff/` anytime without affecting builds or runtime.

**Last full refresh:** 2026-07-12 (Portal request + customer-upload flow; r7; DPI floor; port 3100).

---

## What This Package Is For

| Use case | How to use it |
|----------|---------------|
| Build prompts for Cursor / Claude / ChatGPT | Upload `CURRENT-STATE.md` + relevant topic files |
| Onboard an external agent on product context | Start with `00-START-HERE-PROMPT.md` |
| Understand **customer request + upload flow** | Read `05-workflows-summary.md` first |
| Plan a feature without code access | `03-roadmap-and-phases.md` + `04-features-inventory.md` |

---

## Quick Start (3 steps)

1. **Upload** `CURRENT-STATE.md` (refresh from `.cursor/workflow/state.md` first if needed).
2. **Paste** the contents of `00-START-HERE-PROMPT.md` as your first message.
3. Upload `05-workflows-summary.md` when discussing how customers create requests / upload artwork.

---

## Read Order

| # | File | Purpose |
|---|------|---------|
| 0 | [00-START-HERE-PROMPT.md](./00-START-HERE-PROMPT.md) | **Paste this** |
| ★ | [CURRENT-STATE.md](./CURRENT-STATE.md) | **Upload every session** |
| 1 | [01-project-brief.md](./01-project-brief.md) | What / who / non-goals |
| 2 | [02-architecture-overview.md](./02-architecture-overview.md) | Studio vs Portal, monorepo |
| 3 | [03-roadmap-and-phases.md](./03-roadmap-and-phases.md) | Phase history |
| 4 | [04-features-inventory.md](./04-features-inventory.md) | Feature list |
| 5 | [05-workflows-summary.md](./05-workflows-summary.md) | **Request + upload flows** |
| 6 | [06-data-model-essentials.md](./06-data-model-essentials.md) | Entities / statuses |
| 7 | [07-backend-and-ai-pipeline.md](./07-backend-and-ai-pipeline.md) | Functions, uploads, AI |
| 8 | [08-tech-stack-repo-map.md](./08-tech-stack-repo-map.md) | Paths & commands |
| 9 | [09-coding-standards.md](./09-coding-standards.md) | Layers |
| 10 | [10-security-essentials.md](./10-security-essentials.md) | Roles / secrets |
| 11 | [11-testing-commands.md](./11-testing-commands.md) | How to verify |
| 12 | [12-decisions-and-constraints.md](./12-decisions-and-constraints.md) | ADRs |
| 13 | [13-recent-completed-work.md](./13-recent-completed-work.md) | Recently shipped |
| 14 | [14-prompt-building-guide.md](./14-prompt-building-guide.md) | Prompt templates |
| — | [MANIFEST.md](./MANIFEST.md) | Checklist |

**Total: 18 files** (under the 25-file limit).

---

## Updating CURRENT-STATE

In-repo agents must update `CURRENT-STATE.md` at managed-phase signoff (see `.cursor/skills/signoff-phase/SKILL.md`).

Before each external AI session (human):

1. Read `.cursor/workflow/state.md`
2. Refresh Workflow Snapshot + Active Goal here
3. Add newly completed work to `13-recent-completed-work.md` if needed
4. Upload the refreshed `CURRENT-STATE.md`

---

## Relationship to In-Repo Docs

This package **summarizes** `docs/`. When they disagree, **repo docs win**.

| Handoff | Authoritative repo doc |
|---------|------------------------|
| 01 | `docs/project/PROJECT_BRIEF.md` |
| 02 | `docs/architecture/ARCHITECTURE.md` |
| 03 | `docs/project/ROADMAP.md` |
| 06 | `docs/architecture/DATA_MODEL.md` |
| 07 | `docs/architecture/BACKEND.md`, `FIREBASE.md` |
| 12 | `docs/project/DECISIONS.md` |
