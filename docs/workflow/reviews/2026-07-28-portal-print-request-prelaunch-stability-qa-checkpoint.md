# Portal Print Request Pre-Launch Stability — Owner QA (v12, post-Amendment 10 correction)

- **Goal:** `portal-print-request-prelaunch-stability`
- **Phase:** Test — Implementation Review 12 **`APPROVED`**
  (`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-12.md`)
- **Plan:** `docs/workflow/plans/2026-07-27-portal-print-request-prelaunch-stability-plan.md`,
  Section 28 / Amendment 10
- **Superseded:** Implementation Review 11 (`docs/workflow/reviews/2026-07-28-portal-print-request-prelaunch-stability-implementation-review-11.md`,
  `REJECTED`) — all four blocking findings independently confirmed resolved by Implementation
  Review 12.
- **Deployment:** none required; this remains a client-only change.

## What was wrong, and what changed

Implementation Review 11 rejected the prior Amendment 10 implementation: the retry lifecycle wasn't
mechanically concurrency-safe (a pending retry could settle into the wrong show or duplicate its
service call), a remediation-only retry result was incorrectly reported as a success, the required
composed behavior tests were missing, and a legacy capability field needed full removal. All four are
now independently verified fixed — see Implementation Review 12 for the full evidence trail.

**The real live request-completion write denial cause is still not claimed.** The corrected retry
lifecycle makes the pending/success/failure/remediation states observable and safe regardless of
what's causing that denial; identifying the denial itself still requires one live retry reproduction
with the sanitized diagnostic manifest below.

## Restart first

1. Fully close Studio and stop old Electron/Studio Vite processes.
2. Close old Portal tabs and stop old Portal/tunnel processes.
3. Start Studio: `npm run dev:studio`
4. Start Portal: `npm run dev:portal`
5. Start the tunnel only when normally required: `npm run tunnel:portal`

## Owner Test 1: Retry evidence

1. Finish a production run that leaves the known unresolved `printRequests/{id}` completion update.
2. When Retry appears, click it once.
3. Confirm the button visibly enters a `Retrying…` state and is disabled against repeat clicks while
   retrying.
4. Confirm it produces either:
   - success (warning clears, Retry disappears), or
   - a clear, mapped failure/remediation result (the warning and Retry stay, with a safe message).
5. Capture the sanitized console object:
   `[useShowProductionTimer] request reconciliation retry result`
   and paste it in your response.

## Owner Test 2: historical inspection

1. Click a finished show.
2. Confirm read-only details open (date/time, terminal status, personal usage if available).
3. Confirm Add to Show is disabled or unavailable for it.
4. Use Enter and Space (with the row focused) to inspect it the same way.
5. Confirm no submission occurs and no error/destination state leaks from a previously selected show.

## Owner Test 3: brief regression smoke

Confirm:

- mounted Portal progress remains dynamic (Queued → Printing → Done/Printed without refresh)
- personal usage wording remains (`Your print spots: {used} of {limit} used`, `{remaining} spots remaining`)
- multiple separate requests may total exactly 25 on one show; more than 25 is blocked
- switching shows in Add to Show clears any stale error/state immediately
- typed over-cap quantity clamp remains correct
- Show Queue live allocation update remains
- removed-item persistence remains
- `Request Again` remains
- Firebase Debug remains available (Ctrl+Shift+F)
- customer elapsed clock remains absent
- 200-effective-DPI floor remains unchanged

## Owner response format

Use exactly one of:

```text
PASS
PASS WITH NOTES: ...
FAIL: ...
```

Do not sign off or begin either queued goal
(`studio-test-data-print-limit-wipe-audit`, `preproduction-static-analysis-cleanup`) before the owner
response.
