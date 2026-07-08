# Review: Show Calendar Picker (Studio + Portal-ready)

| Field | Value |
|-------|-------|
| Date | 2026-07-07 |
| Plan | `docs/workflow/plans/2026-07-07-show-calendar-picker-plan.md` |
| Verdict | **approved** |

## Summary

Approved. Scope is narrow (picker UX only), reuses existing capacity display logic, and correctly defers Portal wiring while shipping a shared `@fresh-prints/show-picker` package for future customer show selection.

## Security

No auth, rules, or data changes. Allocation guards for past shows remain in service layer.

## Architecture

Shared package with domain-agnostic props is the right split for Studio + Portal. Calendar math in `@fresh-prints/shared` keeps tests framework-free.

## Required before signoff

- Manual QA of Add to Show calendar on Studio
- Automated checks per plan

## Conditions

None — proceed to implementation.
