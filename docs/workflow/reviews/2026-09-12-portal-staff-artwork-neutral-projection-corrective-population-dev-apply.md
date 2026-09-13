# DEV Population APPLY Evidence — Portal Print Request Projections

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Authorization | `OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY` |
| Disposition | **APPLY succeeded**; post-apply dry-run and VERIFY clean |

## Pre-apply verification

Re-ran bounded dry-run immediately before APPLY. Counts matched the reviewed dry-run exactly:

| Metric | Reviewed dry-run | Pre-apply dry-run |
|---|---:|---:|
| scanned | 110 | 110 |
| create | 110 | 110 |
| update | 0 | 0 |
| alreadyCorrect | 0 | 0 |
| skipped | 0 | 0 |
| errors | 0 | 0 |
| actualWrites | 0 | 0 |
| hasMore | false | false |
| lastProcessedId | `zMNW9h7gKzulvBPNRxwr` | `zMNW9h7gKzulvBPNRxwr` |

Confirmed controls:

- `FIREBASE_PROJECT_ID=fresh-prints-dev`
- `PAGE_LIMIT=200`
- `APPLY` absent on pre-check; `APPLY=1` only for mutation
- `VERIFY` absent during APPLY
- Firebase CLI current project: `fresh-prints-dev`

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
  "scanned": 110,
  "create": 110,
  "update": 0,
  "alreadyCorrect": 0,
  "skipped": 0,
  "errors": 0,
  "actualWrites": 110,
  "lastProcessedId": "zMNW9h7gKzulvBPNRxwr",
  "nextCursor": "",
  "hasMore": false,
  "malformedCanonicalIds": [],
  "orderBy": "__name__"
}
```

## Trigger race note

No classification shift occurred between pre-apply dry-run and APPLY. Planning still reported 110 CREATE / 0 ALREADY_CORRECT, and `actualWrites = 110`. The live synchronizer did not pre-populate the page before this APPLY.

## Mutation boundary

Writes targeted only `portalPrintRequestItems` for the bounded page IDs. Canonical `printRequestItems`, `printRequests`, `staffArtworks`, Storage, Rules, and indexes were not mutated by the script during APPLY.
