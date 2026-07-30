# Signoff: Pre-Production Static-Analysis Cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-review.md` — `approved_with_changes` |
| Test report | `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-test-report.md` — `passed` |
| Implementation Review | `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-implementation-review.md` — `APPROVED` |
| Owner QA | Not required — every behavior-sensitive hook warning had deterministic automated coverage |
| Final status | **approved** |

---

## Summary

Resolved the pre-production static-analysis baseline deferred from
`portal-print-request-prelaunch-stability`: all 29 reproduced Studio/shared TypeScript diagnostics
and all 41 reproduced lint findings (31 errors, 10 warnings) are fixed, with `npm run build:studio`
and `npm run lint` both exiting `0`. No product behavior, architecture boundary, Firebase Rule,
dependency, or configuration changed.

The implementation spanned two sessions. The first (Codex) resolved the full diagnostic/lint
inventory, including source-level fixes for all three Formal Review binding conditions:

- a bounded Show Queue read (`useShowQueuePrintRequests`, reading Working/Queued/Printing tabs and
  merging by request ID, replacing what would otherwise have been an unbounded or arbitrarily
  narrowed read);
- a shared lazy `sharp` loader (`functions/src/lib/lazySharp.ts`, `createRequire`-based, not a
  static import); and
- stable-ref/destructure-based fixes for all 10 React hook dependency warnings, each with a focused
  test.

The second session (this one) independently re-verified every claim against the actual source rather
than trusting prior work, and closed two verification gaps before signing off:

1. Added `functions/src/lib/lazySharpDeployDiscovery.test.ts` — binding requirement 2 required
   discovery-time proof that native `sharp` never loads during Firebase's deploy-discovery `require`
   pass; no such test previously existed. The new test runs against the **compiled** Functions output
   and proves zero `sharp` cache entries after requiring the compiled index, non-zero entries only
   after `getSharp()` is first called, and instance-identity reuse on a second call.
2. Corrected two stale assertion regexes in `assistedCreationAnswerDisplay.test.ts` that still
   targeted a *removed* enum literal's semantics (`quote_text`, `flexible_wording`) after the fixture
   had already been updated to current valid values (`phrase_or_saying`,
   `need_help_with_wording`) — the test was silently asserting against label text the code could
   never produce for its own input.

An independent Implementation Review against the real final diff (not either agent's claims)
returned **APPROVED** with no residual defects.

---

## Changes Delivered

### Behavior

None. This is a static-analysis/type/lint correction goal; all fixes are behavior-preserving by
design and were verified as such (bounded-read regression tests, closure/ownership tests, lazy-load
discovery proof, control-character boundary tests unchanged).

### Files Created (new, this goal)

- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts`
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` (+ test)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/gangSheetCacheRefresh.ts` (+ test)
- `apps/portal/features/print-requests/utils/addDesignRuntime.ts` (+ test)
- `apps/portal/features/print-requests/utils/flushTimerOwnership.ts` (+ test)
- `apps/portal/features/customer-uploads/utils/uploadSessionRows.ts` (+ test)
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadRefreshAction.ts` (+ test)
- `apps/studio/src/renderer/src/features/print-requests/utils/splitDesignPickerItemPresentation.ts` (+ test)
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadPurgeTimestamp.ts`
- `apps/studio/src/renderer/src/features/designs/utils/designOriginalDownloadGuard.ts`
- `functions/src/lib/lazySharp.ts`
- `functions/src/lib/lazySharpDeployDiscovery.test.ts` (this session)
- `docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md`
- `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-review.md`
- `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-test-report.md`
- `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-implementation-review.md`
- `docs/workflow/reviews/2026-07-29-preproduction-static-analysis-cleanup-signoff.md` (this file)

### Files Modified

All Plan-listed Studio/shared TypeScript files (sections A–C), all Plan-listed lint-driven files
(sections D–H) — see the Plan's Baseline Classification for the itemized list, and the test report
for tracking status. Also corrected this session:
`packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts`.

### Documentation Updated

- `docs/project/ROADMAP.md` — goal #8 marked Done.
- `.cursor/workflow/state.md` — `DONE: yes`, `Signoff Status`, `Last Completed Step`, Goal Order.
- `references/project-chatgpt-handoff/CURRENT-STATE.md` — signoff entry added.

---

## Tests

### Automated

| Command | Exit | Result |
|---------|------|--------|
| `npm run build:studio` | 0 | `tsc` + `vite build` (renderer, Electron main, preload) + `electron-builder` package all succeeded |
| `npm run lint` | 0 | 0 errors, 0 warnings (`--max-warnings 0`) |
| `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |
| `npm run build:portal` | 0 | pass (benign webpack pack-cache warnings only) |
| `npm run build --prefix functions` | 0 | pass |
| Changed-file lint (this session's 2 files) | 0 | pass (after fixing a `require()`-vs-`import` violation introduced by the new discovery test, resolved via `createRequire`) |
| `git diff --check` | 0 | pass |
| Focused behavior tests (`npx tsx --test`, full combined run) | 0 | **101/101 pass**, 0 fail |

Full detail, including the per-warning hook-closure ledger for all 10 React hook diagnostics and the
binding-requirement-by-binding-requirement evidence, is in the test report.

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| Owner QA checkpoint | N/A — not required | Determined by Test phase: every behavior-sensitive hook warning had deterministic automated coverage per the Plan's conditional-QA criteria |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | N/A | | No deployment in scope or performed |
| Database migration | N/A | | None |
| Design / UX | N/A | | No UI/UX change |
| Business / policy | N/A | | None |
| Secrets / env | N/A | | None |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Two pre-existing `eslint-disable-next-line react-hooks/exhaustive-deps` additions found in the full diff during independent review | None (out of scope) | Confirmed both belong to unrelated in-flight goals (`CatalogPageContent.tsx` generated-catalog card resolution; `useShowProductionTimer.ts` reconciliation retry) and were correctly left untouched by this goal — noted so a future reviewer does not misattribute them |

---

## Deferred Items (Roadmap)

None created by this goal. Pre-existing queued goals continue unaffected — see next section.

---

## Open Blockers

- [x] None

---

## Verdict

**approved.** Both primary gates (`npm run build:studio`, `npm run lint`) exit `0`. All required
secondary gates and 101/101 focused tests pass. Independent Implementation Review found no residual
defect. No product behavior, architecture, dependency, configuration, Firebase Rules, or production
change occurred. No deployment was performed or required.

---

## Workflow Complete

- [x] `.cursor/workflow/state.md` updated with `DONE: yes` (for this goal)
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed — not needed; no new persistent product risk
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/03-roadmap-and-phases.md` updated
- [ ] Other handoff files per `references/project-chatgpt-handoff/MANIFEST.md` — not needed; no
  behavior/architecture change

**Recommended next action for user:** Start the next queued managed goal,
`customer-upload-oversized-image-normalization-and-processing-performance`, or direct otherwise. See
the Goal Order note in `.cursor/workflow/state.md` and `ROADMAP.md` for the full current queue — two
items the user separately referenced (a custom-request reference-image MB-limit increase, and
`catalog-image-derivative-storage-consolidation`) do not currently appear in any repository queue
record and would need to be explicitly added before being treated as scheduled.
