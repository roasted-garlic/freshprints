# Plan: Helper permission restrictions (Whatnot import, Dev Tools, design restore)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-14-helper-permission-restrictions-review.md |
| Parks | `owner-studio-design-asset-purge` (test pending_manual — resume after this phase or when owner deploys) |

---

## Goal

Restrict Fresh Prints Studio **helper** role so helpers cannot: (1) open or use staff-assisted Whatnot show import, (2) see the Dev Tools sidebar action, or (3) restore archived designs. Helpers **keep** design archive (and existing show-queue manage except Whatnot import).

## Background

Owner request (2026-07-14). Today:

| Capability | Current helper access | Desired |
|------------|----------------------|---------|
| Whatnot **Import Shows** button / flow | Yes (`canManageUpcomingShows`) | No |
| Dev Tools sidebar (dev Electron) | Yes (`accessDashboard`) | No |
| Archive design | Yes (`canArchiveDesigns`) | Yes (unchanged) |
| Restore archived design | Yes (`canEditDesigns`) | No |

Helpers already cannot manage categories/tags; category restore UI is owner/admin-only via category management.

---

## Scope

### In Scope

- New / split permission helpers on `permissionService` + `PermissionKey` where needed
- Gate **Import Shows** UI separately from general show manage
- Gate Whatnot assisted-import service writes (`recordWhatnotAssistedImportResult` and import upsert path) with the new permission
- Gate **Dev Tools** sidebar action to owner/admin
- Split design **restore** from edit/archive: `canRestoreDesigns` = owner/admin; wire UI + `designService.restoreDesign`
- Unit tests for the new permission matrix
- Doc updates: `SECURITY.md` matrix, `WORKFLOWS.md` restore rule, brief note in `DECISIONS.md` if ADR-worthy (short decision entry)

### Out of Scope

- Changing helper ability to manually **Add show**, edit shows, export, or open Show Queue **Settings** (assumed keep — only Import Shows restricted)
- Category restore (already owner/admin-only)
- Firestore rules role-scoping for design `archived` → non-archived transitions (known limitation; same pattern as other helper UI/service gates until Functions/rules harden)
- Production deploy of rules/functions (no rules change required for this phase)
- Completing parked `owner-studio-design-asset-purge` manual test

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../permissions/types/permission.types.ts`
- `apps/studio/.../permissions/services/permissionService.ts`
- `apps/studio/.../permissions/services/permissionService.*.test.ts` (extend or add)
- `apps/studio/.../shared/components/Sidebar.tsx` (Dev Tools gate)
- `apps/studio/.../upcoming-shows/pages/UpcomingShowsPage.tsx` (Import Shows action only)
- `apps/studio/.../upcoming-shows/hooks/useWhatnotShowImport.ts` and/or services that persist import (`showQueueSettingsService.recordWhatnotAssistedImportResult`, upsert batch used by import)
- `apps/studio/.../designs/components/DesignDetailsModal.tsx`
- `apps/studio/.../designs/services/designService.ts` (`restoreDesign`)
- `docs/standards/SECURITY.md`, `docs/WORKFLOWS.md`, optionally `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: Permission layer only — no new modules; split coarse permissions into finer keys/methods following existing `canPurgeArchivedDesignAssets` / `canManageSettings` patterns.

### Security Impact

- [x] Details: Tightens least-privilege for helpers at UI + service layer. **Not** a Firestore rules change; a motivated helper with Studio client access could still write restore/import via raw Firestore until rules/Functions are role-scoped (document in SECURITY.md / RISK if not already covered).

### Data Model Impact

- [x] None

### Backend Impact

- [x] None (no Cloud Functions / rules deploy)

### UI / UX Impact

- [x] Details: Helpers no longer see Import Shows or Dev Tools; archived design details omit Restore. Owner/admin unchanged. Manual role-switch check recommended.

### Migration Impact

- [x] None

---

## Approach

1. **Permissions**
   - Add `canImportWhatnotShows(user)` → active `owner` | `admin`
   - Add `canRestoreDesigns(user)` → active `owner` | `admin`
   - Add `canOpenDevTools(user)` → active `owner` | `admin` (or reuse `canManageSettings`; prefer dedicated method for clarity)
   - Wire `PermissionKey` + `hasPermission` switch for any keys used by sidebar/header
   - Keep `canArchiveDesigns` / `canManageUpcomingShows` as today for helpers

2. **Whatnot import**
   - `UpcomingShowsPage` header: show **Import Shows** only when `canImportWhatnotShows`; keep Settings / Add show on `canManageUpcomingShows`
   - Guard `openImportWindow` / import confirm persistence with `canImportWhatnotShows` (fail closed with clear error)

3. **Dev Tools**
   - `Sidebar.tsx`: require `canOpenDevTools` (or equivalent) instead of `accessDashboard` for the Dev Tools action

4. **Design restore**
   - `DesignDetailsModal`: `canRestore` uses `canRestoreDesigns`
   - `designService.restoreDesign`: check `canRestoreDesigns` (not `canEditDesigns`)

5. **Tests + docs**
   - Permission unit tests: helper false / owner+admin true for the three capabilities; helper still archives
   - Update SECURITY design matrix + WORKFLOWS restore sentence

---

## Assumptions (non-blocking)

1. Helpers retain Show Queue **Add show**, **Settings**, and other `canManageUpcomingShows` actions.
2. Dev Tools visible to **owner and admin** in dev Electron builds (not owner-only).
3. “Restore the archive” means **design** restore only.

If any assumption is wrong, revise plan before implement.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `npx tsx --test` on permission (+ any touched) tests under studio | yes |
| Typecheck | Studio `tsc` / package script if present | yes |
| Lint | if configured for touched files | preferred |
| Build | no | no |
| Integration / E2E | no | no |
| Backend/rules | N/A — no rules change | no |

### Manual

- [ ] Sign in as **helper**: no Import Shows; no Dev Tools (dev build); can archive; no Restore on archived design
- [ ] Sign in as **admin** (or owner): Import Shows, Dev Tools (dev), Restore still available

---

## Human Checkpoints Anticipated

- [x] Manual UI verification (helper vs admin) after implement
- [ ] Business logic decision — only if assumptions above are rejected
- [ ] Production deploy — not required for this phase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Helper still restores via direct Firestore | Medium (known) | Document; service/UI fail closed; future rules/Functions phase |
| Splitting Import from Settings leaves helper able to change Whatnot base URL | Low | By design per assumption; tighten later if desired |
| Parking purge phase loses context | Low | State Decision Log + Parks field on this plan |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert permission methods and UI/service gates; docs revert with same commit or follow-up.

---

## Documentation Updates Required

- [x] SECURITY.md — helper matrix: no Whatnot assisted import; no Dev Tools; archive yes / restore no
- [x] WORKFLOWS.md — restore owner/admin only
- [ ] DECISIONS.md — short entry for helper least-privilege tightening
- [ ] Other: none required for ARCHITECTURE / DATA_MODEL / BACKEND

---

## Open Questions

- [x] None (assumptions documented; proceed unless human rejects)

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-14-helper-permission-restrictions-review.md
- Verdict: approved_with_changes (implemented)
