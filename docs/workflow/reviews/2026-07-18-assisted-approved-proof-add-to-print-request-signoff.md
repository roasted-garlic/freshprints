# Signoff: Assisted approved proof → Add to Request (Small Managed Items #1)

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-07-18-assisted-approved-proof-add-to-print-request-plan.md |
| Review | docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-review.md |
| Test report | docs/workflow/reviews/2026-07-18-assisted-approved-proof-add-to-print-request-manual-qa.md (owner PASS in chat) |
| Final status | **approved_with_notes** |

---

## Summary

Portal customers can add an approved Assisted Creation proof into Current Request / Stash via **Add to Request** (server-side Storage copy + `customer_upload` attach). Owner confirmed the feature **PASSED** and is working well. Related UX polish delivered in the same slice (Custom source pill, Current Request chrome, live button reset) is treated as covered by that PASS. Unrelated parked work (Portal duplicate insert-before order controls) remains open and is **not** signed off here.

---

## Changes Delivered

### Behavior
- Callable `customerAddAssistedApprovedProofToPrintRequest` copies approved proof into customer-upload storage and attaches a stash line item
- Overview **Approved design** card: Download PNG \| Add to Request; idempotent / Already in request; live reset after remove
- Source badge **Custom** (not Uploaded) for assisted-backed items; header/cart chrome **Current Request**

### Files Created
- `functions/src/customerAddAssistedApprovedProofToPrintRequest.ts` (+ related shared types/helpers as in plan)

### Files Modified
- Portal Assisted Creation detail / Current Request drawer / item card labeling and CTA wiring
- Shared customer-upload / print-request attach patterns as needed for ingest linkage

### Documentation Updated
- Plan, review, human checkpoint, manual QA artifacts under `docs/workflow/`
- DATA_MODEL / BACKEND / DECISIONS updates from implementation phase (assisted ingest fields)

---

## Tests

### Automated
- Implemented and exercised during implementation/test phase (callable + shared validation paths). Exact prior command log retained in workflow artifacts for that phase.

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Assisted approved proof → Add to Request (manual QA checklist) | **PASS** | Owner (2026-07-18): “# is PASSED and working well so far” |
| Custom pill / Current Request labels / button reset | **PASS WITH NOTES** (absorbed into owner PASS for #1 feature broadly) | Owner |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-07-18 | Dev only |
| Database migration | not required | | Optional fields only |
| Design / UX | obtained | 2026-07-18 | Owner PASS |
| Business / policy | obtained | 2026-07-18 | `APPROVE DEFAULTS` earlier same day |
| Secrets / env | not required | | |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Portal duplicate Custom/Uploaded insert-before + optimistic controls | Low (parked separate) | Remains parked; not claimed PASS by this signoff |
| 14-day assisted proof purge | Informational | Already-copied upload assets remain printable (by design) |

---

## Deferred Items (Roadmap)
- Small Managed Items #2 — Update upload caps + Studio Settings live values (**next**)
- Items #3–#10 remain queued
- Parked: Portal duplicate-item order/controls manual QA

---

## Open Blockers
- [x] None

---

## Verdict

**approved_with_notes** — Owner PASS on the Add to Request feature. Notes: related Custom/Current Request chrome treated as covered; unrelated duplicate-order parked workflow explicitly excluded.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` updated if needed (n/a)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated

**Recommended next action for user:** Proceed with Small Managed Items #2 (upload caps + Studio Settings).
