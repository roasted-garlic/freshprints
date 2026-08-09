# Checkpoint: PR #40 production Functions DELETE — Stage 4 publishers (PREPARE ONLY)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Managed goal | `pr-40-prod-functions-delete-stage-4-publishers` |
| Phase | **COMPLETE — VERIFY PASS** |
| Owner report | `STAGE 4 PUBLISHERS DELETED: PASS` |
| Deploy record | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-record.md` |
| Parent | PR #40 remaining production gates — Gate 5 |
| Prerequisites | Firestore Rules **COMPLETE**; Storage Rules **COMPLETE** (generated public reads denied); Portal Stage 4 **LIVE**; Taxonomy bootstrap **COMPLETE** |
| Source tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Bootstrap record | `docs/workflow/reviews/2026-08-08-prod-taxonomy-materialization-bootstrap-record.md` |
| Formal Review | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-checkpoint-review.md` |
| Owner phrase (after Formal Review) | **`APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`** |

---

## Goal

Authorize a **scoped** production Functions **DELETE** of the five retired catalog-snapshot publishers still live on `fresh-prints-prod` — **without** Algolia Functions work, **without** Storage object cleanup, **without** Rules redeploy, **without** App Hosting / Studio.

---

## Fresh production Functions inventory (post-bootstrap verify)

### Publishers / taxonomy / Algolia (relevant subset)

| Function | Live on `fresh-prints-prod` | Tip `functions/src/index.ts` | Classification |
|----------|----------------------------|------------------------------|----------------|
| `onCategorySnapshotSourceWritten` | **PRESENT** | absent | **DELETE** |
| `onTagSnapshotSourceWritten` | **PRESENT** | absent | **DELETE** |
| `onPortalCatalogSnapshotSourceWritten` | **PRESENT** | absent | **DELETE** |
| `rebuildCatalogSnapshots` | **PRESENT** | absent | **DELETE** |
| `retryPortalCatalogPublication` | **PRESENT** | absent | **DELETE** |
| `onPortalCatalogPublicationStateWritten` | **ABSENT** | absent | **SKIP** (already gone) |
| `onTagTaxonomySourceWritten` | PRESENT | exported | **KEEP** |
| `onCategoryTaxonomySourceWritten` | PRESENT | exported | **KEEP** |
| `rebuildTaxonomyMaterializationCallable` | PRESENT | exported | **KEEP** |
| `enqueueAiEnrichment` | PRESENT | exported | **KEEP** |
| `getPortalGlobalOpenGraph` | PRESENT | exported | **KEEP** |
| Algolia trio | **ABSENT** | not on default index | **KEEP ABSENT** |

**Note:** Dev Stage 4 deleted **six** names (including `onPortalCatalogPublicationStateWritten`). Prod inventory is **five** live publishers — delete exactly those five.

---

## Exact DELETE allowlist

```text
onCategorySnapshotSourceWritten
onTagSnapshotSourceWritten
onPortalCatalogSnapshotSourceWritten
rebuildCatalogSnapshots
retryPortalCatalogPublication
```

### Exact command (NOT EXECUTED this prepare pass)

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='60'
firebase functions:delete `
  onCategorySnapshotSourceWritten `
  onTagSnapshotSourceWritten `
  onPortalCatalogSnapshotSourceWritten `
  rebuildCatalogSnapshots `
  retryPortalCatalogPublication `
  --region us-central1 `
  --project fresh-prints-prod `
  --force
```

**Forbidden:** broad `firebase deploy --only functions`; Algolia CREATE; taxonomy Function delete; Storage cleanup; Rules redeploy.

---

## Why this is safe now

| Prerequisite | Status |
|--------------|--------|
| Portal Stage 4 live (ordinary browse ≠ generated assets) | **YES** — `build-2026-08-08-004` |
| Storage Rules deny generated public reads | **YES** — ruleset `ccb8e2ea-…` |
| Algolia OFF (no managed-search dependency on publishers) | **YES** |
| Taxonomy materialization ready (staff/AI path) | **YES** — Gate 4 PASS |

Retired publishers can still **regenerate** residual generated assets until deleted. Deleting stops that write path; residual objects/docs remain until Gate 6 cleanup (separate phrases).

---

## Post-delete verify plan (after owner phrase; future)

1. `firebase functions:list --project fresh-prints-prod` — five names **ABSENT**
2. Taxonomy Functions still **ACTIVE**; Algolia still **ABSENT**
3. Portal HTTP `/` + `/catalog` **200**; Algolia OFF unchanged
4. Write delete record: `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-record.md`
5. Owner reply format: `STAGE 4 PUBLISHERS DELETED: PASS`

---

## Explicitly forbidden this gate

- Storage object / `snapshotPublicationState` cleanup
- Algolia Functions / secret / enable
- Taxonomy Function delete or re-bootstrap
- Rules / indexes / App Hosting / Studio release
- Deleting any Function not on the five-name allowlist

---

## Confirmations

- Owner phrase received: `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS`
- Preflight inventory: **PASS**
- Agent `functions:delete`: **HOOK-BLOCKED**
- Owner CLI delete: **PASS** (`STAGE 4 PUBLISHERS DELETED: PASS`)
- Post-delete verify: **PASS** (five ABSENT; taxonomy ACTIVE; Portal 200)

**Gate 5 COMPLETE.** Next: `APPROVE PROD STORAGE CLEANUP PLAN`.
