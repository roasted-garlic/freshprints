# Manual Test Checkpoint — Remediation r3

**Feature / area:** Discover workflow hint + Start request Upload/Browse guidance  
**Why automated tests are insufficient:** Visual layout and guided modal flow  
**Environment:** local Portal (`npm run dev:portal`) against fresh-prints-dev  
**Prerequisites:** Customer account with no working request (or complete/archive first)

### Steps

1. Open **Discover Designs** (`/catalog`).  
   **Expected:** Full-width callout “How print requests work” under the toolbar; readable, not a narrow gray paragraph.

2. Click **Start request** → confirm modal → **Start request**.  
   **Expected:** Same modal advances to “How do you want to start?” with **Start & upload designs** and **Start & browse designs**.

3. Click **Cancel** on the path step (without choosing a path).  
   **Expected:** Modal closes; no new print request created (Working tab unchanged).

4. Start again → path → **Start & browse designs**.  
   **Expected:** New request created; Design Library opens in request-selection mode.

5. Complete or leave that request, then start again with no working request → path → **Start & upload designs**.  
   **Expected:** Lands on request detail with **Upload artwork** panel open.

6. (Optional) Design Library browse page shows the same full-width callout when not in selection mode.

### Pass criteria

- [ ] Hint is full width and clearly styled
- [ ] Path choice is in the same modal (not a second dialog)
- [ ] Cancel on path does not create a request
- [ ] Browse path → selection mode
- [ ] Upload path → detail with upload panel open

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
