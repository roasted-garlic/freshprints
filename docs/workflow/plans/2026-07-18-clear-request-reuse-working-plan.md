# Plan: Clear request reuses working print request

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-18-rapid-add-working-request-race-plan.md; ADR-FP-079; ADR-FP-071 |

---

## Goal

After Portal **Clear request**, the same open Current Request (`draft` / `editing`) stays open with zero items. The next **Add to Request** attaches to that existing id and must **not** call `createPortalPrintRequest`.

## Background

Owner report: create → clear → add creates a **whole new** print request. Product rule: only create when there is truly no open working request for the customer.

### Root cause

1. `clearPortalWorkingPrintRequest` deletes items **and** sets `status: "archived"` (ADR-FP-079 §4).
2. Archived requests leave `continuableRequests`, so `workingRequest` becomes `null`.
3. Client `clearWorkingRequest` then calls `resetWorkingCart()`, which also clears `ensuredWorkingRequestIdRef` / pending create mutex cache.
4. Next Add → `ensureWorkingPrintRequestId` sees no working id → create path → second print request.

This is intentional archive-on-clear behavior, not a mutex race. Owner now wants cart-style clear (empty + reuse), amending ADR-FP-079.

---

## Scope

### In Scope

- Change `clearPortalWorkingPrintRequest` to delete items, set `itemCount: 0`, keep `status` as `draft` or `editing` (do not archive).
- Keep Cap A refund behavior for removed item quantities.
- Adjust Portal `clearWorkingRequest` so it clears local items **without** dropping the ensured working-request id cache (preserve rapid-add mutex).
- Portal print request **detail page** item list: sort most recent → least recent via `sortWorkingCurrentRequestItems` (same as Current Request drawer). Keep drawer sort as-is.
- Update types/docs (BACKEND, DATA_MODEL, SECURITY note, DECISIONS amend).
- Deploy callable to `fresh-prints-dev` only; soft-reload Portal.

### Out of Scope

- Production Functions deploy
- Changing `archiveStaleWorkingPrintRequests` (14-day empty auto-archive stays)
- Queue-to-show / `resetWorkingCart` after queue (still must clear working cart)
- Studio Working triage UI
- Creating a second concurrent draft (create still blocked by existing server rule)

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/clearPortalWorkingPrintRequest.ts`
- `apps/portal/features/print-requests/context/PortalPrintRequestContext.tsx`
- `apps/portal/features/print-requests/services/portalPrintRequestService.ts`
- `apps/portal/features/print-requests/hooks/usePrintRequestDetail.ts`
- `docs/architecture/BACKEND.md`
- `docs/architecture/DATA_MODEL.md`
- `docs/standards/SECURITY.md` (behavior note only)
- `docs/project/DECISIONS.md` (amend ADR-FP-079 or short ADR)

### Architecture Impact

- [x] Details: Callable semantics change (clear ≠ archive). Client ensure/reuse path unchanged except clear must not wipe cache for the still-open id.

### Security Impact

- [x] Details: Still Admin SDK callable; ownership + draft/editing + no active allocation checks unchanged. Status no longer transitions to `archived` on customer clear.

### Data Model Impact

- [x] Details: Clear no longer writes `archived`. Empty open carts remain `draft`/`editing` with `itemCount: 0` until queued or stale-archived by owner tool.

### Backend Impact

- [x] Details: Deploy `clearPortalWorkingPrintRequest` to `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: After clear, Stash stays “open empty” (same request). Next add reuses it. Manual QA required.

### Migration Impact

- [x] None (forward-compatible). Already-archived clears from prior behavior stay archived; no backfill.

---

## Approach

1. **Callable:** On clear, delete all `printRequestItems` for the id; update request with `itemCount: 0`, `updatedAt`/`updatedBy`; **omit** `status: "archived"`. Return `status` as the preserved `draft` | `editing`. Keep Cap A refund transaction.
2. **Portal service:** Widen response type (`status: 'draft' | 'editing'`).
3. **Context `clearWorkingRequest`:** After successful callable, clear local items (`patchWorkingItems` / items reset) but **keep** `ensuredWorkingRequestIdRef` set to that id; then silent reload list + items for that id. Do **not** call full `resetWorkingCart()` (that is for queue-to-show / leave-working-set).
4. **Docs:** Amend ADR-FP-079 §4; update BACKEND/DATA_MODEL/SECURITY wording.
5. **Deploy + soft-reload** on `fresh-prints-dev`; leave rapid-add mutex intact.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Lint | targeted if noisy | no (optional) |
| Unit tests | none specific unless added | no |

### Manual

- [ ] Create request with ≥1 design → Clear → confirm same request id still Current Request / empty Stash
- [ ] Add again → same print request id (no new doc)
- [ ] Rapid double-add still single create when truly empty (mutex)
- [ ] Queue-to-show still clears working cart and allows a new request afterward

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (clear → add reuse)
- [x] Business logic decision — **owner already directed**: reuse after clear (this plan)
- [ ] Production deploy — out of scope
- [ ] Other: Functions deploy to **dev only** (agent may deploy `fresh-prints-dev`)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Studio Working fills with empty carts again | Medium | Existing `archiveStaleWorkingPrintRequests` + Empty triage chip; document amend |
| Client still clears ensure cache → create during list lag | Medium | Keep ensured id across clear; reload with explicit printRequestId |
| Prod still archives until deployed | Low | Dev-only deploy this phase; note prod follow-up |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Redeploy previous `clearPortalWorkingPrintRequest` (archive-on-clear) to `fresh-prints-dev`; revert Portal clear path to call `resetWorkingCart` if needed.

---

## Documentation Updates Required

- [x] DATA_MODEL.md
- [x] BACKEND.md
- [x] SECURITY.md (callable behavior note)
- [x] DECISIONS.md (amend ADR-FP-079)
- [ ] Other: workflow plan/review/test/signoff

---

## Open Questions

- [x] None — owner specified reuse-after-clear

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-18-clear-request-reuse-working-review.md
- Verdict: pending
