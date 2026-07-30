# Portal Print Request Pre-Launch Stability — Owner QA (v11, FAIL)

- **Goal:** `portal-print-request-prelaunch-stability`
- **Phase:** Test
- **Environment:** `fresh-prints-dev`
- **Status:** owner reported `FAIL`; superseded by Plan Section 28 / Amendment 10

Amendment 9 QA passed mounted Portal progress, Studio Start/Pause/Resume/visible Finish, personal
usage, exact-25 behavior, bounded historical visibility, and the regression smoke. It failed because
one `printRequests/{id}` completion update remains retryable after Finish and the retry control gives
no useful pending/success/error feedback. Malformed show/allocation warnings persist. The owner also
superseded the fully-disabled historical-slot decision: historical shows must be inspectable but
never allocatable.

Plan Section 28 / Amendment 10 is required. Do not rerun QA until Formal Review, implementation,
verification, Implementation Review 11, and any required narrow deployment checkpoint complete.

## Restart first

1. Fully close Studio and stop old Electron/Studio Vite processes.
2. Close old Portal tabs and stop old Portal/tunnel processes.
3. Start Studio: `npm run dev:studio`
4. Start Portal: `npm run dev:portal`
5. Start the tunnel only when normally required: `npm run tunnel:portal`

## Test 1 — Complete Studio lifecycle

Use a valid show with at least one queued request. Start, Pause, Resume, then Finish.

Pass requires no permission/incomplete-record blocker, no normal request-retry requirement, a
Finished show, terminal allocations, Printed related requests, and no manual retry.

If Retry appears, capture its count, sanitized request/allocation IDs, exact error code/message,
whether Retry resolves it, and whether a second Retry is a no-op.

## Test 2 — Mounted Portal progress

Keep the related Portal request detail page open throughout Test 1.

Pass requires Queued → Printing → Done/Printed without refresh; top label and rail agree; the rail
never falls back to Queued; no navigation is required; the customer elapsed clock remains absent.
Record the approximate delay after Start and Finish.

## Test 3 — Historical visibility and non-selection

Open Add to Show and locate the show finished in Test 1.

Pass requires the show to remain visible with its terminal/historical status while disabled for
pointer and keyboard selection. Add to Show cannot submit to it, no capacity/submission request is
issued for it, and open future shows remain selectable.

## Test 4 — Personal usage and capacity

Confirm:

- `Your print spots: {used} of {limit} used`
- `{remaining} spots remaining`
- show-wide capacity remains separate;
- separate requests may accumulate to exactly 25 and more than 25 is blocked;
- switching shows displays each show's own count without stale errors.

## Test 5 — Brief regression smoke

Confirm typed over-cap clamp, live Show Queue allocation updates, removed-item persistence, valid
quantity reductions, immediate queued tracker, cancel-is-no-op, `Request Again`, no Firebase Debug
availability toast, Ctrl+Shift+F debug opening, no customer elapsed clock, and unchanged 200-effective-
DPI save floor.

## Owner response

Reply with exactly one:

```text
PASS
PASS WITH NOTES: ...
FAIL: ...
```

Do not sign off or begin queued goals before the owner response.
