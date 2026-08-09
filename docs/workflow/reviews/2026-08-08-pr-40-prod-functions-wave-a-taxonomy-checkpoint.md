# Checkpoint: PR #40 production Functions Wave A — Taxonomy (PREPARE ONLY)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-functions-wave-a-taxonomy` |
| Phase | **PREPARE / Formal Review only — NO deploy** |
| Parent | PR #40 remaining production gates |
| Prerequisites | Firestore Rules **COMPLETE**; Storage Rules **COMPLETE**; Portal Stage 4 **LIVE**; Algolia **OFF** |
| Source tip | `7e139685099f90eb1532771e927384316a432e87` |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-taxonomy-checkpoint-review.md` |

---

## Goal

Authorize a **scoped** production Functions create/update allowlist for taxonomy materialization + related AI/OG updates — **without** Algolia Functions, **without** publisher deletes, **without** taxonomy bootstrap invoke.

---

## Fresh production Functions inventory (2026-08-08)

### Taxonomy / Algolia / AI / OG / publishers (relevant subset)

| Function | Live on `fresh-prints-prod` | Tip `functions/src/index.ts` | Classification for Wave A-Taxonomy |
|----------|----------------------------|------------------------------|-------------------------------------|
| `onTagTaxonomySourceWritten` | **ABSENT** | exported | **CREATE** |
| `onCategoryTaxonomySourceWritten` | **ABSENT** | exported | **CREATE** |
| `rebuildTaxonomyMaterializationCallable` | **ABSENT** | exported | **CREATE** |
| `rebuildTaxonomyMaterialization` | ABSENT | exported as shared async | **NOT REQUIRED** (not a Gen2 deployable wrapper) |
| `enqueueAiEnrichment` | **PRESENT** | exported | **UPDATE** (materialization-aware loader) |
| `getPortalGlobalOpenGraph` | **PRESENT** | exported | **UPDATE** (PR #40 Portal FS browse delta) |
| `getPortalDesignShareOpenGraph` | PRESENT | exported | **NO CHANGE** this wave |
| `syncPortalCatalogDesignToAlgolia` | ABSENT | exported | **EXCLUDED** (Algolia optional lane) |
| `reconcilePortalCatalogAlgoliaIndex` | ABSENT | exported | **EXCLUDED** |
| `reconcilePortalCatalogAlgoliaIndexScheduled` | ABSENT | exported | **EXCLUDED** |
| `onCategorySnapshotSourceWritten` | PRESENT | **absent from tip** | **EXCLUDED** (Wave B DELETE later) |
| `onTagSnapshotSourceWritten` | PRESENT | absent | **EXCLUDED** (Wave B) |
| `onPortalCatalogSnapshotSourceWritten` | PRESENT | absent | **EXCLUDED** (Wave B) |
| `rebuildCatalogSnapshots` | PRESENT | absent | **EXCLUDED** (Wave B) |
| `retryPortalCatalogPublication` | PRESENT | absent | **EXCLUDED** (Wave B) |
| `onPortalCatalogPublicationStateWritten` | ABSENT | absent | **NO CHANGE** / skip |

**Drift:** none unexpected vs remaining-gates reconciliation — taxonomy CREATE still missing; publishers still live (5); Algolia still undeployed.

---

## Exact Wave A — Taxonomy allowlist

### CREATE

```text
functions:onTagTaxonomySourceWritten
functions:onCategoryTaxonomySourceWritten
functions:rebuildTaxonomyMaterializationCallable
```

### UPDATE

```text
functions:enqueueAiEnrichment
functions:getPortalGlobalOpenGraph
```

### Exact command (NOT EXECUTED)

```bash
firebase deploy --only functions:onTagTaxonomySourceWritten,functions:onCategoryTaxonomySourceWritten,functions:rebuildTaxonomyMaterializationCallable,functions:enqueueAiEnrichment,functions:getPortalGlobalOpenGraph --project fresh-prints-prod --non-interactive
```

**Forbidden:** `firebase deploy --only functions` (broad).
**Forbidden this phrase:** Algolia Functions; publisher DELETE; bootstrap invoke.

---

## Taxonomy bootstrap state

| Item | Status |
|------|--------|
| `taxonomyMaterialization/meta` | **ABSENT** (`exists=false`) |
| Bootstrap required after Wave A? | **Yes** — separate phrase after Functions verify |
| Invoke this pass? | **NO** |

Firestore Rules already allow staff-read of materialization; Admin SDK can write without client Rules.

---

## Dependencies / risks

| Risk | Mitigation |
|------|------------|
| Broad Functions deploy | Explicit 5-function allowlist only |
| Algolia `_dev` contamination | Algolia Functions **not** in this wave |
| Publishers still regenerating generated assets | Expected until Wave B; Storage Rules already deny public reads |
| Bootstrap before compatible Functions | Bootstrap phrase **after** Wave A verify |
| AI taxonomy spike until UPDATE + bootstrap | FS fallback retained in tip loader |

---

## Post-deploy verify plan (after owner phrase; future)

1. `firebase functions:list` shows three taxonomy Functions ACTIVE
2. `enqueueAiEnrichment` / `getPortalGlobalOpenGraph` updated (digest/time)
3. No Algolia Functions created
4. Publishers still present (until Wave B)
5. Do **not** invoke bootstrap until separate phrase

---

## Owner phrase (when authorized)

`APPROVE PROD FUNCTIONS WAVE A TAXONOMY`

---

## Confirmations (this prepare pass)

- NO Functions deploy/delete
- NO taxonomy bootstrap
- NO Algolia change
- NO Storage/Firestore Rules redeploy
- NO object cleanup

**STOP before Functions deployment.**
