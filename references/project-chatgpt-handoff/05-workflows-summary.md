# Workflows Summary

> This is the primary “how the app works” guide for external AI. Prefer this file when explaining customer or staff request flows.

---

## A. Customer print-request flow (Portal) — CURRENT

```
Sign in as customer (Portal)
    ↓
Browse Discover / Design Library (approved designs only)
    ↓
Start a print request  OR  Continue the single open “working” request
    (ADR-FP-071: only one working request per customer)
    ↓
Add designs from the Design Library (selection mode: pick + quantities)
    AND/OR
Upload your own artwork (PNG/WebP, folder, or ZIP)
    ↓
Upload pipeline (server-authoritative):
  create batch → upload source to Storage → finalize callable
  → transparency check → optional convert/trim/upscale (ADR-FP-080: ≤6× toward 12″) → DPI check
  → previews → ready
  (optional: mark “This artwork is a halftone design.” — evidence only, non-blocking)
    ↓
Confirm: ownership REQUIRED; Design Library permission OPTIONAL (default checked)
    ↓
Attach ready uploads to the working print request
  (items may be sourceType: catalog_design OR customer_upload)
    ↓
On the request page: set quantity + print size (default ~10″ wide)
  - Soft warning if 200–299 DPI
  - HARD BLOCK save if < 200 DPI or either side > 22″ (ADR-FP-075)
  - ADR-FP-080 approved-max is **not** a later manual-save ceiling
    ↓
Current Request drawer: **Review & Add to Show** (non-empty working request also shows **Needs a show**)
    ↓
When ready → review Current Request → **Add Request to Whatnot Show** → pick allocatable upcoming show
    ↓
Request moves toward Queued / Printing / Printed (derived from show allocations + timer)
```

### Customer-facing copy (catalog)

Short explainer (collapsed by default): a print request is the customer’s list for Fresh Prints to print — Design Library designs, their own uploads, or both. Steps: add designs/uploads + sizes → review Current Request → choose a show. Drawer CTA is **Review & Add to Show**; reviewing is not the final action.

### Rules customers feel

- Uploaded artwork is for the **request** first — not auto-added to the shared Design Library (staff may later promote if customer allowed it).
- Library permission decline does **not** block attach; staff still see the decline and may promote (ADR-FP-074).
- Mixing library + uploads on one request is intentional.

---

## B. Staff catalog lifecycle (Studio)

```
Import PNG (ZIP/folder)
    ↓
Validate → trim/upscale as needed → Storage originals + derivatives
    ↓
Create design (status: imported) → enqueue AI enrichment
    ↓
AI Review — Processing → Needs Review
    ↓
Staff Approve → status: ready → Design Library
  OR Reject → Rejected tab
```

Design Library never shows imported/rejected by default.

---

## C. Customer upload → optional catalog intake (Studio)

```
Portal customer uploads artwork (customerUploads)
    ↓
Appears in Studio Customer Uploads intake (Pending)
    ↓
Staff: Send to AI Review (promotes to designs + AI queue)
     OR Exclude from catalog (request assets remain)
    ↓
If approved in AI Review → shared Design Library
```

Two independent lifecycles on the upload: `technicalStatus` (processing quality) vs `catalogReviewStatus` (staff catalog eligibility). ADR-FP-073.

---

## D. Staff print-request flow (Studio)

```
/print-requests → Customer Requests (default) or Internal Requests (`isInternal`, ADR-FP-140)
    ↓
Create internal or customer request (lands in matching list, Working / Empty)
    ↓
Add approved catalog designs via Design Library selection mode
  (existing request items are preserved; only newly selected designs are created)
    ↓
Edit qty/size (same DPI floor as Portal: ≥ 200 to save, ≤ 22″)
    ↓
Attach to Show Queue / upcoming show (both kinds still attachable)
```

---

## E. Show Queue / production (Studio)

```
Upcoming show has capacity
    ↓
Attach print requests / allocations
    ↓
Production timer → Printing tab for customers
    ↓
Export zip (300 DPI) and/or auto-nested gang sheet PNGs
    ↓
Finish → terminal allocations + exact request completion
    (Past + Printing Whatnot shows also Finish automatically or via Mark Complete — ADR-FP-139)
    ↓
Studio locks/places completed requests; Portal shows Printed
```

The post-Finish reconciliation is bounded to the selected show's exact related request/allocation
IDs. Persisted completion shows no Retry action; genuine retryable and remediation-only outcomes
remain distinct. Owner QA v18 passed immediate completion and navigation reconstruction on
2026-07-29.

Gang sheet **manual builder** canvas is deferred (post-MVP).

---

## F. Assisted Creation (Phase 9C) — CURRENT

```
Portal customer submits structured Assisted Creation brief
    ↓
Customer may update brief/references while submitted
    ↓
Studio owner/admin starts work and stages a proof
    ↓
proof_ready → customer approves
    OR requests revisions with required notes
    ↓
Studio resumes work → sends revised proof → repeat until approved
```

One open Assisted request per customer. Helpers may read but not mutate. Cancel/reject reasons and owner restore are audited. This is separate from customer PNG uploads on a normal print request.

**Next planned addition:** idempotent proof-ready customer emails through a provider-neutral service, using Resend first.

---

## Workflow rules

- Predictable, recoverable, observable
- Never auto-publish to catalog without staff approval
- Production status never written to `designs.status`
- Trusted image processing for customer uploads is **server-side** (finalize callables)
