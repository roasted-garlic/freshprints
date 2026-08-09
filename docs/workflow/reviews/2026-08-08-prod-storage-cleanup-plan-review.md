# Formal Review: PR #40 production Storage cleanup Plan

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-08-prod-storage-cleanup-plan.md` |
| Checkpoint | `docs/workflow/reviews/2026-08-08-pr-40-prod-storage-cleanup-checkpoint.md` |
| Status | **approved_with_changes** |

---

## Summary

Plan correctly refuses to weaken the Stage 5 `fresh-prints-dev` hard pin, proposes a prod-dedicated script/guard that reuses proven APPLY resilience helpers, keeps Rules/Algolia/Studio out of scope, and sequences Implement → DRY-RUN → DELETE as separate owner phrases. Prerequisites (Stage 4 live, Storage Rules deny, publishers deleted) are satisfied. Ready for Implement authorization only — **no source changes or live cleanup in this review**.

---

## Checklist

| Criterion | Result |
|-----------|--------|
| Scope clear and bounded | **Pass** |
| Architecture alignment (no callable; Admin ops only) | **Pass** |
| Security (project pin, path allowlist, dual APPLY confirm) | **Pass** |
| Data model (`snapshotPublicationState` orphan only) | **Pass** |
| Backend (no Rules/Functions deploy) | **Pass** |
| Test strategy (guard + Stage 5 APPLY regression) | **Pass** |
| Human checkpoints identified | **Pass** |
| Roadmap / remaining-gates alignment | **Pass** |
| No silent scope expansion | **Pass** |
| Stage 5 left untouched | **Pass** |

---

## Required changes (apply during Implement — do not re-block Plan)

1. **Name the confirm env exactly** in script header + dry-run/delete records: `CONFIRM_PROD_STORAGE_CLEANUP=1` (as planned). Reject APPLY if missing or if project ≠ `fresh-prints-prod`.
2. **Bucket identity:** resolve Storage bucket as `fresh-prints-prod.firebasestorage.app` (or project default bucket for that project id) and fail closed if bucket project does not match the hard pin — same spirit as Stage 5 bucket map.
3. **Order of APPLY:** Storage allowlisted deletes first, then `snapshotPublicationState` docs, then final re-list verification for **both** (matches Stage 5 corrective).
4. **Do not** introduce a Cloud Function / callable cleanup path.
5. **Do not** modify `STAGE5_ALLOWED_PROJECT_ID` or add any Stage 5 prod escape hatch.

---

## Decision

**approved_with_changes** — Implement may proceed after owner phrase **`APPROVE IMPLEMENT: PROD STORAGE CLEANUP`**, incorporating the required changes above. Live dry-run and delete remain separately gated.

**STOP** before Implement / dry-run / delete.
