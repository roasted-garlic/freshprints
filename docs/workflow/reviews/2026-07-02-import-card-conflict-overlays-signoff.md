# Import Card Conflict Overlays Signoff

## Status

Signed off locally.

## Summary

Moved Imports page conflict and cancel surfaces into overlays on the affected method cards:

- Active batch import blocks the Single import card.
- Active single PNG import blocks the Batch import card.
- Active single PNG workflow shows `Cancel Upload` over the Single import card instead of in a bottom row.
- Active batch workflow shows `Cancel Upload` over the Batch import card instead of in lower progress, summary, result, and error panels.

Existing disabled-button behavior, conflict detection, and cancellation behavior are unchanged.

## Verification

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `git diff --check` passed with only Git CRLF conversion warnings.

## Deployment

No Firebase, Functions, rules, secrets, data, migration, or dependency action applies. This is a renderer-only UI presentation change.
