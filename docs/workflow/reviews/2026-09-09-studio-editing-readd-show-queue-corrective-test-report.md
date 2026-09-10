# Test Report — Studio Editing → Re-add Show Queue Corrective

Date: 2026-09-09
Goal: `user-info-print-request-lifecycle-activity-ordering`
Corrective: `studio-editing-readd-show-queue-permissions-corrective`

## Phase 0 Rules fixtures

Command:

```text
firebase emulators:exec --only firestore "npx tsx --test tests/firebase/showQueueAllocation.rules.test.ts"
```

Result: **PASS** — 23 tests passed, 0 failed. The fixtures cover status-only activation, the
Studio-shaped activation after a realistic post-unqueue document, activation after a trusted mirror
advance, client mirror tampering denial, and the existing multi-write allocation sequence.

## Corrective contract tests

Command:

```text
npx tsx --test functions/src/allocateStudioPrintRequestToShow.test.ts functions/src/queuePortalPrintRequestToShow.test.ts
```

Result: **PASS** — 10 tests passed, 0 failed. The new four-test contract covers atomic multi-show
plans, invalid/partial input rejection before Admin writes, and complete split-leg aggregation;
the six Portal queue invariants remain green.

Studio source contracts:
`npx tsx --test apps/studio/src/renderer/src/features/print-requests/components/AddToShowModal.staffGangSheet.contract.test.ts apps/studio/src/renderer/src/features/upcoming-shows/services/upcomingShowService.staffGangSheet.contract.test.ts`
— **PASS**, 12/12. This confirms the modal submits the trusted callable once, rejects incomplete
plans, and wires failure reconciliation while preserving existing Staff Gang Sheet guards.

## Full Rules suite

Command: `npm run test:rules`
Result: **PASS** — 174 tests across 22 suites (174 passed, 0 failed, 0 cancelled, 0 skipped).
The shell-local Microsoft OpenJDK `25.0.4.1` and Firebase CLI `15.26.0` were used; Java environment
changes were process-local only.

## Build and static checks

* `npm --prefix functions run build` — **PASS**.
* Targeted ESLint over the changed Add to Show modal, Print Requests page, Upcoming Shows page, and
  Studio upcoming-show service — **PASS**.
* `npx tsc -p apps/studio/tsconfig.json --noEmit` — **existing baseline failures remain** in
  unrelated PNG upscale typing, Firestore trace metadata, Staff Inbox unused symbols, and shared
  test fixtures. No error was reported for the changed callable integration files after the patch.

## Portal and UI verification

The Portal callable source was inspected and its Admin transaction was not changed. Studio Add to
Show now submits one atomic callable plan; on either failure or success the request, allocations,
totals, and queue-tab views are reloaded. Manual DEV Portal/Studio QA and any live repair remain
after the separately gated deployment.

## Deployment inventory

No deployment, publish, Rules release, index update, backfill, production action, commit, or push
occurred in this implementation checkpoint.
