# Handoff Package Manifest

| # | File | Refresh? |
|---|------|----------|
| — | README.md | When structure changes |
| 0 | 00-START-HERE-PROMPT.md | When onboarding rules change |
| ★ | CURRENT-STATE.md | **Every session / every signoff** |
| 1 | 01-project-brief.md | When product scope changes |
| 2 | 02-architecture-overview.md | When architecture changes |
| 3 | 03-roadmap-and-phases.md | When phases complete |
| 4 | 04-features-inventory.md | When features ship |
| 5 | 05-workflows-summary.md | When customer/staff workflows change |
| 6 | 06-data-model-essentials.md | When schema/status changes |
| 7 | 07-backend-and-ai-pipeline.md | When Functions / AI / uploads change |
| 8 | 08-tech-stack-repo-map.md | When structure / ports / commands change |
| 9 | 09-coding-standards.md | Rarely |
| 10 | 10-security-essentials.md | When security model changes |
| 11 | 11-testing-commands.md | When test commands added |
| 12 | 12-decisions-and-constraints.md | When new ADRs added |
| 13 | 13-recent-completed-work.md | After each signoff |
| 14 | 14-prompt-building-guide.md | Rarely |

**Total: 18 files** (limit: 25)

**Last full package refresh:** 2026-07-13 (Your Stash polish signoff); partial refresh 2026-08-21 (`studio-updater-design-id-search-tag-picker-polish` DEV signoff: CURRENT-STATE, 13, 03, 04)

---

## Update checklist (after each managed phase signoff)

1. [ ] Update `CURRENT-STATE.md` from `.cursor/workflow/state.md`
2. [ ] Add entry to `13-recent-completed-work.md`
3. [ ] Update `03-roadmap-and-phases.md` / `04-features-inventory.md` if needed
4. [ ] Update `05-workflows-summary.md` if customer/staff flow changed
5. [ ] Add ADR summary to `12-decisions-and-constraints.md` if applicable
6. [ ] Update `07-backend-and-ai-pipeline.md` if Functions/AI/uploads changed

---

## Safe removal

Delete the entire `references/project-chatgpt-handoff/` folder anytime. Nothing in the app imports it.

Repo-root `CLAUDE.md` / `AGENTS.md` remain for in-repo agents.
