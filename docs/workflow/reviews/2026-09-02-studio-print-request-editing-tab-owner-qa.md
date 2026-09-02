# Owner QA: Studio Print Request Editing tab (+ Internal Printed group order)

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Goal | `studio-print-request-editing-tab` |
| Environment | **DEV** (`fresh-prints-dev`) |
| Result | **PASS** |
| Production QA | **not claimed** / **NOT AUTHORIZED** |

---

## Owner-verified (DEV)

### Studio Customer lifecycle tabs

- Tabs: Working \| Editing \| Queued \| Printing \| Printed
- Tabs remain on one line (`nowrap`; narrow → horizontal overflow, not wrap)
- Editing membership and counts correct
- Editing requests excluded from Working
- Editing search remains active-tab scoped

### Studio Internal lifecycle tabs

- Tabs: Working \| Editing \| Queued \| Printed
- Tabs remain inline / one line
- Narrow layouts do not wrap lifecycle tabs

### Internal Requests → Printed group order

- Newest Internal Gang Sheet first
- Newer Internal Gang Sheet groups appear above older ones
- Grouping / details / counts remain normal
- Sort: `printFinishedAt` DESC → missing finish last → `staffGangSheetCycleNumber` DESC → id tie-break (shared History helper)

---

## Notes

- Portal `/requests` Editing tab was accepted earlier under Decision 5 reverse (ADR-FP-158 amendment) and remains in final source; this Owner QA pass focused on Studio Customer + Internal surfaces listed above.
- ADR-FP-071 Continuable (`draft` \| `editing` one-at-a-time) unchanged in this goal.
- Continuable parking / active-Continuable amendment is a **separate queued goal** — not in this closeout.
