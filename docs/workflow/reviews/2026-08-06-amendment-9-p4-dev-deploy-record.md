# Dev Deploy Record: Amendment 9 P4

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Approval phrase | `APPROVE DEV FUNCTIONS DEPLOY: AMENDMENT 9 P4` |
| Project | `fresh-prints-dev` only |
| Source HEAD | `9fe6430` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — open / unmerged |
| Exit code | **0** |
| Elapsed | ~124s |

---

## Command executed

```bash
firebase deploy --only functions:onPortalCatalogSnapshotSourceWritten,functions:onPortalCatalogPublicationStateWritten,functions:onCategorySnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:rebuildCatalogSnapshots,functions:retryPortalCatalogPublication --project fresh-prints-dev
```

## Results

| Function | Operation |
|----------|-----------|
| `onPortalCatalogPublicationStateWritten` | **Created** (W2) |
| `onPortalCatalogSnapshotSourceWritten` | Updated |
| `onCategorySnapshotSourceWritten` | Updated |
| `onTagSnapshotSourceWritten` | Updated |
| `rebuildCatalogSnapshots` | Updated |
| `retryPortalCatalogPublication` | Updated |

Deploy complete. Region: `us-central1`.

## Not deployed

- Rules / indexes / Storage
- Production
- Other Functions
- PR merge

## Next

Owner Manual QA: `docs/workflow/reviews/2026-08-06-amendment-9-p4-manual-qa.md`  
Reply `PASS` / `FAIL: …` / `PASS WITH NOTES: …`. Signoff blocked until QA.
