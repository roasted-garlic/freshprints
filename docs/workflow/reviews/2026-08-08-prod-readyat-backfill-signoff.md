# Signoff: Production `designs.readyAt` backfill

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Signoff by | Signoff Agent |
| Managed goal | **`prod-readyat-backfill`** (follow-up from R-018) |
| Dry-run | `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-dry-run-record.md` |
| Apply record | `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-apply-record.md` |
| Final status | **approved_with_notes** |
| Project | **fresh-prints-prod** |

---

## Summary

Legacy production ready designs (46) lacked `readyAt`, so Discover New This Week View All (Firestore `readyAt >= readyAfterMs`) stayed empty. Dry-run classified **A SAFE TO APPLY AS-IS** (all seeds `aiReviewedAt`; zero `updatedAt` risk). Owner applied script; post-write verify **46/46** coverage with seed equality; NTW membership **45**. Owner visual QA: **PASS WITH NOTES**.

**R-018 resolved** (readyAt coverage restored; New This Week populated).

---

## Delivered

| Item | Result |
|------|--------|
| Script | `functions/scripts/backfill-design-ready-at.mjs` (unchanged) |
| Written | **46** (`readyAt` ← `aiReviewedAt`) |
| Coverage after | ready **46** · with readyAt **46** · missing **0** |
| Seed verification | **46/46** match |
| NTW membership (read-only) | **45** |
| App Hosting / deploys | **None required / none run** |

---

## Human approvals / QA

| Item | Status |
|------|--------|
| `APPROVE PROD READYAT BACKFILL DRY-RUN` | Done |
| `APPROVE PROD READYAT BACKFILL APPLY` | Done (owner CLI) |
| Post-write verify | **PASS** |
| `READYAT BACKFILL NTW QA: PASS WITH NOTES` | **Recorded** |

### PASS
- New This Week is populated after backfill
- Backfill objective satisfied

### NOTE (separate defect — not R-018)
- New This Week View All / filter page shows **exactly 40 designs** while membership is **45**
- Page badge itself says **"40 designs"**
- Aligns with `DEFAULT_CATALOG_PAGE_SIZE = 40` — likely count/badge uses first-page size, not full membership `countReadyDesigns` for Discover modes
- Tracked as **TD-031** — do **not** implement in this Signoff

---

## R-018

| Before | After |
|--------|-------|
| open — New This Week empty (missing readyAt) | **resolved** — coverage 46/46; NTW populated |

---

## Follow-ups (out of scope)

| ID | Topic |
|----|--------|
| TD-031 | Discover/View All pagination / total badge shows page size (40) instead of full membership (45 for NTW) |

Parent PR #40 Algolia/Rules/cleanup remain separately gated.

---

## Final status

**approved_with_notes**

`prod-readyat-backfill` = **DONE / CLOSED**.

---

## Confirmations

- NO App Hosting / Rules / Functions / indexes / Algolia
- NO pagination fix implemented
- NO further production mutation after owner APPLY
