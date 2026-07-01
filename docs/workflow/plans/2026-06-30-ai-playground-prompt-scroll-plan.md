# Plan: AI Playground Prompt Scroll Behavior

## Goal

Stop long AI Playground prompts from growing the modal while preserving a comfortable prompt-writing workflow.

When staff type or paste a long prompt:

* the prompt textarea may grow only up to a fixed, modal-friendly height
* overflow scrolls inside the textarea instead of expanding the modal
* the textarea follows the cursor/caret while staff are actively typing or pasting
* if staff manually scroll back up, the textarea should not snap them back down until they move the caret/input again

## Scope

In scope:

* Update the shared `AutoResizeTextarea` component with an optional capped auto-resize mode.
* Apply that capped mode to the Settings AI Playground prompt only.
* Keep the production AI Processing prompt editor behavior unchanged unless explicitly configured.
* Update Settings playground CSS so the textarea has a stable max height and internal scrollbar.
* Run focused renderer verification.

Out of scope:

* Firebase deploys, Functions deploys, rules deploys, seed writes, or secret changes.
* Changing AI prompt persistence, Cloud Functions playground behavior, or model settings.
* Redesigning the Settings page or AI Playground modal.
* Changing the result modal output scroll behavior.

## Current Finding

`SettingsPage` currently renders the AI Playground prompt with `AutoResizeTextarea`.

`AutoResizeTextarea` always sets the textarea height to its full `scrollHeight`. That works for short forms, but for long playground prompts it expands the textarea and forces the modal to grow until the modal body must take over scrolling.

The playground-specific CSS has a minimum height, but no capped height that the component respects.

## Proposed Implementation

### 1. Shared Component Option

Extend `AutoResizeTextarea` with optional props such as:

```ts
maxAutoHeightPx?: number;
scrollToCaretOnInput?: boolean;
```

Behavior:

* Existing callers without these props keep current full auto-resize behavior.
* When `maxAutoHeightPx` is provided:
  * calculate content height as today
  * set textarea height to `min(scrollHeight, maxAutoHeightPx)`
  * use `overflow-y: auto` when content exceeds the cap
* When `scrollToCaretOnInput` is enabled:
  * after input/change, keep the caret visible by letting the browser input scroll position settle and then correcting if needed
  * do not continuously force-scroll during passive renders

### 2. Manual Scroll Respect

Track whether the user manually scrolled away from the bottom/caret zone.

Practical implementation:

* On textarea `scroll`, mark manual scroll when the event is not part of a programmatic follow operation.
* On `input`, `change`, `select`, or pointer/keyboard caret movement, allow the browser to bring the caret back into view.
* Avoid forcing scroll from `useLayoutEffect` on value-only renders unless the user is already near the bottom or the input event just happened.

This keeps paste/type ergonomic while allowing staff to review earlier prompt text without a constant snap-back.

### 3. Settings Playground Usage

Apply the new capped mode to the playground textarea:

```tsx
<AutoResizeTextarea
  maxAutoHeightPx={360}
  scrollToCaretOnInput
  ...
/>
```

Exact height can be adjusted in implementation to fit the existing modal proportions across desktop and smaller viewports.

### 4. CSS

Update `.settings-playground-textarea`:

* keep the current minimum height
* allow internal vertical scrolling
* keep resize disabled
* keep width stable

Use existing design tokens and avoid inline styling.

## Architecture Impact

Renderer-only UI change.

Layer ownership:

* shared component behavior: `src/renderer/src/shared/components/AutoResizeTextarea.tsx`
* feature-specific styling/usage: Settings page and `settings.css`

No service, Firebase, Cloud Function, or data model changes.

## Data Model Impact

None.

No Firestore fields or shared AI types change.

## Firebase Impact

None.

No rules, indexes, deploys, seed writes, or migrations are in scope.

## Security Considerations

No change to authorization or secret handling.

The playground remains owner/admin gated by existing permission checks and server callable validation.

## UI Considerations

The modal should remain stable when long prompt text is pasted.

The textarea should be easy to use for long prompts:

* caret remains visible while entering text
* staff can scroll within the textarea to inspect earlier text
* modal body does not become the primary scroll surface just because prompt text is long

## Risks

| Risk | Mitigation |
| --- | --- |
| Shared textarea behavior regresses other forms | Make the capped behavior opt-in only |
| Browser textarea caret scrolling fights custom scroll code | Prefer minimal programmatic scrolling and rely on native textarea behavior where possible |
| Modal still grows on long paste | Cap height in component and CSS, then verify with long text |
| Manual scroll feels sticky | Track manual scroll separately and only follow on actual input/caret actions |

## Verification Plan

Expected commands after implementation:

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Manual QA recommended:

* Open Settings → AI Playground.
* Paste a long prompt that exceeds the modal height.
* Confirm the modal does not grow.
* Confirm the textarea scrolls to the active caret/end after paste.
* Scroll upward inside the textarea and confirm it stays where staff scrolled until they type/paste/move the caret again.

## Human Checkpoint

Implementation requires approval of this plan.

No deployment or external action is approved by this plan.
