# Import Card Conflict Overlays Plan

## Goal

Reduce visual clutter on the Imports page by moving workflow-conflict messages and cancel actions onto the relevant import method cards.

## Scope

- Single PNG import entry card shows its blocking message as an overlay when an active batch import prevents single-file import.
- Batch import entry card shows its blocking message as an overlay when an active single PNG import prevents batch import.
- Single PNG import entry card shows the existing `Cancel Upload` action as an overlay while the single PNG workflow is active, replacing the bottom cancel row.
- Batch import entry card shows the existing `Cancel Upload` action as an overlay while the batch workflow is active, replacing lower duplicate cancel buttons in batch progress, summary, result, and error panels.
- Remove the separate bottom alert-style cards for these two conflict states.
- Keep existing conflict detection and button disabled behavior.
- Keep existing cancel behavior; this phase only moves cancel controls.

## Out Of Scope

- Upload workflow, cancellation behavior, navigation guard, or Electron close behavior changes.
- Import validation, discovery, upload orchestration, Firebase Storage, Firestore, IPC, or data model changes.
- Broader copy changes beyond the approved shorter single-import conflict message.
- Broader Imports page redesign.
- New dependencies.

## Architecture Impact

Renderer-only UI presentation change in the Imports feature. The existing `ImportsPage` owns the conflict and single-import cancel state; `BatchImportPanel` continues owning the batch cancel handler and only changes where that existing action renders. No service, hook, backend, Electron, or shared model changes are required.

## UI Considerations

Use the existing card and button components. The overlay should sit inside the affected import method card, use semantic design tokens, preserve light/dark theme support, and avoid adding another floating alert or action surface below the upload section.

## Security Considerations

No permission, auth, secret, filesystem, IPC, Firebase rule, or data access changes.

## Test Plan

- Run root TypeScript check.
- Run root lint.
- Run `git diff --check`.
