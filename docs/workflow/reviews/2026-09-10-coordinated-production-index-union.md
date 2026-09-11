# Coordinated Production Firestore Index Union

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
