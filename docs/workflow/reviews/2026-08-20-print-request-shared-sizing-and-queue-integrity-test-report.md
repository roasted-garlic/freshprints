# Test Report: Print Request shared sizing and queue integrity (including Amendment 1)

| Field | Value |
|-------|-------|
| Date | 2026-08-20 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-plan.md` |
| Amendment 1 | `docs/workflow/plans/2026-08-20-print-request-shared-sizing-and-queue-integrity-amendment-1-plan.md` |
| Implementation | Uncommitted on `development` (this session) |
| Overall | **passed** |

---

## Summary

Automated checks required by the combined plan passed. Owner combined DEV QA **PASS** (2026-08-20). Amendment 2 is included. DEV Functions deploy and production remain later checkpoints. No production data repair was performed.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Shared + Studio + Functions unit | `npx tsx --test` on sizing, aggregates, persistence, queued inches, schedule grouping, finish plan, oversized-init, Functions size assert, contract tests | 0 | pass | 97 focused tests earlier; plus 3 contract tests |
| Functions validation | `npx tsx --test functions/src/lib/queuePortalPrintRequestToShowValidation.test.ts functions/src/lib/assertQueuePrintRequestItemSize.test.ts` | 0 | pass | 12 tests |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass | |
| Studio typecheck | `npx tsc --noEmit` from `apps/studio` | 0 | pass | |
| Functions build | `npm --prefix functions run build` | 0 | pass | |
| Changed-file lint | `npx eslint` on touched TS/TSX files | 0 | pass | After removing an unnecessary `useMemo` dep |
| Portal build | `npm run build:portal` | 0 | pass | Next.js 15.5.20 |
| Studio Vite build | `npx vite build` from `apps/studio` | 0 | pass | Renderer + electron + preload |
| Diff check | `git diff --check` | 0 | pass | LF/CRLF warning on `docs/WORKFLOWS.md` only |
| Full repo `npm run lint` | not run | — | skip | Changed-file eslint used |
| E2E | none configured | — | skip | |
| Rules tests | none expected | — | skip | No Rules change |

---

## Failures (if any)

None in the automated commands above.

---

## Skipped Checks

| Check | Reason |
|-------|--------|
| Full `npm run lint` | Changed-file eslint covered the implementation surface |
| E2E | Not configured for this flow |
| Rules tests | No Rules/index change |

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| Portal Painkiller 14×21.1 persist + Add to Show | PASS | Owner `PASS` 2026-08-20 |
| Studio same sizing/persist/attach/export | PASS | Owner `PASS` 2026-08-20 |
| 250 DPI warning / <200 block / 22″ cap | PASS | Owner `PASS` 2026-08-20 |
| Past + Printing auto-Finish and Mark Complete | PASS | Owner `PASS` 2026-08-20 |

Manual test instructions: see owner QA checklists in both plans (copied below).

---

## Recommendations

- DEV Functions deploy is a later human checkpoint (Portal queue size validation lives in `queuePortalPrintRequestToShow`).
- Existing Show Queue rows with missing/wrong inches are not auto-rewritten.
- Owner combined DEV QA recorded **PASS** 2026-08-20.

---

## Signoff Readiness

- [x] All required automated checks pass OR failures documented
- [x] Manual tests complete OR checkpoint pending
- [x] Ready for signoff phase

**Next step:** signoff

---

## Owner QA checklist (from plans)

### Portal sizing

1. Open the reproduction design.
2. Add it to Current Request.
3. Set width to 14″.
4. Confirm height ≈ 21.1″.
5. Confirm DPI ≈ 308.
6. Confirm no maximum-quality blocker.
7. Navigate away and return; confirm 14″ × 21.1″ persisted.
8. Add the request to a Whatnot show.
9. Open Studio Show Queue / request detail; confirm 14″ × 21.1″.
10. Verify export / gang-sheet uses 14″ × 21.1″.

Also: type a valid larger size and click Add to Show before save completes → must not queue stale inches. Force a failed save → Add to Show stays blocked.

### Studio sizing

Same sizing/persist/attach/Show Queue/export checks for a staff Print Request.

### Warning / hard-block / cap

- ~250 DPI: save allowed, warning shown (both apps)
- Enlarge until <200 DPI: save blocked (both apps)
- Enough pixels to exceed 22″ while still ≥300 DPI: physical cap blocks (both apps)

### Amendment 1 Past + Printing

- A Whatnot show that is Past while still Printing should auto-complete through Finish on Show Queue load/tick, or via **Mark Complete**.
- Upcoming + Printing still shows **Mark finished**.
- Start/Pause/Resume stay blocked on Past.
- Staff Gang Sheets are not auto-completed by this path.

### Amendment 2 Add Designs (Studio)

See Amendment 2 test report QA 1–5. Do not declare the managed goal PASS until those plus the sizing and Past+Printing checks above are recorded.
