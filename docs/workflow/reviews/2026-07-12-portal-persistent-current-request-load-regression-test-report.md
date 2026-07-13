# Test Report: Portal Persistent Current Request (load regression remediation)

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Goal | `portal-persistent-current-request` |
| Status | **passed_with_notes** — load regression fixed; await owner manual retest |

---

## Root cause

1. **Circular module import:** `PortalPrintRequestContext.tsx` imported `CurrentRequestDrawer`, which imports `usePortalPrintRequests` from the same context module. That cycle can leave the drawer component undefined and crash authenticated Portal shell render.
2. **Corrupt Next.js `.next` cache:** An earlier `catalog.css` syntax error, then a concurrent `next build` while `next dev` was running, produced runtime failures (`SegmentViewNode` / `__webpack_modules__[moduleId] is not a function` / missing chunks). Clearing `.next` and restarting `next dev` alone was required.

## Files changed

- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx` — removed drawer import/render
- `apps/portal/features/navigation/components/PortalAppShell.tsx` — mount `CurrentRequestDrawer` here
- `apps/portal/features/print-requests/hooks/useWorkingCurrentRequestItems.ts` — safe `createdAt.toMillis`
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts` — safe `createdAt.toMillis`
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.boundary.test.ts` — regression test

## Commands / results

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Boundary + unit | `npx tsx --test …boundary.test.ts …currentRequestAggregates.test.ts …portalOneWorking… …resolveAddDesign…` | 0 | **15/15 pass** |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| Portal lint | `npx eslint "apps/portal/**/*.{ts,tsx}" --max-warnings 0` | 0 | pass |
| Portal build | `npm run build:portal` | 0 | pass (run **before** final clean restart; do not build while dev runs) |
| HTTP smoke (after clean restart) | GET `/`, `/login`, `/catalog`, `/catalog/library`, `/requests`, `/requests/artwork` | — | all **200**, no error body |

## Confirmed working URL

**http://localhost:3100** (and routes above)

## Manual

Restored checkpoint: `docs/workflow/reviews/2026-07-12-portal-persistent-current-request-manual-checkpoint.md`
