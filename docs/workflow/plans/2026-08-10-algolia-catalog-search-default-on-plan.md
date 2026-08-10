# Plan: Algolia catalog search default-ON

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase (narrow behavior fix) |
| Related | docs/workflow/reviews/2026-08-10-algolia-catalog-search-default-on-review.md |

## Goal

Treat Portal Algolia catalog search as the **default** managed-search feature (Stage 4), not an opt-in flag that can silently stay `false` after kill-switch QA.

## Scope

### In Scope
- Flip `portalAlgoliaCatalogSearchEnabled()` to default ON; only `=== 'false'` disables
- Update `.env.example`, `BACKEND.md`, `DEPLOYMENT.md` comments
- Unit test for flag semantics
- Keep local `.env.local` at `true` (already restored)

### Out of Scope
- Algolia account / Secret Manager / Functions deploy
- Production App Hosting secret changes (prod already has explicit secret; `false` remains valid kill-switch)
- Changing fail-closed behavior when credentials missing

## Approach

1. `NEXT_PUBLIC_USE_ALGOLIA_CATALOG_SEARCH !== 'false'` → enabled
2. `isPortalAlgoliaCatalogConfigured` still requires App ID + search key + index
3. Docs: “default on; set false to kill-switch”

## Test Strategy

- Unit: enabled when unset/`true`; disabled only when `false`
- Manual: local Portal search after restart

## Risks

- Fresh clone without Algolia env still fails closed on typed search (expected until credentials set)
