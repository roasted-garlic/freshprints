# Human Checkpoint: Assisted Request Messages, Auth Return, and UI Parity

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Workflow | Managed phase — assisted-history-auth-redirect-studio-parity |
| Reason | Authenticated navigation and Studio/Portal visual behavior require owner verification. |
| Status | **pending** |
| Resolution | pending |

---

## What We Need From You

Please verify the three scenarios below locally and reply with the requested result.

---

## Context

This checkpoint now also covers the owner-approved Assisted Messages expansion: proof/revision events remain in the timeline, customers and staff can send text-only chat messages at every status, Studio **Messages** matches Portal (thread + compose only), and Staff actions live on Overview (proof upload on Proofs).

No Firestore or Storage rules, indexes, environment variables, or secrets changed. Dev Functions that must exist before sections D–E / C.12:

```bash
firebase deploy --only functions:customerSendAssistedCreationMessage,functions:staffSendAssistedCreationMessage,functions:staffUpdateAssistedCreationStatus --project fresh-prints-dev
```

`staffUpdateAssistedCreationStatus` is required for Overview **Save notes** (`update_notes`). Do not deploy until the owner replies `APPROVE DEV DEPLOY`; the owner may run the command instead.

---

## Manual Test Required

**Feature / area:** Assisted Creation request status in Portal and Studio

**Why automated tests are insufficient:** The authenticated Firebase redirect sequence and cross-app visual parity depend on a real local account, request data, browser navigation, and human visual review.

**Environment:** local

**Prerequisites:**
- Portal running at `http://localhost:3100`.
- Studio running locally.
- A customer account and corresponding staff access.
- An Assisted Creation request with at least two proofs and, ideally, two revision requests.
- Use a non-production/test request; do not send Brevo email.

### A. Messages timeline numbering

1. Open the request in Portal and select **Messages**.  
   → **Expected:** Proof transitions read `Proof 1`, `Proof 2`, and so on; revision transitions independently read `Revision request 1`, `Revision request 2`, and so on.
2. Compare Portal **Proofs** and **Messages**.  
   → **Expected:** Each proof number identifies the same chronological proof in both tabs.
3. Open the same request in Studio and select **Messages**.  
   → **Expected:** Studio Messages is chronological (oldest at top, newest at bottom), matching Portal; each label keeps its chronological number (for example, `Proof 2` remains `Proof 2` below `Proof 1`).
4. Inspect customer-update and proof-notice entries.  
   → **Expected:** Customer updates remain `Updated`; successful proof notices remain `Email sent` and do not consume proof/revision numbers.

### B. Post-sign-in return URL

1. Sign out of Portal and directly open a protected Assisted request status URL, including any query string.  
   → **Expected:** Portal sends you to `/login` with one encoded `returnTo` parameter.
2. Sign in with email/password.  
   → **Expected:** After Firebase/customer bootstrap completes, Portal returns to the exact protected path and query—not the home/dashboard.
3. Repeat using Google sign-in for an existing customer.  
   → **Expected:** Portal returns to the same protected target.
4. If a safe test account requiring profile completion is available, repeat through `/complete-profile`.  
   → **Expected:** The target survives profile completion and is used after completion.
5. Open `/login?returnTo=https%3A%2F%2Fevil.example`, sign in, or observe navigation if already signed in.  
   → **Expected:** Portal falls back to `/`; it never navigates to the external origin.
6. Open `/login?returnTo=%2Flogin%3FreturnTo%3D%252Frequests`.  
   → **Expected:** Portal falls back to `/` and does not enter an auth redirect loop.

### C. Studio ↔ Portal visual and control parity

1. Compare the same request in Portal and Studio.  
   → **Expected:** Both expose clearly labeled **Overview**, **Proofs**, and **Messages** tabs with equivalent customer-visible information grouped in the same logical areas.
2. Select each Studio tab with mouse and keyboard.  
   → **Expected:** The active tab is visually clear, focus is visible, and the selected panel changes correctly.
3. Review Studio **Overview**.  
   → **Expected:** Request status badge with a ⋯ menu (Reject / Cancel / Restore as applicable — Portal-style overflow next to status). Separate **Internal staff notes** card with **Save notes** and Saved/Unsaved status. **Staff actions** card appears only when primary progressive actions apply (Start work / Resume revision) — not a lonely Reject/Cancel-only card. Overflow and notes do **not** appear under Messages or Proofs.
4. Review Studio **Proofs**.  
   → **Expected:** Proofs are numbered chronologically (`Proof 1` = oldest), listed **newest first** (most recent at top with `(latest)`), and previews/details/download remain intact. When status is `in_progress`, proof upload lives here. Portal **Proofs** matches the same sort and numbering. No Staff lifecycle buttons under Proofs.
5. Review Studio **Messages**.  
   → **Expected:** Numbered entries, notes, actor/read context, and unread **Read** controls remain usable; layout matches Portal messaging (bubbles; staff/system left, customer right; oldest → newest / newest at bottom). Below the capped thread: **Send a message** compose only — no Staff actions, internal notes, or proof upload.
6. Verify staff-only areas.  
   → **Expected:** Internal notes on Overview; primary Start/Resume on Overview when applicable; Reject/Cancel/Restore via status ⋯; proof upload on **Proofs** when `in_progress`; staff chat compose on **Messages**. None of these appear in Portal.
7. Check Studio at a narrow window width and in available light/dark themes.  
   → **Expected:** Tabs remain usable, content does not overlap, and existing theme tokens render readable contrast. Status ⋯ trigger and menu items remain readable in light and dark (especially danger items).
8. **Portal dark theme — request ⋯ actions menu** (QA follow-on fix 2026-07-17). On Assisted Creation status next to the status badge, open the ⋯ menu.  
   → **Expected:** Trigger icon is clearly visible on its button; menu surface and **Update request** text have readable contrast; **Cancel request** remains clearly danger-styled; hover/focus remain usable. (Studio has no customer Update/Cancel menu; Studio staff overflow is Reject/Cancel/Restore.)
9. **Artwork grey preview background** (QA follow-on fix 2026-07-17). On a request with light or transparent references/proofs, check Portal status (references + ready proof + proof modal) and Studio Assisted Overview/Proofs (thumbs, proof row, proof modal, pending upload preview) in light and dark themes.  
   → **Expected:** Image wells use the same solid grey as Design Library (`--color-artwork-preview-bg`); artwork remains visible against the matte; no theme-colored wash behind transparent/light art.
10. **Studio Messages chat layout** (QA follow-on fix 2026-07-17). Open Messages on the same request in Portal and Studio.  
    → **Expected:** Both use message-style bubbles with role/timestamp meta; staff/system left and customer right; chronological ascending (newest at bottom); Studio unread customer-update rows still show **Read** without breaking the bubble layout.
11. **Proofs tab newest-first** (QA follow-on 2026-07-17). On a request with ≥2 proofs, open **Proofs** in Portal and Studio.  
    → **Expected:** List order is most recent → least recent; top row shows `(latest)`; labels remain chronological (`Proof 1` oldest … higher N newer); History/Messages still oldest → newest; opening a proof modal still shows the chronological proof number.
12. **Internal staff notes Save UX** (QA follow-on 2026-07-17). On Studio **Overview**, edit Internal staff notes.  
    → **Expected:** Status shows **Unsaved changes**; **Save notes** is a clear **primary blue** button (idle darker blue, hover lighter blue) and enables when dirty; after save (requires deployed `staffUpdateAssistedCreationStatus` with `update_notes`), toast confirms and status shows **Saved**; notes remain internal (not a Messages bubble); request status unchanged. If you see **Unsupported staff action**, the callable is not deployed yet — run the deploy command above after `APPROVE DEV DEPLOY`.
13. **Studio status ⋯ overflow** (QA follow-on 2026-07-17). On an `in_progress` request, confirm Overview has no Reject/Cancel button row — open the ⋯ next to the status badge instead.  
    → **Expected:** Menu lists Reject and Cancel; choosing either opens the existing reason modal; Start work / Resume are absent for this status (no empty Staff actions card). On `submitted`, Start work remains a primary Overview button and Reject/Cancel remain in ⋯. On cancelled (owner), Restore… is in ⋯.
14. **Studio button hover (idle dark → hover light)** (QA follow-on 2026-07-17). On Assisted Overview / modals, hover primary (blue Save notes / Start work), secondary (Cancel), danger (Reject/Cancel confirms), and any warning/yellow buttons.  
    → **Expected:** Idle fill is the darker shade; hover lightens (not darkens). Pattern holds in light and dark Studio themes.
15. **Messages thread scrollbar** (QA follow-on 2026-07-17). On a request with enough Messages to overflow the capped thread, open **Messages** in Portal (dark theme first; light optional) and Studio.  
    → **Expected:** Thread scrollbar is thin/subtle (transparent or near-invisible track, muted thumb); no chunky native Windows arrow buttons where the browser allows custom scrollbars (Chromium/WebKit). Thread still scrolls internally; page does not grow unbounded; composer stays below the scroll region. Other Portal page scrollbars unchanged.

### D. Customer messaging at every stage

1. In Portal **Messages**, send a normal note on a `submitted` request.  
   → **Expected:** The Send button shows a busy state, the composer clears after success, the new `Message` bubble appears at the bottom, and the request remains `submitted`.
2. Repeat on test requests in `in_progress`, `proof_ready`, and `revision_requested`.  
   → **Expected:** Each message sends successfully and preserves the exact status.
3. Open terminal test requests in Past Requests and send from **Messages** for `approved`, `rejected`, and `cancelled`.  
   → **Expected:** All three accept messages. Helper copy makes clear that messaging does not reopen the request; status remains terminal.
4. Open each new message in Studio.  
   → **Expected:** It appears as a customer/right-side bubble, contributes to the unread badge, and its **Read** control advances unread state without changing the message or request.
5. Submit whitespace only, then paste more than 2,000 characters.  
   → **Expected:** Blank cannot send; browser input caps at 2,000 and the server rejects any bypassed oversized payload.
6. Send two messages less than 10 seconds apart.  
   → **Expected:** The second fails with a safe wait message; it succeeds after the cooldown.
7. Use a request with enough entries to exceed the panel height in Portal and Studio.  
   → **Expected:** The page/panel does not grow indefinitely; the timeline scrolls internally, opens at the newest entry, and the Portal/Studio composer remains below the scroll region.
8. Verify Portal mobile width and Studio light/dark themes with keyboard navigation.  
   → **Expected:** **Messages** tab, scroll region, textarea, and Send button are reachable with visible focus and no overlap.

### E. Staff messaging (Studio)

1. On Studio **Messages**, send a staff note on an open request.  
   → **Expected:** Composer clears; a staff/left `Message` bubble appears at the bottom; request status is unchanged; Portal shows the same message.
2. Confirm Studio **Messages** has no Staff actions block.  
   → **Expected:** Start work / Resume revision / Cancel / Reject / Internal staff notes / proof upload are absent on Messages; Overview still has notes + primary actions when applicable; status ⋯ still has Reject/Cancel/Restore; Proofs still has upload when `in_progress`.
3. Send whitespace only, then attempt >2,000 characters and a second message within 10 seconds.  
   → **Expected:** Same validation/cooldown behavior as customer messaging.
4. As a helper (if available), open Messages.  
   → **Expected:** Thread is visible; send is blocked with helper-safe copy.

### Pass criteria

- [ ] Portal and Studio History number proofs and revision requests independently and consistently.
- [ ] Email/password login returns to the original protected path and query.
- [ ] Existing-customer Google login returns to the original protected path and query.
- [ ] Profile completion return works if a suitable test account is available, or is explicitly noted as not run.
- [ ] Hostile/external and auth-loop targets fall back to `/`.
- [ ] Studio Overview / Proofs / Messages visually and structurally align with Portal (Messages uses chat bubbles; oldest → newest).
- [ ] Studio Overview: notes (Save notes), primary Start/Resume when applicable, Reject/Cancel/Restore in status ⋯; proof upload on Proofs; Messages is thread + compose only.
- [ ] Internal staff notes Save UX: Unsaved → primary blue Save notes → Saved; notes stay internal; status unchanged (scenario C.12). Requires Functions deploy for `update_notes`.
- [ ] Studio status ⋯ holds Reject/Cancel/Restore; no lonely Reject/Cancel-only Staff actions card (scenario C.13).
- [ ] Studio buttons idle darker → hover lightens for primary/secondary/danger/warning (scenario C.14).
- [ ] All existing staff-only controls remain present and usable in their tab homes.
- [ ] No Brevo email or production action was performed.
- [ ] Portal dark-theme ⋯ menu: trigger and **Update request** / **Cancel request** items are readable (scenario C.8).
- [ ] Assisted Creation image wells match Design Library grey preview background in Portal and Studio (scenario C.9).
- [ ] Studio Messages matches Portal messaging layout and sort; unread **Read** still works (scenario C.10).
- [ ] Customer messages send in all seven statuses without changing status (scenario D).
- [ ] Staff messages append as chat `Message` bubbles without changing status (scenario E).
- [ ] Message auth/ownership, 2,000-character limit, and 10-second cooldown behave safely.
- [ ] Portal and Studio timelines cap height, scroll internally, and show newest at the bottom.
- [ ] Proofs tab lists newest → oldest with chronological labels; History unchanged (scenario C.11).
- [ ] Messages thread scrollbar is thin/subtle without chunky native arrows; overflow still works (scenario C.15).

### Please reply with

- `PASS` — all required criteria met.
- `FAIL: [step and description]` — include which scenario failed.
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups; mention any unavailable optional profile-completion test.

**Your result:** _pending_

---

## Impact If Delayed

Implementation remains locally complete, but workflow signoff is blocked until the authenticated and visual checks are completed or explicitly waived.

---

## Agent Actions While Paused

**Allowed:** Read docs, update checkpoint documentation, answer clarifying questions, and apply narrow owner-reported visual QA fixes for this phase (record in Decision Log).

**Forbidden:** Deploy, migrate, change secrets, expand scope beyond QA fixes, send Brevo email, commit, or push unless asked.

---

## Resolution Record

| Date | User response | Recorded in state | Follow-up |
|------|---------------|-------------------|-----------|
| | | | |

---

## Resume Checklist

- [ ] User feedback recorded in `.cursor/workflow/state.md` Decision Log.
- [ ] Test report updated with manual result.
- [ ] `Human Checkpoint Required` set to `no`.
- [ ] `Next Required Step` set to signoff or failure remediation.
