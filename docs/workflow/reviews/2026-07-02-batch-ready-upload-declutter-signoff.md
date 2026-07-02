# Batch Ready Upload Declutter Signoff

## Status

Signed off locally.

## Summary

Updated the batch import ready-to-upload panel so the primary upload action sits in the header, the always-visible summary shows fewer high-signal counts, `Discovery details` and `{count} Normalized` render as compact modal-opening pills, normalized findings render as cards in the modal, the validated-file list shows all rows inside a taller scrolling area instead of an `and X more` footer, individual validated rows no longer repeat the normalized notice, validated rows lazy-load compact image previews, and the rejected-files section is hidden when empty.

Batch discovery, validation, exclusion, upload, cancellation, and Firebase behavior are unchanged. The existing preview IPC was narrowly extended to support validated batch paths for the current batch job.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `git diff --check` passed with only Git CRLF conversion warnings.

## Deployment

No Firebase, Functions, rules, secrets, data, migration, validation, upload, or dependency action applies. This is a UI presentation change with a guarded import-preview IPC extension.
