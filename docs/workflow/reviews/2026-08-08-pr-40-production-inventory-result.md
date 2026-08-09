# PR #40 — Read-only `fresh-prints-prod` inventory

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Owner authorizations | `APPROVE PR 40 PROD INVENTORY` |
| Project | **`fresh-prints-prod`** (every CLI call used `--project fresh-prints-prod`) |
| Source baseline | `1d13edf2eb3d685773157c469b1b2e154fe0fd93` |
| Mutation | **None** |

---

## B1 — Cloud Functions

### Retired publishers (live presence)

| Function | Live on prod |
|----------|--------------|
| `onCategorySnapshotSourceWritten` | **PRESENT** |
| `onTagSnapshotSourceWritten` | **PRESENT** |
| `onPortalCatalogSnapshotSourceWritten` | **PRESENT** |
| `onPortalCatalogPublicationStateWritten` | **ABSENT** |
| `rebuildCatalogSnapshots` | **PRESENT** |
| `retryPortalCatalogPublication` | **PRESENT** |

### Planned new / related exports

| Function | Live on prod | Source on HEAD |
|----------|--------------|----------------|
| `syncPortalCatalogDesignToAlgolia` | ABSENT | exported |
| `reconcilePortalCatalogAlgoliaIndex` | ABSENT | exported |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | ABSENT | exported |
| `onTagTaxonomySourceWritten` | ABSENT | exported |
| `onCategoryTaxonomySourceWritten` | ABSENT | exported |
| `rebuildTaxonomyMaterializationCallable` | ABSENT | exported |
| `rebuildTaxonomyMaterialization` | ABSENT | exported as **plain shared async** (not a Cloud Function trigger) |
| `enqueueAiEnrichment` | **PRESENT** | UPDATE candidate |
| `getPortalGlobalOpenGraph` | **PRESENT** | UPDATE candidate (substantial branch delta) |

### Final proposed Wave A — CREATE (allowlist)

```text
functions:syncPortalCatalogDesignToAlgolia
functions:reconcilePortalCatalogAlgoliaIndex
functions:reconcilePortalCatalogAlgoliaIndexScheduled
functions:onTagTaxonomySourceWritten
functions:onCategoryTaxonomySourceWritten
functions:rebuildTaxonomyMaterializationCallable
```

**EXCLUDE from deploy allowlist:** plain `rebuildTaxonomyMaterialization` export (shared library entrypoint; not a Gen2 trigger/callable wrapper).

### Final proposed Wave A — UPDATE (allowlist)

```text
functions:enqueueAiEnrichment
functions:getPortalGlobalOpenGraph
```

(Additional UPDATEs only after owner confirms from full prod list vs `git diff origin/production...HEAD -- functions/src`.)

### Final proposed Wave B — DELETE (allowlist; separate phrase)

```text
onCategorySnapshotSourceWritten
onTagSnapshotSourceWritten
onPortalCatalogSnapshotSourceWritten
rebuildCatalogSnapshots
retryPortalCatalogPublication
```

`onPortalCatalogPublicationStateWritten` — already absent; skip delete / verify-only.

**RC-R2:** **SATISFIED** — live inventory grounded CREATE/UPDATE/DELETE allowlists.

---

## B2 — Firestore indexes (`readyAt`)

| Composite (source HEAD) | Present on prod |
|-------------------------|-----------------|
| `status` + `readyAt` + `__name__` | **MISSING** |
| `categoryId` + `status` + `readyAt` + `__name__` | **MISSING** |
| `tags` CONTAINS + `status` + `readyAt` + `__name__` | **MISSING** |
| `categoryId` + `tags` CONTAINS + `status` + `readyAt` + `__name__` | **MISSING** |

Prod has **67** composite indexes; **0** include `readyAt`.  
**Implication:** index deploy required before relying on New This Week / filtered `readyAt` queries at scale (`APPROVE PROD INDEXES DEPLOY: PR40`).

---

## B3 — Rules (source intent vs live)

**Source HEAD intent:**

- Firestore: `taxonomyMaterialization/{docId}` staff-read; `snapshotPublicationState` match **removed**
- Storage: generated portal-catalog / catalog-reference public-read **removed**; Assisted proof **80 MB**

**Live Rules release text download:** Firebase Rules API returned **403** (ADC quota project) — exact live hash **[NEEDS OWNER CHECK]** for byte-for-byte compare.

**RC-R4:** remains **OPEN** until Portal Stage 4 code is live on prod App Hosting (inventory does not close).

---

## B4 — Generated Storage residual (list-only)

| Prefix | Approx object count (`gcloud storage ls`) |
|--------|------------------------------------------:|
| `generated/portal-catalog/**` | **~31,557** |
| `generated/catalog-reference/**` | **~229** |

Both prefixes **exist** and are non-empty.  
**RC-R6:** remains **OPEN** — inventory ≠ delete authorization. Dev Stage 5 script stays pinned to `fresh-prints-dev`.

---

## B5 — Taxonomy materialization / snapshotPublicationState

| Resource | Prod state |
|----------|------------|
| `taxonomyMaterialization/*` | **absent** (0 docs; `meta` NOT_FOUND) |
| `snapshotPublicationState` | **2 docs** (`catalog-reference`, `portal-catalog`) |

Bootstrap **not** run (forbidden this pass).

---

## B6 — Algolia production readiness (metadata only; no values)

| Prerequisite | Status |
|--------------|--------|
| Algolia Application | **[NEEDS OWNER CHECK]** (dashboard not inspected) |
| Prod index ≠ `portal_catalog_ready_dev` | **[NEEDS OWNER CHECK]** |
| Search-only key for Portal | **[NEEDS OWNER CHECK]** |
| Secret Manager `ALGOLIA_ADMIN_API_KEY` | **NOT FOUND** (`gcloud secrets describe` → NOT_FOUND) |
| Other `ALGOLIA*` secrets listed | **none** |
| Functions params `ALGOLIA_APP_ID` / index | **[NEEDS OWNER CHECK]** (legacy `functions:config` empty; Gen2 params not readably listed without describe on undeployed functions) |
| Portal/App Hosting Algolia public env | **not** among listed NEXT_PUBLIC App Hosting secrets (Firebase web + origin only) |

**RC-R3:** remains **OPEN**.

App Hosting Firebase web secrets (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_PORTAL_ORIGIN`) remain **CLOSED** / READY — do not reopen (RC-R8).

---

## B7 — App Hosting auto-deploy (RC-R5)

Traffic API (`.../backends/fresh-prints-portal/traffic`):

```json
"rolloutPolicy": {
  "codebaseBranch": "production",
  "disabled": true
}
```

| Item | Finding |
|------|---------|
| Live branch | **`production`** |
| Automatic rollouts | **`disabled: true`** |
| Recent rollouts | labeled `deployment-tool: cli-firebase` (manual CLI) |
| ABIU column | Automatic **Base Image** Updates — **not** auto-rollout |

**Verdict:** **B. MANUAL ROLLOUT — PROVEN**  
Merge to `production` does **not** by itself roll Portal. Still requires `APPROVE APP HOSTING ROLLOUT`.

**RC-R5:** **SATISFIED**.

---

## Confirmations

- NO Firestore writes
- NO Storage deletes/gets of object bytes beyond list names
- NO Function deploy/delete
- NO Rules/index deploy
- NO taxonomy bootstrap
- NO Algolia mutation / secret value access
- NO App Hosting rollout
- NO PR merge
