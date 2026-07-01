# Plan — Design Library Filter Clear Controls

- **Date:** 2026-07-01
- **Mode:** Managed Phase
- **Goal slug:** `design-library-filter-clear-controls`
- **Roadmap phase:** Phase 4/6 maintenance — Design Library catalog filtering
- **Gate:** Plan → **Review (STOP here)** → Implement → Test → Signoff
- **Human checkpoint:** None expected. This is a small UI polish change with no production deploy.

---

## 1. Goal

Improve Design Library filter clearing:

- Add a `Tags:` label before the active tag pills.
- Add an `X` remove control on each selected tag pill so staff can remove one tag without reopening the tag filter modal.
- Add an `X` clear control inside the search input when a search query is active.

---

## 2. Scope

| File | Change |
|---|---|
| `src/renderer/src/features/designs/pages/DesignLibraryPage.tsx` | Add a `removeSelectedTag` handler; render `Tags:` label; render each active tag pill with an accessible remove button/icon. |
| `src/renderer/src/shared/components/GlobalSearchField.tsx` | Add an optional accessible clear button that appears when `value` is non-empty and calls `onChange("")`. |
| `src/renderer/src/styles/components/navigation.css` | Style the shared search clear button and adjust input right padding when clearable. |
| `src/renderer/src/styles/components/design-library.css` | Update active tag row/pill styles so the label and remove button align cleanly in light/dark themes. |
| `.cursor/workflow/state.md` | Track this managed phase through signoff. |
| `docs/workflow/reviews/2026-07-01-design-library-filter-clear-controls-test-report.md` | Record verification. |
| `docs/workflow/reviews/2026-07-01-design-library-filter-clear-controls-signoff.md` | Record signoff. |

No data model, Firebase, service, query, URL contract, permission, or dependency changes.

---

## 3. Implementation Notes

- Keep selected tags in the existing `selectedTags` state.
- Removing a tag should call `setSelectedTags((current) => current.filter((value) => value !== tag))`.
- The existing URL-sync effect will update the `tags` query param automatically after state changes.
- Use a real `<button type="button">` inside each pill with an `aria-label` like `Remove attitude tag filter`.
- Use a lucide `X` icon to match the existing icon system.
- Add the search clear button to `GlobalSearchField` so the existing Design Library search input gets the behavior through the shared component.
- The search clear button should use `aria-label="Clear search"` and call `onChange("")`.
- Preserve the existing `Clear filters` behavior.

---

## 4. UI Considerations

- Label should read exactly `Tags:`.
- Pills should stay compact and wrap when many tags are selected.
- Tag remove buttons and search clear button must be keyboard accessible and have visible hover/focus states.
- The search clear button should not overlap typed text.
- Styling must use semantic CSS tokens only.

---

## 5. Verification

Run:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `git diff --check`

Manual/inspection checks:

- Active tags render with `Tags:` label.
- Clicking a pill `X` removes only that tag.
- Remaining tags stay selected.
- URL `tags` param updates through the existing filter sync.
- Search input shows an `X` only when it has text.
- Clicking the search `X` clears the search query and updates the URL through the existing filter sync.
- `Clear filters` still clears all active filters.

---

## 6. Acceptance Criteria

- [ ] Active tag filters display a `Tags:` label.
- [ ] Each active tag pill has an accessible `X` remove control.
- [ ] Removing one tag leaves other active filters intact.
- [ ] Search input has an accessible `X` clear control when text is present.
- [ ] Clearing search leaves selected tag/category/archive filters intact.
- [ ] Existing tag modal and Clear filters behavior are unchanged.
- [ ] TypeScript, lint, and whitespace checks pass.

---

## 7. Out Of Scope

- Changing tag filter modal behavior.
- Changing tag matching/filter semantics.
- Changing Firestore queries or indexes.
- Redesigning the filter dock.
- Starting `print-request-query-index-hardening`.
