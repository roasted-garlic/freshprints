# Plan: Cap B one request ↔ one show + auto-create remainder

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-19-cap-b-one-request-per-show-remainder-review.md |

---

## Goal

When Cap B or show capacity cannot take an entire Portal print request, customers **choose** which prints go on the selected show. Those prints finalize **this** request onto **that show only**. Leftover quantity is **moved onto a new working print request** (same customer). Portal lands on the remainder request and prompts Add to show. **Never** leave one request spanning two shows.

## Background

- Owner rejects same-request multi-show remainder: print request identity/counter is tied to a show → **one request ↔ one show**.
- Prior approaches superseded: (1) partial allocate + keep remainder on same draft request; (2) remove-first only (edit request down before queue).
- Authoritative example: Cap B = 25; request has 25+25; user chooses 12 of A + 13 of B for show 1 → request 1 fully on show 1; system creates request 2 with remaining 13+12; guide Add to show for request 2.
- Cap A already charged on add; queue / remainder create must **not** re-charge Cap A.
- Cap B still enforced per show; bidding ack still required.

## Product model (updated)

| Rule | Behavior |
|------|----------|
| One request ↔ one show | After queue, request is `active` and fully allocated to that show only |
| Cap B / capacity overflow | Choose prints ≤ fit; remainder → **new** working request |
| Working request size | Max prints on Current Request = **Cap A** (daily budget), not Cap B — so 50→25+25 is possible; Cap B enforced at queue |
| Cap A | Unchanged charge/refund on add/remove; no charge on remainder move |

Supersedes: remove-first-only queue gate; same-request Continuable remainder; per-request max = Cap B (foolproof phase).

## Scope

### In Scope

1. Shared pure helper + tests: given remaining lines + selections + fit budget → queue lines + remainder lines (50→25 case).
2. `queuePortalPrintRequestToShow`: accept `selections`; allocate only selected; activate request 1; create request 2 with leftover items/qty (copy/move; no Cap A charge); return `remainderPrintRequestId` + qty.
3. Reject queuing a second show onto a request that already has allocations (one show only).
4. Portal Add to show: overflow → choose-prints (reuse shared clamp/fill helpers + existing CSS); bidding ack; on success with remainder → navigate to request 2 + clear copy.
5. Working-request max uses Cap A setting instead of Cap B.
6. Docs: DATA_MODEL / BACKEND / DECISIONS light notes.
7. Deploy Functions to `fresh-prints-dev`; soft-reload Portal; manual QA checklist. No production.

### Out of Scope

- Production deploy; Studio staff split UX changes; Cap A formula changes; multi-show single transaction for two shows.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/` — remainder split helper + Cap B overflow copy; working-request max comments/copy if Cap A-based
- `packages/shared/src/types/portal/queuePortalPrintRequestToShow.types.ts`
- `functions/src/queuePortalPrintRequestToShow.ts` + validation + tests
- `functions/src/lib/printRequestWorkingRequestMax.ts` + add callables using Cap A as max
- `apps/portal/.../PortalQueueToShowModal.tsx` + split qty picker component
- `apps/portal/.../PrintRequestDetailView.tsx` — navigate to remainder
- Docs listed above

### Architecture Impact

- [x] Details: Queue callable owns atomic finalize + remainder create; Portal navigates from response.

### Security Impact

- [x] Details: Server validates ownership, selections ≤ remaining, batch ≤ Cap B + capacity; Admin SDK create remainder; no Cap A client authority.

### Data Model Impact

- [x] Details: No new collections. Status: Portal queue always leaves source request fully allocated + `active` when successful. New draft request for leftovers. One-working-request invariant: only remainder is Continuable after split.

### Backend Impact

- [x] Details: Callable request/response shape; deploy to fresh-prints-dev.

### UI / UX Impact

- [x] Details: Choose-prints on overflow; post-split land on remainder with guidance copy. Manual QA required.

### Migration Impact

- [x] None required. Legacy half-queued Continuable requests (if any): fail closed on re-queue to a second show; optional follow-up cleanup out of scope.

---

## Approach

1. Pure `planPortalCapBRemainderSplit({ items, selections, fitBudget })` → queueLines + remainderLines; unit test 50→25.
2. Validation: optional `selections`; when omitted and full remaining fits → full queue (no remainder). When overflow without selections → reject. When selections → total must be > 0 and ≤ fit.
3. Transaction: no existing non-canceled allocations on request; write allocations; shrink/delete R1 items for leftovers; create R2 + items; set R1 `active`; bidding ack; return remainder id.
4. Portal: fit plan → if overflow, open choose-prints capped at `fittingQuantity`; ack → queue with selections → if `remainderPrintRequestId`, `router.push` + banner.
5. Point `assertWorkingRequestAllowsPrintAdds` max at Cap A (`dailyDesignsAddedToRequestsLimit`).
6. Deploy + manual QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `node --test` on shared remainder helper + validation | yes |
| Typecheck | functions / portal as practical | yes (scoped) |
| Deploy | `firebase deploy --only functions:queuePortalPrintRequestToShow,...` to fresh-prints-dev | yes |

### Manual

- Cap B 25; build 25+25; choose 12+13 for show 1; confirm R1 on show 1 only; land on R2 with remainder; Add R2 to show 2.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Portal soft-reload QA)
- [ ] Production deploy — forbidden this phase

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| One-working-request race during create | med | Create R2 in same txn after R1 → active |
| Cap A double-charge on remainder | high | Move/copy items without daily limit charge |
| Confused UX after split | med | Navigate to R2 + explicit copy |
| Per-request max = Cap A allows large carts | low | Cap B still gates each show; auto-split |

---

## Rollback Plan

Redeploy previous `queuePortalPrintRequestToShow` revision on fresh-prints-dev; Portal soft-reload.

---

## Documentation Updates Required

- [x] DATA_MODEL.md (Portal Cap B note)
- [x] BACKEND.md (callable behavior)
- [x] DECISIONS.md (ADR short: one request per show + auto remainder)
- [x] ROADMAP.md (Cap B status line)

---

## Open Questions

- [x] None — owner decision is authoritative

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-19-cap-b-one-request-per-show-remainder-review.md
- Verdict: pending
