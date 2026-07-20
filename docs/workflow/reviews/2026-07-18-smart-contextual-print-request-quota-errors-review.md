# Review: Smart contextual print-request quota errors + Cap A create gate

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-smart-contextual-print-request-quota-errors-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly turns Cap A exhaustion from a misleading “come back tomorrow” dead-end into situation-aware next steps (Add to show / split vs midnight only when the stash is empty). The hard gate on create + add when remaining is 0 matches anti-flood intent without blocking queue/split or refunds. Structured `details.code` plus Portal context is the right split of enforcement vs UX.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Copy + codes + create/add gate; no Cap rule changes; no production |
| Architecture alignment | pass | Shared copy helpers; Portal maps context; services preserve callable details |
| Security impact addressed | pass | Server Cap A charge + create gate remain authoritative; client disable UX-only |
| Data model impact addressed | pass | No schema change |
| Backend impact addressed | pass | Codes on Cap A/B/capacity; create gate; soft deploy `fresh-prints-dev` |
| Test strategy adequate | pass | Unit matrix + owner manual QA scenarios |
| Human checkpoints identified | pass | Owner manual QA; no production |
| Roadmap alignment | pass | Polish on ADR-FP-096 / split UX |
| Documentation plan | pass | BACKEND + DECISIONS + QA artifacts |
| No silent scope expansion | pass | Queue/split behavior already shipped; this phase is messaging + gates |

---

## Architecture Review

**Findings:**
- Situation resolver in shared utils keeps Portal components thin and unit-testable.
- Preserving Firebase `details` in `portalPrintRequestService` (instead of always collapsing to bare `Error(message)`) is required for durable code mapping; do not regress message fallbacks for unrelated callables.
- Heuristic `used > workingPrintCount` for A1 vs A2 is acceptable: both push “add to show”; misclassification is low-harm.

**Required changes:**
- [x] When Cap A remaining is 0, disable **qty up / duplicate / add** only. Qty down, remove, clear, and Add to show must stay enabled.
- [x] Expose Cap A remaining (and ideally `used`/`limit`) via print-request context or a single shared hook so catalog / upload / assisted / stash controls do not each invent quota fetches.

---

## Security Review

**Findings:**
- Create gate must run server-side on `createPortalPrintRequest` and on the **create branch** of `resolveOrCreateWorkingPrintRequest` (or equivalent callers). Client-only disable is insufficient.
- Do not accept client-supplied “situation” for enforcement.
- `details` payload should stay non-PII (`code`, `limit`, `cap`, maybe `remaining`).

**Required changes:**
- [x] Extend `failedPrecondition` to accept optional `details` (mirror `resourceExhausted`) so Cap B / capacity codes are first-class.

**Human approval needed before production:**
- [x] Production deploy (out of scope)

---

## Data Model Review

**Findings:**
- No persisted field changes. Cap A counter semantics unchanged (charge on add, refund on remove/qty-down/clear; queue does not refund).

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Cap A reject today has no `details.code`; adding `DAILY_PRINT_LIMIT` unblocks Portal mapping without brittle string matching.
- Cap B / capacity already have decent strings; codes make future mapping stable.
- Create when remaining === 0 currently allowed; blocking empty working-request creation closes a real UX hole (create then immediate add fail).

**Required changes:**
- [x] Deploy list for `fresh-prints-dev` must include every callable that can create a working request or charge Cap A, plus `queuePortalPrintRequestToShow` (for Cap B/capacity codes). Minimum: `createPortalPrintRequest`, `addPortalCatalogDesignToPrintRequest`, `updatePortalPrintRequestItemQuantity`, `duplicatePortalPrintRequestItem`, `confirmCustomerUploadsAndAttachToRequest`, `customerAddAssistedApprovedProofToPrintRequest`, `queuePortalPrintRequestToShow` (and any other Cap A charge entry points that import the shared charge helper if separately deployed).
- [x] Server default Cap A message stays **A3-safe** (midnight). Portal must rewrite to A1/A2 when stash context says so.

---

## Testing Review

**Findings:**
- Unit tests must lock A1/A2/A3/B1 strings (no em dashes, no Cap jargon, live numbers).
- Manual QA matrix in the plan matches the owner’s reported bug and the 50/25 split world.

**Required changes:**
- [x] Manual QA doc must include: A1 full stash not queued; A2 25 queued + 25 left; A3 empty + Cap A 0; B1 Cap B full; refund re-enables Add.

---

## Documentation Review

**Findings:**
- BACKEND error-code table + short DECISIONS ADR are enough; avoid duplicating the full matrix into DATA_MODEL.

---

## Required Changes (if approved_with_changes)

1. Qty-down / remove / queue remain enabled at Cap A 0; only add/create/qty-up/duplicate disable.
2. Single shared Portal source for Cap A remaining (context or hook) for all disable gates.
3. Extend `failedPrecondition(..., details?)`; attach codes on Cap B / capacity.
4. Deploy all Cap A charge + create + queue callables listed above to `fresh-prints-dev`.
5. Server Cap A fallback message A3-safe; Portal situational rewrite for toasts/helpers.

Implement may follow these without re-plan unless product intent changes.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

Approved with implement-time constraints that tighten UX safety (don’t brick qty-down/queue), error plumbing (`failedPrecondition` details), and deploy completeness. Product matrix and hard gate match owner intent; scope stays reversible and `fresh-prints-dev`-only.

---

## Next Step

Implement approved scope (with required changes above) → Test → owner manual QA → Signoff.
