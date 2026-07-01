# AI Playground Prompt Button Inline Polish Plan

## Goal

Refine the new AI Playground prompt-copy button so it:

- uses the `Sparkles` icon
- uses shorter text
- sits on the same row as the `Prompt` label instead of pushing the label downward

## Scope

In scope:

- Update the button icon and text in the Settings AI Playground prompt area.
- Adjust the prompt field layout so the label and button share one horizontal row.
- Keep the existing one-shot-per-modal-open behavior unchanged.

Out of scope:

- Changing any prompt-copy logic.
- Changing playground request behavior.
- Firebase, Functions, Firestore, secrets, or deploy work.

## Current Finding

- The one-shot button currently renders in a separate toolbar block above the textarea.
- `AutoResizeTextarea` owns the label rendering inside its `.form-field`.
- Because the button is outside that label row, it visually pushes the `Prompt` label down.

## Proposed Implementation

1. Keep the one-shot state/behavior exactly as implemented.
2. Replace the current button icon with `Sparkles`.
3. Shorten the button label to a more compact action.
4. Move the button into an inline header row associated with the prompt field so:
   - `Prompt` stays on the left
   - the button sits on the right
5. Add or adjust scoped CSS for that inline row without disturbing the stable textarea sizing.

## Architecture Impact

Renderer-only UI change in:

- `src/renderer/src/features/settings/pages/SettingsPage.tsx`
- `src/renderer/src/styles/components/settings.css`

## Data Model Impact

None.

## Firebase Impact

None.

## Security Considerations

None beyond the already-approved behavior. The change is presentational only.

## Risks

| Risk | Mitigation |
| --- | --- |
| Inline layout crowds on smaller widths | Keep button compact and rely on existing responsive modal width |
| Reworking the field wrapper affects textarea sizing | Limit the CSS change to the prompt label row and leave the textarea behavior untouched |

## Verification

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Manual QA:

- Open AI Playground.
- Confirm `Prompt` and the new compact button share one line.
- Confirm the button uses the `Sparkles` icon and shorter text.
- Confirm the one-shot disable/reset behavior still works.
