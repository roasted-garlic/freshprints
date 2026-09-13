# Test Report: Studio history newest-first ordering

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-09-02-studio-history-newest-first-ordering-plan.md |
| Implementation | session — History `printFinishedAt` DESC sort |
| Overall | **passed_with_notes** (automated) → **pending_manual** (Owner QA) |

---

## Summary

Focused sort unit + page wiring contract tests: **17/17 pass**. Studio full-project `tsc --noEmit` reports pre-existing errors in unrelated files; none in the three goal files. No Functions/rules/index changes. Owner QA required before signoff.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Unit tests | `npx tsx --test apps/studio/src/renderer/src/features/upcoming-shows/utils/upcomingShowListSort.test.ts` | 0 | **pass** | 17 tests, 4 suites |
| Typecheck | `npx tsc -p apps/studio/tsconfig.json --noEmit` | 2 | **pass_with_notes** | Pre-existing errors only; no errors in `upcomingShowListSort.ts`, `.test.ts`, or `UpcomingShowsPage.tsx` |
| Lint | — | — | skip | Not required for this narrow util change |
| Build | `npm run build:studio` | — | skip | Full Electron build not required for client sort; Owner QA via `dev:studio` |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | Manual Owner QA |
| Backend/rules | — | — | skip | No backend changes |

---

## Failures (if any)

None in scope. Full Studio `tsc` failures are pre-existing (pngValidator, customer-upload, staff-inbox unused imports, shared test Timestamp stubs, etc.) and untouched by this goal.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full Studio electron build | Ordering-only client change; verify via unit tests + Owner QA on `dev:studio` |
| Lint | No lint script change required for this scope |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| A History newest-first | pending | Owner QA |
| B Current unchanged | pending | Owner QA |
| C Past Shows regression | pending | Owner QA |
| D Upcoming soonest-first | pending | Owner QA |

Manual test instructions: see Owner QA section in Implementation Review / reply below.

---

## Recommendations

- None for CI beyond existing focused `tsx --test` pattern.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [ ] Manual tests complete OR checkpoint pending ← **pending**
- [ ] Ready for signoff phase ← **no** until Owner QA

**Next step:** manual-test-checkpoint (Owner QA)
