# Implementation Review — `preproduction-static-analysis-cleanup`

**Scope:** independent review of the final diff for this goal (Codex's prior-session
implementation plus this session's two corrections), verifying it satisfies the Formal
Review's three binding conditions and the Plan's baseline classification (A–H) without
hiding any diagnostic or weakening strictness/lint policy.

## Verdict: APPROVED

All required checklist items pass, independently re-verified against the actual source
(not against either agent's own claims).

## Files reviewed

Every file in Plan sections A–H (see
`docs/workflow/plans/2026-07-29-preproduction-static-analysis-cleanup-plan.md`), plus the
new helper/test files the implementation introduced:

- `apps/studio/src/renderer/src/features/upcoming-shows/hooks/useShowQueuePrintRequests.ts` (new)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/showQueuePrintRequestSources.ts` (+test, new)
- `apps/studio/src/renderer/src/features/upcoming-shows/utils/gangSheetCacheRefresh.ts` (+test, new)
- `apps/portal/features/print-requests/utils/addDesignRuntime.ts` (+test, new)
- `apps/portal/features/print-requests/utils/flushTimerOwnership.ts` (+test, new)
- `apps/portal/features/customer-uploads/utils/uploadSessionRows.ts` (+test, new)
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadRefreshAction.ts` (+test, new)
- `functions/src/lib/lazySharp.ts` (new)
- `functions/src/lib/lazySharpDeployDiscovery.test.ts` (new, added this session)
- `packages/shared/src/utils/assistedCreationAnswerDisplay.test.ts` (corrected this session)
- `apps/studio/src/renderer/src/features/print-requests/utils/splitDesignPickerItemPresentation.ts` (+test, new)
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadPurgeTimestamp.ts` (new)
- `apps/studio/src/renderer/src/features/designs/utils/designOriginalDownloadGuard.ts` (new)

## Findings

1. **Both primary gates — PASS.** `npm run build:studio` exits `0` (tsc + vite + electron-builder).
   `npm run lint` exits `0` with `--max-warnings 0`, meaning genuinely zero errors and zero
   warnings across the entire repository, not just the 41 originally-reproduced findings.
2. **Binding requirement 1 (Show Queue bounded read) — PASS.** Traced the full chain:
   `UpcomingShowsPage` → `useShowQueuePrintRequests(attachedRequestIds)` → three bounded
   `usePrintRequests` calls (`"working"`, `"queued"`, `"printing"`) → merged/deduped by ID →
   `hasMore`/`loadMore` surfaced in the UI. `ensureRequestsLoaded` covers allocation-attached
   requests outside the current page. No single-tab literal was substituted for the former
   unbounded read; no cast or suppression was used to force the type through. 23/23 tests pass,
   including the specific "keeps incomplete cross-classification candidates and excludes printed
   or attached requests" case the Review's boundedness condition required.
3. **Binding requirement 2 (lazy `sharp` proof) — PASS, gap closed this session.** Verified by
   direct inspection that Codex's `lazySharp.ts` correctly uses `createRequire(__filename)` (not a
   static import) with a module-level cache, and that all three consumer files were switched to
   it. Confirmed no test existed proving this at deploy-discovery time before this session; added
   `lazySharpDeployDiscovery.test.ts`, which requires the **compiled** `functions/lib/` output
   (matching what Firebase's real deploy discovery loads) and proves zero `sharp` cache entries
   after requiring the compiled index, then non-zero entries and instance-identity reuse only
   after `getSharp()` is called. 2/2 new tests pass; 31/31 pass in the full Functions focused-test
   run with no cache-order interference from other test files.
4. **Binding requirement 3 (hook closure ledger) — PASS.** All 10 reported warnings map to a
   documented root cause, a stable-identity or ref-based correction (never a mechanical dependency
   append, never a re-added suppression), and a passing deterministic test. Verified this
   personally file-by-file rather than trusting the test report summary — see the ledger table in
   the accompanying test report. No reduced owner QA checkpoint was needed.
5. **No blanket suppression or unsafe escape hatch — PASS.** Full-diff grep for
   `@ts-ignore`, `@ts-expect-error`, newly added `eslint-disable`, `: any`, and `as any` across
   `apps/portal`, `apps/studio`, `functions`, and `packages/shared` found exactly two
   `eslint-disable-next-line react-hooks/exhaustive-deps` additions — both in files entirely
   outside this goal's Plan-listed scope (`CatalogPageContent.tsx`'s generated-catalog card
   resolution and `useShowProductionTimer.ts`'s reconciliation retry logic), both pre-existing
   dirty-worktree content from other in-flight goals that this goal correctly left untouched. The
   sole `eslint-disable` **removed** by this goal was the old `UpcomingShowsPage` gang-sheet
   suppression, which is now unnecessary because of the destructured stable-callback pattern.
6. **Optional/discriminated data handled truthfully — PASS.** Verified
   `usePrintRequestSelectionMode.ts` uses `isCatalogDesignPrintRequestItem` to skip (not fabricate)
   upload-backed items; `printRequestQueryPlanning.ts`'s `getPrintRequestItemSummaryIdentity` keys
   catalog vs. upload items by source with a safe `item:${id}` fallback, never a cast;
   `DesignDetailsModal.tsx` fails closed via `canStartDesignOriginalDownload` when `design` is
   nullable; `userAuditTrailActivityService.ts` replaced the invalid
   map/filter/type-predicate chain with explicit typed accumulation, preserving the null-drop and
   newest-first-sort semantics with an equivalent (not weaker) behavior.
7. **Invalid Next-rule directives — PASS.** Confirmed zero remaining `no-img-element` disable
   comments in all 7 Plan-listed files; no `@next/eslint-plugin-next` was added; no `<img>` was
   converted to `next/image`.
8. **Stale test fixture found and corrected — PASS (after fix).** Independently ran the full Group
   A–C focused suite before trusting any prior claim and found 1 failure in
   `assistedCreationAnswerDisplay.test.ts`: the fixture's enum literals had been updated
   (`quote_text` → `phrase_or_saying`, `flexible_wording` → `need_help_with_wording`) but the
   assertion regexes (`/quote|text/i`, `/flexible/i`) still targeted the old values' semantics,
   so the test silently asserted against a label the code could never produce for the new input.
   This is exactly the "stale test fixtures changed so assertions no longer test their original
   policy" risk the Plan's own risk table flagged. Fixed both regexes to `/phrase|saying/i` and
   `/need help/i`, preserving the original intent (prove the selected enum's label renders
   through) rather than loosening the assertion. Re-run: 8/8 pass.
9. **Full verification matrix — PASS.** Portal typecheck (`0`), Portal production build (`0`,
   webpack cache-restore warnings are benign and unrelated to code correctness), Functions build
   (`0`), changed-file lint on both files touched this session (`0`, after fixing a
   `require()`-vs-`import` violation introduced by this session's own new test file), and
   `git diff --check` (`0`).
10. **No unrelated scope drift — PASS.** Confirmed via `git status` that every file this review
    attributes to the goal is either a Plan-listed path or a clearly-derived helper/test file for
    one of those paths. The two pre-existing unrelated `exhaustive-deps` suppressions (finding 5)
    and the large unrelated dirty-worktree footprint (Portal auth/catalog/print-request services,
    Studio ai-review/designs/customers modules, etc.) were confirmed as belonging to other,
    already-in-flight goals and were not modified, reformatted, or reverted by this implementation.

## Residual Risk

None blocking. The two `eslint-disable-next-line react-hooks/exhaustive-deps` additions in
`CatalogPageContent.tsx` and `useShowProductionTimer.ts` are pre-existing, out-of-scope content
from other goals — they are noted here only so a future reviewer does not mistake them for this
goal's output.

## Recommendation

Proceed to signoff. No further implementation work is required for this goal's approved scope.
