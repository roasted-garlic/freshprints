# DEV Activation Record — Print Request Lifecycle Indexed Reader

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Owner authorization: `OWNER AUTHORIZATION: ENABLE DEV PRINT REQUEST LIFECYCLE INDEXED READER`
Project: `fresh-prints-dev`

## Existing activation gate

The reviewed gate is a compile-time source constant in:

`apps/studio/src/renderer/src/features/users/types/customerPrintRequestHistory.types.ts`

```text
PRINT_REQUEST_HISTORY_INDEXED_READER_ENABLED: false -> true
```

When false, the compatibility reader loads the bounded customer request context and derives the
lifecycle clock locally. When true, the existing service branch queries each logical customer
stream by `customerId`, `lastLifecycleActivityAt DESC`, and `__name__ DESC`, then performs the
reviewed k-way merge. This is a local source gate; no new environment variable, Firestore flag, or
runtime settings mechanism was introduced. The compatibility reader and fallback utilities remain
intact for rollback.

## Preflight

- Branch: `development`.
- Firebase target: `fresh-prints-dev`.
- Request trigger: `onprintrequestlifecyclerequestwritten-00002-fuy`, ACTIVE, 100% latest traffic.
- Allocation trigger: `onprintrequestlifecycleallocationwritten-00001-zat`, ACTIVE, 100% latest traffic.
- Ordering index `CICAgNir940K`: READY.
- Details index `CICAgPiB5pcK`: READY.
- Reader-eligible requests: **8/8 mirrored (100%)**; missing eligible mirrors: **0**.
- Lifecycle events created after the trigger corrective deployment: **0**.
- Historical duplicate conversion events remain untouched and retain the disposition
  `SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`.

## Automated validation

Focused command:

```text
npx --no-install tsx --test apps/studio/src/renderer/src/features/users/utils/buildPrintRequestHistoryCard.test.ts functions/src/onPrintRequestLifecycleRequestWritten.test.ts functions/src/onPrintRequestLifecycleAllocationWritten.test.ts
```

Result: **24/24 passed**, including newest-first lifecycle ordering, scheduled-date independence,
stable ties, deduplication, merged-customer helpers, k-way merge support, pagination cursor
behavior, Last Updated parity, active destination/canceled source handling, Details ordering and
lineage, Account Activity separation, and lifecycle trigger regressions.

- Targeted Studio ESLint: **PASS**.
- `npx --no-install tsc -p apps/studio/tsconfig.json --noEmit`: **baseline failures remain** in
  unrelated PNG validation, Firestore trace metadata, staff inbox, and shared test fixtures; no
  indexed-reader source error was reported.
- `git diff --check`: **PASS** (normal LF/CRLF warnings only).

## Read-only DEV indexed query smoke

Because no Browser or Windows Computer Use session was available, the smoke used authenticated,
read-only Firestore REST queries against existing DEV data; no synthetic mutation was performed.

- Project: `fresh-prints-dev`.
- Logical customer streams queried: **3**.
- Indexed request rows returned: **8**.
- Missing mirror rows: **0**.
- Duplicate request IDs across streams: **0**.
- Per-stream lifecycle ordering failures: **0**.
- Ordering query (`customerId`, `lastLifecycleActivityAt DESC`, `__name__ DESC`): **PASS**.
- Details query (`printRequestId`, `occurredAt ASC`, `__name__ ASC`): **PASS**; sample request
  `KVR7rZbtjDb403My1Xzw` returned 15 events.
- Missing-index errors: **NO**.
- Permission errors: **NO**.
- Interactive visual Studio smoke: **not available in this environment**; Owner DEV QA remains
  required for rendered cards, timestamps, Details, Load more, and manual lifecycle scenarios.

## Scope boundary

- Firebase deployment: **NO**.
- Rules/index changes or deployment: **NO**.
- Backfill rerun or mirror/event repair: **NO**.
- Historical duplicate events modified: **NO**.
- Studio publish: **NO**.
- Portal deployment: **NO**.
- Production touched: **NO**.
- Commit/push: **NO**.

The compatibility reader remains available as the immediate rollback path by restoring the gate to
`false`. The parent lifecycle goal remains **OPEN** and is not signed off. Next checkpoint:

`[NEEDS OWNER DEV QA: PRINT REQUEST LIFECYCLE INDEXED HISTORY READER]`
