# DEV Population APPLY Evidence — Staff Artwork enriched projection fields

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Authorization | `OWNER AUTHORIZATION: DEV REPOPULATE PORTAL PRINT REQUEST PROJECTIONS FOR STAFF ARTWORK FIELDS - APPLY` |
| Disposition | **APPLY succeeded**; post-apply dry-run and VERIFY clean |

## Pre-apply verification

CLI current project: `fresh-prints-dev`. Re-ran bounded dry-run immediately before APPLY. Counts matched the reviewed dry-run exactly:

| Metric | Reviewed dry-run | Pre-apply dry-run |
|---|---:|---:|
| scanned | 114 | 114 |
| create | 0 | 0 |
| update | 6 | 6 |
| alreadyCorrect | 108 | 108 |
| skipped | 0 | 0 |
| errors | 0 | 0 |
| actualWrites | 0 | 0 |
| hasMore | false | false |
| lastProcessedId | `zMNW9h7gKzulvBPNRxwr` | `zMNW9h7gKzulvBPNRxwr` |
| malformedCanonicalIds | [] | [] |

Confirmed controls:

- `FIREBASE_PROJECT_ID=fresh-prints-dev`
- `PAGE_LIMIT=200`
- No cursor
- `VERIFY` unset during APPLY
- No malformed/error rows

## Exact APPLY command

```powershell
Remove-Item Env:VERIFY -ErrorAction SilentlyContinue
Remove-Item Env:START_AFTER_ITEM_ID -ErrorAction SilentlyContinue
$env:FIREBASE_PROJECT_ID='fresh-prints-dev'
$env:PAGE_LIMIT='200'
$env:APPLY='1'
npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
```

## APPLY summary

```json
{
  "projectId": "fresh-prints-dev",
  "dryRun": false,
  "verify": false,
  "pageLimit": 200,
  "startCursor": "",
  "scanned": 114,
  "create": 0,
  "update": 6,
  "alreadyCorrect": 108,
  "skipped": 0,
  "errors": 0,
  "actualWrites": 6,
  "lastProcessedId": "zMNW9h7gKzulvBPNRxwr",
  "nextCursor": "",
  "hasMore": false,
  "malformedCanonicalIds": [],
  "orderBy": "__name__"
}
```

| Metric | Value |
|---|---:|
| scanned | 114 |
| create | 0 |
| update | 6 |
| alreadyCorrect | 108 |
| skipped | 0 |
| errors | 0 |
| **actualWrites** | **6** |
| hasMore | false |

Trigger race: **none** — classifications stayed create 0 / update 6 through APPLY.

## Mutation boundary

Writes targeted only `portalPrintRequestItems`. Script design does not mutate canonical `printRequestItems`, `staffArtworks`, Storage, print requests, quantities, sizing, or status. Production untouched.

## Related evidence

- Post-apply dry-run + VERIFY: `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-population-dev-verify.md`
- Owner DEV QA checklist: `docs/workflow/reviews/2026-09-12-portal-staff-artwork-image-title-dpi-projection-owner-dev-qa-checklist.md`
