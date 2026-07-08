# Review: Phase 8 Slice 3 — Portal Customer Print Requests

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-07-07-phase-8-portal-slice3-print-requests-plan.md` |
| Verdict | **approved** |

---

## Summary

Slice 3 plan is well-scoped, aligns with the approved Phase 8 foundation plan and `DATA_MODEL.md`, and correctly identifies the main technical gate: customers cannot increment `customers.nextPrintRequestSequence` client-side, so a `createPortalPrintRequest` callable is required.

---

## Checklist

| Check | Result |
|-------|--------|
| Scope clear and bounded | Pass — list/create/detail/items + catalog hook; no Slice 4 progress, no payments |
| Architecture alignment | Pass — Portal feature module; shared utils; no Studio/Electron imports |
| Security impact addressed | Pass — ownership via `customers/{id}.userId`, editable status gate, narrow field updates |
| Data model impact | Pass — no schema changes; uses existing entities |
| Backend impact documented | Pass — one callable + rules deploy |
| Test strategy adequate | Pass — automated + manual E2E including cross-customer negative test |
| Human checkpoints identified | Pass — function + rules deploy, mobile QA |
| Roadmap alignment | Pass — Phase 8 Slice 3 per parent plan |
| No silent scope expansion | Pass |

---

## Security Notes

- Ownership helper must use `get(/databases/.../customers/$(data.customerId)).data.userId == request.auth.uid` — do not trust client-supplied customerId without this check.
- Callable must resolve customer by `userId == auth.uid`, not accept arbitrary `customerId` input.
- Block customer writes to `status`, `name`, `requestOrigin`, production item fields.
- Staff rules must remain unchanged; customer rules are additive `||` paths.

---

## Required Changes

None. Proceed to implementation as written.

---

## Open Question Defaults (approved)

| Question | Default |
|----------|---------|
| Add to request UX | Picker when draft requests exist; else create new |
| Sizing on Portal | Design default via `resolveInitialPrintRequestItemSize` only |
| Notes field | Optional on create/detail |

---

## Approval

**approved** — implement Slice 3 per plan.
