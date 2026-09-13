# Test Report: Studio history newest-first + Pocket/Full Size counts (combined final)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Tester | Test Agent |
| Goal | `studio-history-newest-first-ordering` |
| Amendment | `print-request-pocket-fullsize-counts` |
| Plans | `docs/workflow/plans/2026-09-02-studio-history-newest-first-ordering-plan.md`, `docs/workflow/plans/2026-09-02-print-request-pocket-fullsize-counts-amendment-plan.md` |
| Overall | **passed_with_notes** |

---

## Summary

Final combined regression from the closeout working tree: **63/63 PASS** on focused unit/contract suites (History sort, width-only Pocket/Full Size helper + owner fixture, UI/scroll contracts, Show Queue summary fixtures, pricing classifier unchanged). Studio Vite build **PASS**. Studio `tsc --noEmit` has **pre-existing** failures only; goal-scoped `sizeClassRows` fixture gaps fixed before closeout; no new goal-scoped type errors remain.

---

## Commands Run

| Check | Command | Exit Code | Result | Notes |
|-------|---------|-----------|--------|-------|
| Focused unit/contract | `npx tsx --test` (files listed below) | 0 | **pass** | 63/63 |
| Studio typecheck | `npx tsc --noEmit` (from `apps/studio/`) | 2 | **pass_with_notes** | Pre-existing debt; goal files clean after fixture fix |
| Studio Vite build | `npx vite build` (from `apps/studio/`) | 0 | **pass** | renderer + electron bundles |
| Lint | — | — | skip | Not run for this closeout |
| Portal typecheck/build | — | — | skip | Portal unchanged |
| Functions build | — | — | skip | Functions unchanged |
| E2E | — | — | skip | Owner QA covered UI |

### Focused test files

```text
apps/studio/src/renderer/src/features/upcoming-shows/utils/upcomingShowListSort.test.ts
packages/shared/src/utils/printRequestPocketFullSizeCounts.test.ts
apps/studio/src/renderer/src/features/print-requests/utils/printRequestPocketFullSizeCounts.contract.test.ts
apps/studio/src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts
packages/shared/src/utils/gangSheetCustomerSectionSummary.test.ts
packages/shared/src/constants/gangSheetSectionPricingSettings.constants.test.ts
apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.test.ts
```

### Results

| Area | Result |
|------|--------|
| History (`printFinishedAt` DESC, ties, empty/single) | PASS |
| Current / Past / Upcoming wiring contracts | PASS |
| Owner fixture Pocket 10 · Full Size 3 | PASS |
| Width-only / cutoff / qty / eligibility | PASS |
| One-pill + outer-scroll contracts | PASS |
| Pricing both-dim classifier | PASS (unchanged) |
| Show Queue `sizeClassRows` fixtures | PASS (updated) |

---

## Failures (if any)

None in focused suite.

### Studio typecheck (documented)

- **In scope to fix:** only goal-introduced `showQueuePrintRequestSources.test.ts` missing `sizeClassRows` — **fixed** in this closeout.
- **Pre-existing examples (not goal-attributable):** `PrintRequestsPage.tsx:257` (blame 2026-08-30), AI review / customer upload / staff inbox / enhance services / shared recovery test Timestamp stubs, etc.

---

## Manual Testing

| Test | Status | Notes |
|------|--------|-------|
| History ordering Owner QA | **pass** | `2026-09-02-studio-history-newest-first-ordering-owner-qa.md` |
| Pocket/Full Size corrective retest | **pass** | `2026-09-02-print-request-pocket-fullsize-counts-owner-qa-retest.md` |

---

## Signoff Readiness

- [x] Required automated checks pass OR failures documented
- [x] Manual Owner QA complete (both parts PASS)
- [x] Ready for signoff phase

**Next step:** signoff
