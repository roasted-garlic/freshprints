# Manual QA: Admin-managed Etsy suggestion lists

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Environment | `fresh-prints-dev` (Studio + Portal) |
| Plan | docs/workflow/plans/2026-07-16-etsy-admin-managed-suggest-lists-plan.md |

---

## Manual Test Checkpoint

**Feature / area:** Etsy wizard Subject + Tone suggestion lists (admin-managed)

**Why automated tests are insufficient:** End-to-end Studio Settings write → Portal autocomplete requires signed-in UI and live Firestore.

**Environment:** Local Studio + Portal against `fresh-prints-dev` (functions/rules already deployed).

**Prerequisites:**
- Owner or admin Studio login
- Portal customer login
- Hard-refresh Studio and Portal after pull / restart if needed so new Settings UI and Portal merge code load

### Steps

1. **Studio → Settings → “Etsy wizard suggestions”** → Subject tab → add a unique subject (e.g. `QA Space Llama`) → **Expected:** appears in admin list; duplicate/`Funny`-like static collision rejected if you try a known default.
2. Switch to **Tone / style** → add a unique tone (e.g. `Whimsical QA`) → **Expected:** appears in list; adding `Funny` (any case) fails with already-exists message.
3. **Portal → Custom Designs → Help me find a design** → Step 1 subject field → type a prefix of the new subject → **Expected:** new subject appears in dropdown; Enter/click still selects; free-text still allowed.
4. Step 2 tone field → type a prefix of the new tone → **Expected:** new tone appears; free-text still allowed.
5. Studio → **Deactivate** the new subject (and optionally tone) → hard-refresh Portal → **Expected:** deactivated entry no longer appears; built-in defaults still work.

### Pass criteria

- [ ] Admin can add subject and tone on Settings
- [ ] Case-insensitive duplicate of static or existing admin entry is rejected
- [ ] Portal autocomplete shows new entries for all customers (after refresh / within ~5 min cache)
- [ ] Free-text still works without picking a suggestion
- [ ] Deactivate hides admin entry from Portal (built-ins remain)

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
