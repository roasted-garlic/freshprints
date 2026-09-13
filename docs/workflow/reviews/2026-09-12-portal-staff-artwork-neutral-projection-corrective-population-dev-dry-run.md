# DEV Dry-Run Evidence — Portal Print Request Projection Population

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Mode | **DRY RUN only** (`APPLY` absent) |
| Disposition | Successful bounded page with zero errors; **APPLY not run** |

## Exact command

From repository root (PowerShell):

```powershell
Remove-Item Env:APPLY -ErrorAction SilentlyContinue
Remove-Item Env:VERIFY -ErrorAction SilentlyContinue
Remove-Item Env:START_AFTER_ITEM_ID -ErrorAction SilentlyContinue
$env:FIREBASE_PROJECT_ID='fresh-prints-dev'
$env:PAGE_LIMIT='200'
npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
```

## Structured summary (complete)

```json
{
  "projectId": "fresh-prints-dev",
  "dryRun": true,
  "verify": false,
  "pageLimit": 200,
  "startCursor": "",
  "scanned": 110,
  "create": 110,
  "update": 0,
  "alreadyCorrect": 0,
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

## Counts

| Metric | Value |
|---|---:|
| scanned | 110 |
| create | 110 |
| update | 0 |
| alreadyCorrect | 0 |
| skipped | 0 |
| errors | 0 |
| actualWrites | **0** |
| hasMore | false |
| nextCursor | _(empty)_ |

## Safety confirmations

- `actualWrites = 0`
- No projection documents mutated
- Firestore Rules **not** deployed
- Storage Rules **not** deployed
- Production untouched
- Only one page invoked; no automatic multi-page loop
- `APPLY=1` was not set and was not executed

## DEV infrastructure context for this dry-run

- Additive `portalPrintRequestItems` index deployed/present on `fresh-prints-dev`
- `onPrintRequestItemPortalProjectionWritten` created ACTIVE on DEV
- `updatePortalStaffArtworkPrintRequestItemSize` created ACTIVE on DEV

## Exact next human checkpoint

`OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY`

Do not apply automatically. Even though this page shows zero errors, all CREATE, a small dataset, and `hasMore: false`, owner APPLY authorization is still required before any mutation.
