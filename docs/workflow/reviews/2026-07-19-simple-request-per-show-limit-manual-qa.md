# Human Checkpoint: Manual QA — simple request-per-show limit

| Field | Value |
|-------|-------|
| Date | 2026-07-19 |
| Workflow | managed-phase / test / Replace Cap A/B with one request-per-show limit |
| Reason | Manual UI/UX QA on fresh-prints-dev after soft deploy (ADR-FP-102) |
| Status | **resolved** |
| Resolution | **PASS WITH NOTES** (owner 2026-07-20) |

---

## What We Need From You

Soft-reload Portal against `fresh-prints-dev`, run the checklist below, and reply **PASS**, **FAIL: …**, or **PASS WITH NOTES: …**.

---

## Context

Implement complete per plan + owner notes:

1. Sole limit `L` = `maxQuantityPerShowPerCustomer` (legacy Cap A mirrored on write only)
2. Portal Cap A daily quota callable removed in same deploy batch
3. Stale `selections` rejected; no remainder requests

Deployed to **fresh-prints-dev**: Functions (scoped) + Firestore rules. **No production.**

Plan: `docs/workflow/plans/2026-07-19-simple-request-per-show-limit-plan.md`  
Test report: `docs/workflow/reviews/2026-07-19-simple-request-per-show-limit-test-report.md`  
ADR: ADR-FP-102 in `docs/project/DECISIONS.md`

---

## Manual Test Required

**Feature / area:** Portal sole print limit `L` + atomic queue-to-show  
**Why automated tests are insufficient:** End-to-end Portal UX, Settings, and show capacity need live Firebase  
**Environment:** local Portal soft-reloaded against `fresh-prints-dev`  
**Prerequisites:**

- Soft-reload / hard-refresh Portal (must not call removed Cap A quota callable)
- Studio Settings → Print request limits: set **Max prints per Current Request / per customer per show** to **25** and Save
- Customer account with Continuable Current Request access
- At least two allocatable shows (one with room ≥ 25; one with remaining capacity &lt; 25 if possible)

### Steps

1. Build Current Request to **25** prints → **Expected:** cannot add a 26th print (button disabled / clamp / clear error). No daily Cap A banner.
2. Add to show with room ≥ 25 → **Expected:** entire request queues; request becomes `active` on that show only; Current Request is **empty** (virtual empty / no leftover items). No Choose Prints modal. No remainder navigation.
3. Attempt a second Portal request to the **same** show → **Expected:** show disabled and/or clear reject (“already have a print request on this show”).
4. Build Current Request to 25; pick a show with capacity **&lt; 25** → **Expected:** clean reject; Continuable request unchanged (same qty).
5. Confirm no Choose Prints / remainder UX anywhere in Portal queue flow.
6. Confirm daily Cap A banner / midnight Central copy is gone.
7. Clear / qty-down still work (no Cap A refund semantics; items empty / lower as expected).
8. **Upload Designs — request full:** fill Current Request to **L** (25), open Upload Designs → **Expected:** danger-styled overlay (“This request is full (25 prints)” + come-back copy); drop zone / Images / Folder / ZIP / checkboxes / Add blocked; **Back** (footer and overlay) still works. Donate Designs page has **no** overlay.
9. **Upload Designs — 1 slot left:** leave Current Request at **L − 1**, open Upload Designs → **Expected:** warning hint “1 print left…”; footer badge like “1 print left on this request. You can add 1 image.”; picking multiple images only accepts **1**; Add attaches one print only. **No** daily images / upload starts / ZIPs / midnight CST (or UTC) copy on Upload Designs.
10. **Donate Designs badge:** open Donate → **Expected:** footer like `N of 1000 donated images left today (resets at midnight CST).` only — no upload starts / ZIPs.
11. **Upload Designs — ownership gate (not quota):** with room on the request and **1 ready** image, leave “I own this artwork…” **unchecked** → **Expected:** Add stays disabled; confirmations call out **(required)**; footer hint / button title says to confirm ownership (not “quota”). Check ownership → **Expected:** Add enables; attach works.

### Pass criteria

- [x] Max Current Request = `L` (25) enforced on add paths
- [x] Full queue succeeds; empty Current Request after; one show only
- [x] Second request to same show rejected / disabled *(Functions uniqueness still active — see notes)*
- [x] Undersized show capacity → atomic reject, no partial / remainder
- [x] No Cap A daily UI
- [x] Studio single limit field works (save 25)
- [x] Upload Designs full overlay when request at L; Back usable
- [x] Upload Designs caps selection to remaining print slots; footer shows request room (not daily UTC buckets)
- [x] Donate footer shows images/day only (+ midnight CST)
- [x] Upload Designs Add requires ownership check; disabled reason is obvious when unchecked

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS WITH NOTES** (owner 2026-07-20: “call all that we have been working on PASSED”)

---

## Impact If Delayed

Signoff blocked. `fresh-prints-dev` runs the new model; production unchanged.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint/state, answer clarifying questions

**Forbidden:** Signoff; production deploy; further implementation unless FAIL requires in-scope fix; commit unless asked

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-20 | Owner: call polish + limit work PASSED | yes | Signoff **approved_with_notes**. Open: Functions still enforces one Portal request per customer per show; Portal show callouts correctly use spots-exhausted (used L). Confirm later if multi-request-under-L is desired. |

---

## Resume Checklist

- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [x] `Human Checkpoint Required` set to `no` (if PASS)
- [x] Test report updated with manual result
- [x] `Next Required Step` → Signoff (if PASS) or fix (if FAIL)
