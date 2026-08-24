# Review: Restore Portal theme toggle to sidebar on Upcoming Shows

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-24-portal-shows-theme-toggle-sidebar-plan.md |
| Verdict | **approved** |

---

## Summary

Narrow Portal chrome bug: `/shows` was omitted from the app-shell route list and the sidebar toggle was explicitly hidden, so the floating header toggle appeared instead. Restoring the existing shell pattern is the correct fix. No backend, auth, or schema impact. Production rollout stays a later human-gated step.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two files + extracted helper; Login CTA out of scope |
| Architecture alignment | pass | Navigation util; providers still own chrome mount |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | None |
| Test strategy adequate | pass | Helper unit test + portal typecheck + targeted lint |
| Human checkpoints identified | pass | Visual QA before production promote |
| Roadmap alignment | pass | QA corrective on live Upcoming Shows |
| Documentation plan | pass | STYLE_GUIDE already states ThemeToggle in shell |
| No silent scope expansion | pass | No chrome refactor |

---

## Architecture Review

**Findings:**
- Extracting `isPortalAppShellRoute` is appropriate so `/shows` cannot silently drop off the list again.
- Keep existing prefix list plus exact `/shows` and `/shows/` (do not use `startsWith('/shows')` alone).

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Theme chrome only. Guest vs signed-in browse of `/shows` is unchanged.

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Follow-up App Hosting rollout after this hotfix is on `development` (not this implement phase)

---

## Data Model Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- None.

**Required changes:**
- [x] None

---

## Testing Review

**Findings:**
- Unit-test shell vs auth routes, including `/shows/[showId]`.
- Manual: sidebar toggle present, floating toggle absent, `/login` unchanged.

**Required changes:**
- [x] None

---

## Documentation Review

**Findings:**
- STYLE_GUIDE ThemeToggle rule already matches intended behavior. Workflow artifacts only.

---

## Required Changes (if approved_with_changes)

None.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Root cause is identified and the fix is the established shell pattern. Scope is small, reversible, and does not touch production.

---

## Next Step

Implement approved scope.
