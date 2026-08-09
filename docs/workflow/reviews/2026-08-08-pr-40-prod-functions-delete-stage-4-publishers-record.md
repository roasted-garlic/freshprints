# Deploy Record: PR #40 production Functions DELETE — Stage 4 publishers

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD FUNCTIONS DELETE: STAGE 4 PUBLISHERS` |
| Owner report | `STAGE 4 PUBLISHERS DELETED: PASS` |
| Project | **`fresh-prints-prod`** |
| Scope | **Exact five publisher Functions only** |
| Status | **COMPLETE — VERIFY PASS** |
| Source tip | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-checkpoint.md` |
| Formal Review | **approved** — `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-delete-stage-4-publishers-checkpoint-review.md` |

---

## Preflight (agent; read-only) — **PASS**

| Check | Result |
|-------|--------|
| `origin/production` | `51db805d2fce6fcb6edee71b1a7f1a9b531fb50f` |
| App Hosting | **100%** `build-2026-08-08-004` |
| Algolia | **OFF**; Algolia Functions **ABSENT** |
| Taxonomy Functions | **ACTIVE** (KEEP) |
| Taxonomy materialization | Gate 4 **COMPLETE** |
| Storage Rules generated deny | **COMPLETE** `ccb8e2ea-…` |
| `onPortalCatalogPublicationStateWritten` | **ABSENT** (SKIP) |

### DELETE targets (pre-delete)

| Function | Pre | Post |
|----------|-----|------|
| `onCategorySnapshotSourceWritten` | PRESENT | **ABSENT** |
| `onTagSnapshotSourceWritten` | PRESENT | **ABSENT** |
| `onPortalCatalogSnapshotSourceWritten` | PRESENT | **ABSENT** |
| `rebuildCatalogSnapshots` | PRESENT | **ABSENT** |
| `retryPortalCatalogPublication` | PRESENT | **ABSENT** |

---

## Execution

| Item | Value |
|------|--------|
| Agent delete | **HOOK-BLOCKED** (no mutation) |
| Owner CLI | **Executed** (outside agent) |
| Owner confirmation | `STAGE 4 PUBLISHERS DELETED: PASS` |

Exact command (owner):

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

---

## Post-delete verification (agent; read-only) — **PASS**

### Functions inventory (filtered)

| Function | Status |
|----------|--------|
| Five publishers | **ABSENT** |
| `onTagTaxonomySourceWritten` | **ACTIVE** |
| `onCategoryTaxonomySourceWritten` | **ACTIVE** |
| `rebuildTaxonomyMaterializationCallable` | **ACTIVE** |
| `enqueueAiEnrichment` | **ACTIVE** |
| `getPortalGlobalOpenGraph` | **ACTIVE** |
| Algolia trio | **ABSENT** |

### Portal smoke

| URL | Result |
|-----|--------|
| `/` | **200** |
| `/catalog` | **200**; algolia markers **0**; `fresh-prints-dev` hits **0** |

### Unchanged this gate

| Item | Status |
|------|--------|
| App Hosting | **100%** `build-2026-08-08-004` |
| Algolia product | **OFF** |
| Rules | untouched |
| Storage objects / `snapshotPublicationState` | **not cleaned** (Gate 6) |

---

## Confirmations

- NO Algolia Functions / secret / enable
- NO Storage object / `snapshotPublicationState` cleanup
- NO Rules / indexes / App Hosting / Studio
- NO taxonomy Function delete
- NO broad Functions deploy

---

## Gate status

**Gate 5 (Publisher Function DELETE) — COMPLETE**

Next production-parity checkpoint: Gate 6 generated Storage + `snapshotPublicationState` cleanup — **requires a production-capable procedure** (Stage 5 script is hard-pinned to `fresh-prints-dev` with no prod escape hatch).

**STOP** before Storage cleanup.
