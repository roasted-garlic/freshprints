# Implementation Review — Request Lifecycle Trigger Mirror-Only Write Corrective

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Corrective: request lifecycle trigger mirror-only write guard
Environment: local source validation; DEV data inspected read-only after the authorized mirror APPLY

## Verdict

**IMPLEMENTATION READY FOR DEV DEPLOYMENT AUTHORIZATION**.

The request lifecycle trigger now compares Firestore values by logical value rather than JavaScript
object identity. Mirror-only request updates are ignored even when equal `Timestamp` instances are
deserialized separately. No Function, Rules, index, data-repair, reader, Portal, Studio, or
production deployment occurred in this corrective.

## Root cause

`changed()` and `hasLifecycleInputChange()` used shallow `before[field] !== after[field]`
comparison. Firestore `Timestamp` values with the same seconds/nanoseconds can be distinct
objects, so an update containing only the three lifecycle mirror fields could be misclassified as
business lifecycle activity. The deployed trigger consequently emitted the two observed conversion
events during the mirror APPLY.

The allocation trigger was audited separately. It compares allocation status strings and creation/
deletion shape, not arbitrary structured source fields, so the same false-positive mechanism is not
present there. No allocation-trigger change was made.

## Equality strategy

`areFirestoreValuesEqual()` uses the narrowest Firestore-aware path:

1. `Object.is` for primitives and identical references.
2. Date and byte-array value comparison.
3. Firestore SDK `isEqual()` for structured values such as `Timestamp`.
4. Recursive comparison only for arrays and plain records, including nested Firestore values.

No JSON serialization, deep-diff dependency, or special-casing of the two affected requests was
introduced. Source-field comparison uses the union of before/after keys so meaningful deletions are
also detected. The mirror-field exclusion remains exactly:
`lastLifecycleActivityAt`, `lastLifecycleActivityEventId`, and
`lastLifecycleActivityPrecedence`.

## Regression coverage

- Mirror-only write with distinct but equal converted timestamps: **PASS** — zero events.
- Equal `Timestamp` seconds/nanoseconds: **PASS** — unchanged.
- Different `Timestamp` value: **PASS** — detected as changed.
- Legitimate conversion from absent to timestamp: **PASS** — one deterministic conversion event.
- Recursive/own-write behavior: **PASS** — mirror-only follow-up emits no event.
- Existing request lifecycle cases and deterministic IDs: **PASS**.
- Allocation trigger audit/tests: **PASS**, unchanged.
- Backfill comparator/tie/idempotency tests: **PASS**.

Focused command:

```text
npx --no-install tsx --test functions/src/onPrintRequestLifecycleRequestWritten.test.ts functions/src/onPrintRequestLifecycleAllocationWritten.test.ts functions/scripts/backfill-print-request-lifecycle-ordering-dev.test.ts
```

Result: **14/14 passed**, exit 0.

Functions build:

```text
npm --prefix functions run build
```

Result: **PASS**, exit 0.

Targeted ESLint: **PASS**, exit 0.
`git diff --check`: **PASS**, exit 0.

## Read-only DEV incident inspection

The two unexpected events remain untouched:

| Request | Event ID | Type | Occurred at | Created at | Precedence |
|---|---|---|---|---|---:|
| `JG1M6fuUroOGLHCJElYx` | `090_52f6e3ac3c4394fb619eec65a0c84b92c0d9e3f9` | `converted_to_internal` | 2026-09-06T12:06:51.889Z | 2026-09-10T03:40:11.263Z | 90 |
| `eu5m2Ew3ffFtQLrQ3qpD` | `090_872fda0d79de8f3948e60c134044540abd5657a9` | `converted_to_internal` | 2026-09-06T12:46:09.862Z | 2026-09-10T03:40:11.320Z | 90 |

For both requests, the current mirror tuple remains the historical `convertedAt` tuple with its
synthetic request-derived event ID and precedence 90; the unexpected forward event did **not**
advance or replace the mirror. The events can appear in User Info Details, but their conversion
type/time causes the existing Details builder to suppress the reconstructed conversion row, so
they do not create two visible conversion rows. Because mirror timestamps and IDs did not change,
they do not affect indexed card ordering.

## Cleanup disposition

**`SAFE_TO_LEAVE_AS_HISTORICAL_DUPLICATE`**.

This is a read-only disposition only. The events are immutable conversion evidence for the same
preserved `convertedAt` timestamps, do not change card ordering, and are deduped by the existing
Details logic. No deletion, mirror repair, or other data mutation was performed. Any future cleanup
would require a separate owner-authorized data-repair checkpoint.

## Scope and deployment boundary

- Rules changed: **NO**.
- Indexes changed: **NO**.
- Proposed DEV deployment inventory: exactly `functions:onPrintRequestLifecycleRequestWritten`.
- Deployment performed: **NO**.
- Data repair performed: **NO**.
- Backfill APPLY rerun: **NO**.
- Indexed reader enabled: **NO**.
- Production touched: **NO**.
- Commit: **NO**.
- Push: **NO**.

Implementation files:

- `functions/src/onPrintRequestLifecycleRequestWritten.ts`
- `functions/src/onPrintRequestLifecycleRequestWritten.test.ts`

Workflow/evidence files updated:

- `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-trigger-mirror-only-corrective-implementation-review.md`
- `docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-apply.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`

The parent lifecycle goal remains **OPEN** and is not signed off. Next checkpoint:

`[NEEDS OWNER AUTHORIZATION: DEV DEPLOY LIFECYCLE REQUEST TRIGGER MIRROR-ONLY WRITE CORRECTIVE]`
