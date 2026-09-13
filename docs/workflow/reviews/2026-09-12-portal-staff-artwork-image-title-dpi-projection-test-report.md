# Test Report — Staff Artwork image/title/DPI projection amendment

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Phase | Test (post-Implement; pre-population APPLY) |
| Disposition | **passed_with_notes** |

## Focused automated results

### Shared + Functions + Portal mapper + population (node:test)

```text
npx --no-install tsx --test ^
  packages/shared/src/utils/portalPrintRequestItemProjection.test.ts ^
  functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts ^
  functions/src/onStaffArtworkPortalProjectionRefreshWritten.contract.test.ts ^
  functions/scripts/backfill-portal-print-request-items-dev.test.ts ^
  apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts ^
  functions/src/updatePortalStaffArtworkPrintRequestItemSize.contract.test.ts
```

Result: **`# tests 31` / `# pass 31` / `# fail 0`**

Coverage includes: allowlist enrichment, missing-enrichment row retention, catalog/upload unchanged, synchronizer Admin enrichment, Staff Artwork refresh trigger, population UPDATE/idempotency contracts, trusted sizing privacy, Portal mapper Staff Artwork without `designId`.

### Security contracts + Storage Rules (emulator)

```text
firebase emulators:exec --only firestore,storage "npx --no-install tsx --test tests/firebase/staffArtwork.storage.rules.test.ts tests/firebase/staffArtwork.rules.contract.test.ts"
```

Result: **`# tests 3` / `# pass 3` / `# fail 0`**

- Customer preview/thumb **allowed**
- Customer production/source **denied**
- Firestore `staffArtworks` customer deny + Portal-off-docs contracts asserted in source tests

Note: Running the Storage emulator suite **without** `firebase emulators:exec` fails with `fetch failed` (emulator not up). Documented; the emulators:exec run is authoritative.

### Functions build

```text
cd functions && npm run build
```

Result: **PASS** (exit 0)

### Portal typecheck

```text
npx tsc --noEmit -p apps/portal/tsconfig.json
```

Result: **PASS** (exit 0)

### Targeted ESLint

Scoped files for projection/Portal/Storage amendment: **PASS** (`--max-warnings 0`)

### `git diff --check`

Result: **PASS** (no whitespace errors reported for amendment scope; CRLF warnings only)

## Not claimed

- Full Portal production build (`next build`) — historical Windows `.next/trace` EPERM baseline remains unclaimed-green this turn.
- Owner DEV QA — not started; awaiting population APPLY authorization first.
- Population APPLY — not run.

## Residual accepted risk

Authenticated customer who learns another `staffArtworkId` may fetch that Staff Artwork `preview.webp` / `thumbnail.webp`. Owner accepted for current product direction.
