# Human Checkpoint: Terminal messaging closed — manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Workflow | managed-phase / test / assisted-terminal-messaging-closed |
| Reason | UI + callable behavior needs owner verification against live `fresh-prints-dev` |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

Confirm Portal and Studio Messages composers are closed on terminal Assisted Creation requests, and still work on open ones.

---

## Context

- No `completed` status — closed = `approved` | `rejected` | `cancelled` (all terminal).
- Send callables already deployed to `fresh-prints-dev`.
- Copy: “Messaging is closed for completed requests.”
- Plan: `docs/workflow/plans/2026-07-17-assisted-terminal-messaging-closed-plan.md`

---

## Manual Test Checkpoint

**Feature / area:** Assisted Creation Messages — terminal closed
**Why automated tests are insufficient:** Composer UX + live callable rejection
**Environment:** local Portal + Studio against `fresh-prints-dev`
**Prerequisites:** Owner/admin Studio login; Portal customer with open and past (terminal) Assisted requests

### Steps

1. Open request (`submitted` / `in_progress` / `proof_ready` / `revision_requested`) → Messages → send a short note (Portal customer). → **Expected:** Send works; message appears in thread.
2. Same open request in Studio (owner/admin) → Messages → send. → **Expected:** Send works.
3. Terminal request (`approved` and/or `rejected` / `cancelled`) → Messages in Portal. → **Expected:** Thread readable; composer hidden; status text “Messaging is closed for completed requests.”
4. Same terminal request in Studio. → **Expected:** Same closed copy; no Send for owner/admin.
5. Studio helper on an open request (if available). → **Expected:** Still “Helpers can view messages but not send replies.”
6. Optional: restore a cancelled request to `submitted`. → **Expected:** Composer returns.

### Pass criteria

- [ ] Open requests: send works (Portal + Studio owner/admin)
- [ ] Terminal requests: no composer; closed message shown; history still readable
- [ ] Helper view-only unchanged

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** _pending_
