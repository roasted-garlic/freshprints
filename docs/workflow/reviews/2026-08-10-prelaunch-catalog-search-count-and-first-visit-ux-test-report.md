# Test Report: Prelaunch catalog search, counts, and first-visit UX

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Branch | `hotfix/prelaunch-catalog-search-count-first-visit-ux` |
| Status | **passed_with_notes** |

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Focused unit tests | `npx tsx --test` (shared exact params, Portal exactToken/narrowedFacets/searchPersistence/about preference, Studio count label/containment/authoritative source) | **pass** (35/35, then 5/5 after count-label correction) |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | **pass** (exit 0) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pass** (exit 0) |
| Lint | `npm run lint` | **pass** (exit 0) |
| Studio Vite build | `npx vite build` in `apps/studio` | **pass** (exit 0) |
| `git diff --check` | | **pass** (exit 0) |
| Portal production build | `npm run build:portal` | **failed_documented** — `EPERM` on `apps/portal/.next/trace` / hang after Next.js start; local lock (likely concurrent Portal process). Portal typecheck passed. Re-run build when `.next` unlocked. |

## Notes

- No Functions/Rules suite required (untouched).
- Portal complete-count: no code change; see portal-count-verification doc.
