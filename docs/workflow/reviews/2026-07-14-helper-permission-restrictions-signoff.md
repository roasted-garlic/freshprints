# Signoff: Helper permission restrictions

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Signoff by | Signoff Agent |
| Goal | `helper-permission-restrictions` |
| Plan | docs/workflow/plans/2026-07-14-helper-permission-restrictions-plan.md |
| Review | docs/workflow/reviews/2026-07-14-helper-permission-restrictions-review.md |
| Test report | docs/workflow/reviews/2026-07-14-helper-permission-restrictions-test-report.md |
| Final status | **approved** |

---

## Summary

Helpers can no longer Import Shows (Whatnot), open Dev Tools, or restore archived designs. They keep design archive and show-queue manage (Add show / Settings). Dev Tools is **owner-only**. Owner manual UI check: PASS.

---

## Changes Delivered

### Behavior

- `canImportWhatnotShows` — owner/admin; gates Import Shows UI + assisted-import service paths
- `canOpenDevTools` — owner only (sidebar)
- `canRestoreDesigns` — owner/admin; helpers keep `canArchiveDesigns`
- Whatnot assisted-import upsert / result recording fail closed without import permission

### Files Created

- `apps/studio/.../permissions/services/permissionService.helperRestrictions.test.ts`
- Plan / review / test report / this signoff under `docs/workflow/`

### Files Modified

- `permission.types.ts`, `permissionService.ts`
- `Sidebar.tsx`
- `UpcomingShowsPage.tsx`, `useWhatnotShowImport.ts`, `upcomingShowService.ts`, `showQueueSettingsService.ts`
- `DesignDetailsModal.tsx`, `designService.ts`
- `SECURITY.md`, `WORKFLOWS.md`, `DECISIONS.md` (ADR-FP-085)

### Documentation Updated

- ADR-FP-085, SECURITY, WORKFLOWS

---

## Tests

### Automated

- Permission unit tests: **pass** (7)
- Studio `tsc`: **failed_documented** (pre-existing TS5103 `ignoreDeprecations`)

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Helper / admin / owner permission UI checkpoint | **PASS** | owner (2026-07-14) |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | | |
| Database migration | not required | | |
| Design / UX | obtained | 2026-07-14 | Manual PASS |
| Business / policy | obtained | 2026-07-14 | Helper restrictions + owner-only Dev Tools |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Studio `tsc` ignoreDeprecations TS5103 | low | Pre-existing; optional cleanup |
| Parked: owner design asset purge deploy + manual | medium | Resume `owner-studio-design-asset-purge` when Function/rules deployed |

---

## Deferred Items (Roadmap)

- Resume **owner-studio-design-asset-purge** (deploy `purgeArchivedDesignAssets` + rules; manual archive → Delete images)
- ADR-FP-086 follow-ups: 7-day auto-archive for rejected designs; customer-upload / donation retention jobs; Portal reusable vs past-uploads
- Session-adjacent (not this goal’s formal scope): Rejected-tab manual Archive + post-import always auto-start AI (ADR-FP-014 amendment) — already in code/docs

---

## Open Blockers

- [x] None for this goal

---

## Verdict

**approved** — plan delivered, review gates met, unit tests pass, owner manual PASS.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed — N/A
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md`** — handoff package not present in repo
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` — N/A

**Recommended next action for user:** Resume parked **owner-studio-design-asset-purge** — deploy Function + rules to `fresh-prints-dev`, then manual archive → Delete images PASS.
