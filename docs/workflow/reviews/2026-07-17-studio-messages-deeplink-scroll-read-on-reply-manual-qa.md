# Manual QA: Studio Messages deep-link scroll + mark read on reply

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | local Studio (`fresh-prints-dev`) |
| Status | **PASS** (owner, 2026-07-17) |

---

## Manual Test Checkpoint

**Feature / area:** Studio Assisted Messages — deep-link scroll + read-on-reply  
**Why automated tests are insufficient:** Viewport scroll and inbox badge UX need human verification.  
**Prerequisites:** Studio running against `fresh-prints-dev`; at least one Assisted request with an unread customer message. Ack rules already deployed (same as Messages inbox).

### Steps

1. As customer, send a Messages note on an Assisted request (leave it unread in Studio).  
   **Expected:** Header **Messages** badge shows ≥1.
2. From Studio Messages inbox, open the unread row (deep-link).  
   **Expected:** Lands on Custom Designs → Assisted → that request → **Messages** tab. The messages thread/composer is in view without manually scrolling the page; the thread is scrolled to the **bottom** (latest messages visible).
3. Reset unread if needed (or use another unread request). Open the request **Messages** tab from the list (or deep-link) **without** clicking the red **Read** control. Send a staff reply.  
   **Expected:** Message sends; unread badge/count for that customer update clears (same as clicking **Read**); header Messages badge drops accordingly.
4. With a fresh unread, open Messages and click per-row **Read** only (no reply).  
   **Expected:** Still marks read as before.

### Pass criteria

- [x] Deep-link shows Messages thread bottom / composer without hunting via page scroll
- [x] Staff reply marks related unread ack as read
- [x] Per-row **Read** still works

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

**Your result:** **PASS** (owner, 2026-07-17) — confirmed Studio deep-link is the Messages inbox deep-link (scroll + mark-read-on-reply).

### Note

Portal Alerts / Web Push deploy + QA remains a **separate** parked checkpoint — do not treat this reply as that phase’s signoff.
