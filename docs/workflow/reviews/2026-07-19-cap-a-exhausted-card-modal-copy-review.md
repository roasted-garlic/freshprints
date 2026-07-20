# Review: Cap A exhausted card/modal copy (status only)

**Date:** 2026-07-19  
**Plan:** `docs/workflow/plans/2026-07-19-cap-a-exhausted-card-modal-copy-plan.md`  
**Status:** approved

## Verdict

Approved. Narrow UI copy split is product-directed and low risk: cards/modals status-only; page banner/drawer keep helper. No backend or quota-logic changes.

## Notes

- Prefer shared `formatCapAExhaustedStatusLine()` for display consistency.
- Do not remove banner/drawer helper lines.
- Manual soft-reload QA after implement; no commit required.
