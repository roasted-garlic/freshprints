# Dev Deploy Record: Stage 1b Algolia sync

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Approval phrase | `APPROVE DEV FUNCTIONS DEPLOY: STAGE 1B ALGOLIA SYNC` |
| Project | `fresh-prints-dev` only |
| Source HEAD | `03aa490` |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — open / **unmerged** |
| Exit code | **0** |
| Region | `us-central1` |

---

## Command executed

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only functions:syncPortalCatalogDesignToAlgolia,functions:reconcilePortalCatalogAlgoliaIndex,functions:reconcilePortalCatalogAlgoliaIndexScheduled --project fresh-prints-dev
```

Notes:

- Loaded environment variables from `functions/.env.fresh-prints-dev` (`ALGOLIA_APP_ID`, `ALGOLIA_PORTAL_CATALOG_INDEX_NAME`).
- Granted compute SA `secretAccessor` on `ALGOLIA_ADMIN_API_KEY`.

## Results

| Function | Operation |
|----------|-----------|
| `syncPortalCatalogDesignToAlgolia` | **Created** (Firestore `designs/{designId}` written) |
| `reconcilePortalCatalogAlgoliaIndex` | **Created** (callable, owner/admin) |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | **Created** (daily schedule) |

Post-deploy `firebase functions:list --project fresh-prints-dev` shows all three present.

## Not done in this deploy

- Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` (still unset)
- Index reconcile / backfill (owner callable next)
- Publisher retirement / generated asset deletion
- Production / PR #40 merge / Stage 4/5/6

## Next

1. Owner/admin call `reconcilePortalCatalogAlgoliaIndex` with `{ "dryRun": false }` against `fresh-prints-dev`.
2. Then enable Portal Algolia flag locally.
3. Stage 1b-C owner QA.
