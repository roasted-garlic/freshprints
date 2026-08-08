# Owner re-QA — Stage 1a Amendment 2 (category archive persist)

**Environment:** Studio + Portal vs `fresh-prints-dev`. Restart Studio and hard-refresh Portal after pulling the fix.

## Reduced checklist

1. Exact category archived for the test (prefer an empty unused one, e.g. **Occasions** / `R84NWfeL2u4WyxKvCzuv`).
2. Confirm its Firestore document is `isActive: false` (Firebase console or Debug) **after** Studio reports success.
3. Refresh/restart Portal and confirm it disappears.
4. Restore it in Studio.
5. Confirm Firestore returns to `isActive: true`.
6. Refresh Portal and confirm it returns.
7. Confirm active empty categories remain visible **in Studio Category Management** (staff).
   **Superseded for Portal:** active empty categories must **not** appear in the Portal customer dropdown (Amendment 3 Plan — category availability). Do not treat Portal omission of empty actives as a FAIL against this Amendment 2 checklist item.
8. Confirm category filtering, search, multi-tag, and facets still work.

## Please reply with

- `PASS`
- `FAIL: …`
- `PASS WITH NOTES: …`
