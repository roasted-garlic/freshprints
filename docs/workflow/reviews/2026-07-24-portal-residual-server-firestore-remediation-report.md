# Portal Residual Server Firestore Remediation Report

## Verdict

The generated Portal catalog remains passed and closed. The residual test interval is bounded to
server-side print-request activity plus the Portal's one traced Help read. No catalog Firestore
fallback, old ready-design query, full snapshot publication, App Hosting Firestore request, or
unidentified scheduled/extension workload appeared in the logs.

The historical aggregate graph cannot be decomposed into exactly 377 reads and 8 writes because the
deployed print-request Functions did not record transaction attempts or returned counts. The
invocation graph and all delete-producing paths are exact; the remaining read total is bounded to
the specific calls below. Instrumentation added in this pass makes a subsequent isolated run exact.

## Interval and live revisions

Read-only Cloud Logging inspection covered:

`2026-07-25T02:34:00Z <= timestamp < 2026-07-25T02:43:00Z`

The retained log set contained 102 entries. All Firestore-capable server requests were Cloud Run
Functions; no App Hosting server request with Firestore work was present.

| Function | Live revision | Invocations | Measured/accounted result |
|---|---|---:|---|
| `registerWebPushSubscription` | `00006-bel` | 3 | unchanged; 4 reads and 0 writes each = 12 reads |
| `getPortalGlobalOpenGraph` | `00007-piq` | 1 | cache miss; settings 1, designs 0 = 1 read |
| `addPortalCatalogDesignToPrintRequest` | `00011-dek` | 10 | two groups of five concurrent calls; old accounting records 3 expected writes per created item but not transaction retries/returned documents |
| `onPrintRequestItemCreated` | `00010-sig` | 10 | one event per created item; deployed code performs one design existence read and one analytics write |
| `clearPortalWorkingPrintRequest` | `00013-lek` | 3 | only delete-capable path in the interval; deployed revision has no aggregate accounting |
| `listPortalAllocatableShows` | `00016-xod` | 1 | explicit show-picker request; deployed revision has no returned-count accounting |
| `onPortalCatalogSnapshotSourceWritten` | `00008-dil` | 10 | every event classified `operational`, mode `none`, outcome `skipped`; 0 ready-design/category/tag/coordination reads and 0 writes |

No old `designs status == ready limit 40` metadata query executed. The live metadata revision used
the generated newest-card asset and its one-hour cache. No evidence showed another Studio/Portal
client, scheduler, extension, or duplicate trigger in this interval.

## Exact attribution and bounded remainder

- The Portal client trace accounts for 21 reads and no writes/deletes.
- Push registration and global metadata account for 13 exact server reads and no writes.
- Ten catalog adds each perform two pre-transaction authorization/settings/design read operations,
  then a request-document read and a full request-items query on every transaction attempt.
- The ten adds arrived as two overlapping groups of five against the same parent request. This is
  the proven contention mechanism: transaction retries reread a growing item collection.
- Ten item-created triggers each performed the deployed design existence read and one analytics
  update.
- Three clears are the only delete-producing requests. Therefore all 9 Console deletes are
  attributable to those calls. Timing is consistent with clears of 4, 0, and 5 items, but the
  deployed revision did not log returned counts, so that per-call split is an inference rather than
  an exact historical measurement.
- One explicit show-picker call read authorization/customer data, cutoff settings, the upcoming-show
  query, and—when calendar shows existed—the customer's allocation query.

The graph's 8-write minute cannot be mapped one-for-one to requests: the same retained interval
contains at least 20 direct item/parent add writes and 10 analytics writes, plus non-empty clear
parent updates. This proves minute-bucket/reporting alignment differs from the precise log window.
No source is invented for an aggregate bucket.

Query Insights remains an owner-console check. Expected signatures for the historical window are
the transaction's `printRequestItems where printRequestId == ...`, the clear query with the same
constraint, the show-picker `upcomingShows`/`showAllocations` queries, and single-document
authorization/settings/design reads. There should be no `designs status == ready limit 40`
signature.

## Implemented remediation

- Portal catalog adds are serialized per print request while unrelated requests may proceed in
  parallel. A rejected task cannot poison the queue. This removes same-parent client contention;
  Firestore remains authoritative.
- Catalog-add development accounting now records transaction attempts, returned documents,
  read-operation count, duration, outcome, and sanitized write classes.
- The item-created analytics trigger no longer performs a redundant design existence read. Its
  direct update succeeds or fails explicitly and emits sanitized 0-read/1-write accounting.
- Clear-working-request reads items first. An empty request is a zero-write/zero-delete no-op and
  skips the allocation query. Non-empty clears retain the allocation safety check and emit exact
  returned-document, read, write, delete, and batch accounting.
- Show-picker accounting records exact show/allocation returned counts and approximate billable
  reads. Its product behavior and lazy explicit-open trigger are unchanged.

No generated asset contract, Firestore rule, persisted schema, Storage behavior, catalog
publication, or production surface changed.

## Verification

- Focused tests: 6/6 pass (same-request serialization, rejection recovery, transaction accounting,
  created/incremented write classes, empty-clear idempotency, and non-empty delete accounting).
- Functions TypeScript build: pass.
- Portal production build/typecheck: pass.
- Changed-file ESLint: pass with zero warnings.
- Git diff/status inspected; unrelated pre-existing Wave C work was preserved.

No deploy, republish, `rebuildCatalogSnapshots`, rules action, or production action occurred.

## Deployment and rollback boundary

After explicit owner approval, the dev-only server deployment is limited to:

`addPortalCatalogDesignToPrintRequest`, `clearPortalWorkingPrintRequest`,
`onPrintRequestItemCreated`, and `listPortalAllocatableShows`.

The Portal dev surface must also be rebuilt/restarted for per-request mutation serialization.
Rollback is the prior known-good revision of those four Functions plus the prior Portal revision.
No data, rules, Storage, or generated-asset rollback is required.

## Owner retest

1. Close every other Portal and Studio client using `fresh-prints-dev`.
2. Deploy only the approved dev Functions and newly built Portal revision; do not republish assets.
3. Open one Portal tab and its debug popup. Reset and confirm the session is active.
4. Record exact UTC start time, create/use one working request, add five different catalog designs,
   open the show picker once, clear once, and perform one second clear while already empty.
5. Leave the main tab and popup open for five full idle minutes. Keep the debug session active until
   the idle period is complete.
6. Copy the report and record exact UTC end time. Inspect Function accounting and Query Insights
   with one minute of padding on both sides.
7. Verify catalog-add calls are serialized, every transaction reports one attempt, the analytics
   trigger reports zero reads, the second clear reports zero writes/deletes, and no generated
   fallback or old 40-design query appears.

