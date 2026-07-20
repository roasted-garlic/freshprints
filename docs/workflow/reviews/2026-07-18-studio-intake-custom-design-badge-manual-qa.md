# Manual QA: Studio intake — Custom design badge

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Feature | Studio Imports customer-upload intake — Custom badge |
| Environment | local Studio (soft-reload) |
| Prerequisites | Staff account with intake view; at least one `pending_staff_review` upload with `assistedCreationRequestId` set (Assisted Add to Request). Plain upload and/or donation rows helpful for contrast. |

> **Deploy note (separate):** Library listing consent callable still needs `APPROVE DEV DEPLOY` on fresh-prints-dev if you do not already have an assisted intake row. This badge itself needs **no** Functions deploy.

---

## Manual Test Checkpoint

**Feature / area:** Studio catalog intake — Custom notation for assisted designs  
**Why automated tests are insufficient:** Visual badge/label on list + detail  
**Environment:** local Studio  
**Prerequisites:** Soft-reload Studio after pull; Imports → Uploaded designs (and optionally Donated) intake

### Steps
1. Soft-reload Studio → open **Imports** → **Uploaded designs** Pending tab.  
   **Expected:** List loads as before.
2. Select a row that came from Assisted Add to Request (`assistedCreationRequestId` present).  
   **Expected:** Purple **CUSTOM** badge on list title; subtitle includes `custom design`; detail header shows badge + `· custom design`; Technical details → Source = `Custom design (Assisted)`.
3. Select a normal customer upload (no assisted id).  
   **Expected:** No Custom badge; Source = `Customer upload`; promote/exclude still work.
4. (Optional) Donated designs intake row.  
   **Expected:** Still shows donation notation; no Custom badge unless somehow assisted (should not).

### Pass criteria
- [ ] Assisted rows clearly marked **Custom** (purple)
- [ ] Normal uploads / donations unchanged
- [ ] No broken promote / exclude / open request actions

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
