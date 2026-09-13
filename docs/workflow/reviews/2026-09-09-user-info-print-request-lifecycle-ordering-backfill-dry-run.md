# DEV Dry-Run Revalidation — Print Request Lifecycle Ordering Mirror Backfill

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Environment: `fresh-prints-dev`
Owner authorization: `OWNER AUTHORIZATION: CORRECT DEV PRINT REQUEST LIFECYCLE MIRROR BACKFILL TIE HANDLING AND RE-RUN DRY RUN`

## Disposition

The prior blocker was corrected locally and revalidated in DEV read-only mode. The backfill is
**`READY_FOR_BOUNDED_DEV_APPLY`**, but APPLY was not run and remains a separate owner checkpoint.
The indexed reader remains disabled. No Firestore data, lifecycle event, allocation, show, or
customer document was written.

## Root cause and correction

The original script duplicated the lifecycle tuple comparator and did not inspect
`printRequestLifecycleEvents`. When a historical allocation timestamp tied an existing trusted
forward mirror, its synthetic ID sorted later and the script proposed replacing the trusted event
ID. The original fallback also treated `needsStaffRequeueAt` as generic precedence 20 instead of
the reviewed `released_for_requeue` precedence 50.

The correction:

- extracts the reviewed timestamp → precedence → event-ID comparator into
  `functions/src/printRequestLifecycleMirror.ts` and uses it from the forward request writer and
  the backfill;
- reads existing forward lifecycle evidence without replaying or writing event documents;
- preserves a trusted forward mirror on an equal occurrence timestamp, while allowing a genuinely
  newer tuple to advance monotonically;
- keeps deterministic historical-only tie handling and the reviewed precedence values; and
- updates only the exact mirror tuple: `lastLifecycleActivityAt`,
  `lastLifecycleActivityEventId`, and `lastLifecycleActivityPrecedence`.

No raw `printRequests.updatedAt` authority is used and no synthetic lifecycle event is created.

## Validation

Focused command:

```text
npx --no-install tsx --test functions/scripts/backfill-print-request-lifecycle-ordering-dev.test.ts functions/src/onPrintRequestLifecycleRequestWritten.test.ts functions/src/onPrintRequestLifecycleAllocationWritten.test.ts
```

Result: **10/10 passed**, exit 0 (6 corrective regression cases plus 4 existing lifecycle trigger
cases).

Functions validation:

```text
npm run build
```

Run from `functions/`; result: **PASS**, exit 0. This was local TypeScript validation only; no
Function deployment was performed. `git diff --check`: **PASS**, exit 0.

Targeted ESLint for the corrected comparator, backfill, and focused tests: **PASS**, exit 0.

## Canonical DEV dry-run command

Run from the repository root with `FIREBASE_PROJECT_ID=fresh-prints-dev`, with `APPLY` absent,
`ALLOW_NON_DEV` absent, and no mutation flag:

```text
npx --no-install tsx functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts
```

The prior `node --import tsx ...` documentation was corrected because it is not executable from
the repository root with this workspace's dependency layout.

## Dry-run executions

Both executions used the canonical command, reported `dryRun: true`, scanned one page, and exited
**0**. Their summary counts, last document ID, candidate-source counts, and all three tie-case
tuples were identical.

| Measure | Run 1 | Run 2 |
|---|---:|---:|
| Requests inspected | 11 | 11 |
| Reader-eligible (`customerId` present) | 8 | 8 |
| Existing mirrors | 3 | 3 |
| Missing mirrors | 8 | 8 |
| Proposed request-document writes | 8 | 8 |
| Unchanged | 3 | 3 |
| Skipped | 0 | 0 |
| Forward-evidence requests | 3 | 3 |
| Historical-fallback requests | 8 | 8 |
| Missing evidence | 0 | 0 |
| Equal-time cases examined | 3 | 3 |
| Anomalies/errors | 0 / 0 | 0 / 0 |
| Actual writes | 0 | 0 |
| Last request ID | `wgx60AqsvsSoY77lvdyi` | `wgx60AqsvsSoY77lvdyi` |

Candidate source counts were identical on both runs: `allocation.createdAt` 6,
`convertedAt` 2, and forward lifecycle event 3. Estimated read volume was 11 request documents,
60 allocation documents, and 64 lifecycle-event documents (**135 documents total**). Estimated
mirror writes were 8; actual writes were 0.

## Previously blocked trusted-forward cases

All three prior blockers were rechecked. The historical candidate tied the current occurrence
time and precedence, but the proposed final tuple retained the trusted forward event ID. No write
was proposed in any case.

| Request | Current timestamp | Current trusted event ID | Current precedence | Historical candidate ID | Proposed final event ID | Write? |
|---|---|---|---:|---|---|---|
| `KVR7rZbtjDb403My1Xzw` | 2026-09-09T21:28:19.029Z | `020_fc3440add621a4d7684df84d75474ce2242615d9` | 20 | `KVR7rZbtjDb403My1Xzw:allocation:rOgxqh1b4gN57K2G58EZ:created` | `020_fc3440add621a4d7684df84d75474ce2242615d9` | no |
| `YAoC7oIGXV9CLlpPC76y` | 2026-09-09T20:07:34.657Z | `020_bb9c8b6f37af6ad697d71c89f9fbf44030d5df39` | 20 | `YAoC7oIGXV9CLlpPC76y:allocation:ZOLUGAoCyREIZqdTMICe:created` | `020_bb9c8b6f37af6ad697d71c89f9fbf44030d5df39` | no |
| `kKrT6ZyUn2Ytn8IJmOEr` | 2026-09-09T21:27:49.078Z | `020_e3b7ea9b7d563fd2022c3fc957d7f681ee81ff49` | 20 | `kKrT6ZyUn2Ytn8IJmOEr:allocation:ZlNfhUZLxHg6xcS7bW88:created` | `020_e3b7ea9b7d563fd2022c3fc957d7f681ee81ff49` | no |

## Gates

- Trusted equal-time forward mirror preservation: **PASS**.
- Historical-only deterministic ties: **PASS**.
- Monotonic preservation (older fallback cannot regress, trusted equal-time identity remains,
  newer tuples advance): **PASS**.
- Idempotency: **PASS** — both dry-runs were identical; after a hypothetical bounded apply with
  no intervening lifecycle activity, the second candidate calculation would propose 0 additional
  mirror changes.
- Reader coverage after proposed mirror updates: **8/8 = 100%**.
- Raw `updatedAt` authority: **NO**.
- Synthetic lifecycle-event writes: **0**.
- Allocation/show/customer writes: **0**.
- Lifecycle indexes: **READY** (`CICAgNir940K` ordering,
  `CICAgPiB5pcK` lifecycle details).
- Indexed reader enabled: **NO**.
- Rules change: **NO**.
- Function deployment: **NO**. The comparator extraction is local source/build validation only.
- Index deployment: **NO**.
- Portal/Studio publish: **NO**.
- Production touched: **NO**.
- Commit/push: **NO**.

## Apply readiness and next checkpoint

Apply readiness: **`READY_FOR_BOUNDED_DEV_APPLY`**.

No APPLY command was executed. The parent lifecycle goal remains open and unsigned off. The next
existing reviewed checkpoint is:

`[NEEDS OWNER AUTHORIZATION: APPLY DEV PRINT REQUEST LIFECYCLE ORDER MIRROR BACKFILL]`

The subsequently authorized apply and post-apply verification are recorded separately in:

`docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-apply.md`
