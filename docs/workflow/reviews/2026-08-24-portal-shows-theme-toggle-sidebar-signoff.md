# Signoff: Restore Portal theme toggle to sidebar on Upcoming Shows

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-24-portal-shows-theme-toggle-sidebar-plan.md |
| Review | docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-review.md |
| Test report | docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-test-report.md |
| Final status | **approved** |

---

## Summary

Upcoming Shows (`/shows` and `/shows/[showId]`) now uses the same sidebar-footer theme toggle as other Portal app-shell pages. The floating top-right `PortalChrome` toggle is hidden on those routes. Owner local visual QA **PASS**. Production Git merge and App Hosting rollout are the follow-up the owner requested in the same session.

---

## Changes Delivered

### Behavior
- `/shows` and `/shows/[showId]` are Portal app-shell routes (`isPortalAppShellRoute`)
- Compact `ThemeToggle` always renders in the sidebar footer
- Floating header theme toggle no longer appears on Upcoming Shows
- Auth pages (`/login`) still use floating `PortalChrome`

### Files Created
- `apps/portal/features/navigation/utils/isPortalAppShellRoute.ts`
- `apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts`
- Workflow: plan, review, test report, manual checkpoint, this signoff

### Files Modified
- `apps/portal/app/providers.tsx`
- `apps/portal/features/navigation/components/PortalSidebar.tsx`

### Documentation Updated
- `.cursor/workflow/state.md`
- `docs/project/ROADMAP.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/04-features-inventory.md`
- `references/project-chatgpt-handoff/MANIFEST.md`

---

## Tests

### Automated
- Helper unit tests 3/3 pass
- Portal typecheck pass
- Touched-file ESLint pass
- Local HTML: `/shows` has no `.portal-chrome`; `/login` still has it

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| `/shows` sidebar toggle, no top-right toggle | PASS | owner |
| `/shows/[showId]` same | PASS | owner |
| `/catalog` unchanged | PASS | owner |
| `/login` floating toggle remains | PASS | owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | requested this session | 2026-08-24 | Owner asked commit/push/PR/merge/rollout after PASS |
| Database migration | N/A | | |
| Design / UX | obtained | 2026-08-24 | Owner `PASS` |
| Business / policy | N/A | | |
| Secrets / env | N/A | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Live production still on `build-2026-08-24-001` until App Hosting | Medium | Follow-up PR + rollout |
| FreshForge shell guard blocks `gh pr merge` and prod `apphosting:rollouts:create` | High | Owner runs those if agent cannot |

---

## Deferred Items (Roadmap)
- Parent goal `production-promote-portal-and-studio-2026-08-23` Gate F (Studio 1.0.9 draft) still parked until Portal production chrome is live and owner authorizes dispatch

---

## Open Blockers
- [x] None for this DEV hotfix

---

## Verdict

**approved** — owner visual PASS; automated checks passed; chrome matches other shell pages.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes` (DEV hotfix)
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (no new persistent risk)
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated**
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Other handoff files per `references/project-chatgpt-handoff/MANIFEST.md` when behavior/architecture changed

**Recommended next action for user:**
Merge the `development` → `production` PR (if the agent cannot), then run App Hosting rollout for the merge SHA. Confirm `/shows` on `https://myprintrequest.com` uses the sidebar toggle.
