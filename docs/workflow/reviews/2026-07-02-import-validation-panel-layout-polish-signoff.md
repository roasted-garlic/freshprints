# Import Validation Panel Layout Polish Signoff

## Status

Signed off locally.

## Summary

Updated the single PNG validation result panel so the preview plus `Upload PNG` button render on the left, compact validation data renders on the right, both columns use matching centered widths, validation status appears as a compact pill beside `VALIDATION`, and validation metadata uses a two-by-two grid focused on file name, file size, print size in inches, and resolution quality.

The normalized print-size notice is restored beneath the validation data to balance the right column. Validation content, warning copy, upload action, and upload behavior are unchanged.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `git diff --check` passed with only Git CRLF conversion warnings.

## Deployment

No Firebase, Functions, rules, secrets, data, migration, IPC, validation, upload, or dependency action applies. This is a renderer-only UI presentation change.
