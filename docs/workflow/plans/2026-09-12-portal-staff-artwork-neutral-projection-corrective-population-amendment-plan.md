# Portal Staff Artwork neutral projection — bounded DEV population amendment plan

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Workflow | FreshForge managed phase — Plan Amendment |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Parent | `coordinated-production-promotion-release-readiness` |
| Base Plan | `docs/workflow/plans/2026-09-12-portal-staff-artwork-neutral-projection-corrective-plan.md` |
| Base Formal Review | `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-review.md` |
| Status | **population mechanism specified; owner acceptance required before script implementation** |
| Environment | `fresh-prints-dev` only; production untouched |

## 1. Amendment boundary

This amendment supplies the executable design that was missing from the accepted Staff Artwork
neutral-projection Plan/Formal Review. It is documentation-only in this turn. It does not create the
population script, change runtime code, deploy Functions/Rules/Storage/indexes, read or write DEV
data, stage, commit, push, freeze, or touch production.

The previously implemented local projection, Portal cutover, trusted sizing callable, Rules/Storage
boundary, and focused tests remain unchanged. Script implementation requires a separate owner
acceptance of this amendment followed by the normal Implement → Test gate.

## 2. Repository evidence and pattern reuse

The reviewed lifecycle backfill at
`functions/scripts/backfill-print-request-lifecycle-ordering-dev.ts` is the repository pattern to
reuse. Its evidence is recorded in
`docs/workflow/reviews/2026-09-09-user-info-print-request-lifecycle-ordering-backfill-dry-run.md`.
The reused controls are:

- Admin SDK initialization from a root-invoked `tsx` script;
- dry-run by default and mutation only with `APPLY=1`;
- explicit Firebase project selection and a DEV guard;
- deterministic document-ID ordering;
- a bounded page size and `START_AFTER_*` cursor;
- per-page progress plus a structured summary with counts, `lastId`, and resume information; and
- no writes in dry-run, with apply remaining a separate owner checkpoint.

The Staff Artwork implementation already provides the single authoritative mapper:
`packages/shared/src/utils/portalPrintRequestItemProjection.ts`. The new script must import and call
`projectPortalPrintRequestItem` and must not duplicate any projection or privacy logic.

## 3. Exact mechanism and file name

After this amendment is accepted, implement exactly:

`functions/scripts/backfill-portal-print-request-items-dev.ts`

The script is an Admin-SDK, DEV-only, one-page-at-a-time reconciliation runner. It reads canonical
`printRequestItems`, builds the expected value with the shared mapper, and reconciles only the
deterministic projection document with the same ID:

```text
printRequestItems/{itemId}
  → projectPortalPrintRequestItem(itemId, canonicalData)
  → portalPrintRequestItems/{itemId}
```

No Cloud Function is added for population. The already reviewed
`onPrintRequestItemPortalProjectionWritten` trigger remains the live synchronizer.

## 4. Eligibility scope — all canonical item documents

The locked scope is **A: every canonical `printRequestItems` document**.

This is not a guess or a convenience expansion:

1. The Portal request-item readers query `portalPrintRequestItems` by `printRequestId`; they do not
   filter item documents by request origin or status.
2. The customer request readers query every request with the customer’s `customerId` for full
   history, and `draft`/`editing` requests for the working chrome. Historical customer requests
   that remain readable therefore need their item projections too.
3. Canonical items contain `printRequestId` but do not carry enough trusted request ownership data
   to select customer rows without a parent lookup per item. A parent lookup would introduce an
   unnecessary N+1 eligibility scan and could still race request transitions.
4. The live synchronizer already maps every canonical item and has no parent eligibility lookup.
   Population must converge to that same trigger behavior.
5. A projection for an internal request, an orphaned item, or a request that no longer exists is
   not customer-readable: the projection Rules predicate requires ownership of the existing parent
   request. Such rows are harmless sanitized server-owned records, while excluding them could leave
   a legitimate historical customer row uncovered.

The exact eligibility predicate is therefore: **the canonical document exists in the bounded
`printRequestItems` collection scan and `projectPortalPrintRequestItem(itemId, data)` returns a
non-null projection**. No `customerId`, `requestOrigin`, `isInternal`, status, or parent request
lookup is used by the population script. Invalid canonical rows are not eligible for a write and
are handled by the fail-closed malformed-row rule below.

Deleted canonical items are not encountered by the scan. The live trigger deletes their matching
projection; this amendment does not delete projections that are not encountered.

## 5. Project and environment guard

The script must resolve the project from `FIREBASE_PROJECT_ID`, then `GCLOUD_PROJECT`, and fail if
neither is present. The only accepted value is exactly:

`fresh-prints-dev`

There is no `ALLOW_NON_DEV` switch and no production override. A missing, whitespace, or any
non-matching project ID fails closed before Admin SDK initialization or any Firestore read. The
canonical dry-run command must set the project explicitly:

```text
FIREBASE_PROJECT_ID=fresh-prints-dev npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
```

PowerShell equivalent:

```text
$env:FIREBASE_PROJECT_ID='fresh-prints-dev'; npx --no-install tsx functions/scripts/backfill-portal-print-request-items-dev.ts
```

Production use is not enabled by this amendment. Any future production reuse requires a new parent
review, frozen-SHA/M0 evidence, explicit owner authorization, maintenance sequencing, and a
separate production data-operation window.

## 6. Dry-run and apply contract

The safe default is dry-run. `APPLY=1` is the only mutation switch; with `APPLY` absent (or any
value other than the exact `1`) the script performs zero Firestore writes. `APPLY` values other
than the exact `1` are reported as dry-run and are not treated as an apply request.

The script must reject `APPLY=1` together with `VERIFY=1`. `VERIFY=1` is read-only verification
mode described in Section 12.

Dry-run must read the bounded page, calculate the expected projections, compare existing projection
documents, and report proposed changes without committing anything. It must not modify canonical
items, Staff Artwork documents, Storage objects, requests, quantities, sizing, or projections.

## 7. Bounded page and cursor contract

The script processes **one bounded page per invocation**. It must not automatically loop through the
entire collection.

Locked controls:

| Control | Contract |
|---|---|
| `PAGE_LIMIT` | optional positive base-10 integer; default `200`; maximum `200`; values outside `1..200` fail closed |
| `START_AFTER_ITEM_ID` | optional exact canonical document ID; absent starts at the beginning; present cursor document must exist or the run fails before writes |
| Query | `printRequestItems.orderBy("__name__")` |
| Read limit | `PAGE_LIMIT + 1`; first `PAGE_LIMIT` documents are processed and the extra document determines `hasMore` |
| Cursor semantics | `startAfter(cursorSnapshot)` on the canonical document ID; `nextCursor` is the last processed canonical ID when `hasMore` is true |
| Invocation size | exactly one page; a caller resumes with the returned `nextCursor` |

The extra look-ahead read is bounded at 201 documents. No offset, unordered scan, unbounded loop,
or concurrent page workers are permitted. Firestore writes for one apply page are at most 200 and
remain below the 500-operation batch/transaction limit.

## 8. Reconciliation and idempotency

For every canonical document in the page:

1. Call `projectPortalPrintRequestItem(itemId, canonicalData)` from the shared helper.
2. Read the matching `portalPrintRequestItems/{itemId}` document.
3. Classify exactly one of:
   - `CREATE` — projection is missing;
   - `UPDATE` — projection exists but is semantically different, has stale fields, or contains any
     extra field; or
   - `ALREADY_CORRECT` — projection has exactly the mapper output and no extra fields.
4. Never rewrite an `ALREADY_CORRECT` projection merely to refresh timestamps.

Semantic equality is a strict flat-document comparison of the sorted expected key set and existing
key set. Timestamp values compare by `toMillis()`; scalar values compare by value. An extra field
therefore requires an `UPDATE`, and the update replaces the projection with the exact allowlisted
mapper output. The script never changes a canonical document.

The same page run twice is idempotent: after a successful apply, a repeat dry-run or apply reports
zero creates and updates unless the canonical source or projection was changed by another actor.

## 9. Apply transaction and race behavior

In `APPLY=1`, the script must prepare the page read-only first, then perform one bounded optimistic
transaction for the page:

- re-read the canonical page documents and their matching projection references inside the
  transaction;
- recompute every expected projection with the shared mapper from those transaction reads;
- abort the transaction before any commit if any canonical row is malformed or otherwise unsafe;
- set only missing/different `portalPrintRequestItems/{itemId}` documents to the exact expected
  projection; and
- commit no more than 200 projection writes.

The transaction prevents a stale planning read from overwriting a canonical change that is visible
before commit. If a canonical item changes after the transaction commits, the live trigger receives
that change and writes the same mapper output; an idempotent cursor rerun is the deterministic
fallback if trigger delivery is delayed. Neither path requires a lock. No projection delete is
performed by the backfill.

## 10. Malformed and privacy-unsafe rows

`projectPortalPrintRequestItem` returning `null` is a malformed/unsafe canonical row.

- Dry-run: classify it as `skipped/ineligible` and increment `errorCount`; report only its canonical
  document ID, never its fields. Continue scanning the bounded page so the owner receives a complete
  page summary, but perform zero writes.
- Apply: fail closed for the entire page before the transaction commits. Return the IDs/count and a
  non-zero exit status. No partial projection writes are allowed.

This deliberately favors privacy over silently producing a partial row. The script must not attempt
to repair canonical data, infer missing Staff Artwork identity, or continue past a privacy-unsafe
row in apply mode.

## 11. Projection privacy contract

The script may write only the object returned by the shared mapper. For `staff_artwork`, the mapper
must continue to emit only the neutral request projection: source type/neutral label, request-item
identity, quantity, requested size/preset, display order, and minimum status/timestamp state.

The script must have no code path that reads or writes Staff Artwork data. It must prove that these
fields cannot enter the projection:

- `staffArtworkId`;
- title, `titleSnapshot`, or description;
- preview/thumbnail paths or Storage URLs;
- customer association or private customer metadata;
- background metadata;
- source/processing pixel dimensions, DPI, or maxima;
- upscale/enhancement state, paths, or derivatives; and
- private notes.

Catalog and customer-upload projections continue through the same mapper and retain only their
already-approved customer-safe identity and request fields.

## 12. Structured output and verification

Every invocation must emit a concise JSON summary containing at least:

```text
projectId
dryRun
pageLimit
startAfterItemId
pagesScanned
itemsScanned
projectionCreates
projectionUpdates
alreadyCorrect
skipped
errorCount
lastProcessedItemId
nextCursor
hasMore
actualWrites
```

Progress output may report page number and counts. It must not print Staff Artwork fields, Storage
paths, customer PII, document payloads, or secret/config values. Canonical document IDs and cursor
values are permitted because they are required for deterministic resumability.

`VERIFY=1` is a read-only, one-page verification mode. It must:

1. scan the same canonical page and recompute every expected projection with the shared mapper;
2. assert every valid canonical row has a projection and that the projection is exactly equal,
   including no extra/private fields;
3. report malformed rows as errors and exit non-zero;
4. compare canonical fingerprints captured before/after an apply page to prove canonical documents
   were not modified;
5. report that every projection write ID was one of the processed canonical IDs and that no
   projection was deleted; and
6. return the same cursor/`hasMore` data so the owner can verify each page.

After each apply page, run a default dry-run and `VERIFY=1` with the same cursor. The completed page
must report zero creates and updates, zero errors, and exact projection equality. For a small DEV
dataset, repeat the bounded invocations until `hasMore` is false to establish complete coverage.
For a larger dataset, the owner records every page summary and cursor; no invocation becomes an
unbounded full scan.

## 13. Exact DEV cutover sequence

After this amendment is accepted and the script is implemented/tested, the locked DEV sequence is:

1. Re-run the local implementation tests and confirm the projection mapper, trigger, callable,
   Portal typecheck/lint, and Rules/Storage tests still pass.
2. Deploy the additive `portalPrintRequestItems` index only if it is not already deployed; do not
   force or replace existing indexes.
3. Wait for that index to be `READY`.
4. Deploy only the reviewed `onPrintRequestItemPortalProjectionWritten` and
   `updatePortalStaffArtworkPrintRequestItemSize` Functions.
5. Run the population script in DRY RUN with `FIREBASE_PROJECT_ID=fresh-prints-dev`, `APPLY` absent,
   and a bounded page.
6. Stop and present the structured counts, cursor, and error state to the owner.
7. Obtain the separate checkpoint:
   `OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY`.
8. Run one bounded `APPLY=1` page at a time, resuming only from the returned cursor, and retain each
   summary.
9. Run `VERIFY=1` and a repeat dry-run for every applied page; do not proceed on any error or
   non-zero proposed change.
10. Only after coverage and exact equality are proven, deploy the reviewed Firestore Rules and
    Storage Rules boundary.
11. Run the localhost Portal against `fresh-prints-dev` and verify no customer Staff Artwork
    Firestore/Storage read is attempted.
12. Stop for `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective`.

No step in this amendment authorizes deployment or data mutation now. The current turn ends before
step 1 because script implementation itself is not authorized.

## 14. Production reuse and safety boundary

The script concept is technically reusable as a projection reconciliation utility because it calls
the shared mapper and has deterministic reconciliation semantics. This corrective does not add a
production escape hatch or authorize a production command. Any production use would require a new
coordinated-parent review with a frozen SHA, regenerated M0/data-operation manifest, explicit owner
authorization, maintenance/rollout sequencing, and an approved overnight window. A non-DEV project
must remain impossible in this script until that separate review changes the contract.

## 15. Expected implementation files and tests (future, not this turn)

Expected implementation files are limited to:

- `functions/scripts/backfill-portal-print-request-items-dev.ts` — the bounded runner;
- `functions/scripts/backfill-portal-print-request-items-dev.test.ts` — pure reconciliation,
  classification, bounds, cursor, guard, privacy, and idempotency coverage; and
- the existing shared mapper/test only if a test assertion must be extended. No runtime Portal,
  Rules, Storage, or production file is changed by the population script itself.

Focused tests must prove:

- default dry-run performs zero writes;
- non-DEV and missing project IDs fail closed;
- `PAGE_LIMIT` default/max bounds and deterministic cursor resume;
- create, update, and already-correct classification;
- repeat apply/dry-run idempotency with no timestamp-only rewrites;
- Staff Artwork forbidden fields cannot enter output;
- catalog/customer-upload projections remain unchanged;
- malformed rows fail closed in apply and are explicitly reported in dry-run;
- canonical documents, Staff Artwork, and Storage are never written/read by the script; and
- the script imports and uses `projectPortalPrintRequestItem` rather than duplicating it.

## 16. Amendment gate and next owner checkpoint

This amendment is ready for owner review but does not authorize script implementation. The exact
next owner decision is:

> **OWNER ACCEPT BOUNDED DEV PORTAL PROJECTION POPULATION AMENDMENT + AUTHORIZE SCRIPT IMPLEMENTATION**

After the script is implemented, tested, and a successful DEV dry-run is presented, the separate
mutation checkpoint remains:

> **OWNER AUTHORIZATION: DEV POPULATE PORTAL PRINT REQUEST PROJECTIONS - APPLY**

Owner DEV QA and Signoff remain later gates. No staging, commit, push, freeze, or production action
is part of this amendment.
