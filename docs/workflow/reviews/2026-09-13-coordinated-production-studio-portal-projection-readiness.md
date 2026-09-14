# Coordinated production Studio / Portal / projection readiness

| Field | Value |
|---|---|
| Date | 2026-09-13 |
| Parent | `coordinated-production-promotion-release-readiness` |
| Frozen candidate | `7b8462a0fe60e484a937a7c88fc37e7c938fff6d` (production merge `f615c38dbe15c37c494ce057544463843ead866e`) |
| Status | **READY FOR OWNER PROJECTION APPLY CHECKPOINT** |
| Production mutation boundary | Projection population APPLY was **not run** |

## Studio production QA and publication

Owner supplied and authorized the final production QA result:

> `OWNER QA: PROD STUDIO HISTORICAL PRINT REQUEST HISTORY — PASS`

The owner confirmed historical Print Request History is visible for existing customers, ordering is
correct, recently completed requests remain visible, and Account Activity remains a separate stream
that may be empty when no account/identity audit events exist. The lifecycle mirror correction is
therefore accepted: 203 mirror-only writes, 190 historical eligible requests updated, 206/206
reader-eligible coverage, post-APPLY dry run with zero proposed writes, zero missing evidence, and
zero malformed/unsafe rows.

The reviewed stable Studio release is published:

- tag `v1.0.10-f615c38`;
- release `1.0.10`, non-draft/non-prerelease;
- production source `f615c38dbe15c37c494ce057544463843ead866e`;
- eight Windows/macOS assets; and
- workflow `34762807770` passed build and finalization.

## Portal rollout and smoke

The existing Git-connected backend `fresh-prints-portal` in `fresh-prints-prod` rolled out the same
production merge SHA:

- rollout `build-2026-09-13-001` — **SUCCEEDED**;
- App Hosting build `build-2026-09-13-001` — **SUCCEEDED**;
- Cloud Run revision `fresh-prints-portal-build-2026-09-13-001` — **100% traffic**;
- hosted origin `https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app`.

Read-only hosted smoke passed with TLS verification (`curl`): `/`, `/catalog`, `/robots.txt`, and
`/sitemap.xml` all returned HTTP 200; the HTML responses contained no `fresh-prints-dev` marker.
The canonical `myprintrequest.com` domain remains outside this checkpoint and was not changed.

## Maintenance and projection gates

Maintenance remains OFF: read-only Admin SDK metadata for
`fresh-prints-prod/settings/portalMaintenance` returned `exists=false` (no setting mutation).
Functions/transition Rules/indexes are already active from the reviewed rollout evidence. With the
stable Studio and dual-read Portal live and maintenance absent/OFF, **FULL MAINTENANCE CAPABILITY
READY — PASS (OFF)** is recorded. Maintenance was not activated or production-tested in ON mode.

The production-locked runner
`functions/scripts/reconcile-portal-print-request-items-prod.ts` was run against exactly
`fresh-prints-prod` and the frozen candidate binding, page-by-page with `PAGE_LIMIT=200` (nine
bounded invocations, no unbounded scan):

| Mode | Scanned | Creates | Updates | Already correct | Errors | Actual writes | Final cursor |
|---|---:|---:|---:|---:|---:|---:|---|
| DRY RUN (9 pages) | 1,675 | 1,668 | 0 | 7 | 0 | 0 | none (`hasMore=false`) |
| pre-APPLY VERIFY (9 pages) | 1,675 | 1,668 | 0 | 7 | 0 | 0 | none (`hasMore=false`) |

Both runs converged across all nine pages with `hasMore=false`; intermediate cursors were retained in
the command transcript. No projection document was written, no malformed/unsafe row was found, and
no APPLY/VERIFY against production data beyond the read-only pre-APPLY mode was performed. The next
owner-authorized APPLY must run page-by-page from the first page and retain the runner's exact
production confirmation guards.

## Explicitly not performed

No projection APPLY or backfill, final Firestore Rules deployment, maintenance activation, Smart
Profile backfill, Algolia reconciliation, legacy-tag deletion, source/config change, Auth/settings/
secret mutation, or unrelated production deployment was performed in this continuation.

## Next checkpoint

**`PROD PORTAL PRINT REQUEST PROJECTION POPULATION — APPLY`**
