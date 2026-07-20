# Plan: Portal split print request across shows (Cap B + capacity)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-18-portal-split-print-request-across-shows-review.md |

---

## Goal

When a Portal customer’s Current Request cannot fully fit on the selected show because of **Cap B** (max qty per show per customer) and/or **show remaining capacity**, offer a clear **split**: queue up to the allowed amount to this show; leave the remainder on the **same working (Current) Request** for another show later. Server enforces Cap B, capacity, and partial selections. No production deploy.

## Background

- Cap A (daily prints) and Cap B (per-show customer allotment) exist. Cap A is charged on add-to-request; queue/split does not re-charge Cap A.
- Today `queuePortalPrintRequestToShow` is all-or-nothing: Cap B or capacity overflow hard-rejects; any existing allocation blocks re-queue; status flips to `active` on first queue (drops Continuable / Current Request).
- Owner primary acceptance: Cap A = **50**, Cap B = **25**, request has **50** prints → queue **25** to show A, keep **25** on Current Request for show B.
- **Studio is reference only**, not a clone requirement. Prefer clearest Portal UX over multi-leg Studio staging/picker polish.

## Scope

### In Scope

1. Shared pure helpers: effective fit = min(request remaining, Cap B remaining on show, show capacity remaining); portal-facing split warning copy (no em dashes; no staff override).
2. Extend `queuePortalPrintRequestToShow` to accept optional per-item `selections` (partial qty); enforce Cap B + capacity on selection total; allow additional queue when unallocated remainder exists; set `status: active` only when fully allocated; keep `draft`/`editing` while remainder remains.
3. `listPortalAllocatableShows`: include `customerAllocatedQuantity` per show for Cap B remaining UI.
4. Portal Add to show modal:
   - If full remaining fits → existing full-queue path + bidding ack.
   - If partial fit (>0) → warning + quantity choice (simple per-design qty or “fill up to N”) → bidding ack → queue that portion → stay on / refresh Current Request with remainder.
   - If fit = 0 (show full or Cap B exhausted) → pick another show (no empty split).
5. Detail: `canQueueToShow` when unallocated remainder remains (not only when zero allocations).
6. After **partial** queue: do **not** `resetWorkingCart` / clear Stash; only clear when fully queued.
7. Unit tests for fit helpers + validation; Functions deploy to `fresh-prints-dev`; Portal soft-reload; manual QA checklist.
8. Docs: BACKEND / DATA_MODEL / DECISIONS / ROADMAP / WORKFLOWS as needed.

### Out of Scope

- Production deploy; staff override; Cap A changes; Studio UI changes; multi-show single-transaction commit; cloning Studio `SplitDesignPickerModal` / leg staging unless reuse is clearly cheaper than a simpler Portal control.

---

## Studio reference (not parity checklist)

| Topic | Studio | Portal target |
|-------|--------|---------------|
| Overflow | Capacity (+ override) | Cap B **and** capacity; no override |
| UX | Multi-leg session + thumbnail picker | One show at a time; remainder stays on Current Request |
| Status | `active` on first allocate | `active` only when fully allocated |
| Ack | N/A | Bidding ack per Add to show confirm |

Reuse shared `planAllocationSplit`, `printRequestSplitAllocation` clamp/totals where helpful; do not force Studio modal flow.

---

## Primary acceptance scenario

Settings: Cap A = 50, Cap B = 25. Customer has one Current Request totaling **50** prints (any mix of lines).

1. Open Add to show, pick show A (plenty of show capacity).
2. See that only **25** can go on this show (Cap B); choose which prints/qty (total ≤ 25).
3. Confirm bidding ack → **25** allocated to show A.
4. Request stays **draft/editing**; Current Request / Stash still shows the request with **25** unallocated.
5. Add to show again → show B → queue remaining **25**.
6. Request becomes **active**; leaves Continuable / Current Request.

Also: show capacity smaller than Cap B uses the same path with the tighter limit.

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/` — portal show-fit + copy helpers + tests
- `packages/shared/src/types/portal/` — queue request selections; list shows `customerAllocatedQuantity`
- `functions/src/queuePortalPrintRequestToShow.ts` + validation + tests
- `functions/src/listPortalAllocatableShows.ts`
- `apps/portal/.../PortalQueueToShowModal.tsx` (+ small split qty UI component)
- `apps/portal/.../PrintRequestDetailView.tsx` — `canQueueToShow` + partial vs full `onQueued`
- Docs listed above

### Architecture Impact

- [x] Details: Portal queue callable becomes partial-allocation aware; Continuable status stays until fully queued.

### Security Impact

- [x] Details: Server validates selections vs remaining unallocated qty, Cap B, show capacity, ownership; no client-only trust.

### Data Model Impact

- [x] Details: No new collections. Same `showAllocations` with `allocatedQuantity` ≤ item qty across shows. Status transition rule change for Portal queue only.

### Backend Impact

- [x] Details: Callable request shape + list shows field; deploy to fresh-prints-dev.

### UI / UX Impact

- [x] Details: Split warning + qty selection; bidding ack unchanged per confirm; button language Add to show / Current Request.

### Migration Impact

- [x] None (forward-compatible optional `selections`; omit = full remaining like today when fits).

---

## Approach

1. Add `planPortalShowQueueFit({ requestedQuantity, showRemainingCapacity?, capBRemaining })` and portal warning copy.
2. Validation: optional `selections: { printRequestItemId, quantity }[]`; if omitted, treat as full remaining per item.
3. Rewrite queue callable allocation loop for remaining-aware partials; Cap B/capacity on batch; status active iff no remainder.
4. List shows: sum customer’s non-canceled allocations per show → `customerAllocatedQuantity`.
5. Portal modal: compute fit; branch full / split / zero; simple qty UI capped by fit; ack; queue; callback distinguishes partial vs complete.
6. Detail: queue when `unallocatedQty > 0` and continuable; only reset cart on complete queue.
7. Tests + deploy + manual QA.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (shared fit + copy) | `node --test` on new/updated shared tests | yes |
| Unit (validation) | Functions validation tests | yes |
| Typecheck portal/functions as feasible | package scripts | yes if available |
| Lint | if quick | no |

### Manual

- Cap B primary: 50 vs 25 (above).
- Show capacity tighter than Cap B.
- Full fit still one-shot.
- Fit 0: no split, choose another show.
- Bidding ack each queue confirm.
- No em dashes in new copy.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner QA)
- [ ] Production deploy
- [ ] Database migration

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Partial queue leaves request editable while some qty already on a show | Medium | Document; Cap B still enforced; qty edits on items with allocations need care — prefer locking qty down only if existing callables already do; otherwise note follow-up |
| List tab shows partially queued under Queued while still Continuable | Low | Acceptable; Current Request still works via draft status |
| Race on Cap B between two tabs | Medium | Transaction re-check Cap B + capacity |

---

## Rollback Plan

Redeploy previous `queuePortalPrintRequestToShow` / `listPortalAllocatableShows`; Portal UI falls back to reject-on-overflow if old callable (or hide split UI behind fit check that never offers if server lacks selections — prefer deploy both together).

---

## Documentation Updates Required

- [x] BACKEND.md
- [x] DATA_MODEL.md (Portal queue partial + status rule)
- [x] DECISIONS.md (ADR)
- [x] ROADMAP.md (note under caps / Portal)
- [x] WORKFLOWS.md (brief Portal split)

---

## Open Questions

- [x] None — owner clarified Cap B example and Studio = reference only.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-portal-split-print-request-across-shows-review.md
- Verdict: pending
