# Review: Cap B overflow = remove-first (rip choose-prints split)

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Reviewer | Agent |
| Plan | docs/workflow/plans/2026-07-19-cap-b-remove-first-no-split-plan.md |
| Verdict | **approved** |

---

## Checklist

- [x] Scope clear and bounded (Option A remove-first; Studio staff split out of scope)
- [x] Architecture alignment (UI gate + server hard reject; no partial Portal path)
- [x] Security: server authoritative; reject `selections` and over Cap B/capacity
- [x] Data model: doc note only
- [x] Backend: callable simplify + `fresh-prints-dev` deploy only
- [x] Test strategy: unit + manual QA
- [x] Human checkpoints: manual QA; no production
- [x] Supersedes Cap B split allotment bug phase (product change, not allotment fix)

## Required changes

None.

## Notes

Owner chose Option A for elderly UX and maintainability. Prior split allotment work is abandoned in favor of tearing out the split path.
