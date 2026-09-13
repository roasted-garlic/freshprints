# Plan Amendment: WS1 Kickoff — ADR Corrections + Audit Wording

| Field | Value |
|-------|-------|
| Date | 2026-08-28 |
| Parent plan | `docs/workflow/plans/2026-08-28-customer-account-identity-management-and-audit-plan.md` |
| Review | `docs/workflow/reviews/2026-08-28-customer-account-identity-management-and-audit-review.md` |

---

## Owner checkpoints (recorded 2026-08-28)

1. **Hard-delete blocker inventory** — approved (Plan §6 / Appendix A).
2. **Merge ownership map** — approved (Appendix A); WS3 must reverify against source before implement.
3. **Source post-merge policy** — source `customers` doc remains as merge tombstone; exact fields in WS3.
4. **Admin username edit** — retain owner + admin via `updateCustomer`.
5. **Merge sequence counter** — use `max(source, survivor) nextPrintRequestSequence` (reverify in WS3).
6. **Reset username** — deferred.
7. **Hard delete deploy** — DEV-gated initially; production is separate checkpoint.

---

## ADR number correction

`docs/project/DECISIONS.md` already uses **ADR-FP-148** (Portal username self-service) and **ADR-FP-149** (Past show failsafe).

| Original plan label | Correct ADR ID | Topic |
|---------------------|----------------|-------|
| ADR-FP-148 (plan) | **ADR-FP-150** | Reversible customer account disable (WS1) |
| ADR-FP-149 (plan) | **ADR-FP-151** | History-free customer hard delete (WS1) |
| ADR-FP-150 (plan) | **ADR-FP-152** | Customer account merge (WS3 — placeholder in DECISIONS) |

WS2 duplicate username transfer: **ADR-FP-153** (reserved at WS2 planning).

---

## Appendix A audit wording correction

`customerActivityEvents` are **immutable audit evidence / activity history**.

They are **not** lifecycle source-of-truth. Authoritative state remains in canonical domain documents (`customers`, `printRequests`, uploads, etc.).

---

## WS1 authorization

Implement WS1 only: username UX, hard-delete preview/apply (DEV-gated), disable/restore, minimum forensic audit plumbing, shared eligibility foundations.
