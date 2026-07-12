# Manual Test Checkpoint — Portal Customer Artwork Upload (Remediation retest)

**Feature / area:** Manual E2E remediation (7 issues) under `portal-customer-artwork-upload`  
**Why automated tests are insufficient:** UI/UX across Portal + Studio Electron  
**Environment:** local apps against **`fresh-prints-dev` only**  
**Parent checkpoint:** `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-subphase-g-manual-checkpoint.md`  
**Status:** Owner prior result **FAIL** — remediation automated green; **retest required** before G/parent signoff.

---

## Setup

### Apps / env
| App | How to run | Firebase project |
|-----|------------|------------------|
| Portal | `npm run dev:portal` (repo root) | `apps/portal/.env.local` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev` |
| Studio | Electron against the same `fresh-prints-dev` config | Confirm not pointed at prod |

### Accounts
| Role | Requirement |
|------|-------------|
| Portal customer | Active `role: customer` with linked `customers/{id}` on **fresh-prints-dev** |
| Studio staff | **Owner or admin** for promote; helper can view intake / exclude |

### Routes (updated after remediation)
| Surface | Path |
|---------|------|
| Portal Discover | `/catalog` |
| Portal Design Library | `/catalog/library` |
| Portal request detail | `/requests/[id]` |
| Studio **Customer Uploads** (new) | `/customer-uploads` |
| Studio Imports (intake removed) | `/imports` — batch/single import only |
| Studio AI Processing | `/ai-review` |
| Studio Design Library | `/designs` |
| Studio Show Queue | `/show-queue` |

---

## Retest checklist (7 issues)

### 1. Dedicated Customer Uploads page + badge
1. Open Studio → confirm **Customer Uploads** nav item (near Imports / AI Processing).  
   **Expected:** Route `/customer-uploads`; intake queue lives here, **not** on `/imports`.
2. Confirm pending count badge beside the nav item.  
   **Expected:** Matches uploads with `catalogReviewStatus: pending_staff_review`.
3. Promote, exclude, or navigate away/back.  
   **Expected:** Badge updates live without full app reload.
4. **Send to AI Review** on a ready pending upload.  
   **Expected:** Hands off to existing AI Processing (`/ai-review`); this page does **not** host AI Review UI.

### 2. Smaller action buttons
1. On `/customer-uploads`, open a pending item.  
   **Expected:** Open linked request / Send to AI Review / Do not add to catalog use standard Studio `sm` button height; primary/secondary/danger emphasis clear; usable at narrow width.

### 3. Portal discovery copy
1. Open `/catalog` (Discover) and `/catalog/library`.  
   **Expected:** Near Start/Continue request, copy reads:  
   > A print request can include designs from the Design Library, artwork you upload yourself, or both. Uploaded artwork is for your request only — it is not automatically added to the shared Design Library.

### 4. Upload item label
1. On a request with an uploaded item (`/requests/[id]`).  
   **Expected:** Label is **Your uploaded design** (not “not in Design Library yet”).

### 5. Duplicate uploaded designs
1. On an editable request, Duplicate a catalog item and an upload-backed item.  
   **Expected:** Both create a new line item; upload duplicate keeps same `customerUploadId` / `sourceType: customer_upload`; no second Storage/`customerUploads` file; qty/size preserved.

### 6. Studio Design Library loads
1. Open `/designs`.  
   **Expected:** Approved catalog designs load (no UNAVAILABLE / Unable to load designs). Search, filters, detail, request-selection mode still work. Portal catalog still works.

### 7. Studio Show Queue loads
1. Open `/show-queue`.  
   **Expected:** Upcoming / full / completed shows display; allocations load including upload-backed items. Portal show selection still works.

### Pass criteria
- [ ] All seven issues above pass
- [ ] No return of the Design Library / Show Queue load failures

---

## Please reply with exactly one of

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

Do **not** expect Sub-phase G or parent signoff until this reply is **PASS** or **PASS WITH NOTES**.

---

## Automated remediation status (already done)

| Check | Result |
|-------|--------|
| Remediation plan + review | approved |
| Implementation (7 issues) | landed |
| Firestore rules deploy (`fresh-prints-dev`) | success — upload allocation/item create + source-identity updates |
| Portal typecheck + build | PASS |
| Studio Vite build | PASS |
| Studio `tsc --noEmit` | known baseline failures outside remediation files; remediation-touched files clean after `replaceAll` fix |
| Unit tests (source + asset + list resilience + portal one-working) | 27/27 PASS |
| G smoke re-run | 6/6 PASS (`mrhxs2vt`) |
| Production | **not** deployed |
