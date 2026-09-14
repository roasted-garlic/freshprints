# Production Print Request Lifecycle Mirror Backfill — Dry Run

**Date:** 2026-09-13
**Parent goal:** `coordinated-production-promotion-release-readiness`
**Frozen candidate:** `7b8462a0fe60e484a937a7c88fc37e7c938fff6d`
**Project:** `fresh-prints-prod`

## Root-cause confirmation

The production Studio QA observation is confirmed. The indexed User Info reader orders by
`lastLifecycleActivityAt DESC, __name__ DESC`, while most historical production requests lack the
server-maintained lifecycle mirror. Recently touched requests are represented by forward lifecycle
evidence and already have mirrors; untouched historical requests rely on the reviewed fallback
candidate and lack mirrors. This explains why newly touched requests appear while older history
cards are absent.

## Existing reviewed tooling

Runner reused without modification:

`functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts`

The runner is the reviewed DEV mirror-only implementation. Its non-DEV guard was explicitly
overridden only for this read-only production dry run with `FIREBASE_PROJECT_ID=fresh-prints-prod`
and `ALLOW_NON_DEV=1`; `APPLY` was absent. No new migration script was created.

Safety review confirms:

- candidate selection uses the reviewed timestamp → precedence → stable event-ID comparator;
- forward lifecycle events are read but never created or replayed;
- writes, if separately APPLY-authorized, update only
  `lastLifecycleActivityAt`, `lastLifecycleActivityEventId`, and
  `lastLifecycleActivityPrecedence`;
- request status, allocations, items, show state, customer identity, queue state, and artwork are
  not written;
- the current lifecycle request and allocation triggers are both production `ACTIVE`;
- the production indexed reader still depends on `lastLifecycleActivityAt` and `__name__` ordering.

## Aggregate dry-run results

The runner completed with exit 0 and `dryRun: true`; no customer-sensitive IDs were emitted in the
captured evidence.

| Measure | Result |
|---|---:|
| Print Requests inspected | 219 |
| Reader-eligible (`customerId` present) | 206 |
| Reader-eligible with mirror | 16 |
| Reader-eligible missing mirror | 190 |
| Reader-eligible requiring mirror update | 190 |
| Total existing mirrors | 16 |
| Total missing mirrors | 203 |
| Total proposed mirror writes | 203 |
| Eligible proposed writes | 190 |
| Skipped | 0 |
| Missing evidence | 0 |
| Malformed/unsafe/anomalous | 0 |
| Actual writes | 0 |

Candidate sources were limited to the reviewed forward evidence and historical fields: 16 forward
lifecycle-event candidates, 111 `allocation.completedAt`, 24 `allocation.createdAt`, 8
`convertedAt`, and 60 `request.createdAt` candidates. Aggregate correlation confirms **16/16
forward-evidence eligible requests are mirrored**, while **0/190 historical-fallback eligible
requests are mirrored**. This is representative evidence of the recently-touched versus untouched
production behavior without recording customer identifiers.

## Disposition and boundary

The dry run is safe to proceed to a separately owner-gated bounded APPLY. Compatibility-reader
fallback remains necessary as a rollback/safety path until APPLY completes, a post-APPLY dry run
reports zero proposed writes, and eligible coverage reaches 100%. No reader switch is made here.

**Production mutation performed:** none. No lifecycle events, statuses, allocations, items, shows,
customers, artwork, settings, maintenance state, Portal, Studio, Rules, Functions, indexes, or
other production data were written. Studio remains unpublished and Portal rollout remains stopped.

**Exact next owner checkpoint:** `OWNER AUTHORIZE PROD PRINT REQUEST LIFECYCLE ORDERING MIRROR BACKFILL — APPLY`
