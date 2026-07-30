# Targeted Publication Read Attribution and Test Report

## Live attribution

Read-only `fresh-prints-dev` logs were inspected for the owner edit completed around
`2026-07-24T19:01:22.509Z`.

- One `onPortalCatalogSnapshotSourceWritten` request began at
  `2026-07-24T19:01:22.451673Z` and returned HTTP 200.
- One accounting event was emitted at `2026-07-24T19:01:23.958423Z`.
- Execution ID: `zb3df8gavz8p`; CloudEvent ID:
  `fb596263-8b4b-40ad-86aa-b4255eb32184`.
- Revision: `onportalcatalogsnapshotsourcewritten-00007-les`.
- Classification/mode: `card-only` / `targeted`.
- Pass: 1; duration: 1,416 ms; outcome: success.
- Ready designs, categories, tags, and coordination documents read: 0.
- Total measurable Firestore reads in the Function: 0.
- No full publisher, Firestore transaction, generation-precondition retry, duplicate invocation, or
  concurrent publication was recorded.
- No other Cloud Function execution appeared in the same inspected Console minute. The Studio
  report independently recorded zero listeners, fallbacks, and callables.

The deployed schema did not yet include Storage-operation fields. Exact code-path accounting for a
successful pass is one Storage manifest download, one manifest metadata lookup, one immutable
override write plus metadata verification, and one generation-preconditioned manifest write plus
metadata verification. If the prior manifest references an override asset, that adds one Storage
download. These are Storage operations, not Firestore document reads.

The Function contributed zero of the Console's approximately 110 Firestore reads. One read is the
owner-approved Studio editor-opening read. The remaining approximate 109 reads are outside this
trigger and the traced Studio action. Firebase's rounded aggregate graph and available Function
logs do not expose a per-document/per-caller ledger, so naming an unseen caller would be speculation.

## Implemented reduction and observability

- Identical duplicate card delivery is now an idempotent no-op with no asset or manifest rewrite.
- CloudEvent time is used as deterministic publication metadata.
- Development accounting now records manifest reads/writes, override reads, transaction attempts,
  precondition retries, Storage downloads/writes/metadata operations, total Firestore reads, and
  duplicate-skip outcome.
- The existing three-attempt generation-precondition merge remains. Concurrent edits reread and
  merge the winning override; immutable assets and concurrency safety are unchanged.
- No Firestore query, transaction, coordination document, design reread, full publisher, new asset
  family, or bucket-size change was introduced.

Expected card-only count after deployment:

- Client: 1 Firestore document read + 1 write.
- Targeted Function: 0 Firestore document reads.
- Successful publication: 1 manifest read, 1 manifest write, 2 Storage object writes, 3 Storage
  metadata operations, and 0 or 1 prior-override download.
- Identical duplicate: 1 manifest read, 1 prior-override download, 0 writes.
- Conflict: bounded to three manifest attempts.

## Separate 63-bucket observation

Studio passes only currently visible generated design IDs to card resolution. With 81 designs
visible on the current 100-item page and 128 hash buckets, 63 distinct bucket requests is expected
hash dispersion for those visible cards, not off-page fetching. Bucket size and asset families were
not changed.

## Verification

- `npm run build --prefix functions` — pass.
- Focused `tsx --test` suite — 55 tests passed, 0 failed.
- Changed Functions files ESLint with `--max-warnings 0` — pass.
- `git diff --check` — pass (existing line-ending warnings only).

No deployment, rebuild, republish, or production action was performed.

## Owner isolated retest signoff

**Verdict: PASS WITH NOTES**

The owner’s isolated retest measured 3 Firebase Console reads and 1 write. Studio traced exactly
1 authoritative design read and 1 successful design write, with 0 listeners, callables, and
fallbacks. The targeted Function contributed 0 Firestore reads. The two additional aggregate
Console reads are unattributed and non-blocking; neither the client trace nor Function accounting
contains evidence assigning them to this remediation.

All generated Design Library background-edit and targeted-publication items listed in the Wave C
dev deployment checkpoint are closed. The separate restart-inclusive 69-read/0-write Console minute
included startup and Inbox loading and is retained only as a non-isolated reporting observation.
