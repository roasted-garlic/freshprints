# Review: Our Shows page UX + print-request action placement

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-08-23-our-shows-page-ux-and-print-request-actions-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Owner-driven Portal + Studio UX correctives. Scope is bounded to Portal Our Shows browse presentation and Studio Print Request action placement. No backend/schema changes. Proceed with a Portal-local browse calendar (do not alter shared ShowPicker allocation UX).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit in/out |
| Architecture alignment | pass | Portal-local calendar avoids ShowPicker coupling |
| Security impact addressed | pass | None |
| Data model impact addressed | pass | None |
| Backend impact addressed | pass | Reuse existing public show fields |
| Test strategy adequate | pass | Typecheck + manual UI |
| Human checkpoints identified | pass | Manual UX review |
| Roadmap alignment | pass | Follows show-discovery QA |
| Documentation plan | pass | Workflow artifacts only |
| No silent scope expansion | pass | Allocation modal explicitly out |

---

## Architecture Review

**Findings:**
- Correct to keep allocation ShowPicker unchanged.
- Use shared calendar grid helpers from `@fresh-prints/shared/utils/showCalendarGrid`.

**Required changes:**
- [x] Prefer Portal-local browse component over mutating ShowPicker (already in plan)
- [x] Use real paths under `apps/portal/features/...` and `apps/studio/...`

---

## Security Review

**Findings:**
- None

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [ ] None for this phase (DEV only)

---

## Data Model Review

**Findings:**
- None

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- `listPortalPublicShows` already returns `productionStatus` and `uniquePublicCatalogDesignCount` — enough for Past/Completed + counts.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Manual UX checkpoint required after implement.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Workflow plan/review/test/signoff only.

---

## Required Changes (if approved_with_changes)

1. Correct plan file paths to `apps/portal/features/navigation/constants/portalNavItems.ts`, `ShowDesignsPageContent.tsx`, `ShowDesignGalleryPageContent.tsx`, Studio `PrintRequestsPage.tsx`.
2. Gate Studio buttons by selected request `isInternal` (CR vs IR), not only URL kind.
3. Convert overflow item must set `danger: false` so it is not styled as destructive.

---

## Blockers (if blocked)

None

---

## Verdict Rationale

Clear product direction, low risk, no security/data impact. Approved with path and overflow styling corrections.

---

## Next Step

Implement approved scope on `development`.
