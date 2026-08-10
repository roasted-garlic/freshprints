# Formal Review: PR #40 production Functions Wave A — Algolia checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Reviewer | Review Agent |
| Artifact | `docs/workflow/reviews/2026-08-08-pr-40-prod-functions-wave-a-algolia-checkpoint.md` |
| Gate A | **COMPLETE** — `Z1FVCM5QUX` / `portal_catalog_ready_prod` / SM secret present |
| Status | **approved_with_changes** |

---

## Summary

Gate A prerequisites are met for a SEPARATE prod app and prod index name. Wave A Algolia correctly scopes CREATE to the three Functions and keeps Portal enable OFF. Because Option E removed Algolia from default discovery, **restoring `algoliaFunctionExports` on `production` tip is a required change before deploy** — not optional. Secret rotation is recommended after agent verification exposed the admin key in tool output.

---

## Checklist

| Criterion | Result |
|-----------|--------|
| App SEPARATE + App ID recorded | **Pass** |
| Index ≠ `_dev` | **Pass** |
| Admin secret exists | **Pass** |
| Enable remains OFF | **Pass** |
| Exact three-function allowlist | **Pass** |
| Option E export restore sequenced | **Pass** (required change) |
| No secret values in docs | **Pass** |

---

## Required changes (during Gate B execution)

1. **Restore** Algolia trio exports onto default `functions/src/index.ts` via `./algolia/algoliaFunctionExports` (narrow source PR → `production`) before CREATE deploy.
2. Set params `ALGOLIA_APP_ID=Z1FVCM5QUX` and `ALGOLIA_PORTAL_CATALOG_INDEX_NAME=portal_catalog_ready_prod` on `fresh-prints-prod`.
3. Prefer **rotate** `ALGOLIA_ADMIN_API_KEY` after accidental agent access, then continue.
4. Deploy **only** the three Algolia Functions — no Portal enable / no reconcile until Gate C.

---

## Decision

**approved_with_changes** — owner may authorize with **`APPROVE PROD FUNCTIONS WAVE A ALGOLIA`**. Execute export restore → params → CREATE; stop before Portal enable.

**STOP** before Implement/deploy until that phrase.
