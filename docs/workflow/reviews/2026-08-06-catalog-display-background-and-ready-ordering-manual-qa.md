# Manual Test Checkpoint — Catalog mats + ready-approval ordering

**Feature:** Studio Design Details artwork mat + Portal/Studio ready ordering  
**Environment:** `fresh-prints-dev`, branch `fix/post-launch-catalog-and-processing-stability`  
**Why manual:** visual mats + live Firestore ordering

## Steps

1. Open a light-colored transparent design with a **dark** configured mat in Studio Design Library → **Expected:** card shows dark mat.
2. Open Design Details → **Expected:** modal thumbnail uses the **same** dark mat.
3. Open full lightbox from Details → **Expected:** same dark mat; artwork remains visible.
4. Download original → **Expected:** PNG still transparent (unchanged production file).
5. Approve a **new** design to ready → **Expected:** appears **first** in Studio Design Library.
6. Open Portal ordinary browse → **Expected:** that design appears **first** (or at top of first page).
7. Re-approve an **older** design → **Expected:** it moves above the newer-created but earlier-approved design in Studio and Portal browse.
8. Check one **category** and one **tag** Portal result → **Expected:** newest-approval-first; no missing/dupe obvious.

### Pass criteria

- [ ] Card / Details thumbnail / lightbox mats match
- [ ] Download PNG unchanged
- [ ] New approval first in Studio + Portal browse
- [ ] Re-approval moves older design to top
- [ ] Category + tag retain approval ordering
- [ ] No silent disappearances / obvious duplicates

### Please reply with

- `PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

**Do not Signoff until owner replies.** No PR merge / deploy.
