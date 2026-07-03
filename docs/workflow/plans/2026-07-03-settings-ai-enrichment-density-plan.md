# Plan - Settings AI Enrichment Density Polish

- **Date:** 2026-07-03
- **Mode:** Managed Phase
- **Goal slug:** `settings-ai-enrichment-density`
- **Roadmap phase:** Phase 5 AI Processing maintenance / Studio settings usability
- **Gate:** Plan -> **Review (STOP here)** -> Implement -> Test -> Signoff
- **Human checkpoint:** UI/UX approval received in chat on 2026-07-03 with additions:
  move the prompt editor into a modal and fix the input focus/caret bug after opening it.

---

## 1. Goal

Reduce the vertical space used by the Settings page's AI Enrichment section while keeping the same
controls and save behavior. The current card is narrow and stacks every control, hint, built-in
exclusion chip, and additional-exclusion chip editor vertically, making the section feel much taller
than it needs to be.

---

## 2. Scope

### In scope

- Widen the AI Enrichment settings card so labels and help text wrap less.
- Tighten vertical spacing inside the AI Enrichment section.
- Arrange the three primary AI controls more densely on desktop:
  - Vision model
  - Tag reranker mode
  - Suggested-tag quality mode
- Keep responsive single-column behavior on narrower screens.
- Replace the always-expanded Tag exclusions block with a compact summary row on the main page.
- Add a modal for Tag exclusions that shows:
  - built-in exclusions as read-only chips
  - additional exclusions with the existing `TagChipInput`
  - a clear close/done action
- Preserve the existing save model:
  - editing additional exclusions updates the local draft
  - Firestore is written only when the existing `Save AI enrichment settings` button is clicked
- Move the AI Processing prompt editor into a modal to save main-page space.
- Fix the bug where opening the prompt editor leaves other inputs without a visible active cursor/focus
  state afterward.
- Keep prompt edits draft-only until the existing `Save AI enrichment settings` button is clicked.
- Retain the `Use current default` action in the prompt editor modal.

### Out of scope

- No AI prompt wording changes.
- No Firebase Functions changes or deploy.
- No Firestore schema changes.
- No automatic Firestore writes.
- No changes to tag resolution, tag reranking, suggestion authoring, category resolution, or AI pipeline behavior.
- No changes outside the Settings page and Settings CSS unless a tiny shared modal/layout utility is required.

---

## 3. Proposed UI Shape

Desktop layout:

- AI Enrichment card max width increases from `40rem` to roughly `56-64rem`.
- Intro copy becomes shorter/tighter on the page.
- Primary controls render in a compact two-column grid:
  - select control
  - its hint directly below it inside the same grid item
- Prompt warning block becomes a compact summary row with an `Edit prompt` action.
- Tag exclusions become a compact row:
  - title
  - summary text like `Built-in: 17 | Additional: 12`
  - `Manage exclusions` button
- The modal owns the long chip lists and add/remove UI.

Mobile/narrow layout:

- Controls stack to one column.
- Exclusions summary and actions stack cleanly.
- Modal remains scrollable within viewport.

---

## 4. Expected Files

| File | Change |
|---|---|
| `src/renderer/src/features/settings/pages/SettingsPage.tsx` | Add exclusions modal state/markup; reorganize AI Enrichment controls into compact groups; replace inline exclusions editor with summary + manage button. |
| `src/renderer/src/features/settings/pages/SettingsPage.tsx` | Move prompt editor into a modal and keep prompt draft/save behavior unchanged. |
| `src/renderer/src/styles/components/settings.css` | Widen card, tighten gaps/padding, add compact grid plus prompt/exclusions modal styles, keep responsive behavior. |
| `.cursor/workflow/state.md` | Track this managed phase. |

---

## 5. Acceptance Criteria

- [ ] AI Enrichment card uses less vertical space on desktop than the current screenshot.
- [ ] The card is wider so labels/hints wrap less.
- [ ] Vision model, tag reranker, and suggested-tag quality remain editable and save through the existing save button.
- [ ] Built-in exclusions and additional exclusions are available in a modal.
- [ ] Additional exclusions can still be added/removed with the same validation behavior.
- [ ] Closing the modal does not write Firestore; only `Save AI enrichment settings` writes.
- [ ] AI Processing prompt editor opens in a modal instead of expanding inline.
- [ ] Opening/closing the prompt editor does not break visible caret/focus state in other inputs.
- [ ] Unsaved exclusion edits still count as unsaved Settings changes.
- [ ] Unsaved prompt edits still count as unsaved Settings changes.
- [ ] Owner/admin permission behavior is unchanged.
- [ ] Responsive layout remains usable on narrow screens.

---

## 6. Testing Plan

- `npx tsc --noEmit`
- `npm run lint`
- `npx vite build`
- `git diff --check`

Manual visual check after implementation:

- Open Settings at desktop width and confirm the AI Enrichment section is shorter and wider.
- Open the Tag exclusions modal, add/remove an additional exclusion, close the modal, and confirm the
  main page shows unsaved changes until Save is clicked.
- Open the prompt editor modal, focus/type in the prompt textarea, close it, then focus/add text in
  the exclusions modal and verify the caret/focus state is visible and active.
- Check a narrow/mobile-ish viewport to confirm stacking and modal scrolling remain usable.

---

## 7. Risks

- Moving the chip editor into a modal could hide important settings too much. Mitigation: keep a
  visible summary count and a clear `Manage exclusions` action.
- Unsaved draft state must remain on the main Settings page, not isolated inside the modal, so the
  existing save button and unsaved-change detection continue to work.
- Wider desktop layout must not break narrow viewports.

---

## 8. Review Decision Needed

Approve this plan to implement the Settings AI Enrichment density polish.
