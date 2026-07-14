# Test Report: Studio/Portal perf + show-queue gates

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Tester | Test Agent |
| Plan | `docs/workflow/plans/2026-07-14-studio-portal-perf-queue-gates-plan.md` |
| Overall | **passed** |

---

## Summary

Automated unit tests, functions build, and Portal typecheck passed. Callables deployed to `fresh-prints-dev`. Manual verification required for all five user-facing behaviors.

**Follow-up (same phase, 2026-07-14):** Inbox shows who marked Done; past/full/done picker selection hardened; Portal cart clears dynamically after queue-to-show.

**Owner FAIL retest (same phase):** Stash still re-hydrated after queue; catalog prefetch made nav sticky. Fixed: `resetWorkingCart` before refresh; prefetch removed (on-demand URL memo only). Portal typecheck re-run exit 0.

---

## Commands Run

| Check | Command | Exit Code | Result |
|-------|---------|-----------|--------|
| Unit | `npx tsx --test packages/shared/src/utils/showAllocationEligibility.test.ts` | 0 | pass (4/4) |
| Build | `npm run build` in `functions/` | 0 | pass |
| Typecheck | `npm run typecheck` in `apps/portal` | 0 | pass |
| Deploy | `firebase deploy --only functions:promoteCustomerUploadToAiReview,functions:listPortalAllocatableShows,functions:queuePortalPrintRequestToShow --project fresh-prints-dev` | 0 | pass |
| Typecheck (cart/prefetch fix) | `npm run typecheck --workspace @fresh-prints/portal` | 0 | pass |

---

## Manual Test Checkpoint

**Environment:** Studio + Portal against `fresh-prints-dev`  
**Prerequisites:** Restart Studio so client changes load; hard-refresh Portal

### Steps

1. **Studio promote** — Send to AI Review from a customer upload and a donation  
   → **Expected:** “Sending…” ends quickly; design appears in AI Processing and runs in background  
2. **Portal nav** — Click sidebar / quick links (including pages visited before)  
   → **Expected:** Single click navigates promptly; no sticky double-click feel  
3. **Portal calendar** — Open Add to show / queue calendar  
   → **Expected:** Calendar appears quickly on first open; reopen is near-instant (session cache)  
4. **Studio alert** — Queue a Portal request that fills a show  
   → **Expected:** One audible alert (not two in quick succession)  
5. **Full / done / past** — Try add to a full, finished, or past-tab show from Studio and Portal  
   → **Expected:** Blocked with clear message; past calendar slots not selectable  
6. **Inbox Done attribution** — Mark an inbox item done  
   → **Expected:** Completed row shows `Marked done {time} by {display name}`  
7. **Portal cart after queue** — Queue working request to a show  
   → **Expected:** Header/cart stash empties without a full page refresh

### Please reply with

- `PASS`  
- `FAIL: [description]`  
- `PASS WITH NOTES: [notes]`

---

## Signoff Readiness

- [x] Automated checks pass  
- [x] Manual tests complete — owner **PASSED** (2026-07-14)  
- [x] Ready for signoff  

**Next step:** signoff complete — see `2026-07-14-studio-portal-perf-queue-gates-signoff.md`
