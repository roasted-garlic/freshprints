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
  → transparency check → optional convert/trim/upscale → DPI check
  → previews → ready
    ↓
Confirm: ownership REQUIRED; Design Library permission OPTIONAL (default checked)
    ↓
Attach ready uploads to the working print request
  (items may be sourceType: catalog_design OR customer_upload)
    ↓
On the request page: set quantity + print size (default ~10″ wide)
  - Soft warning if 200–299 DPI
  - HARD BLOCK save if < 200 DPI (ADR-FP-075)
    ↓
When ready → Add to show → pick allocatable upcoming show
    ↓
Request moves toward Queued / Printing / Printed (derived from show allocations + timer)
```

### Customer-facing copy (catalog)

Short explainer (collapsed by default): a print request is the customer’s list for Fresh Prints to print — Design Library designs, their own uploads, or both. Steps: start/continue → add designs/uploads + sizes → choose a show.

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
/print-requests → create internal or customer request
    ↓
Add approved catalog designs via Design Library selection mode
    ↓
Edit qty/size (same DPI floor as Portal: ≥ 200 to save)
    ↓
Attach to Show Queue / upcoming show
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
```

Gang sheet **manual builder** canvas is deferred (post-MVP).

---

## F. Future — Custom Requests (Phase 9)

Separate Q&A / Etsy / optional design-fee path. **Not** the same as customer PNG uploads on a print request.

---

## Workflow rules

- Predictable, recoverable, observable
- Never auto-publish to catalog without staff approval
- Production status never written to `designs.status`
- Trusted image processing for customer uploads is **server-side** (finalize callables)
