# Plan: Replace Dev Dashboard page with sidebar DevTools button

| Field | Value |
|-------|-------|
| Date | 2026-06-29 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | — |

---

## Goal

Remove the placeholder Dev Dashboard route (`/dev-dashboard`) and replace the sidebar nav link with a menu button that opens Electron DevTools directly, preserving the existing dev-only IPC guard and staff permission gate.

## Background

The Dev Dashboard was a Phase 1 foundation placeholder (stats cards, welcome copy, Firebase connection card). Its only operational control is **Open DevTools**, which is already implemented via `desktopAppService.openDevTools()` and dev-only main-process IPC. The page adds navigation overhead without ongoing product value.

## Scope

### In Scope
- Remove `/dev-dashboard` route and `DashboardPage` component
- Replace sidebar `Dev Dashboard` `NavLink` with a `Dev Tools` action button that calls `desktopAppService.openDevTools()`
- Show the button only when `import.meta.env.DEV && isElectronDesktop()` and user has `accessDashboard` permission (unchanged staff gate)
- Remove dashboard-only layout CSS no longer referenced
- Update `docs/project/ROADMAP.md` addendum to reflect the change

### Out of Scope
- Changing DevTools IPC behavior, persistence, or keyboard shortcuts
- Removing `accessDashboard` permission key (repurposed for DevTools button visibility)
- Removing `FirebaseConnectionCard` (unused after page removal; component remains for potential future use)
- Production deploy
- Customer portal or permission model changes

---

## Affected Areas

### Files / Modules (expected)
- `src/renderer/src/shared/components/Sidebar.tsx`
- `src/renderer/src/routes/AppRoutes.tsx`
- `src/renderer/src/features/dashboard/pages/DashboardPage.tsx` (delete)
- `src/renderer/src/styles/layout.css` (remove dashboard-only selectors)

### Architecture Impact
- [x] None — UI-only; sidebar action button instead of routed page

### Security Impact
- [x] None — same dev-only IPC guard (`canOpenDevTools()` in main process); button hidden outside dev Electron builds

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Dev Dashboard page removed; bottom-of-sidebar item becomes **Dev Tools** button (Bug icon) that opens detached DevTools. Manual verify in `npm run dev`.

### Migration Impact
- [x] None — no persisted data; `/dev-dashboard` bookmarks fall through to `*` → `/designs`

---

## Approach

1. Extend sidebar item model to support optional `action` items (button) vs route `NavLink` items.
2. Add a `Dev Tools` sidebar action at the bottom of nav (same position as current Dev Dashboard) gated by `accessDashboard`, `import.meta.env.DEV`, and `isElectronDesktop()`.
3. Wire click handler to `desktopAppService.openDevTools()` with brief loading disabled state.
4. Remove `DashboardPage`, its route, and dashboard-only CSS.
5. Update ROADMAP addendum.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Typecheck | `npx tsc --noEmit` | yes |
| Build | `npm run build` | yes |

### Manual
- [ ] In `npm run dev` Electron app, signed in as owner/admin/helper: **Dev Tools** button visible at bottom of sidebar; click opens detached DevTools.
- [ ] `/dev-dashboard` navigates to Design Library (catch-all redirect).
- [ ] Button not shown in production build (if verified locally).

---

## Human Checkpoints Anticipated
- [ ] Manual UI/UX review — quick sidebar button check in dev Electron

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Users bookmarked `/dev-dashboard` | Low | Catch-all redirect to `/designs` |
| DevTools button shown in web-only dev | Low | Gate on `isElectronDesktop()` same as before |

---

## Rollback Plan

Restore `DashboardPage`, route, and sidebar `NavLink` from git history.

---

## Documentation Updates Required
- [ ] ROADMAP.md addendum

---

## Open Questions
- [x] None

---

## Approval
- Review doc: `docs/workflow/reviews/2026-06-29-dev-dashboard-to-sidebar-devtools-review.md`
- Verdict: pending
