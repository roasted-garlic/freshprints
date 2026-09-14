# Production Portal projection population APPLY

| Field | Value |
|---|---|
| Date | 2026-09-13 |
| Parent | `coordinated-production-promotion-release-readiness` |
| Frozen candidate | `7b8462a0fe60e484a937a7c88fc37e7c938fff6d` |
| Production project | `fresh-prints-prod` |
| Runner | `functions/scripts/reconcile-portal-print-request-items-prod.ts` |
| Result | **PASS — projection population converged** |

## Pre-APPLY guard

All reviewed guards passed before the first write: exact project and candidate SHA binding, runner
source matched the frozen candidate, clean checkout/manifest verification, `PAGE_LIMIT=200`, exact
double APPLY confirmation, bounded one-page invocations, no delete path, and writes limited to
`portalPrintRequestItems`.

## APPLY evidence

Nine explicit bounded invocations were run from the first page through the final cursor. Aggregate:

| Metric | Result |
|---|---:|
| APPLY pages | 9 |
| Source rows scanned | 1,680 |
| CREATE | 1,668 |
| UPDATE | 0 |
| ALREADY_CORRECT | 12 |
| Actual writes | 1,668 |
| Skipped / malformed / unsafe / errors | 0 / 0 / 0 / 0 |
| Deletes | 0 |
| Final `hasMore` | `false` |

The five-row population increase versus pre-APPLY evidence was reconciled as legitimate concurrent
source activity. No unclassified drift or privacy issue occurred.

## Post-APPLY exact VERIFY

The same nine pages were run with `VERIFY=1`, `VERIFY_STAGE=post_apply`. All 1,680 source rows had
exactly equal projection documents: missing `0`, stale `0`, already correct `1,680`, malformed `0`,
unsafe `0`, errors `0`, and no writes. Final `hasMore=false`.

## Zero-diff DRY RUN

The same nine pages were rerun in post-APPLY DRY RUN mode. Every page reported `CREATE=0`,
`UPDATE=0`, `errors=0`; aggregate scanned `1,680`, already correct `1,680`, actual writes `0`, and
final `hasMore=false`.

Independent count verification returned 1,680 canonical `printRequestItems` and 1,680
`portalPrintRequestItems` documents.

## Smoke and boundary

Portal hosted.app `/` and `/catalog` returned HTTP 200 with no DEV marker. Owner Studio QA remains
PASS and stable Studio `1.0.10` is published. Maintenance metadata remains absent/OFF. No final
Firestore Rules deployment, maintenance activation, Smart Profile/Algolia operation, legacy-tag
deletion, Auth/secret/settings change, or unrelated backfill occurred.

## Next checkpoint

**`OWNER AUTHORIZE FINAL FIRESTORE RULES CUTOVER`**
