# Post-APPLY Dry-Run + VERIFY Evidence — Staff Artwork enriched projections

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Disposition | **PASS** — exact enriched mapper convergence on full DEV page |

## Post-apply dry-run command

```powershell
Remove-Item Env:APPLY -ErrorAction SilentlyContinue
Remove-Item Env:VERIFY -ErrorAction SilentlyContinue
Remove-Item Env:START_AFTER_ITEM_ID -ErrorAction SilentlyContinue
$env:FIREBASE_PROJECT_ID='fresh-prints-dev'
$env:PAGE_LIMIT='200'
npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
```

### Summary

```json
{
  "projectId": "fresh-prints-dev",
  "dryRun": true,
  "verify": false,
  "pageLimit": 200,
  "startCursor": "",
  "scanned": 114,
  "create": 0,
  "update": 0,
  "alreadyCorrect": 114,
  "skipped": 0,
  "errors": 0,
  "actualWrites": 0,
  "lastProcessedId": "zMNW9h7gKzulvBPNRxwr",
  "nextCursor": "",
  "hasMore": false,
  "malformedCanonicalIds": [],
  "orderBy": "__name__"
}
```

## VERIFY=1 command

```powershell
Remove-Item Env:APPLY -ErrorAction SilentlyContinue
Remove-Item Env:START_AFTER_ITEM_ID -ErrorAction SilentlyContinue
$env:FIREBASE_PROJECT_ID='fresh-prints-dev'
$env:PAGE_LIMIT='200'
$env:VERIFY='1'
npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
```

### Summary

```json
{
  "projectId": "fresh-prints-dev",
  "dryRun": true,
  "verify": true,
  "pageLimit": 200,
  "startCursor": "",
  "scanned": 114,
  "create": 0,
  "update": 0,
  "alreadyCorrect": 114,
  "skipped": 0,
  "errors": 0,
  "actualWrites": 0,
  "lastProcessedId": "zMNW9h7gKzulvBPNRxwr",
  "nextCursor": "",
  "hasMore": false,
  "malformedCanonicalIds": [],
  "orderBy": "__name__"
}
```

Exit code: **0**

## Verification conclusions

- Exact shared-mapper equality for all 114 scanned projections (`alreadyCorrect: 114`).
- Staff Artwork enrichment fields (title, preview/thumbnail paths, widthPx/heightPx, optional background) match the Admin-enriched allowlist output where enrichment is available.
- Excluded private fields remain absent by allowlist (notes/archive/AI/audit/production/enhance internals not projected).
- Canonical `printRequestItems` / `staffArtworks` / Storage were not written by this script.
- `actualWrites = 0` on both post-apply dry-run and VERIFY.
- No App Hosting deploy; production untouched.
