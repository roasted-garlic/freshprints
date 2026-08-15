# Manual Test Checkpoint: Searchable Studio category picker (DEV QA)

| Field | Value |
|-------|-------|
| Feature / area | Studio searchable Category select (Design edit + AI Review) |
| Why automated tests are insufficient | Keyboard focus, scroll + search coexistence, and modal/portal UX need a real Studio session |
| Environment | Local `npm run dev:studio` against `fresh-prints-dev` |
| Prerequisites | Staff login; taxonomy loaded with multiple categories; at least one design editable in Library and one in AI Review |

### Steps

1. Design Library → open a design → **Edit design** → open **Category**.  
   **Expected:** Search field “Search categories…” at top; full scrollable list when empty; current category shown on trigger.
2. Without typing, scroll and select a category.  
   **Expected:** Selection saves the same category id semantics as before; picker closes.
3. Reopen Category.  
   **Expected:** Full list again (search cleared); selected value still correct.
4. Type a partial query (e.g. `chr`).  
   **Expected:** Immediate local filter (case-insensitive); “No category” only if its label matches.
5. Clear the search.  
   **Expected:** Full list restored.
6. Type nonsense.  
   **Expected:** Quiet “No categories found”; no category created.
7. Keyboard: open, type filter, ArrowDown/Up, Enter, Escape.  
   **Expected:** Focus usable; Enter selects; Escape closes and clears search.
8. AI Review / AI Processing → Final Catalog Information → **Category**.  
   **Expected:** Same searchable behavior as edit modal.
9. Switch designs / inbox items and reopen Category.  
   **Expected:** No leaked search query from the previous design.
10. Design Library browse **filter** Category (not edit).  
    **Expected:** Unchanged non-searchable Select.
11. Edit modal **Placement** Select.  
    **Expected:** Unchanged non-searchable Select.

### Pass criteria

- [ ] Design edit Category searchable + scrollable
- [ ] AI Review Category searchable + scrollable
- [ ] Empty search = full list; clear restores; no-results quiet
- [ ] Selection values unchanged; no taxonomy writes
- [ ] Library filter + Placement remain non-searchable
- [ ] Keyboard usable

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
