# Review: Staff-controlled text censoring amendment

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-10-staff-text-censoring-amendment-plan.md` |
| Verdict | **approved** |

---

## Checklist

- [x] Scope clear and bounded (display-only text mask; DEV first)
- [x] Architecture alignment (shared util; Portal presentation; raw data unchanged)
- [x] Security impact addressed (staff write; presentation-only; Rules type/size)
- [x] Data model + no migration noted
- [x] Backend: Rules only; Algolia explicitly out
- [x] Test strategy covers owner cases 1–17
- [x] Human checkpoints identified
- [x] No silent scope expansion vs image censor / prod

## Required changes before implement

None.

## Notes for implement

- Prefer `packages/shared/src/utils/maskCensoredDesignText.ts`.
- Extend `catalogMetadataOnlyUpdate` hasOnly with `censoredTerms` (expression-budget safe).
- Gate Portal mask on same `showExplicitContent` preference as images.
- Do not strip `censoredTerms` when `isExplicitContent` becomes false.

## Verdict

**approved** — proceed to implement on `fresh-prints-dev` only; stop for owner QA.
