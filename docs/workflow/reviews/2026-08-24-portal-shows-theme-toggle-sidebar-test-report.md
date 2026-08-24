# Test Report: Restore Portal theme toggle to sidebar on Upcoming Shows

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-08-24-portal-shows-theme-toggle-sidebar-plan.md |
| Implementation | uncommitted session on `development` |
| Overall | **passed** |

---

## Summary

Automated checks for the chrome helper and Portal typecheck/lint **passed**. Local Next.js `/shows` SSR no longer emits `.portal-chrome` (same as `/catalog`); `/login` still emits the floating toggle. Owner visual QA **PASS**.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Lint | `npx eslint apps/portal/app/providers.tsx apps/portal/features/navigation/components/PortalSidebar.tsx apps/portal/features/navigation/utils/isPortalAppShellRoute.ts apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts` | 0 | pass | Touched files only |
| Unit tests | `npx tsx --test apps/portal/features/navigation/utils/isPortalAppShellRoute.test.ts` | 0 | pass | 3/3 |
| Build | `npm run build:portal` | — | skip | Chrome-only; typecheck sufficient per plan |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | N/A |
| Backend/rules | — | — | skip | N/A |
| Local HTML smoke | `curl http://localhost:3100/shows` and `/login` | 0 | pass | `/shows` `.portal-chrome` count **0**; `/login` has `.portal-chrome` |

---

## Failures (if any)

None.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Portal production build | Plan: UI chrome only; typecheck required |
| Full-repo lint / unit sweep | Out of scope; targeted files linted |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| `/shows` sidebar theme toggle, no top-right toggle | pass | Owner PASS 2026-08-24 |
| `/shows/[showId]` same | pass | Owner PASS |
| `/catalog` unchanged | pass | Owner PASS |
| `/login` floating toggle remains | pass | Owner PASS |

Manual test instructions: `docs/workflow/reviews/2026-08-24-portal-shows-theme-toggle-sidebar-manual-checkpoint.md`

---

## Recommendations

None beyond owner visual PASS, then a follow-up production promote (not this phase).

---

## Signoff Readiness
- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff
