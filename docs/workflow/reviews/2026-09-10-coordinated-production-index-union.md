# Coordinated Production Firestore Index Union

## Final parent M0 linkage — 2026-09-12

The final read-only parent M0 consumes the additive-only union below: current `firestore.indexes.json`
has 95 definitions and 3 field overrides versus 77 production definitions and 0 overrides. All 77
production identities are retained, 18 definitions are additive, and zero definitions are removed
or replaced. Current SHA is `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae`;
the continuity union digest is `f720a348bbf5be7392f77560748f229902c9e5a98f2b4022f0ac9150c2887f75`.
The projection index must be READY before population/Portal exposure, and no index deployment or
`--force` operation occurred.

## Authoritative post-pre-freeze-child M0 rerun — 2026-09-12

| Input | Index definitions | Field overrides | SHA-256 |
|---|---:|---:|---|
| Current `firestore.indexes.json` | 95 | 3 | `2cdba89ad6092b0ebd234750ee5829520accff315b5e8fa642b144009e3fffae` |
| `origin/production:firestore.indexes.json` | 77 | 0 | `8ede15025538dd4d8c96da28a24b6a8581e7425e75063632bca75b229713dcfa` |
| Canonical sorted union (continuity algorithm) | 95 | 3 | `f720a348bbf5be7392f77560748f229902c9e5a98f2b4022f0ac9150c2887f75` |

All 77 production definitions are retained. The current file adds 18 definitions, proposes zero
deletions/replacements, contains zero duplicate composite identities, and must never be deployed
with `--force`. The one addition since the prior 94-entry packet is:

```text
portalPrintRequestItems: printRequestId ASC, updatedAt DESC
```

The other 17 additions and three Staff Artwork field overrides remain as recorded below. No index
deployment occurred. The projection index must be READY before production projection population or
the new Portal reader is exposed, subject to the amended cutover Plan and owner checkpoints.

## Authoritative post-Staff-Artwork M0 rerun — 2026-09-12

The earlier rerun below is historical. The current structural comparison is authoritative and was
performed read-only against `development` at `a76d8be218571e1260bdb983f86ee5cf86563e1b` and
`origin/production` at `36165096f09bef6817adb5b11d496dbb1502b34b`.

| Input | Index definitions | Field overrides | SHA-256 |
|---|---:|---:|---|
| Current `firestore.indexes.json` | 94 | 3 | `f2d65d8d9eb62b48711438efffc00978395944b285ff2db40d7028019654518e` |
| `origin/production:firestore.indexes.json` | 77 | 0 | `8ede15025538dd4d8c96da28a24b6a8581e7425e75063632bca75b229713dcfa` |
| Proposed canonical union | 94 | 3 | `40c69c94e42062ce42e4a0d1928214aec4b37612b6d23cf3403ec45bbc02ebf5` |

The union is **77 retained production definitions + 17 additive current definitions = 94**, with
**zero deletions, zero replacements, and no `--force`**. The legacy production definition
`designs(status ASC, updatedAt ASC)` was restored to the current source before hashing so the
`designs(status ASC, updatedAt ASC, __name__ ASC)` variant is additive rather than a replacement.
The three current field overrides are the Staff Artwork ID overrides on `printRequestItems`,
`showAllocations`, and `gangSheetItems`; they are recorded separately from composite index identity.

The 17 additive definitions are:

- `staffArtworks`: `(status ASC, createdAt DESC)`; `(customerId ASC, status ASC, createdAt DESC)`;
  `(status ASC, updatedAt DESC)`; `(customerId ASC, status ASC, updatedAt DESC)`.
- `printRequests`: `(customerId ASC, lastLifecycleActivityAt DESC, __name__ DESC)` and
  `(status ASC, isInternal ASC)`.
- `printRequestLifecycleEvents`: `(printRequestId ASC, occurredAt ASC, __name__ ASC)`.
- `designs`: `(status ASC, updatedAt ASC, __name__ ASC)`; the three `aiReviewStatus`/status/createdAt
  variants; `(status ASC, aiReviewStatus ASC, __name__ ASC)`; and the tags + AI/status/updatedAt
  variant.
- `customerUploads`: `(purpose ASC, catalogReviewStatus ASC, catalogExclusionReason ASC, createdAt DESC)`;
  `(catalogReviewStatus ASC, catalogRetentionStartedAt ASC, __name__ ASC)`; and
  `(catalogExclusionReason ASC, catalogRetentionStartedAt ASC, __name__ ASC)`.
- `catalogReprocessJobs`: `(projectId ASC, targetType ASC, status ASC)`.

No index operation was run. This union must be mechanically rechecked at the clean candidate SHA and
must stop if any deletion/replacement appears.

Status: read-only M0 reconciliation rerun artifact. No Firestore index deployment was executed.

Rerun snapshot: `development` dirty at `04b9637470a16b0f4d4a1ba9f822fe9df7acca2d`; the
customer-upload follow-up child adds no index definition. The structural union was regenerated
from the current file and `origin/production`; it has the same 77 production identities plus the
same ten reviewed additions, with zero deletions or replacements. The reviewed union digest is
unchanged.

## Inputs and exact hashes

| Input | Count | SHA-256 |
|---|---:|---|
| Current `firestore.indexes.json` | 86 | `6355ca54ce0c282cb6c19987a9c05c5acf8f0c0f259060f1c000c121b91f5ced` |
| `origin/production:firestore.indexes.json` | 77 | `8ede15025538dd4d8c96da28a24b6a8581e7425e75063632bca75b229713dcfa` |
| Proposed exact union (production baseline + additions below) | 87 | `f95a9e68086203a1863a54911c812ae9b2acb73346253ab6f3b28a0081998a20` |

The proposed union is deterministic: all 77 production definitions are retained byte-for-byte as logical index entries, then the ten current entries below are appended as additions. It does not delete or replace a production definition and must not be deployed with `--force`.

## Additions

```text
printRequests: customerId ASC, lastLifecycleActivityAt DESC, __name__ DESC
printRequestLifecycleEvents: printRequestId ASC, occurredAt ASC, __name__ ASC
designs: status ASC, updatedAt ASC, __name__ ASC
designs: aiReviewStatus ASC, status ASC, updatedAt ASC, __name__ ASC
designs: aiReviewStatus ASC, status ASC, createdAt ASC, __name__ ASC
designs: aiReviewStatus ASC, status ASC, createdAt DESC, __name__ DESC
designs: status ASC, aiReviewStatus ASC, __name__ ASC
designs: tags CONTAINS, aiReviewStatus ASC, status ASC, updatedAt ASC, __name__ ASC
printRequests: status ASC, isInternal ASC
catalogReprocessJobs: projectId ASC, targetType ASC, status ASC
```

## Legacy retention finding

The current file has one structural difference from production: it contains `designs(status ASC, updatedAt ASC, __name__ ASC)` where production contains the legacy `designs(status ASC, updatedAt ASC)` definition. The latter is a required production definition and is restored by the union; the `__name__` variant is treated as an addition, not a replacement. Any M1 freeze packet must materialize and validate the 87-entry union before a human-authorized deployment proposal.

No index is identified as maintenance-specific. Maintenance state uses a single settings document and does not justify an index or a data operation.
