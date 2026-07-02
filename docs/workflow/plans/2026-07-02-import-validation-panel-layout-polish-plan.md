# Import Validation Panel Layout Polish Plan

## Goal

Make the single PNG validation result panel read more uniformly by placing the preview/action column on the left, placing compact validation data on the right, equalizing the two columns, and restoring the normalized print-size notice inside the data column.

## Scope

- Place the preview image plus upload button on the left and the validation/data group on the right.
- Center the two-column layout inside the validation card and size both columns consistently.
- Replace the verbose validation result heading with a compact `Passed` / `Failed` status pill next to the `VALIDATION` label.
- Style validation metadata as compact bordered info cells.
- Simplify compact metadata to avoid repeated DPI/pixel details; show file name, file size, print size in inches, and resolution quality in a centered two-by-two grid.
- Restore the informational normalized-print-size notice beneath the compact validation data so the right column has balanced visual weight.
- Keep non-normalization validation warnings separate from the normalized print-size notice.
- Keep validation content, warning copy, upload action, and upload behavior unchanged.

## Out Of Scope

- Import validation rules.
- Upload, cancellation, navigation guard, Firebase, IPC, Electron, data model, or service behavior.
- Batch import layout changes.
- New dependencies.

## Architecture Impact

Renderer-only presentation change in `ImportResultPanel` and existing Imports CSS. No service, hook, shared type, backend, Electron, Firebase, or data model changes are required.

## UI Considerations

Use existing preview, button, and alert styles. The validation label and status pill should be centered above the compact data grid. The preview/action column and validation data column should use matching widths and stay centered in the parent card. Keep this compact panel focused on production-facing inches and quality rather than raw pixels or repeated DPI values.

## Security Considerations

No auth, permission, secret, filesystem, IPC, Firebase rule, or data access changes.

## Test Plan

- Run root TypeScript check.
- Run root lint.
- Run `git diff --check`.
