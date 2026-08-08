# Deploy Record: PR #40 production Functions Wave A Taxonomy

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD FUNCTIONS WAVE A TAXONOMY` |
| Project | **`fresh-prints-prod`** |
| Scope | **Exact five Functions only** (CREATE 3 + UPDATE 2) |
| Status | **OWNER CLI ATTEMPTED — FAILED before mutation (missing `ALGOLIA_ADMIN_API_KEY`)** |
| Source SHA | `7e139685099f90eb1532771e927384316a432e87` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-checkpoint.md` |
| Formal Review | **approved** — `…-checkpoint-review.md` |

---

## Timeline

| Step | Result |
|------|--------|
| Agent preflight | **PASS** (identity, inventory, security, tests) |
| Agent `firebase deploy` | **HOOK-BLOCKED** (zero mutation) |
| Owner CLI exact five-function deploy | **FAILED** at analyze (exit before Functions create/update) |
| Post-failure inventory | CREATE trio still **ABSENT**; UPDATE duo still **PRESENT**; Algolia trio still **ABSENT** |

---

## Pre-deploy identity (PASS — still current)

| Check | Result |
|-------|--------|
| `origin/production` / HEAD | `7e139685099f90eb1532771e927384316a432e87` |
| App Hosting | **100%** `build-2026-08-08-004` @ same SHA; auto-rollout **disabled** |
| Algolia product flag | **OFF** |
| Firestore Rules | **COMPLETE** `2c0578a0-9764-4081-a5b3-6a5f23795e7d` |
| Storage Rules | **COMPLETE** `ccb8e2ea-74e6-4ed6-b1f8-e3cb3e386cd6` |
| `taxonomyMaterialization/meta` | **ABSENT** |

---

## Pre-deploy / post-failure Functions inventory (UNCHANGED)

| Function | Live | Classification |
|----------|------|----------------|
| `onTagTaxonomySourceWritten` | **ABSENT** | CREATE |
| `onCategoryTaxonomySourceWritten` | **ABSENT** | CREATE |
| `rebuildTaxonomyMaterializationCallable` | **ABSENT** | CREATE |
| `enqueueAiEnrichment` | **PRESENT** | UPDATE |
| `getPortalGlobalOpenGraph` | **PRESENT** | UPDATE |
| Algolia trio | **ABSENT** | EXCLUDED |
| Publisher five | **PRESENT** | EXCLUDED (Wave B) |

---

## Pre-deploy tests (PASS — prior)

| Command | Exit | Result |
|---------|-----:|--------|
| `npm run build` (in `functions/`) | **0** | `tsc` OK |
| Scoped eslint on Wave A sources | **0** | clean |
| Taxonomy + AI taxonomy suites | **0** | **30/30** |
| `getPortalGlobalOpenGraph.test.ts` | **0** | **6/6** |
| `git diff --check` | **0** | clean |

---

## Owner CLI attempt (FAILED — no mutation)

### Exact command

```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:rebuildTaxonomyMaterializationCallable,functions:enqueueAiEnrichment,functions:getPortalGlobalOpenGraph --project fresh-prints-prod --non-interactive
```

### Observed output (summary)

- Predeploy `npm run build` / `tsc` succeeded
- Codebase analysis started (`Serving at port 8446`)
- Loaded `.env.fresh-prints-prod`
- **Stopped with:**

```text
Error: In non-interactive mode but have no value for the secret ALGOLIA_ADMIN_API_KEY: ALGOLIA_ADMIN_API_KEY

Set this secret before deploying:
        firebase functions:secrets:set ALGOLIA_ADMIN_API_KEY
```

### Root cause

Firebase CLI **loads the entire Functions codebase** during deploy analysis. Tip `functions/src/index.ts` exports the Algolia trio, which declare `secrets: [algoliaAdminApiKeySecret]` (`defineSecret("ALGOLIA_ADMIN_API_KEY")` in `functions/src/lib/secrets.ts`).

`--only` limits **what is deployed**, but does **not** skip secret existence checks for other exported Functions that reference `defineSecret`.

`gcloud secrets list` on `fresh-prints-prod`: **`ALGOLIA_ADMIN_API_KEY` NOT FOUND** (matches RC-R3 OPEN).

This is **not** a Wave A source defect and **not** authorization to deploy Algolia Functions or enable Algolia.

### What did NOT happen

- No CREATE Functions created
- No UPDATE Functions updated
- No Algolia Functions deployed
- No publisher deletes
- No Rules / App Hosting / Storage object changes
- No taxonomy bootstrap / materialization write
- No Algolia product enablement

---

## Corrective path (requires NEW owner authorization)

~~Wave A authorization explicitly excluded Algolia secret set. Unblocking therefore needs a **separate** secrets checkpoint.~~

**SUPERSEDED 2026-08-08:** Plan+Formal Review for optional Algolia secret deployment-discovery coupling **rejected Option A (create secret)** as primary unblock.

Artifacts:

- Plan: `docs/workflow/plans/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-plan.md`
- Formal Review: **approved_with_changes** — `docs/workflow/reviews/2026-08-08-functions-optional-algolia-secret-deployment-discovery-corrective-review.md`

Selected path: split Algolia `defineSecret` out of shared `lib/secrets.ts` + remove Algolia trio from default `index.ts` exports while Algolia OFF; then retry the **same** five-function Wave A deploy (separate production authorization).

### Explicitly still forbidden

- Deploy Algolia Functions
- Configure Portal Algolia search env / enable flag
- Create `ALGOLIA_ADMIN_API_KEY` solely to unblock taxonomy
- Invoke taxonomy bootstrap
- Publisher DELETE / Storage cleanup / Rules / App Hosting / Studio

---

## Confirmations (this pass)

- PROD FUNCTIONS WAVE A TAXONOMY: **FAIL** (owner CLI blocked by missing Algolia secret; **zero mutation**)
- NO taxonomy bootstrap
- NO Algolia Functions/config/enable
- NO publisher Function delete
- NO Rules deploy
- NO index/backfill
- NO Storage cleanup
- NO App Hosting rollout
- NO Studio release

---

## Next owner checkpoint (ONE)

`APPROVE IMPLEMENT: OPTIONAL ALGOLIA SECRET DISCOVERY CORRECTIVE`

**STOP.**
