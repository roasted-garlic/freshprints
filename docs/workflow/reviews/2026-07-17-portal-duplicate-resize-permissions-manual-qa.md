# Manual Test Checkpoint — Portal duplicate + resize permissions

**Feature / area:** Portal print request details — Duplicate → resize autosave  
**Why automated tests are insufficient:** Needs real customer auth + Firestore rules against `fresh-prints-dev`  
**Environment:** local Portal (`npm run dev:portal`) → `fresh-prints-dev`  
**Prerequisites:** Signed-in customer; draft/editing Current Request with at least one catalog or upload item  

| Field | Value |
|-------|-------|
| Status | **PASS** |
| Resolution | Owner: “Portal duplicate/resize is fixed and PASSED” (2026-07-17) |

---

### Steps

1. Open request detail → click **Duplicate** on an item → **Expected:** New card appears; editors stay disabled (or non-editable) until duplicate finishes; no Save failed toast from the optimistic row alone.
2. After the new card is live, change **Width** or **Height** within 22″ → blur → **Expected:** bottom-right **Saved** (not Missing or insufficient permissions).
3. Change quantity with **+/−** on a valid size → **Expected:** **Saved**.
4. Set a side **above 22″** → **Expected:** save blocked with clear oversize / Custom Request message (not permissions toast).
5. **Remove** a non-essential duplicate line → **Expected:** item removed; request still loads (parent `itemCount` bump still works).

### Pass criteria

- [x] Duplicate + resize reaches **Saved**
- [x] No `Missing or insufficient permissions` on valid edits
- [x] Over-22″ does not show permissions error
- [x] Remove still works

### Please reply with

- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

**Your result:** **PASS** — owner reply 2026-07-17: “Portal duplicate/resize is fixed and PASSED.”

Optional: reply `APPROVE DEV DEPLOY` to ship rules harden to `fresh-prints-dev` only (still open — not required for this PASS):

```bash
firebase deploy --only firestore:rules --project fresh-prints-dev
```
