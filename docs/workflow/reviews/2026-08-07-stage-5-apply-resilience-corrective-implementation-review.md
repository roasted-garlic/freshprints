# Implementation Review: Stage 5 APPLY resilience corrective (no live delete)

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Implementation Review |
| Related | Stage 5 plan + prior Implement APPROVED; owner partial APPLY failures |
| Verdict | **APPROVED** — STOP before live resume APPLY |

---

## Diagnosis (best-supported)

| Factor | Assessment |
|--------|------------|
| Error text | `"We encountered an internal error. Please try again."` — classic **transient GCS / Google API** failure |
| Trigger | APPLY used **concurrency 40** + `Promise.all` with **no per-object retry** |
| Failure mode | First transient error aborted the entire run mid-pass |
| Partial progress | Idempotent re-list already showed remaining counts drop (57377→46298) — deletes that succeeded stayed deleted |
| Scope | Second run still only hit allowlisted prefixes — **no path escape** |
| Firestore | Still 2 docs because Storage phase aborted before FS cleanup (original script order); corrective deletes FS after Storage pass and verifies both |

**Root cause (supported):** high fan-out delete load + no retry on transient Storage errors → hard abort. Not an allowlist/project-pin defect.

---

## Corrective applied (source only)

1. New module `functions/scripts/lib/stage5GeneratedAssetCleanupApply.mjs`:
   - `isTransientStorageError` (matches observed message + 429/5xx/UNAVAILABLE/etc.)
   - `withTransientRetry` (exponential backoff + jitter)
   - `deleteAllowlistedPathsInBatches` (default concurrency **8**; per-object retry; sibling failures don’t abort batch mates; hard allowlist assert before delete)
   - `buildApplyVerificationSummary` for post-APPLY re-list
2. Ops script updated:
   - Uses resilient batch delete
   - Safe resume via **re-list remaining** objects each APPLY (no assumption of original inventory)
   - List/getFiles also retry transient errors
   - Firestore orphan delete after Storage pass (batch recreate inside retry)
   - **Final verification re-list**; exit code **2** if residuals remain (re-run same command)
3. Allowlists / project pin / dry-run default / no callable — **unchanged**

---

## Files changed

| Path |
|------|
| `functions/scripts/lib/stage5GeneratedAssetCleanupApply.mjs` *(new)* |
| `functions/scripts/lib/stage5GeneratedAssetCleanupApply.test.mjs` *(new)* |
| `functions/scripts/stage5-generated-asset-cleanup.mjs` |
| This review + checkpoint/state updates |

---

## Tests

| Suite | Result |
|-------|--------|
| Guard + APPLY unit tests | **26/26 pass** |
| eslint (touched scripts) | **exit 0** |
| Live APPLY | **not run** (forbidden this pass) |

---

## Verification checklist

| Item | Status |
|------|--------|
| No path-escape / allowlist preserved | **PASS** |
| Project hard-pin preserved | **PASS** |
| Dry-run still default | **PASS** |
| No cleanup callable | **PASS** |
| Transient retry + lower concurrency | **PASS** |
| Resume via re-list | **PASS** |
| Final verification | **PASS** |
| No live delete this pass | **PASS** |

---

## Owner resume command (after this review; prior delete authorization still in force)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
$env:APPLY = "1"
$env:STAGE5_DRY_RUN_OUT = "docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-apply-resume-inventory.json"
node functions/scripts/stage5-generated-asset-cleanup.mjs
```

Optional: `$env:STAGE5_CONCURRENCY = "8"` (default). Lower further (e.g. `4`) if internals persist.

Expect: re-list remaining (~46k or less) → resilient delete → FS cleanup → verification `fullyClean: true` → `APPLY complete`.

Reply: `STAGE 5 STORAGE DELETED: PASS` when verification shows empty allowlisted targets.

---

## Confirmations

- NO live dry-run/delete this corrective pass
- NO Rules deployed
- NO Stage 6 / production / PR merge
