# Workflows Summary

> This is the primary “how the app works” guide for external AI. Prefer this file when explaining customer or staff request flows.

---

## A. Customer print-request flow (Portal) — CURRENT

```
Sign in as customer (Portal)  OR  browse as guest
    ↓
Browse Discover / Design Library / **Our Shows** (public calendar + show galleries)
    ↓
Start a print request  OR  Continue the single open “working” request
    (ADR-FP-071: only one **Portal-editable** working request per customer — see § G)
    ↓
Add designs from the Design Library (selection mode: pick + quantities)
    AND/OR
Upload your own artwork (PNG/WebP, folder, or ZIP)
    ↓
Upload pipeline (server-authoritative):
  create batch → upload source to Storage → finalize callable
  → transparency check → optional convert/trim/upscale (ADR-FP-080: ≤6× toward **15″** automated target, `image-quality-v3`) → DPI check
  → previews → ready
  (optional: mark “This artwork is a halftone design.” — evidence only, non-blocking)
    ↓
Confirm: ownership REQUIRED; Design Library permission OPTIONAL (default checked)
    ↓
Attach ready uploads to the working print request
  (items may be sourceType: catalog_design OR customer_upload)
    ↓
On the request page: set quantity + print size (**runtime default** from Studio Settings, **10″** system fallback; Standard Size presets override)
  - Soft warning if 200–299 DPI
  - HARD BLOCK save if < 200 DPI or either side > 22″ (ADR-FP-075)
  - ADR-FP-080 approved-max is **not** a later manual-save ceiling
  - **Standard Size presets** (optional modal) override default width when selected
    ↓
Current Request drawer: **Review & Add to Show** (non-empty working request also shows **Needs a show**)
    ↓
When ready → review Current Request → **Add Request to Whatnot Show** → pick allocatable upcoming show
    ↓
Request moves toward Queued / Printing / Printed (derived from show allocations + timer)

Guest note: Our Shows + Design Library browse are public; Add to Request / mutations use login gate (ADR-FP-142).

Signed-in customers may edit **display name** and **username** in Account Settings → Profile (30-day username cooldown; DEV 2026-08-27). Username/display-name propagation updates snapshot fields on related records but **does not** change `printRequests.name`, `requestOrigin`, `isInternal`, or `customerId` (WS1 DEV 2026-08-28).
```

### Portal Print Request editability (WS1 DEV — 2026-08-28)

ADR-FP-071 still enforces **one working request per Portal customer**, but only among **Portal-editable** continuable requests:

| Rule | Detail |
|------|--------|
| Continuable status | `draft` or `editing` |
| Portal-editable | `requestOrigin == portal_customer` **and** `isInternal != true` |
| **Not** Portal-editable | `studio_customer` drafts (Studio-created customer requests) — customer-owned but Portal callables reject mutations |
| Picker / Working Request UI | Must **not** offer a non–Portal-editable request as an editable Working Request |
| Legacy duplicates | If multiple Portal-editable continuable requests exist, customer **explicitly selects** one; add / increment / decrement / remove all target that selection consistently |
| Historical names | `printRequests.name` (e.g. `olduser-CR001`) stays immutable when username changes |

Shared helper: `packages/shared/src/utils/portalPrintRequestEditability.ts` (`isPortalEditablePrintRequest`).

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
Lists grouped by primary upcoming show (+N more; Unassigned last)
    ↓
Create internal or customer request (lands in matching list, Working / Empty)
  **Customer Request create (WS1 DEV 2026-08-28):**
  - Studio must **not** offer a customer in the Create Customer Request picker when that customer already has a continuable draft/editing **Customer** request (`isInternal == false`, status `draft|editing`).
  - **Disabled** and **Closed** (tombstoned) customers are not selectable.
  - Trusted creation path rejects a second continuable Customer CR when one already exists.
  - Legacy duplicate requests in data are **preserved** — this guard prevents **new** duplicates only.
    ↓
Add approved catalog designs via Design Library selection mode
  (existing request items are preserved; only newly selected designs are created)
    ↓
Edit qty/size (same DPI floor as Portal: ≥ 200 to save, ≤ 22″)
    ↓
Customer: **Add to Show**  |  Internal: **Add to Internal Gangsheet**
  Convert Customer → Internal via ⋯ (ADR-FP-141; blocks if in_progress allocations)
    ↓
Attach to Show Queue / upcoming show (both kinds still attachable)
    ↓
Show Queue Generate: **Standard**, **Grouped by Customer**, or **Sheet per Customer** gang sheets (ADR-FP-143 three-mode extension 2026-08-27)
    ↓
Internal Gang Sheet Mark Complete → reconciles eligible internals to Printed
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
Export zip (300 DPI) and/or gang sheet PNGs (**Standard** · **Grouped by Customer** · **Sheet per Customer** — ADR-FP-143)
    ↓
Finish → terminal allocations + exact request completion
    (Past + Printing Whatnot shows also Finish automatically or via Mark Complete — ADR-FP-139;
     Internal Gang Sheet Mark Complete reconciles eligible Internal requests to Printed)
    ↓
Studio locks/places completed requests; Portal shows Printed
```

The post-Finish reconciliation is bounded to the selected show's exact related request/allocation
IDs. Persisted completion shows no Retry action; genuine retryable and remediation-only outcomes
remain distinct. Owner QA v18 passed immediate completion and navigation reconstruction on
2026-07-29.

Gang sheet **manual builder** canvas is deferred (post-MVP).

### Needs Attention → Did Not Print (DEV — ADR-FP-156)

```
Show enters Needs Attention (missed / unresolved production)
    ↓
Staff: Did Not Print
    ↓
Primary: Move unprinted requests to another show
  - Exact unprinted quantities moved
  - Source allocations remain historical + canceled
  - Destination allocations use requeuedFromAllocationId lineage
  - Source show stays DID NOT PRINT; moved PR stays active/Queued
    ↓
Secondary: Release only
  - Portal one-continuable-request invariant preserved
  - Released work → Needs Re-queue (Working triage rightmost filter + badge)
  - Normal Add to Show clears Needs Re-queue after successful allocation
```

**DEV fixtures:** `DEV-OVERRIDE` / `source: dev_fixture` participate in Show Queue lifecycle on DEV only; excluded from Whatnot import/sync (ADR-FP-155).

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

## G. Customer identity — Portal + Studio (WS1–WS4 DEV — complete 2026-08-30)

**Status:** WS1–WS4 **complete on `fresh-prints-dev`**. Production, Studio publish, and Portal App Hosting **not authorized**.

### WS4 — User Info / activity (Studio)

- **Print Request History** — compact cards, lazy details, deep links (`buildPrintRequestDeepLinkPath`)
- **Account Activity** — collapsed by default (Transfer Username, Merge Accounts, disable/restore, etc.)
- Merged-customer history via `resolveLogicalCustomerIds` / `mergedSourceCustomerIds`
- Did Not Print requeue: one card per PR; destination show/date as active context

### WS3 — Merge Accounts (owner)

- `previewCustomerAccountMerge` / `applyCustomerAccountMerge`
- Survivor retains history; sources tombstoned; `mergedSourceCustomerIds` on survivor

### WS2 — Transfer Username (owner)

- `previewDuplicateAccountResolution` / `transferCustomerUsername`
- Verified duplicate resolution; no full merge

### Account states (do not conflate)

| State | Reversible? | Sign-in | Username reservation | History |
|-------|-------------|---------|----------------------|---------|
| **Active** | — | Allowed | Held | Full |
| **Disabled** | Yes — owner **Re-enable Account** | Blocked (email + Google show clear message) | Held | Full |
| **Closed / tombstoned** | No via normal Studio flow | Blocked | **Permanently reserved** | Full (ADR-FP-115) |
| **Hard deleted** | N/A | Auth removed | **Released** | Only when history-free + owner Apply on **dev-gated** path (ADR-FP-151) |

Studio customer directory: **Active** (default) | **Disabled** | **Closed** tabs.

### Portal session behavior

- Active customer signs in normally.
- Disabled customer is blocked at login with explicit copy (email/password and Google).
- If disabled **mid-session**, Portal signs out cleanly **before** private Firestore reads fail (no permission overlay).
- Tombstoned customer is not reversible through Disable/Re-enable; tombstone UI does not expose Re-enable/Restore.

### Staff identity actions (Studio — owner)

| Action | Callable / path | Notes |
|--------|-----------------|-------|
| Change username | `updateCustomer` via Change Username modal | Immutable CR names preserved |
| Disable Account | `disableCustomerAccount` | Reversible |
| Re-enable Account | `restoreCustomerAccount` | Success styling (not destructive) |
| Close Account Permanently | `tombstoneCustomerAccount` | One-way; history kept |
| Delete Account Permanently | `previewHardDeleteCustomerAccount` → `hardDeleteCustomerAccount` | History-free only; Apply **fresh-prints-dev** gated |

Append-only `customerActivityEvents` records WS1 operations (audit evidence, not lifecycle source of truth).

---

## Workflow rules

- Predictable, recoverable, observable
- Never auto-publish to catalog without staff approval
- Production status never written to `designs.status`
- Trusted image processing for customer uploads is **server-side** (finalize callables)
