# Plan: Interleave Duplicate Copies So Rotation Isn't Blocked by Same-Design Adjacency

**Date:** 2026-07-06
**Status:** Draft — awaiting review

## Problem

User compared our gang sheet export against a reference builder using the
same 8 images (4 distinct designs, 2 copies each). The reference builder
achieved a shorter sheet by pairing **different** designs of matching height
into rotation-friendly rows, rather than defaulting to pairing two copies of
the *same* design. Our nesting algorithm's rotation logic
(`resolveRowRotations` in `shared/utils/gangSheetNesting.ts`) already
correctly handles "can these boxes in this row rotate together without
exceeding sheet width" — that part works. The gap is upstream: **which
boxes end up candidates for the same row in the first place.**

Root cause: `exportGangSheetPng.ts` builds the flat list of per-copy boxes by
iterating `request.images` (one entry per distinct design/allocation) and,
for each, pushing all `quantity` copies **consecutively** before moving to
the next design. `nestBoxesIntoShelves`/`WithHeightCap` then sort this list
tallest-first using `Array.sort`, which is a *stable* sort — equal-height
entries keep their original relative order. Since duplicate copies of one
design are already adjacent going in, they stay adjacent after sorting too,
so the greedy row-fill always tries pairing same-design duplicates first and
never gets a chance to try a different-design pairing that might rotate-fit
better.

## Decision (confirmed with user)

Fix the input ordering, not the packing/rotation logic itself: before
handing the flat box list to the nesting functions, interleave duplicate
copies round-robin across designs (design A copy 1, design B copy 1, design
C copy 1, design D copy 1, design A copy 2, ...) instead of grouping each
design's copies together. This preserves the existing, already-tested
stable-sort-plus-greedy-row-fill shape entirely unchanged — it only feeds it
an input order where same-height ties naturally alternate between different
designs before repeating a design, giving the packer the same opportunity
the reference builder took.

## Scope

### In scope

- `electron/services/export/exportGangSheetPng.ts`: after building the
  per-design/per-copy list (or in place of the current nested-loop push),
  interleave copies round-robin across `request.images` groups instead of
  fully emitting one design's copies before the next.
- A small new pure helper (in `shared/utils/gangSheetNesting.ts` or a
  sibling shared util) that takes groups of same-design items and returns
  them round-robin-interleaved, so the reordering logic is unit-testable in
  isolation from the download/resize side effects in
  `exportGangSheetPng.ts`.

### Out of scope

- Any change to `resolveRowRotations`, the greedy row-fill width/fit checks,
  or the height-cap peek — all already correct and tested.
- Any change to sort order for *different-height* boxes — tallest-first
  ordering across distinct heights is unaffected; this only changes
  tie-breaking among equal-height entries.
- Deduplicating or otherwise changing which/how many copies get placed —
  purely a reordering of the existing flat list before it reaches nesting.

## Technical Approach

1. Add `interleaveGroups<T>(groups: T[][]): T[]` (or similarly named) pure
   helper: given an array of arrays (each inner array = one design's
   ordered copies), returns a single flat array visiting index 0 of every
   group first, then index 1 of every group, etc., skipping groups once
   exhausted. Order of groups themselves follows their input order
   (i.e. the order `request.images` was provided in), so behavior stays
   deterministic and easy to reason about.
2. In `exportGangSheetPng.ts`, restructure the box-building loop: instead of
   pushing all of one design's resized copies into `resizedImages`
   immediately, collect each design's copies into its own group (still
   downloading/resizing exactly once per design, as today — only the
   *placement* ordering changes, not the download/warning logic), then run
   `interleaveGroups` once across all groups before nesting.
3. No changes needed to `gangSheetNesting.ts` itself, since its sort is
   already stable and its rotation/fit logic is height- and width-based, not
   identity-based — it will automatically benefit once fed a better-ordered
   input.

## Files Touched (expected)

- `shared/utils/gangSheetNesting.ts` (new `interleaveGroups` helper) + test
- `electron/services/export/exportGangSheetPng.ts` (group copies per design,
  interleave before nesting)

## Verification Plan

- `npx tsc --noEmit`, `npm run lint`, `npx vite build`, full `npx tsx --test`
  repo sweep.
- New unit tests for `interleaveGroups`: equal-size groups fully interleave;
  unequal-size groups gracefully skip exhausted groups while continuing to
  interleave the rest; single group returns unchanged; empty input returns
  empty.
- Manual QA: re-run the exact 8-image (4 designs x 2 copies) export from the
  user's comparison and confirm the resulting sheet height is now
  comparable to the reference builder's, with same-height duplicate copies
  no longer forced to pair with themselves when a different-design pairing
  would rotate-fit better.
