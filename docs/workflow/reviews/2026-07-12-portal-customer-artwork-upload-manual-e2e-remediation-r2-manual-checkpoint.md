# Manual Test Checkpoint — Remediation Round 2 (6 issues)

**Feature / area:** Portal customer artwork upload — post-FAIL remediation r2  
**Environment:** local Portal + Studio against **`fresh-prints-dev` only**  
**Status:** Automated green — **owner retest required** before G/parent signoff  

Restart Portal if you still see a stale `.next` chunk error (`Ctrl+C` → `npm run dev:portal`).

---

## Accounts / routes

| Need | Detail |
|------|--------|
| Portal customer | Active customer on `fresh-prints-dev` |
| Studio staff | Owner/admin for promote; helper OK for exclude/view |
| Portal | `/catalog`, `/catalog/library`, `/requests/[id]` |
| Studio | `/customer-uploads`, `/imports`, `/designs`, `/show-queue`, `/inbox`, `/test-data-reset` |

---

## Checklist (reply after all)

1. Duplicate a **customer-upload-backed** request item → succeeds (no permissions error).  
2. Duplicate appears with the **same artwork** (same upload; no new Storage file).  
3. On Test Data Reset, select/deselect **every** wipe target including `customerUploads` → page never blanks.  
4. Reload and fully restart Studio with unchecked inbox items → **no** repeated alert sound.  
5. Create a **new** inbox alert → sounds **once**.  
6. Inbox **count remains** until checked off.  
7. Upload **one** Portal image → visible stages Queued → Uploading (% bar) → Uploaded/Validating/Processing → Ready.  
8. Upload **several** images → up to 3 finalize in parallel; Ready files appear before the batch finishes.  
9. Mixed valid/invalid batch → valid files continue; failed shows message + retry.  
10. Refresh during/after upload → completed files do not restart processing (session/idempotency).  
11. Studio Customer Uploads → **Send to AI Review** shows immediate “Sending…” feedback.  
12. Promoted card leaves pending list **without** full-page refresh.  
13. **Do not add to catalog** → immediate “Excluding…” + dynamic removal.  
14. Retry a failed upload → only that card updates.  
15. **Open linked request** → client-side navigation (no Electron reload).  
16. Pending **badge** updates dynamically.  
17. Filters / selection not wiped by card actions.

---

## Please reply with exactly one of

- `PASS`
- `PASS WITH NOTES: ...`
- `FAIL: ...`

Do **not** expect Sub-phase G or parent signoff until PASS / PASS WITH NOTES.

---

## Automated evidence (already done)

- Deployed `duplicatePortalPrintRequestItem` + rules to `fresh-prints-dev`
- Portal typecheck/build PASS; Studio vite build PASS; Functions build PASS
- Shared unit tests PASS (wipe guards, duplicate requestCount contract, delivery id)
