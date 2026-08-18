# Human Checkpoint

| Field | Value |
|-------|-------|
| Date | 2026-08-18 |
| Workflow | managed-phase / test / portal-add-to-show-unmissable |
| Reason | Owner DEV QA for Current Request drawer and request-review add-to-show copy |
| Status | **resolved** |
| Resolution | PASS — owner `DEV ADD TO SHOW UNMISSABLE QA: PASS` 2026-08-18 |

---

## What We Need From You

Run the Portal locally and confirm the Current Request drawer and request-review page make “add to a show” obvious without changing the existing queue behavior.

---

## Context

Plan: `docs/workflow/plans/2026-08-18-portal-add-to-show-unmissable-plan.md`  
Review: **approved**  
Automated tests: copy source-read 8/8 + Portal typecheck passed  

This is presentation/copy only. Show picker and add-to-show callable are unchanged.

---

## Manual Test Required

**Feature / area:** Portal Current Request drawer + request-review add-to-show clarity

**Environment:** local Portal (`npm run dev:portal`, typically port 3100)

**Prerequisites:**
- Signed-in Portal customer
- At least one design that can be added to Current Request
- An upcoming show the request can be added to (for the full add-to-show pass)

## Manual Test Checkpoint

**Feature / area:** Make Add to Show unmissable
**Why automated tests are insufficient:** Visual hierarchy, mobile/desktop cleanliness, and post-queue labeling need a human.
**Environment:** local
**Prerequisites:** signed-in customer; catalog design; allocatable show

### Steps

1. Put at least one design in Current Request.
2. Open the Current Request drawer.
3. Confirm **Review & Add to Show** is the prominent primary CTA.
4. Confirm the muted helper: `Next step: review your request, then add it to a show.`
5. Confirm a subdued **Needs a show** cue on the working request with items.
6. Confirm the drawer still looks clean on desktop and mobile (long titles must not collide with the helper/status).
7. Follow the CTA into request review.
8. Confirm Upload Designs and Browse Design Library are **gone from the header**.
9. Confirm **Back to Design Library** still works when you arrived from the library (`from=library`).
10. Confirm **Add Request to Whatnot Show** is the only prominent header action (wider on desktop, full-width on mobile) and that supporting copy makes the next step obvious.
11. Click **Add Request to Whatnot Show** → existing show picker opens (no skipped review, no auto-queue).
12. Complete the normal Add to Show flow (modal **Add to show**).
13. Confirm no extra step and the request queues normally.
14. Re-open the request after it is queued and confirm **Needs a show** does **not** appear.
15. Confirm How this works / Help still makes the flow understandable: add designs → review Current Request → add to a show.
16. Confirm adding more designs still works through normal Portal navigation (not the removed header buttons).

### Pass criteria
- [x] Drawer CTA is **Review & Add to Show** with the next-step helper
- [x] **Needs a show** appears only on the working Current Request with items
- [x] Review header has no Upload Designs / Browse Design Library
- [x] **Add Request to Whatnot Show** is prominent (wider desktop / full-width mobile) and opens the existing picker; modal **Add to show** still queues
- [x] Queued request is not labeled **Needs a show**
- [x] Desktop and mobile layouts stay clean
- [x] No upload/browse regression outside the review header

### Please reply with
- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** PASS (`DEV ADD TO SHOW UNMISSABLE QA: PASS`)

---

## Impact If Delayed

Signoff cannot be approved. Production PR is not opened.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint doc, answer clarifying questions

**Forbidden:** Implement extra scope, deploy, mix analytics, production push, create branches

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-08-18 | `DEV ADD TO SHOW UNMISSABLE QA: PASS` | yes | Signoff approved |

---

## Resume Checklist
- [x] User feedback recorded in `.cursor/workflow/state.md` Decision Log
- [x] `Human Checkpoint Required` set to `no`
- [x] Plan/review updated if scope changed
- [x] `Next Required Step` set for current phase
