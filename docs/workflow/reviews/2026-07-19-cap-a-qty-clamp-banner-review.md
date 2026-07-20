# Review: Cap A qty clamp + shorter request-full banner

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-a-qty-clamp-banner-plan.md |
| Status | **approved** |

---

## Summary

Narrow, well-scoped fix. Root cause (reject + rollback to prior qty) matches owner report. Clamp formula is correct; keeping current when room is 0 avoids the snap-to-1 bug. Server + client clamp required. Banner copy change is shared-string only.

## Checklist

- [x] Scope clear and bounded
- [x] Architecture alignment (shared pure + Functions enforce)
- [x] Security impact addressed (no bypass; daily + working max)
- [x] Data model impact none
- [x] Backend impact documented (qty callable deploy)
- [x] Test strategy adequate
- [x] Human checkpoints identified (soft smoke)
- [x] No silent scope expansion

## Required changes before implement

None.

## Notes for implement

- Prefer `Add to a show. Extra prints move to a new request.` for line 2 (shortest).
- Return clamped `quantity` from callable so clients can trust response.
- Do not change Cap B / queue paths.

## Outcome

**approved** — proceed to implement.
