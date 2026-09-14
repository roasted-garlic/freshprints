# Portal Smart Filter Production Rollout — Owner Authorization Record

| Field | Value |
|---|---|
| Date | 2026-09-14 |
| Parent goal | `coordinated-production-promotion-release-readiness` |
| Authorization | `OWNER AUTHORIZE PORTAL SMART FILTER PRODUCTION ROLLOUT` |
| Reviewed source | `f1001332574b8891b2a59c14985e5c00cdbceb09` |
| Firebase project | `fresh-prints-prod` |
| App Hosting backend | `fresh-prints-portal` (`./apps/portal`) |
| Status | **FINAL PUBLIC REOPEN VERIFIED — coordinated rollout signoff complete** |

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

## Final public reopen and coordinated rollout signoff — 2026-09-14

Owner records:

- **`OWNER QA: PROD PORTAL SMART FILTER + COMPANION SMOKE — PASS`**
- **`OWNER QA: PROD STUDIO 1.0.11 — PASS`**
- **`OWNER AUTHORIZE MAINTENANCE MODE OFF / FINAL PUBLIC REOPEN`**

Maintenance Mode is now **OFF**. The public `getPortalMaintenanceState` read for
`fresh-prints-prod` returned `enabled=false` and `maintenanceTestAccessGranted=false`. The
established owner/admin control is the only approved write path; this shell did not issue a direct
Firestore write, read any credential, or expose any secret.

Final production checks:

| Check | Result |
|---|---|
| Public root, `/catalog`, `/requests` | HTTP 200; no maintenance markers in served HTML |
| Portal revision | `fresh-prints-portal-build-2026-09-14-001`, Ready/Active, 100% traffic |
| Smart Filters and companion controls | **Owner QA PASS** — visibility/functionality, eight facets, combined search/category/filter/reset, Add/Adding/Added, quantity increment/decrement/remove, Not now → Done, narrow layout |
| Studio | `1.0.11` published and unchanged; source `f1001332574b8891b2a59c14985e5c00cdbceb09`; eight assets intact |
| Catalog Processing Mode | `shadow` |
| Autonomous / Pass 2 | OFF / OFF |
| Algolia | Not rerun |
| Maintenance | OFF; no tester bypass required |

No Portal revision change, Studio rebuild/republish, Functions/Rules/Storage deployment, unrelated
settings/secret change, or production data mutation occurred in this final reopen step. The
coordinated rollout signoff is complete and this goal is closed.

**Next checkpoint:** None — start a new Plan → Review cycle for any later change.
