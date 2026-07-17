# Review: Phase 9C — Fresh Prints Assisted Creation

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-16-phase-9c-assisted-creation-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Owner-locked MVP is clear: no fee, rich multi-step brief (no rights step), one open request, owner/admin mutate with helper read-only, and a real customer proof/revision loop. Approve with implementation constraints so Storage/callables stay least-privilege and the wizard stays maintainable.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Fee/AI out |
| Architecture alignment | pass | New collection + feature module |
| Security impact addressed | pass | Callables; helper read-only |
| Data model impact addressed | pass | Status machine documented |
| Backend impact addressed | pass | Callables + Storage |
| Test strategy adequate | pass | Transitions + validation + manual |
| Human checkpoints identified | pass | Manual QA |
| Roadmap alignment | pass | Phase 9C / TD-027 |
| Documentation plan | pass | |
| No silent scope expansion | pass | |

---

## Required Changes

1. **Proof required for `proof_ready`:** staff cannot move to `proof_ready` without at least one proof asset on the request.
2. **Revision notes required:** customer `revision_requested` requires non-empty note (min length e.g. 3).
3. **Do not client-write Firestore/Storage metadata** — uploads via signed/finalize pattern or Admin-validated callable; prefer mirroring the simplest existing authenticated upload pattern already in Portal.
4. **Wizard implementation:** new `features/assisted-creation/` module; do not overload Etsy recommendation types/validators.
5. **Reuse archived field enums/labels** where they match screenshots; new collection + new status machine (do not revive old `etsy_searching` statuses).
6. Ship Portal card order + Studio tab order in the same implementation pass.

---

## Security Review

**Findings:** Customer PII/brief + reference images are sensitive; staff-wide read for helpers is accepted for ops. Proofs must not be world-readable.

**Human approval needed before production:** yes (later) for rules/functions deploy to prod.

---

## Verdict Rationale

Product answers remove blockers. Constraints keep proofing honest and uploads safe.

---

## Next Step

Implement approved scope on `fresh-prints-dev` path; then automated tests + manual QA checkpoint.
