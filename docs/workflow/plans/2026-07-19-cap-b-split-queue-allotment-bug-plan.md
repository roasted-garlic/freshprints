# Plan: Cap B split UI allots 25 but queues entire request (50)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-18-portal-split-print-request-across-shows-plan.md |

---

## Goal

When Cap B (or capacity) forces a partial fit (e.g. 50 prints, allot 25), **Add to show** must queue only the chosen per-item quantities. Remainder stays on the same Continuable / Current Request. Fix the live `fresh-prints-dev` bug where the whole request activates onto the show.

## Background

Owner QA on the parked Cap B split flow: split walkthrough + allotment UI looked correct (25 of 50), but confirming still put **all 50** on the show.

Investigation vs `HEAD` (deployed baseline) and local working tree:

| Layer | Finding |
|-------|---------|
| Portal client (`PortalQueueToShowModal`) | Builds `selections` from split qty inputs after bidding ack and passes them to `queuePortalPrintRequestToShow`. **Not a client drop** of allocations when local UI is running. |
| Shared types / validation | Optional `selections[]` validated (positive ints, item ids). |
| Callable **committed / typical deploy** | Pre-split: **no Cap B**, **no `selections`**, allocates full item qtys, always sets `status: active`, rejects re-queue if any allocation exists. Unknown client fields are ignored → full 50 queues. |
| Callable **local working tree** | Split-aware: respects `selections`, Cap B + capacity on batch total, `status: active` only when remaining unallocated ≤ 0. |

**Root cause:** **Server ignore / stale deploy** — Portal soft-reload serves the new split UI, but `fresh-prints-dev` still runs (or was overwritten by) the pre-split callable that ignores `selections` and has no Cap B. Client is not the drop point.

## Scope

### In Scope
- Confirm client always sends non-empty `selections` on the split path (harden if any gap).
- Ensure server path rejects over-Cap-B / over-capacity batches and applies only selection qtys (local code already does; verify + redeploy).
- Unit tests: 25+25 → queue 25 of design A only (fill-up + remainder + validation).
- Deploy `queuePortalPrintRequestToShow` (+ `listPortalAllocatableShows` if Cap B customer qty needed) to **`fresh-prints-dev` only**.
- Soft-reload Portal; manual re-test steps for owner.

### Out of Scope
- Production deploy
- Studio multi-leg clone flow
- Cap A daily quota changes
- Committing unless owner asks

---

## Affected Areas

### Files / Modules (expected)
- `apps/portal/.../PortalQueueToShowModal.tsx` — harden split submit payload
- `packages/shared/src/utils/printRequestSplitAllocation.ts` (+ tests) — shared fill-up helper + 25+25 scenario
- `functions/src/queuePortalPrintRequestToShow.ts` (+ validation / small resolve helper + tests as needed)
- `functions/src/listPortalAllocatableShows.ts` — Cap B `customerAllocatedQuantity` for fit UI
- Workflow docs / state

### Architecture Impact
- [x] None (finish + redeploy approved split design)

### Security Impact
- [x] Details: Server must enforce Cap B / capacity / selection totals; never trust client alone. Redeploy restores that boundary on dev.

### Data Model Impact
- [x] None new (existing partial allocation + draft-until-fully-queued rules)

### Backend Impact
- [x] Details: Redeploy split-aware callables to `fresh-prints-dev`

### UI / UX Impact
- [x] Details: Behavior fix only; split modal already correct when server matches

### Migration Impact
- [x] None

---

## Approach

1. Harden Portal: on `needsSplit`, require non-empty `selections` before callable; never omit `selections` on that path.
2. Move greedy fill-up into shared util; unit-test **25+25 → 25 of A**; assert remainder after selection.
3. Add/adjust validation or resolve-line unit test covering partial selections vs full-remaining default.
4. Deploy to `fresh-prints-dev`: `queuePortalPrintRequestToShow`, `listPortalAllocatableShows`.
5. Soft-reload Portal; hand owner manual re-test (Cap A 50 / Cap B 25 / two designs × 25).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Unit | `npx tsx --test` on split allocation + queue validation (+ fit if touched) | yes |
| Functions build | via `firebase deploy` predeploy `tsc` | yes |
| Lint / portal typecheck | no unless touched files fail | no |

### Manual
- [x] Details: Cap B 50→25 of design A only; remainder on Current Request; second show for rest

---

## Human Checkpoints Anticipated
- [x] Manual UI/UX verification after deploy (owner)
- [ ] Production deploy — **forbidden**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Later full-functions deploy from HEAD overwrites split callable again | High | Keep local split code until committed; note in signoff; prefer committing soon |
| Requests already wrongly fully activated during bad QA | Low | Owner cleans via Studio / test wipe if needed |

---

## Rollback Plan

Redeploy previous known-good function revisions on `fresh-prints-dev` only (not prod).

---

## Documentation Updates Required
- [ ] Other: workflow plan/review/test/signoff + state; no permanent doc change unless behavior doc drifted

---

## Open Questions
- [x] None — root cause identified

---

## Approval
- Review doc: docs/workflow/reviews/2026-07-19-cap-b-split-queue-allotment-bug-review.md
- Verdict: pending
