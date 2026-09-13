# DEV Dry-Run Evidence — Staff Artwork enriched projection repopulation

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Mode | **DRY RUN only** (`APPLY` absent / unset) |
| Disposition | Successful bounded page; Staff Artwork rows classify as UPDATE; **`actualWrites = 0`**; APPLY not run |

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

## Structured summary

```json
{
  "projectId": "fresh-prints-dev",
  "dryRun": true,
  "verify": false,
  "pageLimit": 200,
  "startCursor": "",
  "scanned": 114,
  "create": 0,
  "update": 6,
  "alreadyCorrect": 108,
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
| scanned | 114 |
| create | 0 |
| update | **6** |
| alreadyCorrect | 108 |
| skipped | 0 |
| errors | 0 |
| **actualWrites** | **0** |
| hasMore | false |
| nextCursor | _(empty)_ |

## Interpretation

- Six Staff Artwork (or otherwise drifted) projections need enrichment writes for title/preview/pixels/background fields after the schema amendment.
- Non-Staff-Artwork rows largely remain `alreadyCorrect` (108).
- Dry-run mutated nothing (`actualWrites = 0`).

## Safety confirmations

- `FIREBASE_PROJECT_ID=fresh-prints-dev`
- `APPLY` unset
- Production untouched
- One page only; no multi-page loop
- Script still writes only `portalPrintRequestItems` on APPLY (not run)

## Exact next human checkpoint

`OWNER AUTHORIZATION: DEV REPOPULATE PORTAL PRINT REQUEST PROJECTIONS FOR STAFF ARTWORK FIELDS - APPLY`
