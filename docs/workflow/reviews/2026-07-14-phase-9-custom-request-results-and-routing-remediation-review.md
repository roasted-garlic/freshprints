# Review: Phase 9 Custom Request results UX and routing remediation

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Status | **historical — approved_with_changes** (binding constraints carried into 2026-08-12 Formal Review) |
| Plan (original) | Superseded by `docs/workflow/plans/2026-08-12-phase-9-custom-request-results-and-routing-remediation-plan.md` |
| Current Formal Review | `docs/workflow/reviews/2026-08-12-phase-9-custom-request-results-and-routing-remediation-review.md` |

---

## Binding required changes (retained)

1. Etsy `not_found` recompute with distinct transition reason; never drop prior Etsy from `transitionHistory`.
2. Mark as satisfied allow-list = OPEN statuses **including `reviewing`** + `etsy_referred`.
3. History default = drawer/sheet first.
4. `etsy_referred` UI still shows purchase / upload / satisfied CTAs.
5. Do not break existing reference upload path.
6. Etsy pricing copy = shared constant — not Firestore settings.

Verdict at the time: **approved_with_changes**. Implement only under the 2026-08-12 combined Formal Review after owner approval.
