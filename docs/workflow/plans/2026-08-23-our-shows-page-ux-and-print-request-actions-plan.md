# Plan: Our Shows page UX + print-request action placement

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-08-23-our-shows-page-ux-and-print-request-actions-review.md |

---

## Goal

Make Portal **Our Shows** a customer-friendly browse experience for designs already on Whatnot shows (not a clone of the add-to-show picker), and tidy Studio Print Request actions so CR/IR only show the relevant queue button and Convert lives in the overflow menu.

## Background

Owner DEV QA feedback on `customer-request-show-discovery-and-search-correctives`: Show Designs nav/copy/layout still felt like the allocation modal; capacity bar was confusing for a browse page; Studio still showed both queue buttons plus Convert in the primary action strip.

## Scope

### In Scope
- Rename nav label **Show Designs → Our Shows**; move to **last** sidebar item
- Restyle Portal `/shows` list: centered intro blurb only; remove Fresh Prints Portal / Show Designs chrome and **Browse full library**
- Replace allocation-style capacity calendar UX on this page with a **browse calendar**: day number in a corner, design count centered, clear Past / Completed markers; past shows remain visible
- Update `/shows/[showId]` copy (remove Show Designs eyebrow; clearer “designs on this Whatnot show” heading)
- Studio: **Add to Show** only on Customer Requests; **Add to Internal Gangsheet** only on Internal Requests; move **Convert to Internal Request** into the ⋯ menu beside Edit

### Out of Scope
- Changing Studio/Portal **Add to Show modal** calendar (allocation picker stays as-is)
- Backend/callable schema changes (reuse existing `listPortalPublicShows` fields)
- Bottom-nav addition of Our Shows
- Production deploy

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/features/navigation/constants/portalNavItems.ts`
- `apps/portal/features/show-designs/pages/ShowDesignsPageContent.tsx`
- `apps/portal/features/show-designs/pages/ShowDesignGalleryPageContent.tsx`
- New: `apps/portal/features/show-designs/components/OurShowsCalendar.tsx` (+ helpers/CSS)
- `apps/portal/app/globals.css` (or dedicated imported CSS)
- `apps/studio/src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `DangerOverflowMenu` already supports `danger: false` for Convert

### Architecture Impact
- [x] Details: Portal browse calendar is **Portal-local** (not a breaking change to shared `@fresh-prints/show-picker` allocation UI). Reuses shared calendar grid helpers where useful.

### Security Impact
- [x] None

### Data Model Impact
- [x] None

### Backend Impact
- [x] None (existing `productionStatus` + `uniquePublicCatalogDesignCount` sufficient for Past/Completed + counts)

### UI / UX Impact
- [x] Details: Portal Our Shows list + detail; Studio Print Requests detail actions. Manual visual QA required.

### Migration Impact
- [x] None

---

## Approach

1. **Nav** — reorder `portalNavItems`; label `Our Shows`; keep `id: showDesigns` / `/shows` routes.
2. **List page** — centered intro copy; remove library CTA; stop using ShowPicker capacity bars for this surface.
3. **Browse calendar** — month grid; cells show day number (corner) + total public design count (center); day/show chips mark **Past** (scheduled start before now) and **Completed** (`fully_printed` / `completed`); click day → show time slots; click slot → `/shows/[id]`.
4. **Detail page** — copy-only header updates.
5. **Studio actions** — gate buttons by `visibleSelectedRequest.isInternal` (or active list kind); add Convert as non-danger overflow item next to Edit; keep delete as danger item.

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Typecheck Portal | `npm run typecheck -w @fresh-prints/portal` (or project equivalent) | yes |
| Typecheck Studio | Studio tsc / existing script | yes |
| Lint touched | eslint on edited files | yes |
| Unit | optional pure helpers for past/completed labels | no |

### Manual
- [ ] Portal sidebar: Our Shows last; label correct
- [ ] `/shows` blurb only; no Browse full library; calendar self-explanatory; past/completed visible
- [ ] Show detail heading/copy
- [ ] Studio CR: Add to Show only; Convert in ⋯; IR: Internal Gangsheet only

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX review
- [ ] Design approval
- [ ] Production deploy

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Shared ShowPicker regression | Med | Do not change allocation picker API; Portal-local browse UI |
| Past shows hard to distinguish | Low | Explicit badges + muted cell styling |
| Convert buried too deep | Low | Keep in Edit-adjacent ⋯ with clear label |

---

## Rollback Plan
Revert Portal nav/pages/CSS and Studio PrintRequestsPage action strip changes.

---

## Documentation Updates Required
- [ ] Other: workflow plan/review/test/signoff only; STYLE_GUIDE only if new lasting pattern documented later

---

## Open Questions
- [x] None — owner provided concrete copy/layout direction

---

## Approval
- Review doc: docs/workflow/reviews/2026-08-23-our-shows-page-ux-and-print-request-actions-review.md
- Verdict: pending
