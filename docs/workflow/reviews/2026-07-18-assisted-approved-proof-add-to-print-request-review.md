# Review: Assisted approved proof → Current Request / Stash

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-18-assisted-approved-proof-add-to-print-request-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly scopes backlog #1: bridge time-boxed assisted proofs into Stash via a server-side Storage copy and existing `customer_upload` attach patterns. Architecture and security approach are sound. Implementation is **blocked until the owner confirms the recommended product defaults** (or provides alternate decisions).

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Single Portal flow; no catalog promote; no production |
| Architecture alignment | pass | Callable orchestration; UI → service → callable |
| Security impact addressed | pass | Owner-only; validate status/proof; no secrets |
| Data model impact addressed | pass | Optional audit fields; reuse `customer_upload` sourceType |
| Backend impact addressed | pass | One new callable; no new env secrets |
| Test strategy adequate | pass | Unit + typecheck/lint + manual QA after dev deploy |
| Human checkpoints identified | pass | Product defaults + manual UI + APPROVE DEV DEPLOY |
| Roadmap alignment | pass | Small Managed Items #1 |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS |
| No silent scope expansion | pass | Explicit out-of-scope list |

---

## Architecture Review

**Findings:**
- Reusing `confirmCustomerUploadsAndAttachToRequest` patterns + `resolveOrCreateWorkingPrintRequestInTransaction` is the right layering.
- Avoiding a new `sourceType` keeps Studio/Portal print/export paths simpler.
- Must probe image dimensions on ingest (proofs lack `widthPx`/`heightPx` today).

**Required changes:**
- [ ] None architectural — implement only after product defaults confirmed

---

## Security Review

**Findings:**
- Callable must enforce Portal customer role + ownership of assisted request.
- Storage copy must land under customer-owned upload paths with existing rules expectations.
- Do not return Storage paths of other users; fail closed if object missing.

**Required changes:**
- [ ] None beyond plan

**Human approval needed before production:**
- [x] Any production Function deploy (out of scope for this phase)

---

## Data Model Review

**Findings:**
- Optional `assistedCreationRequestId` / `assistedProofId` on uploads is sufficient for audit + idempotency.
- Document that assisted purge does not delete already-copied upload assets.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Respect assisted proof max byte limits during copy.
- Idempotency must be transactional against working request items.

**Required changes:**
- [ ] None

---

## Testing Review

**Findings:**
- Manual QA is mandatory (UI + show-queue behavior for upload-backed items).
- Unit-test eligibility and idempotency helpers.

**Required changes:**
- [ ] None

---

## Documentation Review

**Findings:**
- Plan lists the right docs. Update ROADMAP row status on signoff.

---

## Required Changes (if approved_with_changes)

1. **Before any application code:** obtain owner confirmation of the plan’s **Recommended product defaults** table (or explicit alternate decisions). Record answers in workflow state Decision Log and amend the plan if defaults change.
2. Prefer CTA label **“Add to request”** unless owner picks Stash/Current Request wording.
3. Do **not** support adding to past/terminal print requests in v1 (working request only).

---

## Blockers (if blocked)

(none — review is conditional on human product confirm, not a plan rewrite)

---

## Verdict Rationale

Scope, security, and reuse strategy are solid. Product path (stash vs catalog, size/qty, storage copy) changes behavior enough that human confirmation is required by `human-checkpoints.mdc` before implement. Defaults in the plan are acceptable to implement **once approved**.

---

## Next Step

Human checkpoint: confirm product defaults → then Implement phase for #1 only.
