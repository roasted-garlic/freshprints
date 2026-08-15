# Manual Test Checkpoint: Studio AI Review reprocess local reconciliation

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Feature / area | AI Review Reprocess stay-on-tab local reconciliation |
| Environment | Local Studio against current branch `fix/studio-ai-review-reprocess-local-reconciliation` |
| Why automated tests are insufficient | Tab membership, selection advancement, and count badges need live staff UX verification |

## Prerequisites

- Staff login with Reprocess permission
- At least 3 designs on **Needs Review**
- At least 3 designs on **Rejected** (or re-use after sending some back)
- Note starting Processing / Needs Review / Rejected badge counts

---

## Needs Review

1. Open AI Review → **Needs Review** with at least 3 designs. Note Processing and Needs Review counts.
2. Reprocess design A.
   - **Expected:** A disappears immediately; still on Needs Review; B selected; counts update (Needs Review −1, Processing +1).
3. Reprocess B.
   - **Expected:** B disappears immediately; still on Needs Review.
4. Reprocess C.
   - **Expected:** C disappears immediately; next remaining item or normal empty state.
5. Manually open **Processing**.
   - **Expected:** A/B/C (or the reprocessed set) are available for processing.

## Rejected

Repeat the same sequential test from **Rejected**.

- **Expected:** Stay on Rejected; each design disappears individually; counts update; Processing shows them after manual tab open.

## Failure path

Force or trigger a real reprocess error (e.g. offline / ineligible design if available).

- **Expected:** Design remains on the current tab; selection preserved; Processing count does not falsely increment.

## Pass criteria

- [ ] Each reprocessed design disappears individually (no delayed batch drop)
- [ ] No automatic navigation to Processing
- [ ] Selection advances on the source tab
- [ ] Counts update correctly
- [ ] Manual Processing visit shows reprocessed designs
- [ ] Failed reprocess does not remove the design falsely
- [ ] Processing auto-advance / sequential Process workflow still feels normal

## Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
