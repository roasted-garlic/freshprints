# Stage 5 Storage Delete Checkpoint — `fresh-prints-dev`

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Owner authorizations | `STAGE 5 DRY-RUN: PASS` + `APPROVE DEV STORAGE DELETE: STAGE 5` |
| Project | **fresh-prints-dev** only |
| Status | **Partial APPLY** — resilience corrective **APPROVED**; resume with hardened script |

---

## Partial progress (owner)

| Run | Started | Progress | Failure |
|-----|---------|----------|---------|
| 1 | 57,377 Storage objs | ≥11,000 | GCS “internal error… try again” |
| 2 | 46,298 Storage objs | ≥10,000 | same |

`snapshotPublicationState` still **2** docs after those runs. Negative roots excluded.

---

## Corrective (2026-08-07)

Implementation Review: `docs/workflow/reviews/2026-08-07-stage-5-apply-resilience-corrective-implementation-review.md` (**APPROVED**)

- Lower concurrency (default 8)
- Per-object retry/backoff for transient GCS errors
- Re-list resume + final verification
- No allowlist/project-pin change; no callable

---

## Owner resume command (from repo root)

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
$env:APPLY = "1"
$env:STAGE5_DRY_RUN_OUT = "docs/workflow/reviews/2026-08-07-stage-5-generated-asset-cleanup-apply-resume-inventory.json"
node functions/scripts/stage5-generated-asset-cleanup.mjs
```

If internals continue: `$env:STAGE5_CONCURRENCY = "4"` then re-run the same command.

Success ends with verification `fullyClean: true` and:
`APPLY complete — allowlisted Storage prefixes and snapshotPublicationState are empty.`

---

## After success — reply

`STAGE 5 STORAGE DELETED: PASS`

**Do not** deploy Rules until `APPROVE DEV RULES DEPLOY: STAGE 5`.
