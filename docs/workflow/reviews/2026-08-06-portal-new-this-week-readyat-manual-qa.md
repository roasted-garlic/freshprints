# Manual QA: Portal Discover New This Week → `readyAt` (Case D)

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Environment | Local Portal → `fresh-prints-dev` |
| Prerequisites | Case D commit on `fix/post-launch-catalog-and-processing-stability`; Studio can approve designs |
| Related | Plan + Formal Review approved; Impl Review **APPROVED** |

---

## Manual Test Checkpoint

**Feature / area:** Discover / Home “New This Week” uses customer-ready time (`readyAt`)  
**Why automated tests are insufficient:** Live Firestore membership + first-viewport order vs Studio approval recency  
**Environment:** local Portal (`npm run dev:portal`) against `fresh-prints-dev`  
**Prerequisites:** At least one design with old import/`createdAt` and recent approval (`readyAt` today)

### Steps

1. Open Portal Discover → **New This Week** (`/catalog?discover=new`).  
   → **Expected:** Grid shows designs newly ready within ~7 days; newest approvals first.

2. Compare first-viewport order to Studio Design Library approval recency for the same ready designs.  
   → **Expected:** Newest recently-approved designs appear first on New This Week.

3. Confirm an older-import / recent-approval design appears in New This Week.  
   → **Expected:** Included despite old `createdAt`.

4. Open Home → **New This Week** rail.  
   → **Expected:** Same product semantics (ready-time membership/order).

5. Open ordinary Library (no `discover=`).  
   → **Expected:** Still newest approved first (`readyAt`); unchanged by this fix beyond New This Week.

6. Smoke category browse.  
   → **Expected:** Works; no regression.

7. Smoke metric Discover rails (Popular / Most Liked / Recently Requested).  
   → **Expected:** Still metric-ordered; not readyAt week filter.

8. Smoke text search / multi-tag / facets.  
   → **Expected:** Still work.

9. Confirm no obvious Portal visual/regression issues on these paths.  
   → **Expected:** Clean.

### Pass criteria

- [ ] New This Week membership feels ready-based (old import + approve today appears)
- [ ] Newest approvals first on New This Week (Library + Home rail)
- [ ] Ordinary Library / category / metrics / search / multi-tag / facets OK
- [ ] No deploy / merge performed for this QA

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Owner result (2026-08-06)

**PASS**

Signoff: `docs/workflow/reviews/2026-08-06-portal-new-this-week-readyat-signoff.md` (**approved**).
Implementation commit: `f9bc19c`. No deploy required for local Portal QA.
