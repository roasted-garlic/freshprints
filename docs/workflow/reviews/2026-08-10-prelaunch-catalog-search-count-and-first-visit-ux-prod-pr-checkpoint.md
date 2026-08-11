# Checkpoint: Production PR ready — prelaunch catalog search / counts / first-visit UX

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Updated | 2026-08-10 (Portal `build:portal` PASS) |
| Branch | `hotfix/prelaunch-catalog-search-count-first-visit-ux` |
| Base | `origin/production` @ `b6e67be1b7fe02a69cd31077a203ee9102611ca5` |
| Implementation commit | `ddaf5e37d80482442481f74a50190d8ed5b6fc00` |
| Status | **READY** for owner production PR merge — do not merge/deploy without approval |

## Verification gates

| Gate | Result |
|------|--------|
| Focused unit tests | PASS |
| Studio / Portal typecheck | PASS |
| Lint | PASS |
| Studio Vite build | PASS |
| Portal production build (`npm run build:portal`) | **PASS** (exit 0) |
| `git diff --check` | PASS |
| Functions / Rules / indexes / Algolia setSettings | untouched |
| Chris Corner artifacts in commits | none |
| Implementation Review | **approved** (no re-review — no product code change for build unlock) |

## Stop line

Do **not**:
- merge this PR into `production`
- roll out Portal App Hosting
- publish/install a production Studio release
- mutate Algolia index settings / reconcile
- change DNS / Coming Soon / myprintrequest.com
- sync into `development` until after production signoff

## After owner merge approval

1. Merge hotfix PR → `production` (protected PR workflow).
2. Deploy Portal App Hosting from production tip (explicit phrase).
3. Build/publish Studio with `VITE_ALGOLIA_*` search-only env matching Portal prod index.
4. Run owner production QA checklist below.
5. Sync hotfix into `development` via PR (no force-push).

## Owner production QA checklist

### Studio
1. Confirm complete Design Library count visible without Load More.
2. Search for a design known to be outside the first page **before** Load More → appears.
3. Clear search → bounded pagination intact.
4. Spot-check category / tags / halftone / needs-companion.
5. Without Algolia Studio env: search shows clear unavailable error (not full hydrate).

### Portal
1. Confirm catalog count (likely ~ready membership; not page size 40).
2. Search `Kill` → only exact-word matches; no `Will` / `Willie`.
3. Open a result → close → `Kill` + results/filters remain.
4. Reset About preference → modal on eligible visit.
5. Dismiss without checkbox → suppressed ~24h (test via storage/time).
6. “Don’t show this again” → indefinite suppress.
7. `/help` About content matches modal source.
8. Regression: Discover, filters, favorites, details, share, Add to Current Request.

## Open PR

https://github.com/roasted-garlic/freshprints/pull/new/hotfix/prelaunch-catalog-search-count-first-visit-ux  
(base: `production`)
