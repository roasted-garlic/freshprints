# Review: Pre-final A–G corrective package (plan) — F3 clear

| Field | Value |
|-------|-------|
| Date | 2026-08-11 (A–G Formal Review after F3 owner decision) |
| Reviewer | Review Agent (independent Formal Review) |
| Plan | docs/workflow/plans/2026-08-11-prefinal-portal-search-and-global-og-corrective-plan.md |
| Production tip verified | `913329caefa5cf5041b269da1e5192424d0b95c6` |
| Verdict | **approved_with_changes** |

---

## Summary

Owner F3 decisions clear the prior F blocker: Upload Artwork stays Cap L (no retained-upload quota); Donate displayed day allowance refunds only after successful hard delete of an eligible charged donation; Portal customers get a confirmed self-delete path that **reuses** existing deletion eligibility/blockers; concurrency/size/batch protections stay. A–E and G remain sound. Package may implement only after the approval phrase below, treating all binding constraints as mandatory.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | F3 recorded; Cap L vs donate day separated |
| Architecture alignment | pass | Reuse deletion eligibility; Admin SDK writes |
| Security impact addressed | pass | Own-upload only; blockers retained; no Rules relaxation |
| Data model / migration | pass | No backfill; day counter decrement only |
| Backend impact documented | pass | Functions + Portal |
| Test strategy adequate | pass | F3 cases + prior A–G |
| Human checkpoints | pass | Deploy gates; Studio FAQ for G |
| No silent scope expansion | pass | No F2 retained quota; no checkout |
| Documentation plan | pass | |
| FreshForge | n/a | Product app |

---

## Workstream F challenge (clearance)

| Concern | Finding | Disposition |
|---------|---------|-------------|
| Quota drift | F3 decrements day counter only on successful hard delete | pass |
| Client-only refunds | Forbidden — server TX with doc delete | **required** |
| Double refunds | Doc delete + single decrement; already_done no-op | **required** |
| Concurrent ops | Transactional delete/decrement | **required** |
| Delete failure / Storage partial | Doc retained → no refund | pass (existing contract) |
| Print Request refs | Existing blockers unchanged | pass |
| Promoted designs | Existing blockers unchanged | pass |
| Donate vs Upload | Cap L untouched; only donation day refunds | pass |
| Exclude/restore | Must not refund | **required** |
| Legacy | No backfill | pass |
| Processing abuse | Day recycle accepted under F3; keep concurrency/size/batch | pass with residual note |
| Portal self-delete weaker than Studio | Must reuse same eligibility + Storage-first | **required** |
| Staff path stale after Studio delete | Same refund helper on Studio delete | **required** |
| Cap L regression | No new retained quota; Cap L math unchanged | **required** |
| Unnecessary migration | None | pass |

**F verdict:** **cleared** under F3 with constraints below.

---

## A–E + G

Prior dispositions stand (A–D constraints 1–8; E 9–12; G 18–20). E allocation `onCreate` + one-way de-allocation remain binding.

---

## Required Changes (binding implement constraints)

### A–D
1. Studio Algolia helper parity for `prefixLast`.
2. Deterministic stale-`q` vs newer local input test for B.
3. Category/`syncLibraryUrl` + URL effect regression case for B.
4. Static Image: persist resolved asset reference (+ optional designId provenance).
5. Explicit Storage Rules deploy gate if new upload path.
6. Invalidate/bust Function **and** Portal Global OG caches after Save.
7. Align Portal brand default strings with owner-approved copy.
8. Primary post-Save verification = Function JSON first.

### E
9. Donate confirm still sets `pending_staff_review`; print-request attach/assisted must not.
10. Review transition only after successful show allocation / queue; idempotent; server-only.
11. Portal queue TX **and** allocation `onCreate` (or equivalent) for Studio allocate coverage.
12. No Rules relaxation; no migration; one-way review on de-allocation.

### F3
13. Cap L unchanged — no retained-upload product quota.
14. On successful hard delete of charged `catalog_donation`, decrement today’s `finalizeImageCountDonation` once in the authoritative delete path (Portal **and** Studio); never on blocked/failed/Exclude/Restore.
15. Portal customer self-delete: own uploads only; confirmed UX; **reuse** existing blockers + Storage-first / retain-on-Storage-failure contract; do not weaken eligibility.
16. Immediate Donate quota UI refresh after authoritative delete success.
17. Keep concurrency, file-size, batch, and other non-day anti-abuse limits intact.

### G
18. Replace About shared “Browsing the catalog…” concept with owner-approved submit≠order/charge / Whatnot purchase wording.
19. Single `PortalHelpAboutPanel` source for `/help` + first-visit; keep Whatnot follow CTA; no Portal checkout.
20. Update bundled FAQ `what-is-print-request`; checkpoint live Studio FAQ if customized.

---

## Blockers
None for planning. Implement only after owner phrase.

---

## Final PR / deployment split

| PR | Contents | Deploy |
|----|----------|--------|
| **PR-Portal** | A + B + G | App Hosting |
| **PR-OG** | C + D | Functions (± Storage Rules) + App Hosting |
| **PR-Intake** | E | Functions |
| **PR-Quota** | F3 (Portal self-delete UI + Functions delete/refund) | Functions + App Hosting |

Prefer one coordinated **Functions** production wave for C+D+E+F after merges. Never hide Functions inside App Hosting-only rollout.

---

## Verdict Rationale

F3 maps cleanly onto Cap L (already correct) + donation day-counter refund + Portal self-delete with shared safety. Residual day-recycle abuse is explicitly accepted and mitigated by retaining non-day limits. Package **approved_with_changes**.

---

## Next Step

Owner replies:

`APPROVE IMPLEMENT: PREFINAL A-G CORRECTIVES`
