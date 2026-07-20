# Human Checkpoint: Cap B split queue allotment re-test

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test / Cap B split UI allots 25 but queues entire request |
| Reason | Manual verification that partial queue respects selections after redeploy + client harden |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

1. Soft-reload Portal (Ctrl+Shift+R / hard refresh on `:3100`).
2. Re-run the Cap B 25+25 → queue only 25 of design A scenario below.
3. Reply `PASS` / `FAIL: …` / `PASS WITH NOTES: …`.

**You do not need to run any deploy command.** Functions were redeployed to `fresh-prints-dev` for you.

---

## Root cause (updated 2026-07-19, second pass)

| Layer | Evidence |
|-------|----------|
| **Git HEAD (committed)** | Pre-split callable: no Cap B, no `selections`, always allocates full request → `active`. |
| **Local working tree** | Split-aware: respects `selections`, Cap B on batch, `active` only when fully queued. |
| **Portal submit path** | Split UI builds `selections`; hardened to **snapshot** chosen rows when confirming the split step so bidding ack cannot fall back to full-queue. |
| **Why “redeploy claimed, still 50”** | Cap B code was never committed; a later deploy from a tree without Cap B (or owner testing before rollout finished) can still serve the old full-queue behavior. If Cap B=25 were enforced and selections omitted, the call would **error**, not silently queue 50 — successful full queue ⇒ server without Cap B / selections. |

**This pass:** Redeployed split-aware callables with log marker `cap-b-split-v2` (revision `queueportalprintrequesttoshow-00021-keh`) + client selection snapshot harden.

---

## Deploy status (fresh-prints-dev only)

| Function | Result | Notes |
|----------|--------|-------|
| `queuePortalPrintRequestToShow` | **Success** | Cap B + `selections` + `cap-b-split-v2` logs; revision **00021-keh** |
| `listPortalAllocatableShows` | **Success** | Includes `customerAllocatedQuantity` for Cap B fit UI |

**Production:** not deployed.  
**Owner deploy needed:** **No.**

---

## Manual Test Required

**Feature / area:** Portal Cap B / capacity split — partial Add to show  
**Environment:** local Portal (`npm run dev:portal` / soft-reload) + `fresh-prints-dev`  
**Prerequisites:**
- Soft-reload Portal after this message
- Studio Settings: Cap A = **50**, Cap B = **25** (confirm **saved**)
- ≥2 upcoming allocatable shows with capacity
- Prefer a **new** Current Request totaling 50 (prior wrongly-activated requests can confuse QA)

### Steps (prove only 25 lands on show A)

1. Soft-reload Portal. Build Current Request: **25 design A + 25 design B** (50).  
   → **Expected:** Cap A allows; request shows 50.

2. **Add Request to Show** → pick show A.  
   → **Expected:** Cap B callout; button **Choose prints for this show**.

3. Choose prints → **25 of A only** (B = 0) → **Add to show** → bidding ack.  
   → **Expected:** Show A gets **25** only. Request stays **draft / Continuable**. Design B (~25) still needs a show. Request is **not** fully activated.

4. Add remaining 25 to show B + bidding ack.  
   → **Expected:** Fully queued; leaves Continuable; status active.

### Pass criteria

- [ ] First show gets only chosen qty (25), not 50
- [ ] Remainder stays on same Current Request
- [ ] Second show completes the request

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** _pending_

---

## Related polish (closed — not this checkpoint)

| Date | Item | Result |
|------|------|--------|
| 2026-07-19 | Cap B callout copy / split qty auto-select / etc. | **PASS** (owner) — polish only |

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-19 | PASS on callout copy only (not allotment) | yes | 25+25 queue re-test still pending |
| 2026-07-19 | Owner: still queues entire 50 after prior “stale deploy” claim | yes | Redeployed 00021-keh + client snapshot harden; re-test again |
