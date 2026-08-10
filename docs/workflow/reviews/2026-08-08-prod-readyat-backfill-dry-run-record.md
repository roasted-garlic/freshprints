# Dry-Run Record — Production `designs.readyAt` backfill

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD READYAT BACKFILL DRY-RUN` |
| Status | **DRY-RUN COMPLETE — NO WRITES** · Go/No-Go: **GO (classification A)** |
| Related | R-018 · closed Home/Discover corrective Signoff |
| Project | **fresh-prints-prod** |
| Production source SHA | `ccfc97487a42553146ea3186bde8f710a54b86ca` |

---

## Script identity

| Item | Value |
|------|-------|
| Path | `functions/scripts/backfill-design-ready-at.mjs` |
| Blob on `origin/production` | `6585526b06006150f00b8dceac310a3b2a212d00` |
| Working-tree SHA256 | `60D6542E752D4AC81CFCA43C3BEE6C8B9B5AAC4C04B47D1A5249D65639F83D64` |

### Verified contract (matches CURRENT source)

- Only `status == "ready"`
- Skip if `readyAt` already set
- Seed: `aiReviewedAt ?? updatedAt ?? createdAt`
- Idempotent; dry-run default; `APPLY=1` for writes
- Non-dev requires `ALLOW_NON_DEV=1`
- Batch size **400**

---

## Counts (read-only analysis mirroring script seed logic)

Official `node functions/scripts/backfill-design-ready-at.mjs` dry-run was **Cursor-hook-blocked** against prod. Aggregate analysis used Admin SDK **read-only** (`APPLY` unset; no `update`/`batch.commit`). Counts match the script’s candidate selection.

| Metric | Value |
|--------|-------|
| ready | **46** |
| alreadySet | **0** |
| needsBackfill | **46** |
| skipped-no-seed | **0** |

### Seed-source distribution (candidates)

| Seed | Count |
|------|-------|
| `aiReviewedAt` | **46** |
| `updatedAt` | **0** |
| `createdAt` | **0** |

### Proposed `readyAt` age distribution (from winning seed)

| Window | Count |
|--------|-------|
| Within last 7 days | **45** |
| 8–30 days | **1** |
| 31–90 days | **0** |
| Older than 90 days | **0** |

Cutoff used: ~`2026-08-01T18:06:19Z` (7 days before analysis time).

---

## New This Week impact preview

**Portal View All / Discover `new` path** (binding for empty page):

`useCatalogDesigns` → `readyAfterMs` → Firestore `where('readyAt', '>=', …)` + `orderBy(readyAt)`.

Docs **missing** `readyAt` are excluded → current View All New This Week = **empty** (matches owner QA).

| Estimate | Count |
|----------|-------|
| View All NTW **before** backfill | **0** (no `readyAt` fields) |
| View All NTW **after** backfill (seed ≥ cutoff) | **45** |
| Of those, seed = `aiReviewedAt` | **45** |
| Of those, seed = `updatedAt` | **0** |
| Of those, seed = `createdAt` | **0** |
| Ready designs still outside NTW window after backfill | **1** |

Client `rankNewThisWeek` also falls back to `createdAtMs` when `readyAtMs` is missing (Home rails), but **Discover View All does not** — it requires the Firestore field. That is why NTW View All is empty while Home multi-design works.

**Not** “entire legacy catalog falsely looks new via `updatedAt`.” All NTW-qualifying seeds are **`aiReviewedAt`** (best evidence = approval/review time).

---

## `updatedAt` risk check

| Question | Result |
|----------|--------|
| Candidates seeding from `updatedAt` | **0** |
| Of those within last 7 days | **0** |
| Risk of unrelated recent writes impersonating Ready | **None on current corpus** |

---

## Safety verify

| Check | Result |
|-------|--------|
| Overwrite existing `readyAt` | **No** (`alreadySet` skipped; 0 present) |
| Only `status=ready` | **Yes** |
| Idempotent | **Yes** |
| Archived/processing/rejected written | **No** (query filters ready only) |
| Status / lifecycle changes | **No** (only sets `readyAt`) |
| Rules/Functions/index/App Hosting required | **No** |
| readyAt indexes | **4/4 READY** (confirmed this pass) |
| `APPLY=1` used | **No** |
| Document mutations | **None** |

---

## Safety classification

### **A. SAFE TO APPLY AS-IS**

Rationale: entire candidate set uses `aiReviewedAt` (script’s preferred seed). Zero `updatedAt` contamination. Predicted NTW population (**45**) reflects recent review timestamps, not last-write pollution. No script correction required before APPLY.

---

## APPLY checkpoint (NOT EXECUTED)

PowerShell (repo root):

```powershell
$env:FIREBASE_PROJECT_ID = 'fresh-prints-prod'
$env:ALLOW_NON_DEV = '1'
$env:APPLY = '1'
node functions/scripts/backfill-design-ready-at.mjs
```

Remove `APPLY` / do not set `APPLY=1` for any further dry-run.

Optional: re-run official dry-run first (still no writes):

```powershell
$env:FIREBASE_PROJECT_ID = 'fresh-prints-prod'
$env:ALLOW_NON_DEV = '1'
Remove-Item Env:APPLY -ErrorAction SilentlyContinue
node functions/scripts/backfill-design-ready-at.mjs
```

Expected summary line shape:
`project=fresh-prints-prod ready=46 alreadySet=0 needsBackfill=46 mode=DRY-RUN`

---

## Next owner phrase

```text
APPROVE PROD READYAT BACKFILL APPLY
```

R-018 remains **OPEN** until APPLY + owner NTW QA.

---

## Confirmations

- NO readyAt writes
- APPLY=1 NOT used
- NO Rules / Functions / indexes / App Hosting / Algolia / taxonomy / Storage cleanup
