# Checkpoint: Production PR ready — combined Portal hotfix

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Branch | `hotfix/portal-design-modal-scroll-preservation` |
| Base | `origin/production` @ `f5584451e8cff197e0dd1acc8ea747bc992a88a9` |
| Parent goal | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Status | **READY** for owner production PR (combined scope) — **do not merge until owner approves** |

## Combined scope

1. **Scroll preservation** — skip `PortalScrollReset` on `designId`-only query changes
2. **Discover placeholder count** — authoritative `countReadyDesigns({})` / `readyLibraryCount`; never home-pool `designs.length`

## Gates

| Gate | Result |
|------|--------|
| Scroll Formal + Implementation Review | approved |
| Discover count Formal Review | approved |
| Combined Implementation Review | **approved** |
| Focused tests (incl. scroll + Discover) | **PASS** |
| Portal typecheck / lint / `build:portal` / `git diff --check` | **PASS** |

## Stop line

Do **not** yet: merge; second App Hosting rollout; Studio 1.0.3; final QA; Signoff; development sync; Functions/Rules/indexes; Algolia mutate; DNS/cutover.

`f558445…` App Hosting revision remains intermediate QA only.

## Suggested PR title

`fix(portal): preserve catalog scroll and show complete Discover library count`

## Open PR

https://github.com/roasted-garlic/freshprints/compare/production...hotfix/portal-design-modal-scroll-preservation?expand=1
