# Print Request Query Index Hardening Signoff

Date: 2026-07-03
Mode: Managed Phase
Goal: `print-request-query-index-hardening`
Status: PASS

## Scope

Signed off scope:

- Hardened `printRequests` reads with server-side query constraints and ordering.
- Hardened `printRequestItems` reads with request-scoped query constraints.
- Replaced global item summary loading with request-scoped item summary loading.
- Hardened customer reads with server-side ordering and supported optional filters.
- Added required Firestore index definitions to `firestore.indexes.json`.
- Added focused query planning, summary, and request naming tests.
- Updated durable docs to match implemented query/index behavior.
- Preserved current Print Requests UI behavior.

Confirmed exclusions:

- No Print Request sizing.
- No duplicate same-design item behavior.
- No request naming counters.
- No show selection or show capacity.
- No reduce, move, or split behavior.
- No Print Runs.
- No Portal account linking.
- No customer-created Portal requests.
- No Custom Requests.
- No customer notes.
- No size presets.
- No design lifecycle status changes.

## Implementation Summary

Files changed for the implementation:

- `src/renderer/src/features/print-requests/services/printRequestService.ts`
- `src/renderer/src/features/print-requests/hooks/usePrintRequests.ts`
- `src/renderer/src/features/print-requests/pages/PrintRequestsPage.tsx`
- `src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.ts`
- `src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts`
- `firestore.indexes.json`
- `docs/architecture/DATA_MODEL.md`
- `docs/WORKFLOWS.md`
- `docs/project/ROADMAP.md`
- `docs/project/TECH_DEBT.md`
- `.cursor/workflow/state.md`

Query paths hardened:

- `printRequests`: server-side `orderBy("updatedAt", "desc")`, with supported single filters for `status`, `customerId`, or `isInternal`.
- `printRequestItems`: server-side `where("printRequestId", "==", id)` plus `orderBy("updatedAt", "desc")`, with optional `status`.
- Item summaries: request-scoped item queries for the loaded request IDs instead of a global `printRequestItems` scan.
- `customers`: server-side `orderBy("displayName", "asc")`, with optional `isGuest`.

## Indexes

Added to `firestore.indexes.json` and deployed to the dev Firebase project only:

- `printRequests.status ASC, updatedAt DESC`
- `printRequests.customerId ASC, updatedAt DESC`
- `printRequests.isInternal ASC, updatedAt DESC`
- `printRequestItems.printRequestId ASC, updatedAt DESC`
- `printRequestItems.printRequestId ASC, status ASC, updatedAt DESC`
- `customers.isGuest ASC, displayName ASC`

Dev deployment command:

```bash
firebase deploy --only firestore:indexes --project fresh-prints-dev
```

Result:

- Deployed to `fresh-prints-dev`.
- New Print Request and Customer indexes reached `READY`.
- Firebase CLI compiled `firestore.rules` for validation, but deployed indexes only.
- No Functions, Hosting, Storage rules, Firestore rules, migration, backfill, rules relaxation, or production deploy occurred.
- CLI warning noted one existing remote index not present in local `firestore.indexes.json`; it was not deleted because `--force` was not used.

## Automated Verification

Commands and results:

```bash
npx tsx --test src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts
```

Result: PASS, 8/8 tests.

```bash
npx tsc --noEmit
```

Result: PASS.

```bash
npm run lint
```

Result: PASS.

```bash
npx vite build
```

Result: PASS. Existing circular manual-chunk warning printed.

```bash
git diff --check
```

Result: PASS. Standard Windows LF/CRLF warnings only.

## Manual QA

Manual authenticated QA passed in the dev session.

Verified:

- Opened Print Requests.
- Confirmed request cards loaded.
- Confirmed customer labels displayed correctly.
- Confirmed item and quantity counts displayed correctly.
- Created a customer request.
- Opened request details.
- Confirmed request items loaded.
- Added an approved design to the request.
- Updated an item.
- Removed an item.
- Confirmed internal request behavior still worked.
- Reloaded/revisited and confirmed request list, labels, counts, and details still loaded.

## Follow-Up Notes

- TD-015 remains open: long Firebase index error URLs can stretch operational error panels horizontally. Recommended follow-up: shared error text wrapping such as `overflow-wrap: anywhere` without changing error content.
- Future high-volume request lists may warrant denormalized request-level summary fields with a separate migration/backfill plan.
- Future request naming counters remain separate from this phase.

## Signoff

PASS.

`print-request-query-index-hardening` is complete and signed off.
