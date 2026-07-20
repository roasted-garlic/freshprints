# Test Report: Clear request reuse + detail page sort

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-clear-request-reuse-working-plan.md |
| Tester | Test Agent |
| Verdict | **passed_with_notes** (pending owner manual QA) |

---

## Commands Run

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Functions build | `npm --prefix functions run build` | 0 | Includes clear callable |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | 0 | |
| Unit | `npx tsx --test apps/portal/features/print-requests/utils/sortWorkingCurrentRequestItems.test.ts` | 0 | 3/3 pass |
| Deploy (dev) | `firebase deploy --only functions:clearPortalWorkingPrintRequest --project fresh-prints-dev` | 0 | Successful update |

Skipped: full lint, portal build, E2E (not required for this scope).

---

## Implementation Summary

### Clear → reuse
- Callable empties items / `itemCount: 0`, keeps `draft`|`editing` (no archive).
- Portal clear preserves `ensuredWorkingRequestIdRef` so next Add reuses id.
- Docs amended (ADR-FP-079, BACKEND, DATA_MODEL, SECURITY).

### Detail page sort
- `usePrintRequestDetail` uses `sortWorkingCurrentRequestItems` (createdAt desc) for load, working sync, and duplicate optimistic paths.

---

## Manual Test Checkpoint

**Feature / area:** Clear reuse + print request detail sort  
**Why automated tests are insufficient:** Needs live Portal + Firestore on `fresh-prints-dev`  
**Environment:** local Portal http://localhost:3100 (soft-reloaded); Functions on `fresh-prints-dev`  
**Prerequisites:** Signed-in Portal customer

### Steps
1. Add ≥2 designs to Current Request → note print request id (URL or drawer).  
   **Expected:** Stash has items.
2. Clear request from Stash drawer.  
   **Expected:** Items gone; still same open Current Request (not “virtual empty create”).
3. Add a design again.  
   **Expected:** Same print request id — no new request created.
4. Open print request detail with several items added at different times.  
   **Expected:** Items listed most recent → least recent (matches drawer order).
5. (Optional) Rapid double-add when truly empty.  
   **Expected:** Still a single working request (mutex).

### Pass criteria
- [ ] Clear does not archive / does not force a new create on next Add
- [ ] Detail page item order is newest-first
- [ ] Drawer order unchanged / matches detail

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
