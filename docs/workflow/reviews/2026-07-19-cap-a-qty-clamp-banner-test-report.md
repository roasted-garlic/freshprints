# Test Report: Cap A qty clamp + shorter request-full banner

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Plan | docs/workflow/plans/2026-07-19-cap-a-qty-clamp-banner-plan.md |
| Status | **passed_with_notes** (automated pass; manual smoke pending) |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Shared unit | `npx tsx --test packages/shared/src/utils/printRequestWorkingRequestMax.test.ts` | **pass** (8/8) |

Covered: 25+26→25; room=1→1; room=0 keeps current; daily remaining; decrease passthrough; shortened helper copy (no em dash).

## Deploy

| Target | Result |
|--------|--------|
| `functions:updatePortalPrintRequestItemQuantity` → `fresh-prints-dev` | **success** |

## Manual (owner)

### Soft-reload Portal first

1. Cap A = 50. Add design A qty **25**, design B type **26**.
   - **Expected:** B becomes **25** (not 1); total **50**; qty-up / add / duplicate disabled.
2. Banner when full:
   - Line 1: `This request is full (50 prints)`
   - Line 2: `Add to a show. Extra prints move to a new request.` (fits ~2 lines on mobile)
3. Qty-down on a line, then qty-up until full again — clamp still holds.

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
