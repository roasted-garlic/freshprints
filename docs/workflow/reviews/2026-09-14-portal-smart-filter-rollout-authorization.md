# Portal Smart Filter Production Rollout — Owner Authorization Record

| Field | Value |
|---|---|
| Date | 2026-09-14 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Authorization | `OWNER AUTHORIZE PORTAL SMART FILTER PRODUCTION ROLLOUT` |
| Reviewed source | `f1001332574b8891b2a59c14985e5c00cdbceb09` |
| Firebase project | `fresh-prints-prod` |
| App Hosting backend | `fresh-prints-portal` (`./apps/portal`) |
| Status | **ROLLOUT SUCCEEDED — authenticated production UI smoke pending** |

## Read-only prechecks

- `origin/production` remains exactly `f1001332574b8891b2a59c14985e5c00cdbceb09`.
- Production `apps/portal/apphosting.yaml` maps `NEXT_PUBLIC_USE_SMART_FILTERS` to the same
  Secret Manager name with availability `BUILD` and `RUNTIME`.
- `firebase.json` maps App Hosting backend `fresh-prints-portal` to root `./apps/portal`.
- `gcloud secrets describe NEXT_PUBLIC_USE_SMART_FILTERS --project=fresh-prints-prod` returned
  `NOT_FOUND`; versions listing returned no versions.
- No alternate reviewed Smart Filter secret/name exists. The separate
  `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH` secret is not a substitute.
- No secret value was read, printed, logged, or written by this agent.

## Owner action required

The owner must run this exact command in an interactive terminal and enter the literal value
`true` only at the prompt (never in chat, an argument, logs, or documentation):

```text
firebase apphosting:secrets:set NEXT_PUBLIC_USE_SMART_FILTERS --project fresh-prints-prod
```

Then grant backend access if the set flow does not grant it automatically:

```text
firebase apphosting:secrets:grantaccess NEXT_PUBLIC_USE_SMART_FILTERS --backend fresh-prints-portal --project fresh-prints-prod
```

Return metadata-only confirmation that the secret exists with an enabled version and that backend
access is granted. Do not provide the value.

## Deferred rollout command

After metadata confirmation, run only the exact-SHA App Hosting rollout:

```text
firebase apphosting:rollouts:create fresh-prints-portal --project fresh-prints-prod --git-commit f1001332574b8891b2a59c14985e5c00cdbceb09 --force
```

Verify the rollout is READY/SUCCEEDED, receives 100% traffic, and returns HTTP 200 before the
reviewed production smoke. Do not deploy Functions, Rules, Storage, or unrelated resources. Do not
rerun Algolia, rebuild/republish Studio, turn Maintenance OFF, enable Autonomy, or enable Pass 2.

## Rollout result — 2026-09-14

Owner confirmed the secret was created with value `true` and access granted. Metadata-only
verification found enabled version `1`; the value was not read or exposed by this agent.

The exact-SHA rollout completed successfully:

| Check | Result |
|---|---|
| Rollout | `build-2026-09-14-001` — **SUCCEEDED** |
| Build | `build-2026-09-14-001` — **READY** |
| Source commit/hash | `f1001332574b8891b2a59c14985e5c00cdbceb09` |
| Cloud Run revision | `fresh-prints-portal-build-2026-09-14-001` — Ready/Active |
| Traffic | 100% (`t-3570725422`) |
| Hosted URL | HTTP 200 |
| Secret binding | `NEXT_PUBLIC_USE_SMART_FILTERS` mounted as a secret-backed env entry |

Served-bundle static checks found Smart Filter, facet, and companion-control markers and no
`tagIds`/`tagFacetKeys` markers. Authenticated interactive smoke could not be completed because no
browser session is connected in this environment; visibility, facet population, combined
search/category/filter behavior, reset, and companion Add/quantity flows therefore remain
owner-QA pending. No Functions, Rules, Storage, or Algolia action occurred. Studio `1.0.11` is
unchanged. Maintenance remains ON; Autonomous and Pass 2 remain OFF.

Exact next checkpoint: **`OWNER QA: PROD PORTAL SMART FILTER + COMPANION SMOKE — PASS`**, then
**`OWNER AUTHORIZE MAINTENANCE MODE OFF / FINAL PUBLIC REOPEN`**.
