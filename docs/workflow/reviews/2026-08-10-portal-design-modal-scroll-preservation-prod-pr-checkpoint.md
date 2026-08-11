# Checkpoint: Production PR ready — combined Portal hotfix (3 items)

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Branch | `hotfix/portal-design-modal-scroll-preservation` |
| Base | `origin/production` @ `f5584451e8cff197e0dd1acc8ea747bc992a88a9` |
| Parent goal | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Status | **READY** for owner production PR — **do not merge until owner approves** |

## Combined scope

1. Design-modal scroll preservation (`PortalScrollReset` skips `designId`-only)
2. Discover search placeholder = complete ready-library `countReadyDesigns` aggregate
3. Whatnot follow UX — About callout, required FAQ + safe CTA, sidebar link above Help

## Canonical Whatnot URL

`packages/shared/src/constants/portal/portalExternalLinks.constants.ts`  
→ `https://www.whatnot.com/user/funkyfreshprints`

## Gates

| Gate | Result |
|------|--------|
| Scroll / Discover / Whatnot Formal Reviews | approved |
| Combined Implementation Review | **approved** |
| Focused tests (37) | **PASS** |
| Portal typecheck / lint / `build:portal` / `git diff --check` | **PASS** |

## Stop line

Do **not** yet: merge; second App Hosting rollout; Studio 1.0.3; final QA; Signoff; development sync; Functions/Rules/indexes; Algolia mutate; DNS/cutover.

## Suggested PR title

`fix(portal): catalog scroll, Discover library count, and Whatnot follow UX`

## Open PR

https://github.com/roasted-garlic/freshprints/compare/production...hotfix/portal-design-modal-scroll-preservation?expand=1
