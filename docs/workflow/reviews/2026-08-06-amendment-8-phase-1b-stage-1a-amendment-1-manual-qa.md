# Owner re-QA — Stage 1a Amendment 1 (categories)

**Environment:** Portal vs `fresh-prints-dev`. Restart or hard-refresh Portal first.

## Retest only

1. Confirm active categories appear.
2. Confirm at least one known inactive (Studio-archived, `isActive: false`) category does **not** appear.  
   If Studio has no archived categories yet, archive an empty unused category first (categories still referenced by designs cannot archive), then re-check Portal.
3. Refresh or restart Portal and confirm the result remains correct.
4. Confirm ordinary Library category filtering still works.
5. Confirm text search, multi-tag filtering, and facets still work.

## Please reply with

- `PASS`
- `FAIL: …`
- `PASS WITH NOTES: …`
