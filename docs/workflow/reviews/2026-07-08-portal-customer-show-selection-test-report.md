# Test Report: Portal Customer Show Selection

| Field | Value |
|-------|-------|
| Date | 2026-07-08 |
| Plan | `docs/workflow/plans/2026-07-08-portal-customer-show-selection-plan.md` |
| Test status | **passed** |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Shared schedule grouping | `npx tsx --test packages/shared/src/utils/showScheduleGrouping.test.ts` | PASS (per implementation session) |
| Portal show capacity | `npx tsx --test packages/shared/src/utils/portalShowQueueCapacity.test.ts` | PASS (per implementation session) |
| Functions validation | `npx tsx --test functions/src/lib/portalShowAllocationValidation.test.ts` | PASS (per implementation session) |
| Targeted suite (implementation) | Combined shared + functions portal tests | PASS, 40/40 (per workflow state) |
| Studio typecheck | `npx tsc --noEmit` | PASS |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | PASS |
| Lint | `npm run lint` | PASS |
| Studio build | `npx vite build` | PASS (prior session) |

## Deploy

| Item | Status |
|------|--------|
| `listPortalAllocatableShows` to `fresh-prints-dev` | **Deployed** (user QA session) |
| `queuePortalPrintRequestToShow` to `fresh-prints-dev` | **Deployed** (user QA session) |

## Manual

| Test | Status |
|------|--------|
| Draft request with items → **Add to show** → calendar → confirm → **Queued** tab | **PASS** (user 2026-07-08) |
| Insufficient capacity: confirm disabled / clear error | **PASS** (user 2026-07-08) |
| Past shows not listed | **PASS** (user 2026-07-08) |
| Request with existing allocation: Add to show hidden | **PASS** (user 2026-07-08) |
| Studio Add to Show still works after shared util move | **PASS** (user 2026-07-08) |
| Portal UX polish (list refresh, tab copy, mobile header, print-run wording) | **PASS** (user 2026-07-08) |

## Notes

- Full repo `npx tsx --test` sweep not re-run at final signoff; targeted suites and user end-to-end QA cover changed areas.
- Commits on `master`: `22230a7`, `51c6cf7`, `4822acf`.
