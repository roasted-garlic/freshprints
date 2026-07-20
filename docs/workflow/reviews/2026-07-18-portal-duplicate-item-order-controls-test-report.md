# Test Report: Portal duplicate item order + optimistic controls

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-portal-duplicate-item-order-controls-plan.md |
| Result | **partial** — automated passed; manual UI pending |

---

## Automated

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Unit | `npx tsx --test packages/shared/src/utils/printRequestItemDisplayOrder.test.ts` | 0 | 3/3 pass |
| Functions build | `npm --prefix functions run build` | 0 | |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | |
| Lint | skipped | — | narrow UI/hook change; typecheck covered |

## Deploy

| Target | Result |
|--------|--------|
| `firebase deploy --only functions:duplicatePortalPrintRequestItem --project fresh-prints-dev` | **success** (retry after load-timeout) |
| Production | not deployed |

## Manual (owner)

### Steps
1. Soft-reload Portal (hard refresh request detail).
2. Open a draft/editing print request with ≥3 items including a **Custom** or **Uploaded** design that is not alone on the row.
3. Click **Duplicate** on that Custom/Uploaded card.
4. **Expected immediately:** New card appears **directly to the left** of the source (same chrome: width/height/qty/Duplicate/Remove — controls may be briefly disabled). Custom badge still purple/`Custom` for assisted proofs.
5. **Expected after settle:** Controls enable; no jump to far-left of the grid.
6. Soft-reload the page → order still has duplicate immediately before source.
7. Duplicate an item that is **last on a row** → source becomes first of the next row; duplicate takes the prior last slot.

### Please reply with
- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
