# Manual Test Checkpoint — Amendment 9 P0 re-QA (scroll + P0 budgets)

**Feature / area:** Studio AI Review post-action scroll-to-top + P0 local reconciliation  
**Why automated tests are insufficient:** Electron scroll container + live Firestore + Console vs Debug attribution  
**Environment:** `fresh-prints-dev`, Studio on branch `fix/post-launch-catalog-and-processing-stability` (scroll correction commit)  
**Prerequisites:** Staff account; Firebase Debug enabled; Needs Review queue with ≥3 designs

## Prior result

First owner QA: **FAIL** — next design selected but page stayed scrolled to action buttons; Console ~7.7K reads while client Debug met P0 budgets. P0 not reverted. Server attribution:
`docs/workflow/reviews/2026-08-06-amendment-9-p0-server-read-attribution.md`.

## Scroll steps (primary)

1. Open `/ai-review` Needs Review. Select a design. Scroll the **main page content** (not only the left queue) so the approve/reject buttons are near the bottom of the viewport.
2. Approve (button) → **Expected:** next design selected **and** preview/title area visible without manual scroll-up.
3. Scroll to bottom again. Approve (keyboard if normally used) → **Expected:** same reveal behavior.
4. Scroll to bottom. Reject → **Expected:** next design (or Rejected destination UX) visible from top of review area.
5. On Rejected tab if applicable: scroll to bottom, Archive → **Expected:** review area returns to top for next/empty state.
6. Failed action (optional offline blip) → **Expected:** error shown; page not left in a misleading scrolled-empty state; one bounded recovery reload only.
7. Final design approve → **Expected:** empty/completion state; no reload loop.

## P0 budget regression (still required)

8. With Debug on, approve several designs → **Expected:** no post-action `listDesignsPage` fan-out; no per-action triple `countDesigns`; selection advances; counts look right.
9. Processing small batch → **Expected:** Processing counts still update; **no** unwanted scroll-to-top from background Processing patches alone.

### Pass criteria

- [ ] Approve-from-bottom reveals next design top/preview
- [ ] Reject-from-bottom reveals next design top/preview
- [ ] Archive-from-bottom (if in flow) same
- [ ] Keyboard and button paths match
- [ ] Only one scroll per successful terminal action (no flashing loop)
- [ ] Failed action does not break positioning / false ready
- [ ] Final item empty/completion correct
- [ ] No new list/count reload pattern on success
- [ ] Processing patches do not force scroll-to-top

### Console note (informational)

~7.7K Console reads during the prior 45-image test are attributed primarily to **portal catalog full publications** (~25 in the UTC window, ~28.8K scanned docs across the full window). That is **out of scope for this re-QA scroll pass**. Optional: confirm attribution doc; do not block scroll PASS on implementing P4.

### Please reply with

- `PASS` — scroll + P0 regression criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Do not Signoff until owner replies.** P1/P3/P4/Phase 1B remain not started.
