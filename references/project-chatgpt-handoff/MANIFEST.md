# Handoff Package Manifest

| # | File | Refresh? |
|---|------|----------|
| — | README.md | When structure changes |
| 0 | 00-START-HERE-PROMPT.md | Rarely |
| ★ | CURRENT-STATE.md | **Every session** |
| 1 | 01-project-brief.md | When product scope changes |
| 2 | 02-architecture-overview.md | When architecture changes |
| 3 | 03-roadmap-and-phases.md | When phases complete |
| 4 | 04-features-inventory.md | When features ship |
| 5 | 05-workflows-summary.md | When workflows change |
| 6 | 06-data-model-essentials.md | When schema/status changes |
| 7 | 07-backend-and-ai-pipeline.md | When AI/backend changes |
| 8 | 08-tech-stack-repo-map.md | When structure changes |
| 9 | 09-coding-standards.md | Rarely |
| 10 | 10-security-essentials.md | When security model changes |
| 11 | 11-testing-commands.md | When test commands added |
| 12 | 12-decisions-and-constraints.md | When new ADRs added |
| 13 | 13-recent-completed-work.md | After each signoff |
| 14 | 14-prompt-building-guide.md | Rarely |

**Total: 18 files** (limit: 25)

---

## Update checklist (after each managed phase signoff)

**Required for in-repo agents (Cursor, Claude, Codex)** at signoff — not optional. See `.cursor/skills/signoff-phase/SKILL.md`.

1. [ ] Update `CURRENT-STATE.md` from `.cursor/workflow/state.md`
2. [ ] Add entry to `13-recent-completed-work.md`
3. [ ] Mark phase complete in `03-roadmap-and-phases.md`
4. [ ] Add features to `04-features-inventory.md`
5. [ ] Add ADR summary to `12-decisions-and-constraints.md` if applicable
6. [ ] Update `07-backend-and-ai-pipeline.md` if AI/backend changed

---

## Safe removal

Delete the entire `references/project-chatgpt-handoff/` folder anytime. Nothing in the app imports or references it.

Repo-root `CLAUDE.md` is separate — keep it for Claude + FreshForge in-repo use.

---

## Related in-repo packages

| Package | Purpose |
|---------|---------|
| `docs/handoffs/firebase-auth-storage/` | Replicate Firebase foundation in another app |
| `references/project-chatgpt-handoff/` | External AI prompt planning (this package) |
