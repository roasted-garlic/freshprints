# Signoff: ZIP Import 2.1 GB Limit

| Date | 2026-06-25 |
| Final status | **approved** |

## Summary

`MAX_ZIP_SIZE_BYTES` raised to `Math.floor(2.1 * 1024 * 1024 * 1024)` (~2.25 GB). Select ZIP, folder ZIP scan, nested ZIP extraction, and error messages use the shared constant. Docs updated for Google Drive multi-part downloads.

## Unchanged

`MAX_EXTRACTED_BYTES` (10 GB), `MAX_BATCH_FILES`, PNG/storage limits.

## Deploy

Restart desktop app (`npm run dev`). No Firebase deploy.
