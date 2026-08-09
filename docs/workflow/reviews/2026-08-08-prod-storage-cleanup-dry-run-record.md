# Dry-run Record: PR #40 production generated Storage cleanup

| Field | Value |
|-------|-------|
| Date | 2026-08-08 (run 2026-08-09T00:39:23.365Z) |
| Authorization | `APPROVE PROD STORAGE CLEANUP DRY-RUN` |
| Project | **`fresh-prints-prod`** |
| Mode | **dry-run** (list-only) |
| Script | `functions/scripts/prod-generated-asset-cleanup.mjs` |
| Status | **DRY-RUN PASS** — owner `PROD STORAGE CLEANUP DRY-RUN: PASS` |
| Owner confirmation | `PROD STORAGE CLEANUP DRY-RUN: PASS` (2026-08-08) |
| JSON inventory | `docs/workflow/reviews/2026-08-08-prod-generated-asset-cleanup-dry-run.json` |
| Destructive actions | **false** — no Storage or Firestore deletes |

---

## Inventory

| Target | Object / doc count | Bytes |
|--------|-------------------:|------:|
| `generated/portal-catalog/` | **31557** | **34133628** (~32.5 MiB) |
| `generated/catalog-reference/` | **229** | **41291849** (~39.4 MiB) |
| **Storage total (allowlisted)** | **31786** | **75425477** (~71.9 MiB) |
| `snapshotPublicationState` | **2** (`catalog-reference`, `portal-catalog`) | — |

### Sample paths (allowlisted only)

- `generated/portal-catalog/manifest.json`
- `generated/portal-catalog/card-overrides/…`
- `generated/portal-catalog/v10-…/discover.json`, search shards, filters, cards
- `generated/catalog-reference/ai/v….json` (AI reference snapshots)

Full samples: see JSON inventory.

---

## Negative-root checklist

| Root | Targeted for deletion |
|------|------------------------|
| `originals/` | **false** |
| `thumbnails/` | **false** |
| `previews/` | **false** |
| `display/` | **false** |
| `customer-uploads/` | **false** |

---

## Safety confirmations

| Check | Result |
|-------|--------|
| Project pin | `fresh-prints-prod` |
| Bucket | `fresh-prints-prod.firebasestorage.app` |
| `APPLY` set | **no** |
| `CONFIRM_PROD_STORAGE_CLEANUP` set | **no** |
| Stage 5 script used | **no** |
| Deletes performed | **none** |

---

## Owner review

Owner reply: **`PROD STORAGE CLEANUP DRY-RUN: PASS`** (2026-08-08)

Next phrase (separate): **`APPROVE PROD STORAGE CLEANUP DELETE`**

Do **not** run APPLY until that DELETE phrase.

### APPLY command (authorized only after DELETE phrase)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
$env:CONFIRM_PROD_STORAGE_CLEANUP = "1"
$env:APPLY = "1"
node functions/scripts/prod-generated-asset-cleanup.mjs
```

---

## Confirmations

- DRY-RUN: **PASS** (owner confirmed)
- DELETE / APPLY: **NOT EXECUTED**
- NO Algolia / Rules / App Hosting / Studio

**STOP** pending `APPROVE PROD STORAGE CLEANUP DELETE`.
