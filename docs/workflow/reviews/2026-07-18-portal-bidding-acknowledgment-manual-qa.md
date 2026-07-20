# Manual QA: Portal bidding acknowledgment

**Feature / area:** Signup pre-create acknowledgment + Add to Show confirmation  
**Why automated tests are insufficient:** Modal ordering, checkbox gating, and Auth/Firestore create timing need human verification.  
**Environment:** Portal local (http://localhost:3100) against `fresh-prints-dev`  
**Prerequisites:** Soft-reloaded Portal; Functions `registerCustomer` + `queuePortalPrintRequestToShow` deployed to `fresh-prints-dev` (version `portal-bidding-ack-v3`)

### Steps

1. Open `/register` → fill email signup form → click **Create account** without confirming acknowledgment.  
   → **Expected:** Modal opens (**Request Portal Acknowledgment**). No Auth account created yet (Cancel returns to form; no signed-in session). Body includes exclusive gang-sheet paragraph with funkyfreshprints.com link.

2. On modal, leave checkbox unchecked.  
   → **Expected:** Primary **Create account** disabled. Checkbox label: *I understand how the Fresh Prints Request Portal works…*

3. Check the box → **Create account**.  
   → **Expected:** Account creates; lands in Portal; `users/{uid}.portalBiddingAcknowledgments.signup` has version `portal-bidding-ack-v3`.

4. (Optional) Google path: Continue with Google → complete profile form submit → same modal before provision. Cancel does not create `customers` doc.

5. Open Current Request with ≥1 item → **Add to show** → pick a show → **Add to show**.  
   → **Expected:** **Add to Show Print Run** modal; exclusive gang-sheet paragraph + funkyfreshprints.com link; primary disabled until checkbox; Cancel returns to show picker without queueing. Checkbox: *I understand that these designs are not reserved for me…*

6. Check box → **Add to show**.  
   → **Expected:** Request queues; `printRequests/{id}.showQueueBiddingAcknowledgment` version `portal-bidding-ack-v3`; user `lastQueueToShow` updated. Signup ack alone did not skip this modal.

### Pass criteria

- [x] Signup modal title **Request Portal Acknowledgment**; appears before Auth/Firestore create; Cancel creates nothing
- [x] Signup checkbox required; ack stored on user as `portal-bidding-ack-v3`
- [x] Add to Show title **Add to Show Print Run**; always shows confirmation (even after signup ack)
- [x] Queue without checkbox blocked; with checkbox succeeds and stores printRequest + user queue ack (`v3`)
- [x] Exclusive gang-sheet paragraph + funkyfreshprints.com link present on both modals

### Please reply with

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

**Your result:** **PASS** (owner, 2026-07-19) — bidding acknowledgments v3 batch
