# Current-stack Autonomous DEV canary result — 2026-09-14

## Scope and source parity

Owner authorization was received for the reviewed DEV promotion/canary. The exact direct-canary
closure was 76 unique local files, digest
`bd0f8f52344f3c12c90e8e289e2ad9c9cacc8c263c2b2331552911165b691c44`, and three Functions:

- `enqueueAiEnrichment`: `17d8aec199a16e83fe73c9eb3e452db9f3b8ce77` → `ad5c176e2204794b20120ff33f2d75037b0a069c`
- `updateCatalogWorkflowMode`: `1734bfe7d1e732e207d6c5380542dab3b42000ef` → `7a56af97748f45fe85d08d311164da758ba00337`
- `syncPortalCatalogDesignToAlgolia`: `ec72b48d3724915c1c7cf4fa1b7b29c5b42ca84b` → `edae8dd7cf64de40962682e5917b1e847bbef946`

`reprocessReadyDesignWithAi` and `onCatalogReprocessJobWritten` were not promoted: the direct
canary does not call them, and their separate reprocess path carries stale v37/v6 snapshot
constants. Deployed source archives prove prompt `catalog-enrich-v39`, normalizer
`smart-profile-normalizer-v7`, schema `smart-profile-v1`, and the current legacy-tag-retired
loader.

## Tests

- Required current-contract suites: **88/88 PASS**.
- Functions TypeScript build: **PASS**.
- Smart Profile quality stale expectation: corrected from normalizer-v6 to normalizer-v7.

## Canary results

All four supplied rows were processed with the current source and ended with current v39/v7/v1
provenance. Clean and import-preset rows reached Ready/approved with
`aiReviewedBy=system:catalog-autonomy`; publication synced and Algolia search returned a hit.

- `coiXzQDhJBKBVB1dFVZT`: PASS — Ready/approved/system actor; synced and searchable.
- `74BdnNQuNWz0N0GaL4CO`: operationally Ready/approved/system actor; import preset dimension
  keys preserved; synced publication. The one immediate Algolia poll missed the object, so this
  row was marked mechanically failed for sync evidence rather than treated as a PASS.
- `nff6PpkZF9TNitnpX2Mm`: **acceptance failure** — it was `imported/pending` before execution,
  not the documented `imported/needs_review` fixture. Its v39 result had only structured evidence
  gap diagnostics, which the current decision contract explicitly treats as non-blocking; it
  therefore correctly became Ready/approved/system-autonomy. No genuine hard blocker remained
  Needs Review.
- `1Ws0T9fivryest6IUSbt`: current explicit reconciliation correctly cleared prior automation-owned
  `hit` state because the current vocabulary produced no artwork hit; it became Ready/approved,
  synced, and searchable. This is the current safeguard contract, not a bypass. Protected
  staff/import authority was not present on this row.

Overall canary evaluation: **INCOMPLETE / FAIL against the reviewed acceptance matrix**, solely
because the supplied blocker row was stale/ineligible and did not exercise a genuine hard blocker.
This is not evidence of a current-source safety bypass.

## Restoration and production gate

The dual gate was enabled only during the run and unconditionally restored. Final DEV settings:

- `catalogWorkflowMode=shadow`
- `catalogAutonomousLiveEnabled=false`
- `semanticReviewPlaygroundEnabled=false` (Pass 2 OFF)

Because the canary did not pass the original matrix, the conditional production read-only preflight
was **not rerun after the canary**, and no production settings/data/Functions were changed.

Next checkpoint: **`OWNER REVIEW DEV CANARY ACCEPTANCE MISMATCH / AUTHORIZE NEXT BOUNDED VALIDATION OR CLOSE`**.
