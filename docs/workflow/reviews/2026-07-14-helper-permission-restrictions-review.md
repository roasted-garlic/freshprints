# Review: Helper permission restrictions (Whatnot import, Dev Tools, design restore)

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-14-helper-permission-restrictions-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly scopes three helper least-privilege tightenings with clear assumptions (keep Add show / Settings; Dev Tools owner+admin; design restore only). Architecture and doc updates are appropriate. Required changes harden the Whatnot assisted-import path at the **service** layer so helpers cannot complete import via IPC/confirm even if the button is hidden.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Three capabilities; out-of-scope explicit |
| Architecture alignment | pass | permissionService + UI + service gates |
| Security impact addressed | pass | Honest about Firestore staff-wide updates |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | No rules/functions |
| Test strategy adequate | pass | Permission unit tests + manual role check |
| Human checkpoints identified | pass | Manual UI after implement |
| Roadmap alignment | pass | Role hygiene; parks purge phase cleanly |
| Documentation plan | pass | SECURITY + WORKFLOWS + DECISIONS |
| No silent scope expansion | pass | Assumptions documented |

---

## Architecture Review

**Findings:**
- Splitting Import Shows from `canManageUpcomingShows` is correct so helpers retain manual show ops.
- `useWhatnotShowImport` currently upserts via `upcomingShowService.upsertUpcomingShow` (gated only by `canManageUpcomingShows`) and records results via settings service — UI hide alone is insufficient.

**Required changes:**
- [x] See Required Changes below (service-layer assisted-import gate)

---

## Security Review

**Findings:**
- Matches existing helper restrictions (categories/tags/catalog approve): UI + service, Firestore still staff-wide — already documented pattern in SECURITY.md.
- Dev Tools gated to owner/admin is appropriate (dev Electron only).

**Required changes:**
- [x] Fail closed on assisted import in service/hook, not button-only

**Human approval needed before production:**
- [x] None for this phase (no rules/prod deploy)

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- No Cloud Functions / rules changes — acceptable for this slice.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Permission matrix tests required; manual helper vs admin sufficient for UI.

**Required changes:**
- [x] None beyond plan

---

## Documentation Review

**Findings:**
- SECURITY matrix and WORKFLOWS restore sentence correctly identified.

---

## Required Changes (if approved_with_changes)

1. **Assisted-import service gate:** In `upsertUpcomingShow`, when `input.fromAssistedImport === true`, require `permissionService.canImportWhatnotShows(caller)` in addition to (or instead of relying only on) manage-shows — fail with a clear permission error. Manual Add show paths must keep using `canManageUpcomingShows` only (`fromAssistedImport` false/omit).
2. **Hook fail-closed:** `useWhatnotShowImport.openImportWindow` and the import-confirm handler must check `canImportWhatnotShows` before opening the window / writing; report failure to the shell if denied.
3. **Settings write:** `showQueueSettingsService.recordWhatnotAssistedImportResult` must require `canImportWhatnotShows` (not only `canManageUpcomingShows`).

---

## Blockers (if blocked)

None

---

## Verdict Rationale

Approved with the three service/hook hardening items so Whatnot import is not button-only security. Assumptions (helpers keep Add show/Settings; Dev Tools owner+admin) accepted unless owner rejects during implement/manual test.

---

## Next Step

Implement approved scope including Required Changes 1–3; then automated permission tests + manual helper/admin checkpoint.
