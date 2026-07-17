# Manual QA: Wizard Back, Notifications, Unread Badges, Studio Startup

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | local Portal + Studio (`fresh-prints-dev`) |
| Status | pending |

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
3. As customer, update a `submitted` request. In Studio Assisted → **New**, confirm unread badge on stage tab, list card, and History header. Expand History.  
   **Expected:** Badges clear after History opens; note reads `Request updated` (not “Customer updated request”).
4. Restart Studio with `npm run dev:studio`.  
   **Expected:** Window appears without a long Sharp derivative self-test delay at startup.
5. (After email Functions deploy) Staff uploads a proof so delivery succeeds.  
   **Expected:** History shows `Proof-ready email sent` (system). Opted-out customer does not get Resend delivery.

### Pass criteria

- [ ] Back has no forward flash
- [ ] Notifications toggle persists
- [ ] Unread badges appear and clear on History expand
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
