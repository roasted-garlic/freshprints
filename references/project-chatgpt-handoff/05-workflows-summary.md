# Workflows Summary

> This is the primary “how the app works” guide for external AI. Prefer this file when explaining customer or staff request flows.

> 2026-09-12 cutover note: Portal request list, current-request drawer, detail, and queue reads
> prefer the Admin-maintained `portalPrintRequestItems` projection. During the additive transition,
> bounded canonical `printRequestItems` fallback fills missing rows; stable IDs prevent duplicates
> and ordering churn. The final Rules state removes direct customer canonical reads only after
> projection population and verification. Owner DEV QA **PASS**; production remains untouched.

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
  (Portal PR + Show quantity caps use **effective** limits: optional owner temporary
  `customers/{id}.printRequestQuotaOverride` ?? current global `settings/printRequestLimits` — ADR-FP-159;
  expired overrides fall back by clock; parking/Editing Continuable unchanged)
    ↓
Request moves toward Queued / Printing / Printed (derived from show allocations + timer)

Guest note: Our Shows + Design Library browse are public; Add to Request / mutations use login gate (ADR-FP-142).

Signed-in customers may edit **display name** and **username** in Account Settings → Profile (30-day username cooldown; DEV 2026-08-27). Username/display-name propagation updates snapshot fields on related records but **does not** change `printRequests.name`, `requestOrigin`, `isInternal`, or `customerId` (WS1 DEV 2026-08-28).
```

### Customer-upload follow-up and retention (DEV — closed 2026-09-11)

Print-request uploads that are still waiting for a successful Add to Show stay out of Studio
Pending/Denied/Excluded intake. The trusted attach/queue/allocation paths set and clear
`studioIntakeHoldUntilShow`; once released, Allow enters Pending and Don’t-allow enters Denied.
Personal Don’t-allow uploads remain reusable in **Your designs → Personal** for the reviewed 30-day
window, while promoted artwork appears in **Design Library**. Staff Excluded remains a separate
14-day retention episode. Ask Again is bounded and pauses cleanup; Allow/Restore exits the episode;
second Decline re-starts the clock. Safe-delete blockers still protect any request or allocation
history.

Portal per-item Remove follows the Studio inline pattern: Remove → Cancel / Confirm, with the
existing request-item mutation and restoration behavior preserved. Staff Inbox queue sounds/toasts
wait for the post-Add-to-Show success settle window.

### Portal maintenance mode (DEV)

Owner/admin Studio Settings controls the private `settings/portalMaintenance` state. The saved
heading/body is returned through `getPortalMaintenanceState` and rendered by Portal at runtime;
an absent or OFF state preserves normal customer behavior. While ON, ordinary customers receive a
full-screen read-only experience, while one trusted active linked customer may receive normal
access plus a yellow testing banner. `listPortalMaintenanceTestCustomers` returns only active,
linked, non-guest, non-deleted, non-disabled, non-merged customer options; the shared backend guard
revalidates the tester before every covered customer mutation. Direct client setting writes remain
denied, and owner/admin control stays callable-only.

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
- Upload and Donate share a browser-local informational quality-notice dismissal; this affects notice visibility only and is not a permission or validation boundary.

---

## Private Staff Artwork workflow (Studio) — DEV closed 2026-09-12

Owner/Admin upload PNG artwork in the Staff Artwork library or from the request workflow. The
trusted finalize path reuses technical customer-upload processing while excluding customer quota,
consent, catalog-intake, notification, and retention behavior. Staff may associate real customers
or leave artwork unassigned; historical merged/closed customer identity remains staff-visible.

Helpers can select existing ready/non-archived Staff Artwork when they have request item-edit
permission, but cannot upload, edit, associate, archive, delete, or promote it. Request attachment
uses the authoritative `staff_artwork` source and continues through sizing, enhancement, allocation,
exports, ZIPs, and gang sheets. Portal reads only request-level neutral data and never Staff Artwork
documents, paths, or pixels. Owner DEV QA passed; no automatic AI, public indexing, or retention runs.

## B. Staff catalog lifecycle (Studio)

```
Import PNG (ZIP/folder)
    ↓
Optional: open Import Session Settings
    ↓
Enter Smart Profile presets in a dedicated tab
    (existing editable dimensions only; opens on Smart Profile presets;
     per-session inputs only; no value survives into the next import session)
    ↓
Validate → trim/upscale as needed → Storage originals + derivatives
    ↓
Create design (status: imported) with optional durable `smartProfileImportPresets`
    ↓
enqueue AI enrichment
    ↓
AI Review — Processing → Needs Review
    ↓
Staff Approve → status: ready → Design Library
  OR Reject → Rejected tab
```

Preset-owned values are re-merged after AI enrichment and ready-catalog reprocess. Later staff edits or dimension resets update the durable preset seed so removed values do not resurrect. Design Library never shows imported/rejected by default.

---

## C. Customer upload → optional catalog intake (Studio)

```
Portal customer uploads artwork (customerUploads)
    ↓
Appears in Studio Customer Uploads intake (Pending)
    ↓
Staff may set per-row Auto / Light / Dark background and Halftone
    - Halftone-on from Auto defaults that row to Dark
    - Explicit Light/Dark stays preserved while Halftone remains on
    - Pending/failed metadata writes block stale Send to AI Review
    - Retry keeps intended local state visible
    ↓
Staff: Send to AI Review (promotes to designs + AI queue)
     OR Exclude from catalog (request assets remain)
    ↓
If approved in AI Review → shared Design Library
```

Promotion now carries authoritative intake Halftone/background metadata into the created design, including `halftoneDecisionSource: intake` and explicit background source `staff_manual`. Two independent lifecycles on the upload remain: `technicalStatus` (processing quality) vs `catalogReviewStatus` (staff catalog eligibility). ADR-FP-073.

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
For eligible non-working requests: Export Images / Export x(Qty) / Generate Standard Gang Sheet / Copy.
Working and Editing requests keep only the existing allocation actions.
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
  Shared `settings/showQueue` Gang Sheet Settings resolve physical layout, four width-based price/weight tiers, request totals, and card cost summaries.
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

- **Print Request History** — compact cards, lazy details, deep links (`buildPrintRequestDeepLinkPath`); cards use the server-maintained lifecycle clock with indexed newest-activity ordering and stable ties
- Details lifecycle activity is accepted **newest → oldest**; current destination context stays on the card while prior show/removal context stays historical
- Lifecycle evidence is Admin-trigger-only; the compatibility reader remains available as rollback
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
