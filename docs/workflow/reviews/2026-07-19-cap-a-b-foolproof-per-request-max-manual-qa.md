# Human Checkpoint: Cap A / Cap B foolproof per-request max

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test |
| Plan | docs/workflow/plans/2026-07-19-cap-a-b-foolproof-per-request-max-plan.md |

---

## Soft-reload Portal first

Hard-refresh or soft-reload the Portal so client copy and disable gates load. Functions must be on `fresh-prints-dev` with marker `per-request-max-v1`.

## Prerequisites

- Studio Settings: Cap A = **50**, Cap B = **25** (saved)
- Fresh day quota or wipe Cap A counter for the test customer if needed
- Prefer an empty Current Request to start

## Manual Test Checkpoint

**Feature / area:** Per-request max (= Cap B) + Cap A labeling

**Why automated tests are insufficient:** End-to-end Portal UX and live callable enforcement

**Environment:** local Portal → `fresh-prints-dev`

### Steps

1. Soft-reload Portal. Confirm banner help (?): one request holds up to 25; daily 50; no "split across shows".
2. Add prints until **25** on Current Request.
   → **Expected:** Add succeeds; banner may warn/healthy Cap A remaining (not "Daily print limit").
3. Try 26th print (library Add, qty-up, duplicate, or upload).
   → **Expected:** Blocked. Status: **This request is full (25 prints)**. Helper: **Add your Current Request to a show before adding more.** Must **not** say "Daily print limit reached".
4. Add Current Request to a show (full 25).
   → **Expected:** Queues; Current Request empty/new.
5. Add another **25** on the new request; queue to another show (or same only if Cap B remaining allows).
   → **Expected:** OK; Cap A used 50.
6. Try to add more / start another request with Cap A remaining 0.
   → **Expected:** Cap A daily / midnight messaging (empty) or Add-to-show situational copy if leftovers remain.
7. Qty down / remove a print from a full request (if you leave one at 25 without queueing).
   → **Expected:** Cap A refunds; Add re-enables while under 25 and Cap A remaining > 0.
8. (Optional) Change Cap B in Studio to 20; soft-reload / wait for quota refresh; request full at 20.

### Pass criteria

- [ ] Screenshot-class bug gone: never "Daily print limit" when Cap A remaining > 0 and request is at/over Cap B
- [ ] 26th print blocked with request-full copy
- [ ] Happy path 25 + 25 across two shows works
- [ ] Cap A daily still blocks when remaining is 0

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups
