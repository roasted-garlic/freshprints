# Test Report: Studio design full-res download + newest-first sort

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Tester | Test Agent |
| Plan | docs/workflow/plans/2026-07-21-studio-design-download-and-newest-sort-plan.md |
| Implementation | session implement (Design details download + Library `createdAt` desc) |
| Overall | **passed_with_notes** |

---

## Summary

Automated unit tests for Design Library query defaults, merge-sort field behavior, and download guards/filename helpers **passed** (8/8). Touched-file ESLint **passed**. Studio `tsc --noEmit` **blocked by pre-existing** `tsconfig.json` `ignoreDeprecations: "6.0"` with TypeScript 5.x (TS5103) — not introduced by this change. Owner manual Studio UI checkpoint **PASS** 2026-07-21.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Typecheck | `npx tsc --noEmit` (cwd `apps/studio`) | 2 | fail (pre-existing) | `tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.` — TS 5.x vs `"6.0"`; unrelated to this goal |
| Lint | `npx eslint` on touched design files `--max-warnings 0` | 0 | pass | |
| Unit tests | `npx tsx --test` on `designLibraryFilters.test.ts`, `designOriginalDownload.test.ts`, `designListMergeSort.test.ts` | 0 | pass | 8 tests, 0 fail |
| Build | Studio Vite/full build | — | skip | Optional per plan; not required for this UI/helper change |
| Integration | — | — | skip | N/A |
| E2E | — | — | skip | N/A |
| Backend/rules | — | — | skip | Client-only |

---

## Failures (if any)

### Studio typecheck TS5103 (pre-existing)
- **Command:** `npx tsc --noEmit` from `apps/studio`
- **Output excerpt:**
```
tsconfig.json(22,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```
- **In scope to fix:** no
- **Action taken:** Documented; do not expand scope to fix TS toolchain config in this goal

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Studio Vite build | Optional per plan |
| Portal / Functions | Out of scope |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Design Library newest-first (`createdAt`) | **PASS** | Owner 2026-07-21 |
| Details modal Download full-res | **PASS** | Owner 2026-07-21 (covered by same PASS) |
| Purged / missing original | **PASS** | Owner 2026-07-21 (covered by same PASS) |

Manual checkpoint: `docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-manual-checkpoint.md` — **PASS**.

---

## Recommendations
- Separate cleanup: align Studio `typescript` / `ignoreDeprecations` so `tsc --noEmit` works again.

---

## Signoff Readiness
- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff complete — `docs/workflow/reviews/2026-07-21-studio-design-download-and-newest-sort-signoff.md`
