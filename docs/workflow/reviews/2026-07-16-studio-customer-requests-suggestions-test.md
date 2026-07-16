# Test Report: Studio Customer Requests — suggestion inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Plan | docs/workflow/plans/2026-07-16-studio-customer-requests-suggestions-plan.md |
| Review | docs/workflow/reviews/2026-07-16-studio-customer-requests-suggestions-review.md |
| Status | **partial** — automated checks pass; `fresh-prints-dev` deploy complete; manual QA outstanding |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Functions build | `npm run build` in `functions/` | **pass** (exit 0) |
| Suggestion request validation | `npx tsx --test src/lib/etsySuggestionRequestValidation.test.ts` in `functions/` | **pass** (6/6) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pass** (exit 0) |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | **skipped / blocked** — pre-existing `tsconfig.json` error `TS5103: Invalid value for '--ignoreDeprecations'` (not introduced by this change) |
| Lint | not run | skipped (not required uniquely for this slice) |

---

## Manual (required before signoff)

See human checkpoint below. Deploy callables + rules + indexes to `fresh-prints-dev` before or as part of manual QA.

### Pass criteria
- [ ] Portal Suggest persists; pending shows in Studio Customer Requests → Suggestions
- [ ] Approve adds to live list / Portal pills; Reject removes from queue
- [ ] Duplicate pending submit returns already-pending behavior (no second queue row)
- [ ] Settings no longer shows Etsy suggestion manager
- [ ] AI Design / Fresh Prints Assisted tabs show Coming soon
- [ ] Sidebar Customer Requests enabled

---

## Deploy (`fresh-prints-dev`)

| Target | Result |
|--------|--------|
| `firestore:rules` | deployed |
| `firestore:indexes` | deployed (note: 6 existing project indexes not in file; not force-deleted) |
| `functions:submitEtsySuggestionRequest` | created |
| `functions:approveEtsySuggestionRequest` | created |
| `functions:rejectEtsySuggestionRequest` | created |

Command: `firebase deploy --only firestore:rules,firestore:indexes,functions:submitEtsySuggestionRequest,functions:approveEtsySuggestionRequest,functions:rejectEtsySuggestionRequest --project fresh-prints-dev`

## Notes

- New composite indexes may take a few minutes to become `READY` before Studio pending listen works reliably.
- Deploy only `fresh-prints-dev` (done).
