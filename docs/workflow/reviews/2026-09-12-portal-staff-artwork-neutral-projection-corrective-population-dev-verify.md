# Post-APPLY Dry-Run + VERIFY Evidence — Portal Print Request Projections

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | `fresh-prints-dev` |
| Disposition | **PASS** — exact mapper convergence on full DEV page |

## Post-apply dry-run command

```powershell
Remove-Item Env:APPLY -ErrorAction SilentlyContinue
Remove-Item Env:VERIFY -ErrorAction SilentlyContinue
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
  "scanned": 110,
  "create": 0,
  "update": 0,
  "alreadyCorrect": 110,
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
  "scanned": 110,
  "create": 0,
  "update": 0,
  "alreadyCorrect": 110,
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

- Every scanned canonical row has an exact `portalPrintRequestItems` projection.
- Projections equal shared `projectPortalPrintRequestItem` output (strict key set + Timestamp millis).
- Malformed count remains 0.
- Staff Artwork privacy assertions remain enforced by the shared mapper path used during verification planning.
- Canonical documents were not written by the population script; APPLY mutation boundary remains projection-only.
- Idempotency proven: post-apply dry-run proposes zero CREATE/UPDATE.
