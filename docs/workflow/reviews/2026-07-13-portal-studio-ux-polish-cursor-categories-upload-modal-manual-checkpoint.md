# Manual Test Checkpoint — UX polish (cursor, categories, upload modal)

**Feature / area:** Print-request lightbox cursor; category filter readability; artwork quality modal width + 24h snooze  
**Why automated tests are insufficient:** Cursor, truncation, and modal layout are visual  
**Environment:** Portal (+ Studio Design Library for categories) against **fresh-prints-dev** / local  
**Prerequisites:** Signed-in Portal customer; Design Library with long category names

### Steps

1. **Print request details (Portal):** Open a request with designs → hover a thumbnail.  
   **Expected:** Magnifying-glass cursor (`zoom-in`), not finger/pointer. Click opens lightbox.
2. **Categories (Portal Catalog and/or Studio Design Library):** Open **All categories** on desktop.  
   **Expected:** Long names (e.g. “Pop Culture & Characters”) fully readable — not cut off mid-word in the menu.
3. **Upload Designs or Donate:** Load page with cleared snooze (or first visit).  
   **Expected:** Wider requirements modal; checkbox “Don’t show this again for 24 hours.”
4. Check the box → **I have the right artwork** → reload the page.  
   **Expected:** Modal does not appear; inline “Print-ready artwork required” accordion still available.
5. Overlay click / Escape dismiss **without** confirming (optional).  
   **Expected:** Modal closes; snooze is **not** written unless primary button was used with checkbox checked.

### Pass criteria

- [ ] Zoom-in cursor on print-request lightbox thumbs
- [ ] Category menu shows full long names on desktop
- [ ] Modal wider + 24h snooze works as above
- [ ] No desktop sidebar collapse redesign present (scrubbed)

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

### Owner result (2026-07-13)

**PASS** — all criteria met. Signoff: `docs/workflow/reviews/2026-07-13-portal-studio-ux-polish-cursor-categories-upload-modal-signoff.md`.

