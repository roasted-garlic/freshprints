# Portal Show-Queue Submission Remediation Test Report

## Historical attribution

Cloud Run revision `queueportalprintrequesttoshow-00028-ruk` received three distinct authenticated
POST requests:

| Start UTC | HTTP | Server latency | Evidence |
|---|---:|---:|---|
| `03:49:18.006941Z` | 400 | 1.621 s | cold instance started at `03:49:14Z`; no plan marker |
| `03:49:31.087012Z` | 400 | 0.358 s | warm instance; no plan marker |
| `03:49:35.980452Z` | 200 | 0.597 s | plan marker emitted; four prints queued |

The Portal has exactly one submission path: acknowledgment modal `onConfirm` calls
`handleConfirmAcknowledgment`, which calls the hook and service. Buttons are `type="button"`; no
form, effect, event retry, callable retry wrapper, or route retry exists. The three tracer entries
and server requests are therefore three separate entries into that same confirmation handler, not a
server retry. They were sequential, not overlapping. The old hook's state-only, component-local
guard could not synchronously prevent reentry or survive modal/remount ownership changes.

The first client-observed 5.7 seconds includes CORS/callable setup and a cold Function instance. The
retained server request itself took 1.621 seconds. The two precise failed-precondition stages are
not recoverable: revision `00028-ruk` logged neither error message nor sanitized validation stage.
Both failed before the success-only plan marker. No cause is invented.

## Correction

- A service-owned Promise is keyed by authenticated user, request, and show. Concurrent/remounted
  callers share it; rejection evicts it; unrelated submissions remain independent.
- The hook also uses a synchronous ref guard before React rerenders its disabled state. A completed
  failure remains manually retryable.
- The callable reads and validates the named request and named show before item/allocation queries.
  An already non-working request or invalid show now exits before broad reads. The transaction still
  repeats authoritative request/show/allocation/capacity checks.
- Development accounting records sanitized validation stage, returned counts, transaction
  attempts/retries, write classes, duration, outcome, and safe failure code. The legacy plan log no
  longer contains request/show IDs.
- Catalog-add returns an explicit allowlisted item DTO. Portal maps its numeric timestamps and no
  longer rereads `printRequestItems/{itemId}`.
- Upload quota calls share an auth/purpose-scoped Promise and 45-second result, matching the existing
  live refresh interval. Rejections evict; completed processing invalidates before refresh.
- Queue success locally marks the detail/request active, clears Current Request, closes its drawer,
  and sets remaining quantity to zero. It no longer reloads the request, unchanged items, customer,
  allocations, or draft/editing lists. Later navigation/explicit refresh remains authoritative.

## Budgets

| Operation | Before | After |
|---|---:|---:|
| One intended queue action | 3 callable invocations | 1 callable invocation while in flight |
| Already non-working request | authorization/settings plus request, show, items and allocation queries | authorization/settings plus one named request; no item/allocation query |
| Invalid/archived show | request plus show, items and request-allocation queries | named request + named show; no item/allocation query |
| Successful four-item queue writes | 4 allocations + show counter + request + user acknowledgment = 7 | unchanged required 7 |
| Post-success client reads | request 1 + items 4 + customer 1 + allocations 4 + 2 empty status queries | 0 immediate reads |
| Four catalog additions follow-up reads | 4 item documents | 0 |
| Concurrent quota startup calls | 2 callables | 1 shared callable |

The successful queue's exact server reads depend on the number of existing show allocations and are
now emitted by `portal-show-queue-accounting`; they cannot be reconstructed for the old revision.

## Verification

- Focused affected tests: 20/20 pass.
- Portal typecheck: pass.
- Functions TypeScript build: pass.
- Portal production build: pass after stopping/restoring the local Next dev server that held
  `.next/trace`.
- Changed-file ESLint: pass with zero warnings.
- `git diff --check`: pass.

No deploy, rules/index change, migration, rebuild, republish, Storage change, secret change, or
production action occurred.

## Deployment and rollback

Dev Functions requiring deployment:

- `queuePortalPrintRequestToShow`
- `addPortalCatalogDesignToPrintRequest`

Portal App Hosting deployment is required for client Promise ownership, item/quota reconciliation,
and post-success state reconciliation. A local restart alone affects only local testing.

Rollback: restore the previous Portal revision and prior known-good revisions of those two
Functions. No data, rules, index, Storage, or generated-asset rollback is required.

## Owner retest

1. Close other Portal/Studio clients using `fresh-prints-dev`.
2. Deploy only the approved two dev Functions and Portal App Hosting revision.
3. Open one Portal tab and debug popup; reset and confirm one continuous active session.
4. Navigate Discover ↔ Library, add four different catalog designs, and confirm zero item-document
   follow-up reads.
5. Open the request/show picker once. Double-click confirmation deliberately and verify exactly one
   queue callable.
6. Confirm one successful `portal-show-queue-accounting` event, one transaction attempt, four
   allocation writes and three counter/request/acknowledgment writes.
7. Confirm success launches no request, item, customer, allocation, draft, or editing reload.
8. In a separate still-working request, choose an invalid/non-allocatable show if safely available;
   verify the sanitized stage and that no item query ran. Retry manually only after failure settles.
9. Keep the main tab and debug popup open for five idle minutes, then copy the report and record UTC
   start/end with one minute of Console/log padding.

