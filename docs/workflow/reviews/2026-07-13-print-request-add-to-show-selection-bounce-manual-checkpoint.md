# Manual Checkpoint — Add-to-show stay on detail + smooth celebration

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `print-request-add-to-show-selection-bounce` |
| Environment | Portal + Studio against `fresh-prints-dev` / emulators |
| Result | **PASS** (owner 2026-07-13) |

## Why automated tests are insufficient

Queue-to-show and Add to Show need live Firebase + calendar UI timing.

## Prerequisites

- Portal: signed-in customer with a Working request that has designs
- Studio: staff user with a Working request + upcoming show

## Manual Test Checkpoint

### Portal

1. Open request detail → Add to show → pick a show → confirm → **Expected:** Capacity bar fills on the **same** calendar (calendar does not disappear/reappear); modal closes; **you stay on this request’s detail** (Queued / read-only). No trip to the Queued list.
2. On Queued detail, progress panel shows **“Waiting for the printing to start”** (not `0:00`). When the show is printing, the counting timer appears instead.
3. From catalog with an empty stash: tap **Add to request** → **Expected:** qty/badge/toast update immediately (does not wait for create round-trip).
4. Home is `/` (logo); Design Library is `/catalog`; no Home nav item. Legacy `/catalog/library` redirects.
5. Back link should reflect Queued context when appropriate.

### Studio

1. Print Requests → Working → select request → Add to Show → confirm → **Expected:** Calendar stays visible during allocate/capacity update (no blank progress-only swap that removes the calendar); modal closes; detail stays on that request on **Queued**.
2. Click Working tab → **Expected:** Can leave Queued without being forced back.

### Pass criteria

- [x] Portal stays on request detail after queue-to-show
- [x] Portal Queued detail shows “Waiting for the printing to start” (timer only once printing)
- [x] First catalog add (empty stash) feels instant (optimistic qty/badge/toast)
- [x] Home is `/` via logo; Design Library is `/catalog`; Home nav item gone
- [x] Portal calendar does not unmount/remount harshly
- [x] Studio stays on Queued detail after Add to Show
- [x] Studio calendar does not disappear then come back as a separate screen

### Owner reply

**PASS** — 2026-07-13
