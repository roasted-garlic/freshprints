# Owner re-QA — Stage 1a Amendment 3 (Portal category availability)

**Environment:** Portal + Studio vs `fresh-prints-dev`. Hard-refresh Portal (and restart Studio if needed) after pulling the fix commit.

**Product rule:** Portal customer categories = `All categories` + active categories with at least one Rules-ready design (`status == "ready"` and matching `categoryId`). Active empty categories stay visible in Studio Category Management only.

## Reduced checklist

1. Confirm an active category with zero ready designs (e.g. **Occasions**) is **absent** from the Portal Library category dropdown.
2. Confirm a category that has ready designs **is present**.
3. Confirm **All categories** remains present.
4. Confirm Studio Category Management still displays active empty categories (staff).
5. Approve or move a ready design into the previously empty category → refocus or refresh Portal → confirm the category **appears**.
6. Move/archive that ready design so the category has zero ready designs again → refocus or refresh Portal → confirm the category **disappears**.
7. Confirm ordinary category filtering still works on Library.
8. Confirm Discover category naming / `?category=` behavior still works.
9. Confirm share-page category naming still works.
10. Confirm search, multi-tag filtering, and tag facets still work.
11. Confirm no duplicate or missing ordinary ready designs in Library browse.

## Please reply with

- `PASS`
- `FAIL: …`
- `PASS WITH NOTES: …`

## Owner reply (recorded)

**PASS** — 2026-08-06

Signoff: `docs/workflow/reviews/2026-08-06-amendment-8-phase-1b-stage-1a-amendment-3-signoff.md`
