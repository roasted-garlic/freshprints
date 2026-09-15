# Owner DEV QA Checkpoint

**Feature / area:** Historical Internal reconciliation · Admin Staff Artwork previews · DEV overlay + approved-email access  
**Goal:** `historical-internal-reconciliation-admin-artwork-previews-and-dev-access-hardening`  
**Why automated tests are insufficient:** UI Preview→Apply, Admin signed previews, overlay UX, and live DEV auth gates need the live DEV Firebase project + local Portal.  
**Environment:** `fresh-prints-dev` (Studio + **local** Portal)  
**DEV Portal hosting (authoritative):**
- Portal runs locally at `http://localhost:3100`
- `myprintrequest.dev` is the **development tunnel/domain** pointing at that local Portal
- **Do not** publish Portal to DEV App Hosting for this QA
- App Hosting publication is a **production** concern (`myprintrequest.com`) and remains separately gated

**Prerequisites:**
- [ ] Functions + Firestore Rules already on **`fresh-prints-dev`** (historical recon Preview/Apply, Staff Artwork preview path, `registerCustomer`, DEV access get/update/check, Rules for `settings/portalDevCustomerAccess`)
- [ ] Studio against DEV; Portal via `npm run dev:portal` (localhost and/or tunnel)
- [ ] Owner Studio account; at least one completed Internal History sheet with finishable allocations (or a safe DEV fixture) **and** one already-reconciled sheet to confirm the button is hidden
- [ ] One approved tester email + one unapproved email for C

---

## Workstream A — Historical reconciliation

### Steps
1. As **owner**, open Internal Sheets → **History** → select a **completed** sheet with unfinished Queued allocations → **Expected:** “Reconcile unfinished” is visible.
2. Select an already-reconciled completed History sheet (all allocations DONE) → **Expected:** “Reconcile unfinished” is **not** shown.
3. As non-owner staff (if available) on a sheet that still needs reconcile → **Expected:** control **not** shown / callable denies.
4. Click Reconcile unfinished → wait for Preview → **Expected:** centered modal with dimmed backdrop; counts shown; no data changes yet.
5. Confirm **Apply reconciliation** → **Expected:** finishable allocs become done; eligible Internal PRs move to Printed; multi-sheet unfinished PRs remain Queued; sheet stays **completed** (no new cycle).
6. Apply again on same sheet (if button still available) or re-open after → **Expected:** idempotent / already-resolved; button gone when no finishable allocs remain.

### Pass criteria
- [ ] Owner-only Preview→Apply works on one selected History sheet that still needs repair
- [ ] Button hidden when already reconciled
- [ ] Modal centered (not bottom-left)
- [ ] No new Internal Gang Sheet cycle; productionStatus stays completed
- [ ] Multi-sheet safety preserved; re-Apply safe

---

## Workstream B — Admin View Designs / Staff Artwork

### Steps
1. Portal Admin `/admin/show-queue` (localhost or tunnel) → open a request with **catalog**, **customer upload**, and **Staff Artwork** items → **View Designs**.
2. Catalog + upload → **Expected:** previews as before (or truthful unavailable/signing_failed).
3. Staff Artwork → **Expected:** derivative preview/thumbnail shown (not blank); never original/production artwork.
4. If a Staff Artwork lacks derivatives → **Expected:** truthful unavailable (not silent blank).
5. If signing fails → **Expected:** diagnosable signing failure (not silent).

### Pass criteria
- [ ] All three artwork types can preview when derivatives exist
- [ ] Missing/signing failures remain honest
- [ ] No Storage Rules / originals exposure observed

**Note:** Production IAM is **not** in scope. If later read-only prod evidence shows TokenCreator/signBlob gap, record required IAM for Manifest only — do not apply IAM now.

---

## Workstream C — DEV overlay + allowlist

### Overlay (local + tunnel; no App Hosting)
1. With Portal running locally, open **`http://localhost:3100/login`** → **Expected:** full-screen semi-transparent overlay; auth page visible behind; centered **THIS IS A DEVELOPMENT SERVER**; copy that requests will not be fulfilled; link/guidance to **MyPrintRequest.com**; small lower-right **I understand**.
2. Acknowledge → **Expected:** overlay dismisses for this visit; persistent DEV banner remains.
3. Navigate away, then return to `/login` (same tab) → **Expected:** overlay **shows again**.
4. Repeat on **`http://localhost:3100/register`** → **Expected:** overlay every visit.
5. Through the **`myprintrequest.dev` tunnel** (same local Portal), open `/login` and `/register` → **Expected:** same overlay behavior (tunnel is not a separate deploy).
6. Confirm production Portal (if checked read-only on `myprintrequest.com`) never shows overlay.

### Allowlist
1. Studio Settings → Portal DEV customer access → add approved email (normalized) → **Expected:** loads without permission error; no duplicates; helpers cannot manage (owner/admin only).
2. Register/login on DEV with **approved** email → **Expected:** succeeds (after overlay ack for that visit).
3. Register/login with **unapproved** email → **Expected:** generic restricted message; no allowlist membership details; session signed out / cannot use customer Portal.
4. Existing accidental unapproved customer → **Expected:** denied/signed out; Auth/customer records **not** auto-deleted.
5. Staff Portal admin path → **Expected:** staff still usable (allowlist does not block staff roles).

### Pass criteria
- [ ] Overlay appears on every `/login` and `/register` visit (localhost and tunnel)
- [ ] Banner remains after ack
- [ ] Server gate enforces on DEV; generic copy; no Auth auto-delete
- [ ] Production short-circuit unchanged (no overlay / open registration)

---

## Production Promotion Manifest (compact — for Signoff; not a DEV step)

| Kind | Entry |
|------|-------|
| DEV QA | **No** Portal App Hosting deployment. Localhost + `myprintrequest.dev` tunnel only. |
| Code/deploy (prod later) | Functions: historical recon Preview/Apply; `getPortalAdminShowQueueRequestDesigns` (Staff Artwork); DEV access callables + `registerCustomer` (prod no-op). **Portal App Hosting publication only for eventual production** (`myprintrequest.com`) — separately gated. Studio release for History reconcile UI + DEV email settings. |
| External/config | Prod Gen2 TokenCreator self-binding **if** read-only confirms missing (B). Auth blocking Functions: **not** required for this goal. |
| One-time data | Prod Internal History reconciliation Preview → owner authorize → Apply. |
| Minimal smoke | One repaired historical Internal PR Printed; Admin View Designs catalog/upload/Staff Artwork; production login/register open; no DEV overlay/gate on prod. |

Do **not** list a fictional DEV App Hosting publish step.

---

**Owner DEV QA result (2026-09-15):** `PASS`

---
