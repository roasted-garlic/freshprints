# Test Report: Portal Add-to-Show inspect past / closed days

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Goal | `portal-add-to-show-inspect-closed-days` |
| Plan | docs/workflow/plans/2026-07-22-portal-add-to-show-inspect-closed-days-plan.md |
| Automated status | **passed** |
| Manual status | **PASS** (owner 2026-07-22) |
| Overall | **passed** |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Show-picker + cutoff | `npx tsx --test packages/show-picker/src/buildShowPickerOptions.test.ts packages/show-picker/src/getDefaultShowPickerOptionId.test.ts packages/show-picker/src/getShowPickerDayMarker.test.ts packages/shared/src/utils/showQueueCutoff.test.ts` | 0 | 29 pass |

---

## Manual Test Checkpoint

**Feature:** Portal Add to Show — inspect past / cutoff-closed days  
**Environment:** Portal against fresh-prints-dev  

### Steps
1. Open Add to Show on a request with designs  
2. Click a **past** day that has a show (muted/yellowish marker) → **Expected:** day selects; slot shows **CLOSED** + capacity (e.g. spots left / taken); **Add to show** disabled  
3. Click a **same-day / upcoming** show past the add cutoff → **Expected:** CLOSED + closed copy; Add disabled  
4. Click an **open** future show → **Expected:** OPEN + countdown; Add works when the request fits  

### Pass criteria
- [ ] Past / cutoff days are clickable
- [ ] CLOSED + capacity visible
- [ ] Cannot queue onto closed/past shows
- [ ] Open shows still work

**Owner reply:** `PASS` — 2026-07-22
