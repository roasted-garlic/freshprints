# Formal Review: Orientation-Aware Gang-Sheet Shelf Packing Efficiency

| Field | Value |
|---|---|
| Date | 2026-09-24 |
| Managed goal | `gang-sheet-orientation-aware-shelf-packing-efficiency` |
| Verdict | **approved_with_changes** |
| Review scope | Bounded orientation heuristic, exact A/B fixture, landscape/portrait behavior, height caps, cache invalidation |
| Review mode | Read-only; application code and workflow state were not changed |

## Verdict

**Approved with changes.** The direction is safe for the requested narrow change, but implementation
must not begin until the plan gives the heuristic a finite, deterministic contract and corrects the
exact-fixture expectation below.

## Required concrete bounds and rules

1. Define one fixed candidate bound. A safe minimum contract is: compatibility baseline plus an
   orientation-aware beam of at most **8 complete layout candidates per pending row**, with at most
   **4 pending-row items** reconsidered at each expansion and at most **2 expansion passes**. Candidate
   order must be baseline first, then original-input order, then rotated/original alternatives;
   prune by the declared lexicographic score, and never enumerate an unbounded “all-valid” set.
   Alternatively, specify another numeric bound with equivalent deterministic ordering. “Small fixed
   maximum” and “local candidates” are not implementable acceptance criteria.

2. Preserve original stable order explicitly: sort by original height descending, then original input
   index. Orientation must not affect sorting. A candidate is skipped only when both original and
   swapped widths exceed usable width. Every candidate must retain exact IDs and quantity.

3. Score complete layouts, not local rows. Use: fewer skipped copies, lower total artwork feed height
   across sheets, fewer sheets, fewer shelf rows, then fewer rotations; unresolved equality returns
   the compatibility baseline. A candidate may replace baseline only on a strict score improvement.
   This is required to reject landscape rotations that make the completed result worse.

4. For the exact 300-DPI A/B fixture, usable width is 6,750 px and the useful pair width is
   2,805 + 150 + 2,427 = 5,382 px. The tests must assert 15 placements, five A/B pairs, ten rows,
   no overlap/out-of-bounds coordinates, and deterministic IDs/order on repeated runs. They must
   also state the selected orientations: keeping A at 3,900×2,805 and rotating B to 2,427×3,600
   fits and is strictly shorter than rotating both (which makes the pair 3,900 px tall). If the
   intended product rule requires both to rotate, the plan must say so and justify that non-minimal
   choice; the current whole-layout score does not justify it. The corrected ten-row result under
   the lower-height choice is 33,675 px (112.25 in), versus the recorded 42,585 px baseline.

5. Add the explicit landscape-worse case: usable width 850, gutter 150, A 750×500 and B 100×80.
   Baseline artwork height is 500 + 150 + 80 = 730 px; rotating A permits one row but makes it
   750 px tall. Baseline orientation must win, with A unrotated. Also cover two rotations being
   required to fit a pair (600×400 and 600×400, usable 850, gutter 150), so a single-flip shortcut
   cannot pass.

6. Preserve portrait behavior: a lone portrait still rotates when it reduces height; a portrait
   that does not drive row height remains unrotated; squares never report rotation; a lone landscape
   does not rotate merely because swapping is possible. Assert effective rotated dimensions for every
   width bound and no skipped item when only its swapped width fits.

7. Use one finalized row planner for uncapped placement, height-cap peeking, and capped placement.
   Evaluate joining the pending row and starting a new row with resolved dimensions; include the two
   top/bottom margins and each inter-row gutter exactly once. At an exact cap of
   `2 * topBottomMarginPx + resolvedRowHeightPx`, accept the row. Just below that cap, do not emit a
   multi-item over-cap row: fall back to a valid split when possible. Retain the existing exception
   that an unavoidable single row exceeding the cap is emitted rather than dropped. Remove any
   portrait-only cap estimate after the common planner is introduced.

8. Add a shared nesting algorithm version to the cache fingerprint and test that changing only that
   version changes the fingerprint. Verify both the exact-fingerprint lookup and the no-fingerprint
   disk-peek path: an old manifest may be surfaced as stale, but must not be applied as current after
   the algorithm changes. Do not delete existing cache directories.

## Review conclusion

The scope remains appropriately narrow and the existing `placement.rotated` compositor contract can
support it. Proceed after the plan records the numeric search bound, exact candidate ordering and
score, the corrected A/B orientation expectation, finalized cap accounting, and the cache stale-path
assertion. No implementation, commit, push, deploy, or workflow-state change is authorized by this
review.
