# Checkpoint: Stage 1b Algolia — development account / secrets / deploy

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Status | **Functions deployed to `fresh-prints-dev`** — next: reconcile index, then Portal enable flag |
| Branch | `fix/post-launch-catalog-and-processing-stability` |
| PR | #40 — keep open / **unmerged** |
| Code | Stage 1b-A Algolia adapter + sync implemented; **not live** until secrets + deploy |

---

## Why this checkpoint exists

Implementation is complete in source, but live Algolia integration requires:

1. An Algolia account + Application
2. A Search API Key (Portal) and Admin API Key (Functions)
3. Firebase Secret Manager + Functions params
4. A Functions deploy to `fresh-prints-dev`
5. Portal App Hosting / local env with public search-only vars
6. One reconcile run to seed the index

**Do not paste any secret values into git, docs, Firestore, or chat logs.**

---

## 1. Account / application required

| Item | Recommendation |
|------|----------------|
| Provider | **Algolia** (Grow plan — not Grow Plus unless a required feature proves otherwise) |
| Environment | Separate **dev** Application (and later prod Application) |
| Region | Prefer US (or closest to Firebase `fresh-prints-dev`) |

---

## 2. Dev index naming

| Index | Name |
|-------|------|
| Portal ready catalog (dev) | `portal_catalog_ready_dev` |

Index settings (applied by reconcile):

- `searchableAttributes`: `title`, `searchText`, `categoryName`, `unordered(tagFacetKeys)`
- `attributesForFaceting`: `filterOnly(tagIds)`, `filterOnly(categoryId)`, `tagFacetKeys`
- `customRanking`: `desc(readyAtMs)`

---

## 3. Credentials required

| Credential | Role | Where it lives |
|------------|------|----------------|
| **Application ID** | Public-ish identifier | Functions `ALGOLIA_APP_ID` (defineString) + Portal `NEXT_PUBLIC_ALGOLIA_APP_ID` |
| **Admin API Key** | Write / delete / settings | **Secret Manager only** |
| **Search-Only API Key** | Search / browse / facets | Portal `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` (restrict to index + search ACL) |

### Search-only key restrictions (Algolia dashboard)

- ACL: `search` (and facet search if required by ACL model — not `addObject` / `deleteObject` / `settings`)
- Indices: **only** `portal_catalog_ready_dev` (dev)
- Optional: HTTP referrers for Portal origins (`localhost:3100`, `*.myprintrequest.dev`, etc.)

---

## 4. Server-admin / write credential

**Name:** `ALGOLIA_ADMIN_API_KEY`  
**Consumer Functions:**

- `syncPortalCatalogDesignToAlgolia`
- `reconcilePortalCatalogAlgoliaIndex`
- `reconcilePortalCatalogAlgoliaIndexScheduled`

Never ship this key to Portal, `.env` committed files, or client bundles.

---

## 5. Portal search-only credential

| Env var | Purpose |
|---------|---------|
| `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true` | Enable Algolia path (otherwise generated transition path) |
| `NEXT_PUBLIC_ALGOLIA_APP_ID` | App ID |
| `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY` | Search-only key |
| `NEXT_PUBLIC_ALGOLIA_INDEX_NAME=portal_catalog_ready_dev` | Index name |

---

## 6. Exact Secret Manager / Functions params

| Name | Type | Notes |
|------|------|-------|
| `ALGOLIA_ADMIN_API_KEY` | Secret Manager (`defineSecret`) | Admin/write |
| `ALGOLIA_APP_ID` | Functions `defineString` / env | Non-secret |
| `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` | Functions `defineString` | Default `portal_catalog_ready_dev` |

---

## 7. Exact Functions that consume secrets

| Function | Secret |
|----------|--------|
| `syncPortalCatalogDesignToAlgolia` | `ALGOLIA_ADMIN_API_KEY` |
| `reconcilePortalCatalogAlgoliaIndex` | `ALGOLIA_ADMIN_API_KEY` |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | `ALGOLIA_ADMIN_API_KEY` |

---

## 8. Owner approval phrases (suggested)

After creating the Algolia app/index and keys offline:

```text
APPROVE DEV ALGOLIA SECRETS: STAGE 1B
```

Then (separate):

```text
APPROVE DEV FUNCTIONS DEPLOY: STAGE 1B ALGOLIA SYNC
```

Suggested allowlist deploy:

```bash
firebase deploy --only functions:syncPortalCatalogDesignToAlgolia,functions:reconcilePortalCatalogAlgoliaIndex,functions:reconcilePortalCatalogAlgoliaIndexScheduled --project fresh-prints-dev
```

Then call reconcile (owner/admin) with `{ "dryRun": false }` once.

Then set Portal env / App Hosting secrets for search-only vars and enable `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`.

---

## 9. Confirmation

- No secret values belong in the repo or this document.
- Publisher / generated assets remain until Stage 4.
- No production action in this checkpoint.
- PR #40 stays unmerged.

---

## Record schema (reminder)

`objectID`, `title`, `searchText`, `categoryId`, `categoryName`, `tagIds`, `tagFacetKeys`, `readyAtMs` only. Cards hydrate via Firestore by-ID.
