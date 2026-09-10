# DEV Apply Record — Print Request Lifecycle Ordering Mirror Backfill

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Environment: `fresh-prints-dev`
Owner authorization: `OWNER AUTHORIZATION: APPLY DEV PRINT REQUEST LIFECYCLE ORDER MIRROR BACKFILL`

## Apply result

The bounded Admin apply ran once against exactly `fresh-prints-dev` from the `development` branch.
It updated only the three reviewed ordering mirror fields on 8 `printRequests` documents and exited
0. The 3 previously trusted forward mirrors were not modified.

Exact command:

```text
FIREBASE_PROJECT_ID=fresh-prints-dev APPLY=1 npx --no-install tsx functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts
```

The shell-local `ALLOW_NON_DEV` variable was absent. The script reported `dryRun: false`,
`proposedWrites: 8`, and `actualWrites: 8`.

Exact fields written:

- `lastLifecycleActivityAt`
- `lastLifecycleActivityEventId`
- `lastLifecycleActivityPrecedence`

No other request fields were included in the Admin batch.

## Pre-apply gate

The final read-only dry-run immediately before APPLY exited **0** and reported:

| Measure | Result |
|---|---:|
| Requests inspected | 11 |
| Reader-eligible | 8 |
| Existing mirrors | 3 |
| Missing mirrors | 8 |
| Proposed writes | 8 |
| Unchanged | 3 |
| Missing evidence | 0 |
| Predicted coverage | 8/8 (100%) |
| Anomalies/errors | 0/0 |

Branch was `development`; production was not selected; the indexed reader remained disabled;
lifecycle indexes were READY; and `git diff --check` passed.

The comparator extraction was behavior-preserving for the deployed forward writer: the shared
helper retains the deployed timestamp → precedence → `localeCompare` event-ID ordering. No
Function redeploy was required or performed.

## Post-apply verification

The required read-only post-apply dry-run was run twice; both executions exited **0** with
identical summaries. The first run reported:

| Measure | Result |
|---|---:|
| Requests inspected | 11 |
| Reader-eligible | 8 |
| Mirrored requests | 8 eligible / 11 total |
| Missing mirrors | 0 |
| Proposed mirror writes | 0 |
| Unchanged | 11 |
| Missing evidence | 0 |
| Reader coverage | 8/8 (100%) |
| Mirror monotonicity | PASS |
| Mirror idempotency | PASS |

The second post-apply dry-run also reported `proposedWrites: 0`, `missingMirrors: 0`,
`readerEligible: 8`, `unchanged: 11`, and `actualWrites: 0`.

Historical mirror samples remain derived from approved timestamps and never `updatedAt`:

- `AyMyFzu4AELGpZkSKnQJ`: allocation `createdAt` mirror.
- `LrLwzFDzkdKGgtCLpKRZ`: allocation `createdAt` mirror.
- `JG1M6fuUroOGLHCJElYx`: `convertedAt` mirror.
- `eu5m2Ew3ffFtQLrQ3qpD`: `convertedAt` mirror.

## Trusted-forward preservation

The previously blocked equal-time tuples were unchanged before and after APPLY:

| Request | Timestamp | Precedence | Before event ID | After event ID |
|---|---|---:|---|---|
| `KVR7rZbtjDb403My1Xzw` | 2026-09-09T21:28:19.029Z | 20 | `020_fc3440add621a4d7684df84d75474ce2242615d9` | same |
| `YAoC7oIGXV9CLlpPC76y` | 2026-09-09T20:07:34.657Z | 20 | `020_bb9c8b6f37af6ad697d71c89f9fbf44030d5df39` | same |
| `kKrT6ZyUn2Ytn8IJmOEr` | 2026-09-09T21:27:49.078Z | 20 | `020_e3b7ea9b7d563fd2022c3fc957d7f681ee81ff49` | same |

No trusted mirror was regressed or replaced with a synthetic historical ID.

## Unexpected lifecycle-event side effect

The requested mutation scope permitted **0 lifecycle-event writes**. Post-apply inspection found 2
new forward event documents, created during the APPLY window, for the two converted historical
requests:

| Request | Event document | Occurred at | Created at |
|---|---|---|---|
| `JG1M6fuUroOGLHCJElYx` | `090_52f6e3ac3c4394fb619eec65a0c84b92c0d9e3f9` | 2026-09-06T12:06:51.889Z | 2026-09-10T03:40:11.263Z |
| `eu5m2Ew3ffFtQLrQ3qpD` | `090_872fda0d79de8f3948e60c134044540abd5657a9` | 2026-09-06T12:46:09.862Z | 2026-09-10T03:40:11.320Z |

The mirror batch itself did not write event documents. The deployed request trigger observed the
mirror-only request updates and emitted these events. The local/deployed trigger source uses a
shallow `before[field] !== after[field]` check for non-mirror fields; timestamp-valued fields can
therefore look changed across an otherwise mirror-only update. This requires a separately reviewed
Function corrective before indexed-reader activation.

No event was deleted or manually repaired. No rollback was attempted.

## Boundaries and next checkpoint

- Lifecycle-event writes: **2 observed unexpectedly** (authorized target was 0).
- Allocation writes: **0**.
- Show writes: **0**.
- Customer writes: **0**.
- Raw `updatedAt` authority: **NO**.
- Lifecycle indexes: ordering `CICAgNir940K` READY; details `CICAgPiB5pcK` READY.
- Indexed reader enabled: **NO**.
- Functions/Rules/index/Storage/Portal/Studio deployment: **NO**.
- Production touched: **NO**.
- Commit/push: **NO**.

The parent lifecycle goal remains **OPEN** and is not signed off. Reader activation is not authorized
or safe to advance while the unexpected trigger side effect is unresolved. Next checkpoint:

`[NEEDS OWNER AUTHORIZATION: DEV DEPLOY LIFECYCLE REQUEST TRIGGER MIRROR-ONLY WRITE CORRECTIVE]`
