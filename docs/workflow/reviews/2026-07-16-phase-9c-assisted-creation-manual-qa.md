# Human Checkpoint: Phase 9C Assisted Creation Manual QA

| Field | Value |
|-------|-------|
| Date | 2026-07-16 |
| Workflow | Managed phase / test / Phase 9C Assisted Creation |
| Reason | Cross-app Portal, Studio, Firebase, and visual behavior requires human verification |
| Status | **resolved** |
| Resolution | **PASS** — owner confirmed all manual QA pass criteria |

---

## What We Need From You

Run the fresh-prints-dev workflow below and reply with `PASS`, `FAIL: [description]`, or `PASS WITH NOTES: [notes]`.

---

## Context

The pending Assisted Creation callables were selectively deployed to fresh-prints-dev on 2026-07-16. Automated checks are recorded in `2026-07-16-phase-9c-assisted-creation-test-report.md`.

---

## Manual Test Checkpoint

**Feature / area:** Phase 9C Assisted Creation and related Studio navigation polish

**Why automated tests are insufficient:** The workflow crosses Portal, Studio, Firebase Storage/Firestore, Electron file handling, modal layout, and visual state transitions.

**Environment:** Local Portal and development Studio connected to `fresh-prints-dev`

**Prerequisites:**
- Hard-refresh Portal after the function deploy
- Restart Studio so renderer, preload, and CSS changes are loaded
- Use a Portal customer and owner Studio account
- Have one small reference image and one large proof image available

### Steps

1. Submit an Assisted Creation request from Portal.  
   **Expected:** Status is `Submitted`; Brief is open, other Overview sections are collapsed; Overview, Proofs, and History are separate tabs.

2. Open the three-dot menu and choose **Update request**. Add text and a new reference, then save.  
   **Expected:** Save succeeds without `internal`; the modal closes; the updated details/reference appear. Cancel remains available through the menu, not the footer.

3. In Studio, open Custom Designs → Assisted and click each stage tab, including empty stages. Also switch Print Requests stage and triage tabs once.  
   **Expected:** Every tab changes on the first click without flashing or snapping back.

4. In Studio, open the submitted Assisted request. Check Staff actions, then choose **Start work**.  
   **Expected:** Start work, Reject, and Cancel have equal width/height where shown; the request moves to In progress. Portal no longer offers Update request.

5. Stage a large proof image and enter a staff proof note.  
   **Expected:** Preview remains contained; filename, note field, and buttons do not overlay the image. Submit the proof to the customer.

6. In Portal, open the proof-ready request.  
   **Expected:** Staff note is visible with the proof/proof detail; Proofs does not duplicate the note above the list. Respond to proof is always visible, while Approve and Request revisions are separate collapsed sections.

7. Expand **Request revisions**, enter notes, and submit.  
   **Expected:** The warm-yellow button has hover/active feedback; Studio moves the request to Revisions and displays the customer note.

8. Submit a revised proof from Studio with another staff note.  
   **Expected:** Portal returns to Proof ready; both proofs are available; the latest note is associated with the latest proof.

9. Expand **Approve**, optionally add a rating/note, and approve.  
   **Expected:** The full-width soft-blue button has hover/active feedback; status becomes Completed; rating/note are retained.

10. Open History on the status page and a Past Requests modal.  
    **Expected:** Chat-style entries identify You / Fresh Prints / System, with timestamps and notes; modal and status content remain left-aligned.

11. Open Studio Custom Designs → Suggestions. In the **Live lists** header, click **Browse subjects & tones**.  
    **Expected:** Button is top-right of Live lists; modal has Subjects and Tone/style tabs; search filters only the active tab; approved customer suggestions are distinguishable from staff additions.

12. On a disposable request, verify Cancel/Reject reason confirmations and owner Restore.  
    **Expected:** Reasons are required and appear in history; Restore returns a cancelled request to Submitted only when no other open request blocks it.

13. In development Studio, use Test Data Reset for Assisted Creation data.  
    **Expected:** The `assistedCreationRequests` test data and `assisted-creation/` storage targets are cleared without affecting production.

### Pass criteria

- [ ] Submitted updates and new references save successfully
- [ ] Updates are blocked after Start work
- [ ] Proof/revision/approval lifecycle works across Portal and Studio
- [ ] Notes are visible in the expected proof and history locations without duplication
- [ ] Empty tabs and Print Request tabs respond on the first click
- [ ] Suggestions browse modal placement, tabs, and search work
- [ ] Cancel/reject/restore reason audit works
- [ ] Dev wipe targets Assisted Creation data correctly
- [ ] No blocking visual regressions

### Please reply with

- `PASS` — all criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS**

---

## Impact If Delayed

Phase 9C cannot be signed off, and the proof-ready email phase should not begin implementation.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint/test records, answer clarifying questions

**Forbidden:** Begin the email phase, deploy production, change secrets, or expand Phase 9C scope

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| 2026-07-16 | `PASS` | yes | Phase 9C may proceed to signoff; no manual-QA follow-up required |

---

## Resume Checklist

- [x] User feedback recorded in `.cursor/workflow/state.md`
- [x] `Human Checkpoint Required` set to `no`
- [x] Test report updated
- [x] Phase 9C signoff completed
- [ ] Provider-agnostic Resend proof-email phase planned and reviewed
