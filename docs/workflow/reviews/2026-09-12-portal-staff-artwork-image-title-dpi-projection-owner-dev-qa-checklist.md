# Owner DEV QA Checklist — Staff Artwork image/title/DPI projection (amended)

| Field | Value |
|---|---|
| Date | 2026-09-12 |
| Goal | `portal-staff-artwork-neutral-projection-corrective` |
| Environment | Localhost Portal (`http://localhost:3100`) → `fresh-prints-dev` |
| Status | **PASS recorded — Owner DEV QA complete; Signoff approved_with_notes** |
| Checkpoint | `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective` — **PASS** |

Supersedes the prior **neutral no-image/no-title** checklist expectations. Neutral blank Staff Artwork cards are a **FAIL**.

## Prerequisites (complete)

1. ✅ Owner authorized and completed DEV population APPLY for enriched Staff Artwork projection fields (`actualWrites: 6`).
2. ✅ Post-apply dry-run + `VERIFY=1` clean (`alreadyCorrect: 114`).
3. ✅ Portal localhost serving HTTP 200 at `http://localhost:3100` (no App Hosting deploy).
4. ✅ DEV Storage Rules allow customer `preview.webp` / `thumbnail.webp` only; Firestore `staffArtworks` remains customer-denied.

## Manual Test Checkpoint

**Feature / area:** Portal Staff Artwork request cards with projected image/title/DPI
**Why automated tests are insufficient:** Visual title/preview/DPI and interaction require human review
**Environment:** local Portal → `fresh-prints-dev`
**Prerequisites:** customer account with a Print Request containing Staff Artwork (plus Catalog / Upload if available)

### Steps

1. Open Print Request detail with Staff Artwork → **Expected:** row appears; preview image; **real artwork title** (not raw `staffArtworkId`); `Staff-added` badge only; DPI from projected pixels; size + quantity visible.
2. Confirm DPI bands: edit toward &lt;200 → reject; 200–299 → warning path; ≥300 → optimal; &gt;22in → reject.
3. Valid size edit + quantity edit → **Expected:** save works (trusted callable remains authoritative).
4. Remove Staff Artwork item → **Expected:** works.
5. Refresh / realtime after staff changes title or preview on the library artwork → **Expected:** Portal projection refreshes without customer `staffArtworks` reads.
6. Current Request drawer → **Expected:** preview + actual title + size/quantity as appropriate.
7. Queue-to-Show → **Expected:** actual Staff Artwork title where queue UI needs it; request truth preserved.
8. Network/Firestore → **Expected:** **no** customer `getDoc(staffArtworks/...)`; Storage downloads only preview/thumb (not production/source).
9. Catalog Design + Customer Upload items → **Expected:** unchanged behavior.
10. Confirm notes/archive/AI/audit/enhancement internals are **not** shown; Upscale control remains absent.

### Pass criteria

- [ ] Staff Artwork row appears (no `designId` required)
- [ ] Real artwork title (not `staffArtworkId`)
- [ ] Preview image
- [ ] DPI correct from projected pixels
- [ ] &lt;200 DPI rejected
- [ ] 200–299 warning
- [ ] ≥300 optimal
- [ ] &gt;22in rejected
- [ ] Quantity works
- [ ] Valid size editing works
- [ ] Remove works
- [ ] Refresh/realtime works (including library title/preview refresh)
- [ ] Drawer shows preview/title
- [ ] Queue-to-Show correct title
- [ ] `Staff-added` is badge only
- [ ] No Portal `staffArtworks` document reads
- [ ] Customer can read preview/thumb; cannot read production/source
- [ ] Private metadata absent
- [ ] Catalog Design unchanged
- [ ] Customer Upload unchanged

### Please reply with

- `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS`
- `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - FAIL: [description]`
- `OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS WITH NOTES: [notes]`

Do **not** treat any agent observation as Owner QA PASS. No Signoff until Owner QA completes.

## Owner result (2026-09-12)

**`OWNER DEV QA: portal-staff-artwork-neutral-projection-corrective - PASS`**

Signoff: `docs/workflow/reviews/2026-09-12-portal-staff-artwork-neutral-projection-corrective-signoff.md`
(`approved_with_notes`).
