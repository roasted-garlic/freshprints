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

- [x] Card / Details thumbnail / lightbox mats match
- [x] Download PNG unchanged
- [x] New approval first in Studio + Portal browse
- [x] Re-approval moves older design to top
- [x] Category + tag retain approval ordering
- [x] No silent disappearances / obvious duplicates

---

## Owner result (2026-08-06)

**PASS WITH NOTES**

Implementation ready per report; commit `42f7b20` already pushed; PR #40 updated. Unrelated Portal `.next`/robots prerender build failure remains documented in the test report (typecheck green).

Signoff: `docs/workflow/reviews/2026-08-06-catalog-display-background-and-ready-ordering-signoff.md` — **approved_with_notes**.
