# Manual Test Checkpoint — Portal Customer Artwork Upload (Sub-phase G)

> **Superseded for retest:** After owner **FAIL** (7 issues), use  
> `docs/workflow/reviews/2026-07-12-portal-customer-artwork-upload-manual-e2e-remediation-manual-checkpoint.md`  
> Do not sign off G/parent until that retest returns PASS / PASS WITH NOTES.

**Feature / area:** Customer artwork upload end-to-end (Portal → Studio → AI)  
**Why automated tests are insufficient:** Full UI/UX across Portal + Studio Electron + AI Review  
**Environment:** local apps against **`fresh-prints-dev` only**  
**Doc:** This file is the hard gate for Sub-phase G and parent feature signoff.

---

## Setup

### Apps / env
| App | How to run | Firebase project |
|-----|------------|------------------|
| Portal | `npm run dev:portal` (repo root) | Must use `apps/portal/.env.local` → `NEXT_PUBLIC_FIREBASE_PROJECT_ID=fresh-prints-dev` |
| Studio | Desktop Electron against the same `fresh-prints-dev` Firebase config | Confirm Studio is not pointed at prod |

### Accounts
| Role | Requirement |
|------|-------------|
| Portal customer | Active `role: customer` with a linked `customers/{id}` on **fresh-prints-dev** |
| Studio staff | **Owner or admin** (promote / AI approve / reject). Helper can view intake / exclude but cannot promote. |

### Routes
| Surface | Path |
|---------|------|
| Portal working request | Portal print-request detail (your one working request) — use **Upload artwork** |
| Portal catalog (after approve) | `/catalog` or `/catalog/library` |
| Studio intake | `/imports` → section **Customer uploads** |
| Studio AI Review | `/ai-review` |
| Studio Design Library | Design Library (catalog `ready` designs) |
| Studio wipe (optional verify UI only) | Test Data Reset — option **Customer uploads** (do **not** wipe all of dev unless intentional) |

---

## Steps

1. **Portal — upload & attach**  
   Open working print request → **Upload artwork** → select a transparent PNG → check ownership + catalog acknowledgement → confirm/attach.  
   **Expected:** Line item on the request (upload-backed, no catalog `designId`); upload becomes pending staff review.

2. **Portal — queue to show**  
   Queue the request to an allocatable upcoming show.  
   **Expected:** Succeeds; show allocations include the upload-backed item.

3. **Studio — intake list**  
   Go to `/imports` → **Customer uploads** → **Pending**. Select the upload.  
   **Expected:** Preview, filename, customer, linked request, status, DPI, transparency, confirmations visible.

4. **Studio — exclude (optional second upload, or spare)**  
   **Do not add to catalog**.  
   **Expected:** Moves to **Excluded**; artwork **remains** on the print request.

5. **Studio — reverse exclusion** (if you excluded the only item)  
   Filter **Excluded** → **Reverse exclusion**.  
   **Expected:** Back to **Pending**.

6. **Studio — Send to AI Review**  
   On a pending ready upload → **Send to AI Review**.  
   **Expected:** Toast / link to AI Processing; upload `sent_to_ai_review`; design appears under AI Review.

7. **Studio — approve**  
   In `/ai-review`, approve the promoted design (apply suggestions as needed).  
   **Expected:** Design `ready`; visible in Design Library and Portal catalog.

8. **Studio — reject isolation**  
   Promote another upload (or use a second file) → reject in AI Review.  
   **Expected:** Design `rejected`; print request **still shows** the upload artwork; production asset still usable for queue/print paths.

### Pass criteria
- [ ] Upload → attach → queue works on fresh-prints-dev
- [ ] `/imports` intake shows required fields and actions
- [ ] Exclude / reject preserve request artwork
- [ ] Approve makes design catalog-visible in Portal/Studio

---

## Please reply with exactly one of

- `PASS` — all criteria met  
- `FAIL: [description]` — what failed  
- `PASS WITH NOTES: [notes]` — acceptable with follow-ups  

After your reply, the agent will complete Sub-phase G signoff and parent `portal-customer-artwork-upload` signoff (or fix defects if FAIL).

---

## Automated status (already done — do not block on this)

- Deployed to `fresh-prints-dev`: `cleanupAbandonedCustomerUploads`, `wipeOperationalTestData`  
- G smoke **6/6 PASS** (`mrhwvzm8`)  
- Wipe allowlist remains **dev-only**
