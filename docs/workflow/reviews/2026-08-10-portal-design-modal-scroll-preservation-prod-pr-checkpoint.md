# Checkpoint: Production PR ready — Portal design-modal scroll preservation

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Branch | `hotfix/portal-design-modal-scroll-preservation` |
| Base | `origin/production` @ `f5584451e8cff197e0dd1acc8ea747bc992a88a9` |
| Parent goal | `prelaunch-catalog-search-count-and-first-visit-ux` |
| Status | **READY** for owner production PR merge |

## Root cause (verified)

`PortalScrollReset` reset window/main/content scroll on **every** `searchParams` string change. Design modal open/close toggles `?designId=` (already via `router.replace(..., { scroll: false })`), which still triggered the shell reset → jump to top.

## Exact fix

Skip `PortalScrollReset` when pathname is unchanged and the only search difference is `designId` (fingerprint helper). No manual scroll restoration; Add-to-Request product behavior unchanged.

## Original `f558445…` App Hosting rollout

- Owner-run `firebase apphosting:rollouts:create … --git-commit f558445…` → **Successfully created**
- Backend `fresh-prints-portal` Updated Date advanced to **2026-08-10 22:35:50**
- Treat as **completed create** for the pre-amendment tip; **not** final for Signoff
- Do **not** cancel it; after this PR merges, run a **second** Portal App Hosting rollout from the **new** production tip

## Gates

| Gate | Result |
|------|--------|
| Plan Formal Review | **approved** |
| Implementation Review | **approved** |
| Focused tests (11) | **PASS** |
| Portal typecheck / lint / `build:portal` / `git diff --check` | **PASS** |

## Stop line (until merge + second rollout)

Do **not**:
- publish Studio 1.0.3
- run final owner QA / Signoff
- sync `development`
- deploy Functions / Rules / indexes
- mutate Algolia
- change DNS / myprintrequest.com

## After merge

1. Second Portal App Hosting rollout from **new** production tip only.
2. Smoke `/` and `/catalog`.
3. Resume Studio 1.0.3 packaging/publish from final production source.
4. Owner QA = parent checklist **plus** scroll preservation scenarios.

## Suggested PR title

`fix(portal): preserve catalog scroll across design modal designId URL changes`
