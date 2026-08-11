# Test Report: Prelaunch catalog search, counts, and first-visit UX

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Updated | 2026-08-10 (Portal production build re-run) |
| Branch | `hotfix/prelaunch-catalog-search-count-first-visit-ux` |
| Status | **passed** |

## Commands run

| Check | Command | Result |
|-------|---------|--------|
| Focused unit tests | `npx tsx --test` (shared exact params, Portal exactToken/narrowedFacets/searchPersistence/about preference, Studio count label/containment/authoritative source) | **pass** (35/35, then 5/5 after count-label correction) |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | **pass** (exit 0) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pass** (exit 0) |
| Lint | `npm run lint` | **pass** (exit 0) |
| Studio Vite build | `npx vite build` in `apps/studio` | **pass** (exit 0) |
| `git diff --check` | | **pass** (exit 0) |
| Portal production build (initial) | `npm run build:portal` | **failed_documented** — `EPERM` on `apps/portal/.next/trace` (local lock) |
| Portal production build (re-run) | `npm run build:portal` | **PASS** (exit 0) — after stopping Portal next/dev/build lock holders and removing `apps/portal/.next` |

## Portal build lock resolution (environment only)

Lock owners identified via process command lines (not killed blindly):

- Hung `npm run build:portal` / `next build` processes from earlier agent retries
- Live Portal `next start` (`start-server.js`) and `next dev --port 3100` (+ npm parent scripts)

Stopped those Portal/Next processes only; removed generated `apps/portal/.next`; re-ran build. **No application source changes.**

## Notes

- No Functions/Rules suite required (untouched).
- Portal complete-count: no code change; see portal-count-verification doc.
- Implementation Review remains **approved** (no product diff in this verification pass).
