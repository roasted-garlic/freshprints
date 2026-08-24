# Test Report: Our Shows page UX + print-request actions

| Field | Value |
|-------|-------|
| Date | 2026-08-23 |
| Goal | `our-shows-page-ux-and-print-request-actions` |
| Status | **passed_with_notes** |

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Portal typecheck | `npm run typecheck -w @fresh-prints/portal` | PASS (exit 0) |
| Studio typecheck | `npx tsc --noEmit` in `apps/studio` | PASS (exit 0) |

## Manual (owner)

### Portal Our Shows
- [ ] Sidebar label is **Our Shows** and is the last primary item
- [ ] `/shows` shows centered intro blurb only (no Fresh Prints Portal / Show Designs chrome, no Browse full library)
- [ ] Calendar days show date number in corner and design count in center
- [ ] Past / Completed shows remain visible and are labeled
- [ ] Selecting a day lists shows; opening one goes to gallery
- [ ] Gallery title/copy describes designs on that Whatnot show (no Show Designs eyebrow)

### Studio Print Requests
- [ ] Customer request shows **Add to Show** only
- [ ] Internal request shows **Add to Internal Gangsheet** only
- [ ] **Convert to Internal Request** is under the ⋯ menu next to Edit (not in the primary action strip)

Reply `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
