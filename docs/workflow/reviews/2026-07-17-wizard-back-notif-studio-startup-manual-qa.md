# Manual QA: Wizard Back, Notifications, Unread Badges, Studio Startup

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | local Portal + Studio (`fresh-prints-dev`) |
| Status | pending — re-test History **Read** after ack client fix |

---

## Manual Test Checkpoint

**Feature / area:** Assisted Creation UX polish + account notifications + Studio unread badges  
**Why automated tests are insufficient:** Browser Back/URL sync, modal UX, badge visibility, and cold-start feel need human verification.  
**Environment:** local Portal + Studio against `fresh-prints-dev`  
**Prerequisites:** Portal + Studio running; staff and customer accounts; at least one `submitted` Assisted request you can update as the customer.

### Steps

1. Open Assisted Creation wizard mid-flow (e.g. step 4+). Click **Back** several times.  
   **Expected:** Step and URL move to the previous step without flashing forward to the later step.
2. Account → **Notifications** → uncheck proof-ready emails → Save → reload → reopen.  
   **Expected:** Preference persists. (Live email skip requires Functions/rules deploy — note if not deployed yet.)
3. As customer, update a `submitted` request (ideally twice). In Studio Assisted → **New**, confirm unread badge on stage tab, list card, and History header. Expand History: each unread customer update row should show a **Read** control (header has count badge only, no Read).
   **Expected:** Clicking **Read** on an older unread advances `readThroughAt` through that entry only (newer unread remain). Clicking **Read** on the newest unread clears all badges for that request. Note reads `Request updated` (not “Customer updated request”). Unread rows are subtly highlighted.
   **If Read fails:** Studio should toast (permission / rules deploy hint) instead of doing nothing. Live clear requires `firestore:rules` deploy including `assistedCreationUpdateAcks` — reply `APPROVE DEV DEPLOY` (or deploy yourself) then re-test.
4. Restart Studio with `npm run dev:studio`.  
   **Expected:** Window appears without a long Sharp derivative self-test delay at startup.
5. (After email Functions deploy) Staff uploads a proof so delivery succeeds.  
   **Expected:** History shows `Proof-ready email sent` (system). Opted-out customer does not get Resend delivery.

### Pass criteria

- [ ] Back has no forward flash
- [ ] Notifications toggle persists
- [ ] Unread badges appear; **Read** is per unread History row (not on header); older Read leaves newer unread; newest Read clears all
- [ ] History copy is non-redundant (`Request updated`)
- [ ] Studio cold start feels faster (no auto Sharp self-test)
- [ ] Email-sent history / opt-out checked **or** deferred until deploy approval

### Please reply with

- `PASS` — all applicable criteria met
- `FAIL: [description]` — what failed
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

Also for deploy (opt-out + email history worker + rules + acks):

- `APPROVE DEV DEPLOY` — run selective fresh-prints-dev deploy
- `NO DEPLOY` — keep deferred
- `I WILL DEPLOY` — you deploy; report when done

### Owner report (2026-07-17)

- History **Read** visible next to unread items but click appeared to do nothing (badges did not clear).
- **Root cause:** `markReadThrough` used `getDoc` before create; rules of the form `resource.data.userId == auth.uid` deny get on missing docs → permission error; empty `catch` hid it. Undeployed `assistedCreationUpdateAcks` rules on `fresh-prints-dev` would also deny writes.
- **Client fix:** create/update without pre-get; toast + console on failure; Read click `stopPropagation`.
- **Rules fix (local):** get allowed for missing docs on `{uid}__*` id prefix; create/update/delete require doc id `userId__requestId`.
- **Live Read still needs** owner `APPROVE DEV DEPLOY` (at least `firestore:rules`) before acks persist on `fresh-prints-dev`.
