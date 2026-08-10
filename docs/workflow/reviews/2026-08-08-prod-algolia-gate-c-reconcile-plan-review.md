# Formal Review: Production Algolia Gate C — reconcile plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-08-prod-algolia-gate-c-reconcile-plan.md` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-prod-algolia-gate-c-reconcile-checkpoint.md` |
| Verdict | **approved** |

---

## Summary

Gate C reconcile is correctly scoped as an ops invoke against the already-ACTIVE owner/admin callable, with dry-run before clear+rewrite of `portal_catalog_ready_prod`. Splitting Portal enable into a later phrase prevents silent product cutover while the index is populated. Preflight shows live params are the SEPARATE prod app/index. Agent invoke is expected to be hook-blocked; owner CLI matches prior prod bootstrap pattern.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Reconcile only; enable out |
| Architecture alignment | pass | Existing callable; no new layers |
| Security impact addressed | pass | Owner/admin; no secret print; flag OFF |
| Data model impact addressed | pass | Firestore unchanged |
| Backend impact addressed | pass | Algolia index clear+upsert documented |
| Test strategy adequate | pass | Live verify + owner counts |
| Human checkpoints identified | pass | Dry-run + apply phrases |
| Roadmap alignment | pass | Optional managed search lane |
| Documentation plan | pass | Records + matrix |
| No silent scope expansion | pass | Explicit forbid enable |

---

## Architecture Review

**Findings:**
- Reconcile is the intended backfill path; incremental sync already deployed.
- Portal remains on Firestore browse until a separate enable gate.

**Required changes:**
- [x] None

---

## Security Review

**Findings:**
- Callable gates owner/admin; admin key stays in SM.
- Clear+rewrite is destructive to the Algolia index only; customer impact gated by Portal flag OFF.
- Dev console bridge must not be used as the prod path (correctly noted).

**Required changes:**
- [x] None

**Human approval needed before production:**
- [x] Dry-run phrase + apply phrase (production Algolia mutation)

---

## Data Model Review

**Findings:**
- No Firestore schema change.

**Required changes:**
- [x] None

---

## Backend Review

**Findings:**
- Live env confirms `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod` (not `_dev`).
- Default callable payload without `dryRun: true` applies (clears) — checkpoint correctly requires explicit dry-run first.

**Required changes:**
- [x] None

---

## Test Review

**Findings:**
- Count comparison dry-run vs apply is sufficient; no app code change.

**Required changes:**
- [x] None

---

## Human Checkpoints

- Dry-run authorize / PASS
- Apply authorize / COMPLETE
- Enable deferred (`APPROVE PROD ALGOLIA ENABLE`)

---

## Decision

**approved** — owner may proceed with **`APPROVE PROD ALGOLIA RECONCILE DRY-RUN`**.

**STOP** before any invoke until that phrase.
