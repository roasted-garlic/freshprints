# Manual QA: Amendment 9 P4 — Portal publication rate guard

| Field | Value |
|-------|-------|
| Date | 2026-08-06 |
| Environment | `fresh-prints-dev` after Functions deploy |
| Prerequisites | Deploy checkpoint completed; Studio AI Review access; Cloud Logging access |

---

## Manual Test Checkpoint

**Feature / area:** Portal catalog full-publication rate guard (Amendment 9 P4)  
**Why automated tests are insufficient:** Needs live Function scheduling, lease, and Firestore read accounting under a real approval batch.  
**Environment:** local Studio → `fresh-prints-dev`  
**Prerequisites:** P4 Functions deployed; note UTC window for logs

### Steps

1. Record Cloud Logging baseline window UTC start.  
   → **Expected:** Ready to attribute `catalog-snapshot-publication` / `catalog-snapshot-scheduling`.

2. Process a paced batch of ~45 AI Review approvals (similar to prior attribution QA).  
   → **Expected:** Successful full portal publications **≤ 5–6** (not ~25); joins dominate claims.

3. Confirm Portal text search, multi-tag AND, and tag facets eventually reflect the new ready designs within ~6 minutes of the last approval.  
   → **Expected:** Eventual correctness; ordinary browse (Firestore) unaffected.

4. Confirm import/create of non-ready designs with title/tag drafts does **not** spam full portal pubs (`non-ready-index-filter-skipped` / operational skips).  
   → **Expected:** No R=0 full C+T scan storm from import churn alone.

5. Optional: force a failure / observe dirty watermark; confirm recovery via next wake or admin `retryPortalCatalogPublication`.  
   → **Expected:** Dirty preserved; no permanent strand after W2.

### Pass criteria

- [ ] Full portal success count for ~45 approvals ≤ 6 (target ≤5 when batch wall ≤ ~8–10 min)
- [ ] Publication C+T+R sum ≪ prior ~28.7K for similar batch
- [ ] Search / multi-tag / facets eventually correct
- [ ] No Portal feature regression on ordinary browse
- [ ] No production / Rules / merge actions

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
