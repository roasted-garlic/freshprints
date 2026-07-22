# Human Checkpoint: Portal Assisted Resume + Guest Auth Overlay

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Workflow | managed-phase / test / assisted resume + guest overlay |
| Reason | Manual UI verification for hub buttons and mobile overlay position |
| Status | **resolved** |
| Resolution | **PASS** (owner, 2026-07-21) |

---

## What We Need From You

Confirm Assisted Creation Reset/Continue on the Custom Designs hub, and that the guest Login required overlay sits higher on mobile (clear of bottom nav).

---

## Context

Plan: `docs/workflow/plans/2026-07-21-portal-assisted-resume-and-auth-overlay-plan.md`

**Note:** The separate custom-request details parity manual checkpoint remains open. Do not treat a PASS here as PASS for that work.

---

## Manual Test Required

**Feature / area:** Custom Designs assisted resume + guest auth overlay (mobile)

**Environment:** local Portal (`npm run dev` / portal port 3100)

**Prerequisites:**
- Signed-in customer for assisted draft tests (no open assisted Firestore request, or cancel/complete any open one first)
- Guest / signed-out session for overlay test on a gated route (e.g. `/requests` or another non-public path)
- Mobile viewport or device ≤ ~768px width for overlay

### Steps — Assisted Reset / Continue

1. On `/custom-designs`, confirm **Fresh Prints Assisted Creation** shows **Start assisted request** when you have no draft and no open request. → **Expected:** Start only; default description copy.
2. Start assisted wizard, enter some progress (description or next step), leave back to hub without submitting. → **Expected:** Card shows continue/reset copy + **Reset request** + **Continue request**.
3. Tap **Continue request**. → **Expected:** Wizard opens at the saved step with prior answers.
4. Return to hub; tap **Reset request**. → **Expected:** Wizard opens at first step with empty answers; returning to hub again shows **Start assisted request** (no resume).
5. (If you have an open submitted/in-progress Firestore assisted request) Hub shows **View request status** instead of Reset/Continue. → **Expected:** Open request takes precedence.

### Steps — Mobile Login required overlay

1. Sign out (or use guest). Open a gated in-shell route so **Login required** overlay appears. → **Expected:** Overlay card is visible.
2. On mobile width, compare card position to bottom nav. → **Expected:** Card sits in the upper-mid viewport, clearly above the bottom nav / FAB — not visually stuck near the bottom.
3. (Optional) Desktop width: overlay still looks reasonably centered. → **Expected:** No regression vs prior desktop look.

### Pass criteria

- [ ] Assisted Start vs Reset/Continue matches Find-style behavior
- [ ] Reset clears draft; Continue resumes
- [ ] Open request still shows View status
- [ ] Mobile overlay sits higher / clear of bottom nav

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS**

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-21 | PASS | yes — soft-signoff approved | Soft-signoff complete; next goal is AI context / final-source phase |
