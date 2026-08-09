# Stage 5 Dry-Run Record — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Date / timestamp (UTC) | **2026-08-07T22:21:44.206Z** |
| Owner authorization | `APPROVE DEV STORAGE DRY-RUN: STAGE 5` |
| Project | **fresh-prints-dev** |
| Mode | **DRY RUN** (list-only) |
| Script | `functions/scripts/stage5-generated-asset-cleanup.mjs` |
| Command | `node functions/scripts/stage5-generated-asset-cleanup.mjs` |
| APPLY / delete flag | **unset** (not supplied) |
| Machine JSON | `docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-dry-run-fresh-prints-dev.json` |
| Destructive actions performed | **false** |

---

## Pre-run safety check

| Check | Result |
|-------|--------|
| Script defaults to dry-run | PASS |
| Project hard-pinned to `fresh-prints-dev` | PASS |
| No `ALLOW_NON_DEV` | PASS |
| Storage allowlist exact (2 prefixes) | PASS |
| Firestore allowlist = `snapshotPublicationState` | PASS |
| No APPLY flag | PASS |
| Stage 4 publisher source retired | PASS |
| Six publishers absent on live `fresh-prints-dev` | PASS (Algolia sync/reconcile remain) |

**Note:** First attempt failed with “Bucket name not specified.” Script was patched to hard-map `fresh-prints-dev` → `fresh-prints-dev.firebasestorage.app` (fail-closed; no production bucket mapping). Dry-run then re-executed successfully. Still list-only.

---

## Inventory — Storage

### `generated/portal-catalog/`

| Metric | Value |
|--------|-------|
| Object count | **57,354** |
| Total bytes | **146,829,893** (~140.0 MiB) |

**Sample paths (representative):**
- `generated/portal-catalog/manifest.json`
- `generated/portal-catalog/card-overrides/v1329-ea5e942bd5423bb3.json`
- `generated/portal-catalog/v1-e0e5b3ae9fb69797/discover.json`
- `generated/portal-catalog/v1012-4f53cda18c2baa0c/filters/tags-facet.json`
- `generated/portal-catalog/v1012-4f53cda18c2baa0c/studio/ready-index.json`
- (full sample set in JSON record — 20 paths)

### `generated/catalog-reference/`

| Metric | Value |
|--------|-------|
| Object count | **23** |
| Total bytes | **4,478,422** (~4.3 MiB) |

**Sample paths (representative):**
- `generated/catalog-reference/ai/v10-e5a18178b556f311.json` (legacy AI projections — Strategy 2 does not read these)
- `generated/catalog-reference/client/v1-1a810751ceb2b381.json`
- (full sample set in JSON record — 20 paths; includes `ai/` + `client/` versions)

### Unexpected paths?

**No unexpected Storage roots.** All listed objects begin with one of the two allowlisted prefixes. High portal-catalog count reflects many historical version generations (expected residual after Stage 4 publisher stop).

---

## Inventory — Firestore

### `snapshotPublicationState`

| Metric | Value |
|--------|-------|
| Document count | **2** |
| Sample IDs | `catalog-reference`, `portal-catalog` |

No document contents retrieved/printed.

---

## Negative root checklist

| Root | Targeted for deletion |
|------|------------------------|
| `originals/` | **false** |
| `thumbnails/` | **false** |
| `previews/` | **false** |
| `display/` | **false** |
| `customer-uploads/` | **false** |

Every Storage root outside the two allowlisted generated prefixes is out of scope and was **not** listed for deletion.

---

## Safety confirmation

| Action | Occurred? |
|--------|-----------|
| Storage object deleted | **NO** |
| Firestore document deleted | **NO** |
| Rules deployed | **NO** |
| Stage 6 / production / PR merge | **NO** |

Script stdout ended with: `Dry-run complete — no deletes performed.`  
Record field: `destructiveActionsPerformed: false`.

---

## Owner next step

Review this inventory, then reply:

`STAGE 5 DRY-RUN: PASS`

before authorizing:

`APPROVE DEV STORAGE DELETE: STAGE 5`

**Would-delete summary if APPLY later approved:** 57,354 + 23 = **57,377** Storage objects (~151.3 MiB) under the two prefixes, plus **2** `snapshotPublicationState` docs.
