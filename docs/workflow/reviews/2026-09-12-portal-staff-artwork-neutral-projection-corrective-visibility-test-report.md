# Test Report: Portal Staff Artwork neutral projection visibility corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Implementation Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-visibility-implementation-review.md` |
| Status | **Automated Test complete; DEV preparation complete; Owner DEV QA pending** |
| Signoff | **Not authorized / not created** |

## Focused automated results

Command:

```text
npx tsx --test apps/portal/features/print-requests/services/portalPrintRequestService.staffArtworkProjection.test.ts tests/firebase/staffArtwork.rules.contract.test.ts
```

Result: **5 tests passed, 0 failed**.

Coverage proves:

- a safe Staff Artwork projection maps without `designId`;
- customer-safe request item ID, request ID, quantity, requested size, order/status, label, and
  timestamps are retained;
- Staff Artwork ID/title/description, preview/thumbnail/Storage paths, DPI/source dimensions,
  enhancement, and customer association are absent;
- catalog items still require `designId`; and
- customer-upload items still require `customerUploadId`.

Command:

```text
npx tsx --test packages/shared/src/utils/portalPrintRequestItemProjection.test.ts functions/src/onPrintRequestItemPortalProjectionWritten.contract.test.ts functions/src/updatePortalStaffArtworkPrintRequestItemSize.contract.test.ts
```

Result: **4 tests passed, 0 failed**.

This confirms the existing safe projection, synchronizer, and trusted sizing contracts remain green.

## Static/build validation

- `npm run typecheck --workspace @fresh-prints/portal`: **pass**
- Targeted ESLint over the changed service/tests: **pass**
- `git diff --check`: **pass** (normal LF/CRLF normalization warnings only)
- Existing Portal DEV server at `http://localhost:3100`: **HTTP 200**

No Functions, Rules, Storage, index, population, or Portal App Hosting deployment was required or
performed. No data was mutated. Production, staging, commit, push, freeze, and Signoff remain untouched.

## Owner DEV QA required

The owner must validate the original failure first on authenticated localhost Portal against
`fresh-prints-dev`, then repeat the complete checklist:

1. Staff Artwork row remains visible in Detail, Current Request, and Queue-to-Show with the neutral
   label, quantity, requested size, and minimum request state.
2. Quantity edit, trusted size edit, remove, realtime refresh, totals, and queue behavior remain
   truthful and use only the customer-safe request-item ID.
3. No Staff Artwork image, title, source ID, Storage path/URL, DPI, source dimensions, enhancement,
   customer association, private metadata, direct `staffArtworks` read, or `/staff-artwork/...`
   Storage resolution occurs.
4. Catalog Design and Customer Upload behavior remains unchanged.

Exact next checkpoint:

> **OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective**
