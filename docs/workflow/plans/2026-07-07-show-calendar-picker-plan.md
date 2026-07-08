# Plan: Show Calendar Picker (Studio + Portal-ready)

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-07-show-calendar-picker-review.md` |

---

## Goal

Replace the vertical date-grouped list in **Add to Show** with a **calendar month view**: staff pick a date on the grid, then see that day's time slot(s) with the existing capacity progress bar, status badge, and full/over-capacity styling. Ship as a **shared package** (`@fresh-prints/show-picker`) so Fresh Prints Portal can reuse the same picker when customer show selection is implemented.

## Background

Staff allocate print requests to upcoming Whatnot shows via `AddToShowModal`. The current picker scrolls a long list of date headers and time cards (roadmap called this "calendar-style" but it is not a true calendar). With many scheduled shows, scanning dates is slow. A month grid matches mental model ("which Saturday?") and scales better.

Portal does **not** have add-to-show today (staff-only in Studio). This phase builds the reusable picker; Portal integration is deferred until that product flow exists.

## Scope

### In Scope

- Pure calendar grid utilities in `@fresh-prints/shared` (`showCalendarGrid.ts`)
- New workspace package `@fresh-prints/show-picker`:
  - `ShowPicker` React component (month grid + expandable time-slot panel)
  - Self-contained CSS using existing design tokens (`var(--color-*)`)
  - Framework-agnostic props (no Firestore / Studio types)
- Studio: wire `AddToShowModal` to `ShowPicker` (non-`fixedShowId` flow)
- Past shows remain excluded (`filterShowsAvailableForAllocation` — unchanged)
- Unscheduled shows: dedicated "No date set" section below calendar
- Unit tests for calendar grid logic
- Vite + TypeScript path aliases for Studio; Portal `package.json` dependency + tsconfig path for future use
- ADR note in `DECISIONS.md`

### Out of Scope

- Portal UI wiring (no add-to-show flow yet)
- New npm calendar dependency
- Gang Sheet Builder or other show selectors
- Changing allocation / split / override business logic

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/showCalendarGrid.ts` (new)
- `packages/shared/src/utils/showCalendarGrid.test.ts` (new)
- `packages/show-picker/` (new package)
- `src/renderer/src/features/print-requests/components/AddToShowModal.tsx`
- `src/renderer/src/styles/components/show-queue.css` (calendar section styles may move)
- `vite.config.ts`, `tsconfig.json`, `apps/portal/package.json`, `apps/portal/tsconfig.json`
- `docs/project/DECISIONS.md`

### Architecture Impact

- [x] Details: New `packages/show-picker` workspace package — presentation-only, depends on React peer + shared date-key utils. Studio maps domain models → `ShowPickerOption[]`. Portal will do the same when show selection ships.

### Security Impact

- [x] None — display-only UI; allocation guards unchanged in `upcomingShowService`.

### Data Model Impact

- [x] None

### Backend Impact

- [x] None

### UI / UX Impact

- [x] Details: Add to Show modal show selection becomes calendar + time slots. Manual UI review recommended.

### Migration Impact

- [x] None

---

## Approach

1. Add `showCalendarGrid.ts` in shared: `toLocalDateKey`, `buildCalendarMonthWeeks`, date-key sets from options.
2. Create `@fresh-prints/show-picker` with `ShowPicker`, `ShowPickerOption` type, and `show-picker.css`.
3. `ShowPicker` behavior:
   - Month navigation (prev/next)
   - Highlight days that have at least one option; disable days without shows
   - Selecting a date reveals time-slot cards (reuse current progress bar / badge / full-over styling)
   - Sync selected date from `selectedId` prop when parent pre-selects a show
   - "No date set" section for unscheduled options
4. `AddToShowModal`: map `allocatableShows` + capacity to `ShowPickerOption[]`; render `ShowPicker` when `!fixedShowId`.
5. Configure monorepo aliases; add Portal dependency (unused until Portal flow).
6. Tests + typecheck + lint.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npx tsc --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Lint | `npm run lint` | yes |
| Unit tests | `npx tsx --test packages/shared/src/utils/showCalendarGrid.test.ts` | yes |
| Build | `npx vite build` | yes |

### Manual

- [ ] Add to Show: calendar shows dots/highlights on days with upcoming shows
- [ ] Click date → time slot(s) with capacity bar appear
- [ ] Select slot → existing split/override flow unchanged
- [ ] Past shows not listed; unscheduled show appears in "No date set"
- [ ] Month navigation works across month boundaries

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review of calendar in Add to Show modal

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| CSS tokens differ between Studio and Portal | Low | Use only documented `var(--color-*)` tokens; Portal already shares theme architecture |
| Package adds monorepo complexity | Low | Single small package; documented in DECISIONS + plan |
| Multiple shows same day | Low | Time-slot list below calendar (same as today) |

---

## Rollback Plan

Revert `AddToShowModal` to inline date-grouped list; remove `packages/show-picker` if unused.

---

## Documentation Updates Required

- [x] DECISIONS.md (ADR for shared show-picker package)
- [ ] STYLE_GUIDE.md — note shared picker (brief pointer)

---

## Open Questions

- [x] None — Portal wiring deferred until customer show-selection flow is scoped.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-07-show-calendar-picker-review.md`
- Verdict: pending
