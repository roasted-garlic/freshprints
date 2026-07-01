# AI Playground Use Processing Prompt Plan

## Goal

Add a one-shot control in the Settings AI Playground that inserts the current AI Processing prompt into the playground prompt textarea. The control should only work once per playground modal open so it cannot be used repeatedly during the same session.

## Scope

In scope:

- Add a button above the top-right of the playground prompt input.
- Populate the playground prompt textarea with the current AI Processing prompt text from Settings.
- Allow the action only once per playground modal open.
- Reset the one-shot availability when the playground modal is reopened.
- Keep the change local to the renderer Settings UI.

Out of scope:

- Changing saved AI Processing prompt behavior.
- Changing playground backend request behavior.
- Firebase deploys, Functions deploys, Firestore writes, or secret changes.
- Prompt-template validation rules.

## Current Finding

- `SettingsPage.tsx` already has both values in scope:
  - the saved/current AI Processing `promptTemplate`
  - the playground prompt state from `useAiEnrichmentPlayground()`
- The playground prompt textarea lives in `.settings-playground-composer`.
- The existing playground hook already exposes `setPrompt`, so no backend or service change is required.

## Proposed Implementation

1. Add a small secondary/ghost button in the prompt composer header area, visually aligned above the top-right of the textarea.
2. On click:
   - copy the current `promptTemplate` into `playground.prompt`
   - mark the action as used for the current modal-open cycle
3. Disable or hide the button after the first successful use during that modal session.
4. Reset the one-shot flag whenever the playground modal opens again.

## Architecture Impact

Renderer-only UI/state change in:

- `src/renderer/src/features/settings/pages/SettingsPage.tsx`
- possibly `src/renderer/src/styles/components/settings.css`

No hook, service, shared type, or Functions change is expected unless a tiny helper improves clarity.

## Data Model Impact

None. No persisted data changes.

## Firebase Impact

None.

## Security Considerations

No new permissions or data exposure. The button only reuses prompt text that the owner/admin can already view in Settings.

## UI Considerations

- Keep the control compact and clearly tied to the playground prompt area.
- Prevent repeated clicks during the same modal-open cycle.
- Respect disabled/running states so the control does not interfere with an active playground run.
- Preserve the current stable textarea/modal layout.

## Risks

| Risk | Mitigation |
| --- | --- |
| Users accidentally overwrite a drafted playground prompt | Make the action one-shot per modal open and keep the button label explicit |
| State resets at the wrong time | Reset only on modal open/close transition, not on unrelated rerenders |
| Layout regression in the prompt composer | Keep CSS scoped to the Settings playground prompt area and verify build/typecheck |

## Verification

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Manual QA:

- Open the playground modal.
- Confirm the new button appears above the prompt input on the right.
- Click it once and confirm the current AI Processing prompt fills the textarea.
- Confirm the control cannot be used again until the modal is closed and reopened.
- Reopen the modal and confirm the control is available again.
