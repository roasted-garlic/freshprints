# Owner DEV QA Checklist — Staff Artwork Neutral Projection Corrective

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | Localhost Portal (`http://localhost:3100`) → `fresh-prints-dev` |
| Status | **PENDING — mapper corrective implemented/tested; repeat Owner DEV QA required** |
| Checkpoint | `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective` |

## Prerequisites

1. Portal running locally: `npm run dev:portal` (port 3100; currently serving HTTP 200).
2. Sign in as a customer who has an existing Print Request containing at least one Staff Artwork item, plus (if available) Catalog Design and Customer Upload items for parity.
3. DEV Rules/Storage cutover and projection population are complete (do not use production).

## Manual Test Checkpoint

**Feature / area:** Portal Staff Artwork request-item privacy boundary after projection cutover
**Why automated tests are insufficient:** UI neutrality, drawer/queue presentation, and realtime customer experience require human visual/interaction review
**Environment:** local Portal → `fresh-prints-dev`
**Prerequisites:** existing Staff Artwork-backed customer Print Request on DEV

### Steps

1. Open the customer Print Request detail containing Staff Artwork → **Expected:** row shows neutral label `Staff-added`; no Staff Artwork image; no Staff Artwork title; no DPI/private metadata.
2. Open Current Request drawer for the same request → **Expected:** Staff Artwork row remains neutral (no image/title/private metadata).
3. Open Queue-to-Show for the request → **Expected:** Staff Artwork presentation remains neutral.
4. Change quantity on the Staff Artwork row and save → **Expected:** quantity updates successfully.
5. Edit size to a valid size within policy → **Expected:** size saves successfully.
6. Attempt a size that would be below 200 DPI / invalid under trusted sizing → **Expected:** rejected with a safe customer error (no private source dimensions shown).
7. Attempt a size greater than 22 inches → **Expected:** rejected.
8. Refresh the page and/or watch realtime update after a staff/trigger-visible change → **Expected:** projection-backed UI remains correct without customer `staffArtworks` reads.
9. Remove a Staff Artwork item (or duplicate path if remove is available) → **Expected:** remove works; no private Staff Artwork fields appear.
10. Confirm browser Network/Firestore activity for this session → **Expected:** no customer reads of `staffArtworks` and no `/staff-artwork/...` Storage downloads.
11. Confirm a Catalog Design item on a request still renders and behaves normally.
12. Confirm a Customer Upload item on a request still renders and behaves normally.

### Pass criteria

- [ ] Neutral `Staff-added`
- [ ] No Staff Artwork image
- [ ] No Staff Artwork title
- [ ] No DPI/private metadata
- [ ] Neutral Current Request drawer
- [ ] Neutral Queue-to-Show
- [ ] Quantity editing works
- [ ] Valid size editing works
- [ ] Below-200-DPI invalid size rejected
- [ ] >22in rejected
- [ ] Refresh/realtime behavior works
- [ ] Remove works
- [ ] No `staffArtworks` customer read
- [ ] No `/staff-artwork/...` Storage read
- [ ] Catalog Design items still work
- [ ] Customer Upload items still work

### Please reply with

- `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS`
- `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - FAIL: [description]`
- `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS WITH NOTES: [notes]`

Do not treat any agent observation as Owner QA PASS.

## Previous owner result (2026-09-12)

**`OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - FAIL`**

Observed: a Staff Artwork item present on the Print Request in Studio did not appear on the same
Print Request in Portal after the safe-projection cutover. The item must remain visible as the
neutral `Staff-added artwork` row with quantity, requested size, and minimum request state. This
failure is recorded for the separate Portal mapper visibility corrective; no private Staff Artwork
metadata is included here.
