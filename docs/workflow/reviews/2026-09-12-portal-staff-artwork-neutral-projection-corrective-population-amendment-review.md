# Portal Staff Artwork neutral projection — bounded DEV population amendment Formal Review

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Review type | Formal Review of population Plan Amendment only |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Base Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md` |
| Amendment Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-population-amendment-plan.md` |
| Base Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-review.md` |
| Verdict | **`approved_with_changes` — design is implementation-ready after explicit owner acceptance; script implementation is not authorized** |
| Environment | `fresh-prints-dev` only; production untouched |

## Review boundary

This review resolves the prior blocker: the runtime corrective was locally implemented and tested,
but no executable mechanism existed to materialize existing canonical items before the customer
read boundary is deployed. The repository’s reviewed lifecycle backfill pattern, current Portal
query contract, shared projection mapper, trigger, Rules, and index were inspected.

This review covers documentation and design only. No script was created, no code/Rules/Storage/
index was deployed, no DEV data was read or mutated, and no staging, commit, push, freeze, or
production action occurred. The owner must accept this amendment before Implement may begin.

## 1. Pattern and exact mechanism

The proposed mechanism correctly reuses
`functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts` and its dry-run evidence at
`docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-dry-run.md`.
It adopts the reviewed Admin SDK, explicit `APPLY=1`, project guard, deterministic ID ordering,
bounded page, resumable cursor, per-page summary, and separate apply checkpoint.

The exact new script path is:

`functions/scripts/backfill-portal-print-request-items-dev.ts`

No unnecessary Cloud Function is introduced. The existing
`onPrintRequestItemPortalProjectionWritten` remains the live synchronizer.

## 2. Eligibility decision

The review selects **Scope A — every canonical `printRequestItems` document**.

This is the narrowest deterministic scope that is complete for the actual Portal contract:

- Portal item reads query only `portalPrintRequestItems` by `printRequestId`.
- Full Portal history reads all requests with the customer’s `customerId`; working chrome reads
  `draft` and `editing`. Both current and historical customer rows must converge.
- Canonical items contain a request ID but not trusted parent ownership fields. Filtering by
  customer eligibility would require an N+1 parent lookup and would diverge from the live trigger,
  which maps every canonical item.
- Internal, orphaned, and parent-deleted rows remain inaccessible to customers because projection
  Rules require an existing owned parent request. They receive only the strict sanitized mapper
  output and are not a customer library or browse surface.

The exact predicate is therefore: canonical item is present in the bounded ordered scan and the
shared mapper returns a non-null projection. No request status/origin/internal/customer lookup is
performed by the script. This includes all valid current and historical customer items without
guessing or leaving a Portal-readable row unmaterialized.

## 3. Query, page, and cursor review

The locked query is `printRequestItems.orderBy("__name__")`, with optional
`START_AFTER_ITEM_ID` passed to `startAfter(cursorSnapshot)`. `PAGE_LIMIT` defaults to 200 and is
strictly capped at 200; values outside `1..200` fail closed. Each invocation reads at most 201
documents, processes one page of at most 200, and uses the extra document only for `hasMore`.

The script never loops through the collection automatically. `nextCursor` is the last processed
canonical ID when another page exists. This is deterministic, resumable, and below Firestore’s
500-operation batch/transaction limit.

## 4. Environment and mutation safety

The project resolves from `FIREBASE_PROJECT_ID`, then `GCLOUD_PROJECT`; a missing value fails closed.
The only accepted project is exactly `fresh-prints-dev`. There is no `ALLOW_NON_DEV` or production
override. Project validation occurs before Admin SDK initialization or Firestore reads.

Dry-run is the default. Only `APPLY=1` permits writes; all other values are dry-run. `VERIFY=1`
is read-only and cannot be combined with apply. No command in this amendment authorizes apply.

## 5. Mapper, privacy, and idempotency review

The script must import `projectPortalPrintRequestItem` from
`packages/shared/src/utils/portalPrintRequestItemProjection.ts`. No projection logic is copied into
the script. For every canonical document, it reads the matching deterministic projection document
and classifies `CREATE`, `UPDATE`, or `ALREADY_CORRECT`.

Equality is strict over the complete sorted key set; timestamps compare by `toMillis()` and scalar
values by value. Extra fields require replacement with the exact mapper output. Already-correct
documents are not rewritten for timestamp freshness, so repeat runs are semantically idempotent.

The mapper’s Staff Artwork branch emits only neutral request-safe fields. The script has no Staff
Artwork or Storage read path and cannot write:

- `staffArtworkId`, title/titleSnapshot, description;
- preview/thumbnail paths or URLs;
- customer association or private customer metadata;
- background, pixel/source dimensions, DPI, maxima;
- upscale/enhancement state, paths, or derivatives; or
- private notes.

Catalog and customer-upload projections remain governed by the same existing mapper and behavior.

## 6. Malformed-row and fail-closed review

The mapper returns `null` for incomplete or privacy-unsafe canonical data.

- In dry-run, the row is counted as skipped/ineligible and an error; only its canonical ID is
  reported, allowing the owner to see a complete bounded-page result without private payloads.
- In apply, any such row aborts the page before the transaction commits. No partial projection
  writes are permitted and no canonical repair is attempted.

This is the correct privacy-first choice: a malformed row cannot silently become a partial or
ambiguous customer projection.

## 7. Apply and race-safety review

Apply uses one bounded optimistic transaction for the page. Canonical documents and matching
projection references are re-read inside the transaction, the shared mapper is re-run, malformed
rows abort the transaction, and only missing/different projection documents are set. No canonical,
Staff Artwork, Storage, request, quantity, size, status, or unrelated projection document is
written or deleted.

If a canonical item changes after the transaction commits, the live trigger and a deterministic
cursor rerun converge to the same mapper output. The transaction prevents a stale planning read
from overwriting a canonical change visible before commit; no application lock is needed.

## 8. Output and verification review

The required summary is sufficient and privacy-safe. It includes project, dry-run state, page and
cursor controls, scanned count, create/update/already-correct counts, skipped/error count,
last-processed ID, next cursor, `hasMore`, and actual writes. It excludes payloads, Staff Artwork
fields, Storage paths, customer PII, and secrets.

`VERIFY=1` is a bounded read-only page check. It recomputes expected output, proves exact projection
equality and forbidden-field absence, reports malformed rows, compares canonical fingerprints before
and after apply, and confirms written IDs were within the processed canonical page. A repeat dry-run
must report zero changes for a completed page. The owner can repeat bounded pages until `hasMore`
is false for complete DEV coverage; no automatic unbounded scan is permitted.

## 9. Cutover sequencing review

The sequence is accepted as written in the amendment:

1. Revalidate local implementation and tests.
2. Deploy the additive projection index only if absent and wait for `READY`.
3. Deploy only the reviewed projection trigger and trusted sizing callable.
4. Run one bounded dry-run in `fresh-prints-dev`.
5. Stop and present counts/cursor/errors to the owner.
6. Obtain `OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY`.
7. Apply one bounded page at a time, verify and repeat dry-run after each page.
8. Deploy reviewed Firestore/Storage Rules only after coverage is proven.
9. Run localhost Portal against DEV and then stop for `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective`.

This ordering prevents a customer boundary cutover against missing projections. It keeps the
current local Rules/Storage changes undeployed until the data prerequisite is proven.

## 10. Production boundary

The mechanism is technically reusable because it is mapper-driven and deterministic, but this
amendment is DEV-only. No non-DEV command or override is implemented or tested. Production reuse
would require a new coordinated-parent review, frozen SHA and regenerated M0/data-operation
manifest, explicit owner authorization, maintenance/rollout sequencing, and an approved overnight
window. Production population is not part of this corrective.

## 11. Expected implementation and test review

The expected implementation scope is limited to:

- `functions/scripts/backfill-portal-print-request-items-dev.ts`; and
- `functions/scripts/backfill-portal-print-request-items-dev.test.ts`.

The future tests must prove default dry-run zero writes, strict project guard, page/cursor bounds,
create/update/already-correct classification, idempotent rerun, shared mapper use, Staff Artwork
privacy, catalog/upload parity, malformed-row fail-closed behavior, and absence of canonical,
Staff Artwork, or Storage writes/reads.

No Portal, Studio, Functions runtime, Rules, Storage, index, or production file is changed by the
population script itself.

## Verdict and exact next owner checkpoint

**Verdict: `approved_with_changes` — the bounded population design is implementation-ready after
explicit owner acceptance.** The prior missing-mechanism blocker is resolved in documentation, but
the owner has not yet authorized script implementation. No deployment, mutation, QA, or Signoff is
implied by this review.

The immediate checkpoint is:

> **OWNER ACCEPT BOUNDED DEV PORTAL PROJECTION POPULATION AMENDMENT + AUTHORIZE SCRIPT IMPLEMENTATION**

After script implementation, tests, and a successful dry-run, the apply checkpoint remains:

> **OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY**

After proven population and Rules/Storage cutover, the later QA checkpoint is:

> **OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective**

No staging, commit, push, freeze, or production action is authorized.
