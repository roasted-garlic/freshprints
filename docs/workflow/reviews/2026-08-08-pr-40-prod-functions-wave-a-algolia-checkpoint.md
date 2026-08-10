# Checkpoint: PR #40 production Functions Wave A — Algolia (PREPARE ONLY)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-functions-wave-a-algolia` |
| Phase | **PREPARE / Formal Review — NO source promote / NO deploy** |
| Prerequisites | Gate A COMPLETE — App `Z1FVCM5QUX`; index `portal_catalog_ready_prod`; admin secret in SM |
| Tip (current) | `ebcfaf29757d0c107a4ff9f7ad2561816f66f4b0` |
| Gate A record | `docs/workflow/reviews/2026-08-08-pr-40-prod-algolia-config-record.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-checkpoint-review.md` |
| Owner phrase | **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`** |

---

## Goal

Authorize **CREATE** of the three Algolia Functions on `fresh-prints-prod` with production params — **without** Portal enable, reconcile invoke, or taxonomy/publisher changes.

Because Option E removed the Algolia trio from default `functions/src/index.ts`, Gate B includes a **narrow source restore** of:

```ts
export { … } from "./algolia/algoliaFunctionExports";
```

(or equivalent three named re-exports) on `production` **before** deploy.

---

## Exact CREATE allowlist

```text
functions:syncPortalCatalogDesignToAlgolia
functions:reconcilePortalCatalogAlgoliaIndex
functions:reconcilePortalCatalogAlgoliaIndexScheduled
```

### Required params (non-secret)

| Param | Value |
|-------|--------|
| `ALGOLIA_APP_ID` | `Z1FVCM5QUX` |
| `ALGOLIA_PORTAL_CATALOG_INDEX_NAME` | `portal_catalog_ready_prod` |

### Required secret

| Secret | Status |
|--------|--------|
| `ALGOLIA_ADMIN_API_KEY` | Present — owner **`ALGOLIA ADMIN SECRET: ROTATED`** (SM v2 enabled; see Gate A record) |

### Exact deploy (NOT EXECUTED this prepare)

After exports restored on tip and params set:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase deploy --only functions:syncPortalCatalogDesignToAlgolia,functions:reconcilePortalCatalogAlgoliaIndex,functions:reconcilePortalCatalogAlgoliaIndexScheduled --project fresh-prints-prod --non-interactive
```

Param set example (owner CLI; exact flag syntax per Firebase CLI version):

```powershell
firebase functions:config:unset unused 2>$null
# Prefer params from `.env` / `params` / console — project uses defineString:
# Set via Firebase Console → Functions → Params, or documented params file for prod.
```

*(Implement/deploy pass will use the project's current param-setting method for `defineString` — do not invent a wrong CLI if console is the established path.)*

---

## Sequencing after owner phrase

1. **Implement** restore Algolia exports on a branch → promote to `production`
2. Confirm tip contains exports + params `ALGOLIA_APP_ID=Z1FVCM5QUX` + `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod`
3. Owner deploy exact three Functions (agent likely hook-blocked)
4. Verify trio **ACTIVE**; Portal enable still **OFF**
5. Reply `PROD FUNCTIONS WAVE A ALGOLIA: COMPLETE`
6. Next Gate C later: reconcile + `APPROVE PROD ALGOLIA ENABLE` (search-only Portal env)

---

## Explicitly forbidden this phrase scope until sub-steps approved

- Portal `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH=true`
- Reconcile invoke (unless separately phrased after CREATE verify)
- Taxonomy / publisher / Rules / Studio
- Deploying with index `portal_catalog_ready_dev`
- Broad `firebase deploy --only functions`

---

## Confirmations (this prepare pass)

- Gate A recorded COMPLETE
- NO export restore
- NO Functions deploy
- NO Portal enable

**STOP** pending Formal Review + owner `APPROVE PROD FUNCTIONS WAVE A ALGOLIA`.
