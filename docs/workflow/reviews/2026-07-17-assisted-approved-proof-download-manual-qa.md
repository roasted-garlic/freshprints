# Manual QA: Assisted Creation approved proof download

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | `fresh-prints-dev` + local Portal / Studio |
| Feature | Download approved proof PNG + residual UX (Portal + Studio proof detail) |

---

## Manual Test Checkpoint

**Feature / area:** Assisted Creation approved proof download + Studio proof detail (large preview, notes in modals)  
**Why automated tests are insufficient:** Transparency, browser download, and Studio proof preview density need visual verification.  
**Environment:** local Portal / Studio against `fresh-prints-dev`  
**Prerequisites:** Staff Studio + customer Portal accounts; ability to upload a **PNG with transparency** as a proof.

### Layout intent (before → after)

| Surface | Condensed | Full-size / expanded |
|---------|-----------|----------------------|
| Studio Proofs **list** | Compact thumbnail rows + short meta | — |
| Studio proof **detail modal** | Meta rows; **Proof note** / **Linked notes (N)** buttons | **Wide modal** (`~min(92vw, 40rem)`) with **square** preview (`aspect-ratio: 1/1`) + `object-fit: contain` (full art, grey letterbox OK) |
| Nested notes modal | — | Scrollable full note text |
| Portal Proofs **list** | Compact rows **with thumbnails** | Detail modal for full preview / Download |
| Portal Download (legacy approve) | — | Eligible if status approved + file present even when `approvedAt` missing |

### Steps

1. Studio: on an `in_progress` request, upload a **PNG with alpha** as proof → submit to customer.  
   **Expected:** Stored object / `fileName` follows `proof-{n}-{mmddyyyy}-{HHmm}.png` (not the creative original name). Proofs tab shows a **compact row**: small grey-backed thumbnail + proof # / time / status meta.

2. Studio: click a compact proof row (prefer Proof 6 / broken heart).  
   **Expected:** Wide modal; **square** grey preview; **entire** artwork visible (`contain`, not cover/crop). Meta compact. **Proof note** / **Linked notes (N)** buttons. Footer: Download / Close. Soft-reload Studio (Ctrl+R) if CSS looks stale.

3. Studio: click **Linked notes (N)** (and **Proof note** if present).  
   **Expected:** Nested modal with scrollable full note content; Close returns to the detail modal with the large preview still visible.

4. Portal: **Approve** the proof (optional rating/note).  
   **Expected:** Status becomes Approved; **Download PNG** on the status panel with “available until …”.

5. Portal: open **Proofs** → open the approved proof modal.  
   **Expected:** No **File:** / original filename row. Footer has **Download PNG** (and Close).

6. Portal: click **Download PNG** from the modal (and optionally status panel); open in an editor that shows alpha.  
   **Expected:** Transparency intact; Save-as uses rename pattern (or `proof-{n}.png` for legacy).

7. If superseded proofs existed before approve: older full-res unavailable; Studio list still shows compact rows (may say “File removed”).

8. (Optional) Reject/cancel another request with proofs → full-res gone; no customer download.

9. (Optional) Simulate 14-day expiry via callable / `approvedAt` backdate as before.

### Pass criteria (prior)

- [ ] Studio proof detail: wide modal + square contain preview; full heart (nothing cropped); notes behind buttons
- [ ] Studio proofs list stays compact rows with thumbnail + short meta
- [ ] Portal Proofs list shows thumbnails
- [ ] Download on Portal status panel **and** approved proof modal (including older approvals missing `approvedAt`)
- [ ] Original creative filename not shown in Portal proof UI
- [ ] New Studio uploads use `proof-{n}-{mmddyyyy}-{HHmm}.{ext}`
- [ ] Download returns full-res PNG with transparency intact
- [ ] No production deploy performed

---

## Residual checkpoint (CORS + Approved label) — 2026-07-17

**Why:** Owner FAIL — Portal `getBlob` hit Storage CORS from `https://myprintrequest.dev`; proof list lacked Approved indicator.  
**Fix deployed:** `customerGetAssistedCreationApprovedProofDownloadUrl` on `fresh-prints-dev`. Portal Download uses signed URL (no `getBlob`). Soft-reload Portal if needed.

### Owner FAIL follow-up (signed URL IAM) — 2026-07-17

**Symptom:** Modal showed **Unable to prepare the download right now.** (Proof 6 Approved).  
**Root cause:** Function reached `getSignedUrl` but Gen2 runtime SA lacked `iam.serviceAccounts.signBlob` (`SigningError`). Eligibility for request `CJ5H20V4taoDo27BjQxV` passed; not a missing-field / failed-precondition case.  
**Fix applied on `fresh-prints-dev` only:** Bound `roles/iam.serviceAccountTokenCreator` on `695546728466-compute@developer.gserviceaccount.com` to itself. **No Functions or Portal redeploy required.** Soft-reload optional. Retest Download PNG.

### Steps

1. On **https://myprintrequest.dev**, open an **approved** Assisted Creation request.  
   **Expected:** Status panel still shows Download when eligible.

2. Open **Proofs** tab.  
   **Expected:** The approved proof row shows an **Approved** badge (not only “(latest)”); thumbnail may still appear.

3. Click **Download PNG** / **Download file** (status panel and/or proof modal).  
   **Expected:** File downloads. Console has **no** CORS / `getBlob` / `ERR_FAILED` against `firebasestorage.googleapis.com` for this action.

4. Open the approved proof modal.  
   **Expected:** Header shows **Approved** chip next to “Proof N”.

### Pass criteria (residual)

- [ ] Download works from myprintrequest.dev (and optionally localhost Portal)
- [ ] No Storage CORS console errors on Download
- [ ] Approved badge visible on proof list row
- [ ] Approved chip on proof modal title
- [ ] No production deploy / no CORS gsutil required for this path

### Please reply with

- `PASS` — residual criteria met (prior criteria OK or already accepted)  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups

---

## Owner result (2026-07-17 closeout)

**PASS** — Owner accepted the approved-proof download + Portal proof UX workstream (callable file download after CORS/signed-URL residuals; Approved labels; Notes dedupe; Overview 14-day; Studio modal sizing absorbed). See also 2026-07-17-assisted-portal-proof-ux-manual-qa.md.

Pass criteria above treated as met for signoff. No production deploy.
