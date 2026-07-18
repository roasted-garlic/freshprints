# Manual QA: Ctrl+Enter to send assisted messages (Portal + Studio)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | local Portal + local Studio (`fresh-prints-dev`) |
| Status | **PASS** (owner, 2026-07-17) |

---

## Manual Test Checkpoint

**Feature / area:** Assisted Messages composers — Ctrl+Enter send + tip label  
**Why automated tests are insufficient:** Keyboard shortcut + label visibility need human verification.  
**Prerequisites:** Portal and/or Studio running; an Assisted request you can message.

### Steps — Portal

1. Open an Assisted request → **Messages** tab. Confirm tip under Send reads **`Ctrl + Enter to send`**.  
   **Expected:** Small muted tip below the Send button.
2. Focus the composer with empty text; press Ctrl+Enter (Cmd+Enter on Mac).  
   **Expected:** Nothing sends; button stays disabled.
3. Type a short message; press **Enter** only.  
   **Expected:** Newline inserted; message not sent.
4. Press **Ctrl+Enter** (or Cmd+Enter).  
   **Expected:** Message sends the same as clicking Send; draft clears; tip still visible.

### Steps — Studio

1. Open Custom Designs → Assisted → request → **Messages** (staff with mutate). Confirm tip **`Ctrl + Enter to send`** under Send.  
   **Expected:** Tip visible, aligned under Send.
2. Empty draft + Ctrl+Enter → no send. Plain Enter → newline. Non-empty + Ctrl+Enter → sends.  
   **Expected:** Same as Portal.
3. (Optional) Helper / read-only role: composer send UI absent as before.  
   **Expected:** No regression.

### Pass criteria

- [x] Portal: tip visible; Ctrl/Cmd+Enter sends when enabled; plain Enter is newline
- [x] Studio: same for staff who can send

### Please reply with

- `PASS` / `FAIL: …` / `PASS WITH NOTES: …`

**Your result:** **PASS** (owner, 2026-07-17) — Ctrl+Enter already verified.

### Related open QA (separate)

Studio deep-link scroll + read-on-reply — signed off separately after owner confirmed Studio Messages deep-link PASS.

### Note

Portal Alerts / Web Push remains **parked** — do not treat this reply as that phase’s signoff. No deploy required for Ctrl+Enter until you ask.
