# Owner DEV QA Checklist — Portal post-queue items + submit nudge

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-post-queue-items-and-submit-nudge-corrective` |
| Environment | Localhost Portal (`http://localhost:3100`) → `fresh-prints-dev` |
| Status | **PASS recorded — Signoff approved_with_notes** |
| Checkpoint | `OWNER DEV QA: portal-post-queue-items-and-submit-nudge-corrective` — **PASS** |

## Manual Test Checkpoint

**Feature / area:** Post-queue item visibility + submit nudge toast
**Environment:** local Portal → `fresh-prints-dev`

### Steps

1. From catalog, add a design to Current Request → **Expected:** ~8s toast: *You're not done yet — review and submit your request when you're ready.* with **Review request** (no Undo).
2. Click **Review request** → **Expected:** opens that request’s detail page with the design(s) visible.
3. Add more designs as needed, then Queue to Show → **Expected:** queued detail shows the designs (not **0 designs** / “No designs yet”).
4. Refresh the queued detail page → **Expected:** designs still present.
5. Remove from Show & Edit → **Expected:** still works; designs remain editable.
6. Trigger an error toast elsewhere if convenient → **Expected:** still auto-dismisses around the normal ~4s (not 8s).
7. Add 3 designs, Clear request (drawer) and Clear all designs (request page) → **Expected:** cart/detail empties immediately while the confirm modal processes; no leftover highlighted designs after close; refresh still empty.

### Pass criteria

- [ ] Submit nudge toast (no Undo; Review request CTA)
- [ ] CTA opens request page with designs
- [ ] After queue, designs visible (not empty)
- [ ] Refresh keeps designs
- [ ] Unqueue still works
- [ ] Other toasts keep default duration

### Please reply with

- `OWNER DEV QA: portal-post-queue-items-and-submit-nudge-corrective - PASS`
- `OWNER DEV QA: portal-post-queue-items-and-submit-nudge-corrective - FAIL: [description]`
- `OWNER DEV QA: portal-post-queue-items-and-submit-nudge-corrective - PASS WITH NOTES: [notes]`

## Owner result (2026-09-12)

**`PASS on everything`** — recorded as Owner DEV QA **PASS**.

Signoff: `docs/workflow/reviews/2026-09-12-portal-post-queue-items-and-submit-nudge-corrective-signoff.md` (`approved_with_notes`).
