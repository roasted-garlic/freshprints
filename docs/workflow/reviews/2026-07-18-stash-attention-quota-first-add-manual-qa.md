# Manual QA: Stash attention, Cap A refresh, first-add

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Environment | Portal local http://localhost:3100 (soft-reloaded) |
| Deploy | **None** — Portal only; no Functions |

---

## Manual Test Checkpoint

**Feature / area:** Your Stash / Current Request — attention badge, Cap A remaining, first catalog add  
**Why automated tests are insufficient:** UI timing, callable charge visibility, drawer copy  
**Prerequisites:** Signed-in Portal customer; Cap A not exhausted; empty or clearable Stash

### Steps
1. Clear Current Request if needed → open Catalog → add **first** library design (creates request + line).  
   **Expected:** Item appears quickly (optimistic); no double-submit issues; drawer/header do **not** say “needs attention” for a normal Library size+qty row; Cap A remaining decreases **immediately** (not after ~45s).
2. Increase qty +1, then −1.  
   **Expected:** Remaining updates after each settled change.
3. Remove the line (drawer trash) or Clear request.  
   **Expected:** Remaining refunds upward promptly.
4. (Optional) Item that is truly below-min DPI / missing size.  
   **Expected:** Still shows needs attention.

### Pass criteria
- [ ] No false “needs attention” on healthy library default size
- [ ] Cap A updates right after first-add and qty/remove/clear
- [ ] First-add feels responsive (item shows before full list reload finishes)

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
