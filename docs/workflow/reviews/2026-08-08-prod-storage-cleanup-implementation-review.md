# Implementation Review: PR #40 production Storage cleanup (source only)

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Implementation Review |
| Plan | `docs/workflow/plans/2026-08-08-prod-storage-cleanup-plan.md` |
| Plan Formal Review | **approved_with_changes** |
| Owner phrase | `APPROVE IMPLEMENT: PROD STORAGE CLEANUP` |
| Verdict | **APPROVED** — STOP before live dry-run / delete |

---

## Summary

Implemented a prod-dedicated cleanup ops script and guard hard-pinned to `fresh-prints-prod`, reusing Stage 5 APPLY resilience helpers. Stage 5 script/guard remain unchanged and still refuse prod. No live inventory, dry-run, or delete executed this pass.

---

## Formal Review required changes — applied

| # | Requirement | Evidence |
|---|-------------|----------|
| 1 | `CONFIRM_PROD_STORAGE_CLEANUP=1` for APPLY | `assertProdStorageCleanupApplyConfirm`; script checks before destructive path |
| 2 | Bucket identity `fresh-prints-prod.firebasestorage.app` | Fail-closed `PROD_STORAGE_BUCKET_BY_PROJECT` + app `storageBucket` mismatch throw |
| 3 | Storage deletes → then `snapshotPublicationState` → final verify | Script APPLY order matches Stage 5 corrective |
| 4 | No callable | Local script only; no Functions export |
| 5 | Stage 5 pin untouched | No edits to Stage 5 script/guard; regression test asserts Stage 5 rejects prod |

---

## Files created / modified

| Path | Change |
|------|--------|
| `functions/scripts/lib/prodGeneratedAssetCleanupGuard.mjs` | **new** — prod pin, allowlists, confirm gate, dry-run record |
| `functions/scripts/lib/prodGeneratedAssetCleanupGuard.test.mjs` | **new** — 10 tests |
| `functions/scripts/prod-generated-asset-cleanup.mjs` | **new** — dry-run default + APPLY path |
| `docs/architecture/BACKEND.md` | Gate 6 / ADR-FP-130 note |
| `docs/project/DECISIONS.md` | **ADR-FP-130** |
| Stage 5 script / guard | **unchanged** |

---

## Tests

| Suite | Result |
|-------|--------|
| Prod guard unit tests | **10/10 pass** |
| Stage 5 guard + APPLY regression | **26/26 pass** |
| eslint (touched scripts) | **exit 0** |
| Live dry-run / APPLY | **not run** (forbidden this pass) |

---

## Confirmations

- NO live Storage/Firestore mutation
- NO Stage 5 unlock for prod
- NO Algolia / Rules / App Hosting / Studio
- NO Functions deploy

---

## Next owner phrase (ONE)

`APPROVE PROD STORAGE CLEANUP DRY-RUN`

Then (owner CLI, expected):

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-prod"
node functions/scripts/prod-generated-asset-cleanup.mjs
```

Reply: `PROD STORAGE CLEANUP DRY-RUN: PASS`

**STOP** before dry-run.
