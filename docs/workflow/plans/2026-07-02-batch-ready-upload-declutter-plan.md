# Batch Ready Upload Declutter Plan

## Goal

Reduce vertical space and visual clutter in the batch import ready-to-upload panel while keeping batch discovery, exclusion, validation, and upload behavior unchanged.

## Scope

- Move the primary `Upload batch` action into the ready-to-upload header area.
- Render all validated files inside a taller scrolling list instead of truncating the list with an `and X more` footer.
- Replace the large always-visible discovery stat grid with a smaller high-signal summary.
- Move detailed discovery/folder counts into a modal opened by a compact `Discovery details` pill beside the source-type pill.
- Aggregate repeated `PRINT_SIZE_NORMALIZED` warnings into a compact `{count} Normalized` pill that opens a details modal.
- Remove normalized print-size messages from individual validated file rows while preserving other per-file warnings.
- Hide the rejected files section when there are no rejected files.
- Tighten validated file list spacing and panel layout to reduce vertical height.
- Add compact row previews for visible validated files, using only paths already validated for the active batch job.

## Out Of Scope

- Batch discovery, validation, upload, exclusion, cancellation, navigation guard, Firebase, data model, or service behavior.
- Changing the 500-file processing limit.
- Adding dependencies.
- Redesigning the entire Imports page.

## Architecture Impact

Mostly renderer presentation change in the existing batch import summary component and CSS, with a narrow IPC type/handler extension so the existing PNG preview endpoint can read already validated batch paths. No upload, discovery, Firebase, or data model changes are required.

## UI Considerations

Use existing `Card`, `Button`, `Badge`, alert, and dense operational panel patterns. Prioritize a compact header/action row, fewer always-visible metrics, collapsed technical details, and a tighter file list. Preserve accessibility for status messages and empty states.

## Security Considerations

No auth, permission, secret, Firebase rule, or data access changes. Batch row previews must use the same session-owned, validated-path guard as batch byte reads and must not accept arbitrary renderer file paths.

## Test Plan

- Run root TypeScript check.
- Run root lint.
- Run `git diff --check`.
