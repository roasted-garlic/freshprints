# Apply Record — Production `designs.readyAt` backfill

| Field | Value |
|-------|-------|
| Date | 2026-08-08 |
| Authorization | `APPROVE PROD READYAT BACKFILL APPLY` |
| Status | **APPLY COMPLETE · POST-WRITE VERIFY PASS · OWNER NTW QA: PASS WITH NOTES** · Signoff **approved_with_notes** |
| Dry-run | `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-dry-run-record.md` (GO / A) |
| Project | **fresh-prints-prod** |
| Production source SHA | `ccfc97487a42553146ea3186bde8f710a54b86ca` |

---

## Preflight (PASS)

| Check | Result |
|-------|--------|
| Script blob | `6585526b06006150f00b8dceac310a3b2a212d00` (unchanged vs dry-run) |
| Working SHA256 | `60D6542E752D4AC81CFCA43C3BEE6C8B9B5AAC4C04B47D1A5249D65639F83D64` |
| readyAt indexes | **4/4 READY** |
| Candidates | ready **46** / alreadySet **0** / needsBackfill **46** / all `aiReviewedAt` |

---

## APPLY

| Item | Value |
|------|-------|
| Executor | **Owner (manual)** — Cursor hook blocked agent |
| Command | `$env:FIREBASE_PROJECT_ID='fresh-prints-prod'; $env:ALLOW_NON_DEV='1'; $env:APPLY='1'; node functions/scripts/backfill-design-ready-at.mjs` |
| Owner-reported result | `Backfill complete: 46 design(s) updated.` |

---

## Post-write verification (PASS — read-only)

| Metric | Result |
|--------|--------|
| ready designs | **46** |
| with `readyAt` | **46 / 46** |
| missing `readyAt` | **0** |
| `readyAt` === `aiReviewedAt` (ms) | **46 / 46** |
| seed mismatches | **0** |
| New This Week membership (`readyAt` ≥ 7d cutoff) | **45** (matches dry-run) |
| readyAt indexes | **4/4 READY** |

No App Hosting / Rules / Functions / index / Algolia actions this pass.

---

## Manual Test Checkpoint — New This Week (owner)

**Feature / area:** Production New This Week after readyAt backfill
**Why automated tests are insufficient:** Rail + View All composition needs visual confirmation.
**Environment:** https://fresh-prints-portal--fresh-prints-prod.us-central1.hosted.app
**Prerequisites:** Backfill applied; no App Hosting rollout required (live Portal already queries `readyAt`).

### Steps
1. Refresh production Portal → **Expected:** page loads normally
2. Open Discover / Home → **Expected:** New This Week rail **populated** (multiple designs)
3. Click New This Week **View All** → **Expected:** list **populated** (~45), not empty
4. Confirm rail → View All no longer goes from populated → empty
5. Spot-check `/catalog` → **Expected:** still normal full catalog
6. Confirm no new visible errors

### Pass criteria
- [ ] New This Week rail populated
- [ ] New This Week View All populated
- [ ] `/catalog` normal
- [ ] No new visible errors

### Please reply with
- `READYAT BACKFILL NTW QA: PASS`
- `FAIL: [description]`
- `PASS WITH NOTES: [notes]`

### Owner result (2026-08-08)

**PASS WITH NOTES**

- New This Week populated after backfill — R-018 objective met.
- Separate note: View All badge/list shows **40** designs while membership is **45** (page-size badge bug) — **TD-031**, not an R-018 failure.
- Signoff: `docs/workflow/reviews/2026-08-08-prod-readyat-backfill-signoff.md`
- R-018: **resolved**

---

## Confirmations

- NO further production mutation by agent after owner APPLY
- NO App Hosting / Rules / Functions / indexes / Algolia
