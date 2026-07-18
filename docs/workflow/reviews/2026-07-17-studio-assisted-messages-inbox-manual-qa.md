# Manual QA: Studio Assisted Messages Inbox

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | local Studio (`fresh-prints-dev`) |
| Status | PASS — owner confirmed Studio Messages inbox works great (2026-07-17) |

---

## Manual Test Checkpoint

**Feature / area:** Studio header Messages inbox for Assisted Creation unread customer updates  
**Why automated tests are insufficient:** Header dropdown, deep-link selection, and badge UX need human verification.  
**Prerequisites:** Studio running; at least one Assisted request with an unread customer message (or customer send a new Messages note). Ack rules must be deployed for Read/Open to persist.

### Steps

1. As customer, send a Messages note on an Assisted request.  
   **Expected:** Studio header **Messages** (message icon next to Alerts) shows a badge; dropdown lists truncated preview + customer label + time.
2. Click the inbox row.  
   **Expected:** Navigates to Custom Designs → Assisted → that request → **Messages** tab; unread for that message clears (or drops after ack); stage tabs and list cards do **not** show red unread chips.
3. With multiple unread messages on one request, open an older one from the inbox.  
   **Expected:** That entry (and older) clear; newer unread remain in inbox until opened/Read.
4. On Messages tab, use per-row **Read** if any remain.  
   **Expected:** Still works; Messages tab header count updates.

### Pass criteria

- [ ] Header Messages badge + truncated dropdown
- [ ] Open deep-links to request Messages
- [ ] No stage/list unread chips
- [ ] Thread Read still works

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

### Next queue reminder (not this checkpoint)

After this passes, resume parked work: Assisted Messages Functions deploy (Save notes + Send), invite continue URL deploy, then **Brevo**.
