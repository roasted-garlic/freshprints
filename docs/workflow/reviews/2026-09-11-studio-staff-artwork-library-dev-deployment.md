# DEV Deployment: Studio Staff Artwork Library

| Field | Value |
|---|---|
| Date | 2026-09-11 |
| Project | `fresh-prints-dev` |
| Goal | `studio-staff-artwork-library-and-print-request-source` |
| Result | **SUCCESS** |

## Authorization

Owner reported Staff Artwork page `Missing or insufficient permissions` and cited the required
DEV allowlist from the child test report. Deploy executed against that exact allowlist.

## Command

```bash
firebase deploy --project fresh-prints-dev --only functions:createStaffArtworkUpload,functions:finalizeStaffArtwork,functions:updateStaffArtwork,functions:setStaffArtworkArchiveState,functions:deleteEligibleStaffArtwork,functions:promoteStaffArtworkToAiReview,functions:setPrintRequestItemArtworkEnhanceMode,firestore:rules,storage,firestore:indexes
```

## Results

- Created: `createStaffArtworkUpload`, `finalizeStaffArtwork`, `updateStaffArtwork`,
  `setStaffArtworkArchiveState`, `deleteEligibleStaffArtwork`, `promoteStaffArtworkToAiReview`
- Updated: `setPrintRequestItemArtworkEnhanceMode`
- Released: Firestore Rules, Storage Rules
- Deployed: Firestore indexes (`firestore.indexes.json`)

## Not included

- Portal App Hosting / Studio publication
- Migration or backfill
- Production deploy
- Commit / push

## Follow-up — 2026-09-11 evening

Owner DEV QA: adding Staff Artwork to a print request failed with
`Missing or insufficient permissions.` Emulator reproduction showed Firestore Rules
**expression budget (1000)** on `printRequestItems` create — the shared heavy validator ran for
multiple source-type OR branches.

### Fix

- Lean Staff Artwork create validator (`staffArtworkPrintRequestItemCreateFieldsValid`)
- Source-type gated create branches (Staff Artwork first)
- Narrow `staffCanAdjustPrintRequestItemCount` fast path for item-add parent updates

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only firestore:rules
```

Result: **SUCCESS** (rules released). Emulator suite
`tests/firebase/staffArtworkPrintRequestItem.rules.test.ts` **4/4 pass**.

## Follow-up — 2026-09-11 night

Owner QA: Staff Artwork background did not persist after edit/upload. Root cause: create/update
callables were deployed before `artworkBackgroundHex` was added to the Functions write path.

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only functions:createStaffArtworkUpload,functions:updateStaffArtwork
```

Result: **SUCCESS**.

## Follow-up — 2026-09-11 late night

Owner QA: Send to AI Review felt broken (no confirm, silent enqueue when Auto process was off).

### Client
- Confirm modal before promote
- Force background AI enqueue on explicit Send
- Success notice after promote

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only functions:promoteStaffArtworkToAiReview
```

Result: **SUCCESS** (harder production-file check, background hex copy, 120s/1GiB).

## Follow-up — 2026-09-11 late night (detection + promote remove)

Owner: do **not** skip unused dark-mat detection — upload should detect and auto-select
Auto/Light/Dark. Promote should remove from Staff Artwork library.

### Client
- Upload carousel: Import-style Auto / Light / Dark picker
- Browser canvas dark-mat detection on file select (auto-selects mat for Auto)
- Confirm copy + list removal after Send to AI Review

### Server
- `createStaffArtworkUpload` accepts `artworkBackgroundChoice` (`auto` | `light` | `dark`)
- `finalizeStaffArtwork` runs dark-mat detection again; when Auto, writes resolved hex
- `promoteStaffArtworkToAiReview` deletes Staff Artwork storage + doc after successful handoff

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only functions:createStaffArtworkUpload,functions:finalizeStaffArtwork,functions:promoteStaffArtworkToAiReview
```

Result: **SUCCESS**.

## Follow-up — 2026-09-12 (PNG-only + BG picker placement)

Owner: Staff Artwork uploads are PNG-only; Auto/Light/Dark sit in the upload preview header
above the image.

### Client / docs
- File picker `accept`, client filter, copy, service guard → PNG only
- Auto/Light/Dark moved into preview header (horizontal, centered)
- `FIREBASE.md` / `DATA_MODEL.md` / `SECURITY.md` source type notes

### Server
- `createStaffArtworkUpload` + `finalizeStaffArtwork` reject non-PNG
- Storage rules: `/staff-artwork/.../source` requires `image/png`

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only functions:createStaffArtworkUpload,functions:finalizeStaffArtwork,storage
```

Result: **SUCCESS**.

## Follow-up — 2026-09-12 (delete after completed show/sheet)

Owner: cannot delete Staff Artwork attached to a print request unless that request was on a
show or internal sheet marked **completed** (`productionStatus: "completed"`).

### Change
- Shared eligibility helper `staffArtworkDeletionEligibility.ts`
- `deleteEligibleStaffArtwork` / promote-removal use completed-show release instead of any-reference block
- Clearer blocker messages in Studio

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only functions:deleteEligibleStaffArtwork,functions:promoteStaffArtworkToAiReview
```

Result: **SUCCESS**.

## Follow-up — 2026-09-12 (queue/allocate Staff Artwork incomplete)

Owner: Portal submit showed `Print request item data is incomplete.`; Studio Add to Show showed
`Catalog print request item data is incomplete.` for requests with Staff Artwork attached.

### Root cause
Initial DEV Staff Artwork allowlist never included `allocateStudioPrintRequestToShow` or
`queuePortalPrintRequestToShow`. Live DEV callables still treated Staff Artwork rows as catalog
(no `designId` → incomplete).

### Fix
- Shared `resolvePrintRequestItemSourceType` falls back to `staffArtworkId` / `customerUploadId`
  when `sourceType` is missing
- Allocate / Portal queue / enhance-mode callables use that resolver
- Portal item mapper requires non-empty `staffArtworkId` for Staff Artwork detection

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only functions:allocateStudioPrintRequestToShow,functions:queuePortalPrintRequestToShow,functions:setPrintRequestItemArtworkEnhanceMode
```

Result: **SUCCESS**.

## Follow-up — 2026-09-12 (catalog Design Library add permission-denied)

Owner: Studio Add Design Library image to a print request failed with
`Missing or insufficient permissions. Firestore permissions for print requests may still be pending review.`

### Root cause
Staff Artwork create used a lean validator to stay under Firestore’s 1000-expression budget, but
catalog (and upload) creates still used heavy `printRequestItemRequiredFieldsValid`. That path
grew past the budget after third-source fields were added, so catalog creates failed closed.

### Fix
- Lean create validators for catalog + upload (same pattern as Staff Artwork)
- Create allow branches: catalog → staff artwork → upload, each lean-gated
- Emulator: `catalogPrintRequestItemCreate.rules.test.ts` 5/5 + staff artwork create 4/4

### Redeploy

```bash
firebase deploy --project fresh-prints-dev --only firestore:rules
```

Result: **SUCCESS**.
