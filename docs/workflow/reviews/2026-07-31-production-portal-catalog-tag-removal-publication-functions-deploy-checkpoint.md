# Checkpoint: Functions deploy complete — await production catch-up

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Slice | `production-portal-catalog-tag-removal-publication` |
| Dev deploy approval | `APPROVE DEV FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX` |
| Prod deploy approval | `APPROVE PRODUCTION FUNCTIONS DEPLOY: PORTAL CATALOG TAG REMOVAL PUBLICATION FIX` |
| Catch-up | **not invoked** |

---

## Deployed

Scoped catalog-snapshot Functions (not full codebase):

- `onCategorySnapshotSourceWritten`
- `onPortalCatalogSnapshotSourceWritten`
- `onTagSnapshotSourceWritten`
- `rebuildCatalogSnapshots`
- `retryPortalCatalogPublication` (**created**)

### `fresh-prints-dev`

```bash
firebase deploy --only functions:onCategorySnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:rebuildCatalogSnapshots,functions:retryPortalCatalogPublication --project fresh-prints-dev
```

- Exit: **0**
- `retryPortalCatalogPublication` — Successful create
- Other four — Successful update

### `fresh-prints-prod`

```bash
firebase deploy --only functions:onCategorySnapshotSourceWritten,functions:onPortalCatalogSnapshotSourceWritten,functions:onTagSnapshotSourceWritten,functions:rebuildCatalogSnapshots,functions:retryPortalCatalogPublication --project fresh-prints-prod
```

- Exit: **0**
- `retryPortalCatalogPublication` — Successful create
- Other four — Successful update

Notes from CLI (non-blocking): Node.js 20 deprecation warning; firebase-functions upgrade suggestion.

---

## Required next human action

Production portal-catalog is still expected stuck (`requestedGeneration` ahead / prior `failed`) until catch-up runs.

Prefer narrow retry (no dirty bump):

```text
APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: RETRY
```

Fallback full rebuild (not silent):

```text
APPROVE PRODUCTION PORTAL CATALOG PUBLICATION CATCH-UP: REBUILD
```

Then owner Portal QA on tag-removal surfaces → `PASS` / `FAIL` / `PASS WITH NOTES`. Stage 2 remains separately gated.

## Rollback

Redeploy prior Functions revisions from Console / prior git revision for the five named functions.
