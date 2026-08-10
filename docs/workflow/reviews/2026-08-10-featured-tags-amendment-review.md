# Review: Featured Tags amendment

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Plan | `docs/workflow/plans/2026-08-10-featured-tags-amendment-plan.md` |
| Status | **approved** |

## Summary

Amendment correctly extends the prelaunch shipment before promote. `isFeatured` on Firestore `tags` matches preferred shape; keeping Algolia unchanged is correct. Composite index for `status` + `isFeatured` is justified by public read rules. Portal must reuse existing tag selection state (no second filter system).

## Required changes before implement

None.

## Notes for implementer

- Rules `hasOnly` must include optional `isFeatured`; do not require it in `hasAll`.
- Prefer storing `isFeatured: true` when featured and omit/`false` when not — both valid if Rules accept optional bool.
- Do not regress tag aliases / preferredWhen / archive.
- Update production promotion plan after DEV work so Featured Tags is in the shipment matrix.
- DEV-only Rules/indexes deploy; **no prod**.

## Verdict

**approved** — proceed to implement on `fresh-prints-dev` only; stop for owner DEV QA.
