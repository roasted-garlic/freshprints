# Plan: Portal Donate Designs (reuse customer upload pipeline)

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-13-portal-donate-designs-review.md |

---

## Goal

Add a **Donate Designs** flow so Portal customers can submit artwork for Fresh Prints to review and potentially list in the shared Design Library for other customers — **without** attaching uploads to a print request. Reuse the existing customer-upload technical pipeline (create batch → Storage → finalize → staff promote → AI) with donate-specific wording, required catalog-donation consent, a purpose discriminator, a confirm-without-attach callable, Portal sidebar entry, and a Studio **Donated Designs** intake surface.

## Background

- ADR-FP-073 established `customerUploads` with dual lifecycles (technical vs catalog review).
- ADR-FP-074 made Design Library permission **optional** on print-request attach.
- ADR-FP-076 reserved donations as a **separate product path** that must not share `/requests/artwork` or the print-request attach lifecycle.
- Print-request Upload Designs is complete; donations were explicitly deferred. Product now wants donations with maximal reuse.

## Scope

### In Scope

1. **Shared model**
   - Add `purpose: "print_request" | "catalog_donation"` on `customerUploads` and `customerUploadBatches`.
   - Legacy docs without `purpose` treated as `print_request`.
   - Donate terms constant (e.g. `customer-upload-donate-terms-v1`) distinct from print `customer-upload-terms-v2`.

2. **Backend**
   - Extend `createCustomerUploadBatch` to accept/persist `purpose` (default `print_request` for backward compatibility).
   - New callable `confirmCustomerUploadsForDonation`:
     - Same auth as other Portal upload callables (`requirePortalCustomer` + ownership).
     - Requires all selected uploads `technicalStatus === "ready"`, same batch, `purpose === "catalog_donation"`.
     - Requires **ownership confirmed** and **catalog donation consent** (`catalogUseAcknowledged === true`).
     - Does **not** create/resolve a print request or `printRequestItems`.
     - Sets confirmation fields, `termsVersion`, batch `status: "confirmed"`, upload `catalogReviewStatus: "pending_staff_review"`, `printRequestId` remains null.
   - Keep `confirmCustomerUploadsAndAttachToRequest` print-only; reject if `purpose === "catalog_donation"`.
   - Reject donate confirm if `purpose === "print_request"`.
   - Reuse existing promote / exclude / restore / retry staff callables (promote already ownership-gated; donate uploads will always have `catalogUseAcknowledged === true`).
   - Firestore composite indexes as needed for Studio queries (`purpose` + `catalogReviewStatus` + `createdAt`).

3. **Portal**
   - New route (recommended): `/donate` (or `/catalog/donate`) — **not** `/requests/artwork`.
   - Reuse `CustomerUploadPanel` + `useCustomerUploadBatch` with a `mode` / `purpose` prop:
     - Donate wording and CTAs.
     - Confirm calls donate callable (no attach).
     - Success: thank-you / submitted-for-review (no “Review Request”).
   - Consent UI for donate:
     - Ownership required (same spirit as print).
     - Catalog listing consent **required** (cannot submit unchecked) — clear copy that images may be listed on the portal for other customers.
   - Sidebar drawer: **Donate Designs** link near footer (above Account / sign-out area), visible on mobile drawer and desktop sidebar.
   - Do **not** overload header “Upload Designs” CTA.

4. **Studio**
   - New page/route **Donated Designs** (e.g. `/donated-designs`) reusing intake UI/hooks with `purpose == "catalog_donation"` filter.
   - Existing **Customer Uploads** remains print-request artwork (`purpose == "print_request"` or missing).
   - Split pending badges (or purpose-scoped counts) so print and donate queues do not inflate each other.
   - Hide “Open linked request” / print-request fields for donation rows; adjust exclude copy (no “remains on print request”).

5. **Docs**
   - Update `DATA_MODEL.md`, `BACKEND.md`, `DECISIONS.md` (new ADR or ADR-FP-076 follow-up), `ROADMAP.md` note.
   - Portal setup/copy only as needed in workflow artifacts.

### Out of Scope

- Auto-listing donations without staff promote + AI path.
- Using donations to add items to Current Request / print requests.
- Per-customer staff feature flag (`canDonateDesigns`) — **assumed not required** this phase (any Portal customer, same as Upload Designs). Can add later.
- Reworking Storage layout or technical processing pipeline.
- Phase 9 `customRequests` / Q&A.
- Changing print-request Upload Designs product behavior beyond purpose tagging + attach guard.
- Production deploy (human checkpoint later).

---

## Affected Areas

### Files / Modules (expected)

**Shared**
- `packages/shared/src/types/customerUpload/customerUpload.types.ts`
- `packages/shared/src/types/customerUpload/customerUpload.enums.ts` (purpose enum)
- Terms / constants colocated with existing customer-upload constants
- Firestore indexes file(s)

**Functions**
- `functions/src/createCustomerUploadBatch.ts` (+ validation helpers)
- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts` (purpose guard)
- New `functions/src/confirmCustomerUploadsForDonation.ts` (+ validation module mirroring attach)
- `functions/src/index.ts` export
- Tests under `functions/src/lib/confirmCustomerUpload*.test.ts` (or donate sibling)

**Portal**
- New `app/(app)/donate/page.tsx` (or catalog-scoped path)
- `features/customer-uploads/components/CustomerUploadPanel.tsx`
- `features/customer-uploads/hooks/useCustomerUploadBatch.ts`
- `features/customer-uploads/services/customerUploadService.ts`
- `features/navigation/components/PortalSidebar.tsx` (+ styles in `shell.css` if needed)
- Copy/styles: `customer-uploads.css` / catalog request-artwork patterns as needed

**Studio**
- New donated-designs page under `features/customer-uploads/` (or sibling feature folder reusing intake)
- `useCustomerUploadIntake.ts` / `customerUploadIntakeService.ts` purpose filter
- `CustomerUploadIntakeSection.tsx` donate-specific labels
- `Sidebar.tsx` nav + badge
- `AppRoutes.tsx`

**Docs**
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/project/DECISIONS.md`
- `docs/project/ROADMAP.md`
- `docs/standards/TESTING.md` (donate smoke/manual notes if commands change)

### Architecture Impact

- [x] Details: Same layered pattern as request artwork. New Portal route + confirm callable; same Storage/collections; Studio second intake view. No UI→Firestore writes; all mutations via callables.

### Security Impact

- [x] Details:
  - Auth unchanged: Portal customer only for create/finalize/donate-confirm.
  - Donate confirm **must** enforce ownership + required catalog consent server-side (not UI-only).
  - Purpose mismatch rejected on both confirm callables.
  - Staff promote/exclude permissions unchanged (`importDesigns` / approve roles).
  - No new secrets; same `/customer-uploads/` Storage rules.

### Data Model Impact

- [x] Details:
  - New field `purpose` on uploads + batches.
  - Donate path never sets `printRequestId` / never creates print request items.
  - Catalog review transition to `pending_staff_review` happens on donate confirm (same end state as attach, without request linkage).

### Backend Impact

- [x] Details: New callable; create-batch purpose; attach guard; indexes. No env vars.

### UI / UX Impact

- [x] Details: Portal donate page + sidebar link; Studio Donated Designs page; wording/consent differences. Manual UI review required.

### Migration Impact

- [x] Forward steps:
  - Additive `purpose` field; no backfill required if queries treat missing as `print_request`.
  - Deploy Functions + indexes before enabling Portal donate UI in production.
- [x] Rollback / compatibility:
  - Remove donate route/nav; leave purpose field harmless.
  - Print attach continues; orphan donate batches can use existing abandoned cleanup if needed.

---

## Approach

1. **Contracts** — Add `CustomerUploadPurpose` enum + fields; donate terms version; export from shared package.
2. **Backend** — Purpose on create; `confirmCustomerUploadsForDonation`; guard attach; unit tests for validation.
3. **Portal** — Parameterize upload hook/panel for `purpose`; new donate page; sidebar footer link; required dual consent; success UX without request attach.
4. **Studio** — Donated Designs page + purpose-filtered intake; split badges; donate-aware detail copy.
5. **Docs + indexes** — DATA_MODEL / BACKEND / DECISIONS / ROADMAP; composite indexes.
6. **Test** — Automated typecheck/build/unit; manual Portal donate + Studio intake checklist.

### Consent copy (proposed — refine at UI checkpoint)

- Ownership: “I own this artwork or have permission to donate it for catalog use.”
- Donation: “I understand I am donating these images to Fresh Prints. If approved, they may be listed in the Design Library for other customers to request.”
- Both required to enable submit.

### Permission model (assumed)

- **Who can open Donate Designs:** any authenticated Portal customer (same as Upload Designs).
- **What “permission” means in product copy:** ownership/rights + explicit donation-for-listing consent, enforced server-side.
- **Not in this phase:** staff-granted `customers.canDonateDesigns` flag (open question below if product wants it before ship).

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck Portal | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Typecheck Studio | `npx tsc --noEmit` (from `apps/studio/`) | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Unit tests | Targeted `confirmCustomerUpload*` / donate validation + shared purpose tests via `npx tsx --test …` | yes |
| Lint | Project lint if configured for touched packages | if available |
| Build Portal | `npm run build:portal` | recommended |
| Backend/rules | No rules change expected; Storage rules unchanged | document if none |

### Manual

- [ ] Portal: open Donate Designs from sidebar drawer (mobile + desktop).
- [ ] Upload image(s); progress/finalize works like Upload Designs.
- [ ] Cannot submit without both checkboxes.
- [ ] Success does **not** add to Current Request / create print request items.
- [ ] Studio Donated Designs shows pending row; Customer Uploads does **not**.
- [ ] Send to AI Review → design appears in AI pipeline; exclude/restore behave without request links.
- [ ] Print Upload Designs still attaches to Current Request and appears under Customer Uploads only.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (Portal donate wording + Studio Donated Designs)
- [ ] Design approval (light — reuse existing upload UI chrome)
- [x] Business logic decision — confirm permission model assumption (any customer vs staff flag) if product disagrees before implement
- [x] Production deploy (Functions + indexes + apps)
- [ ] Database migration (additive field only; no destructive migration)
- [ ] Auth / external service setup
- [ ] Secrets / env vars
- [x] Other: Consent final copy approval (can use proposed copy unless owner edits)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mixed Studio queues / wrong badge counts | High | Purpose filter on queries + split badges; missing purpose = print |
| Attach callable used on donate batches | High | Server rejects purpose mismatch both ways |
| Catalog consent optional by mistake (ADR-074 bleed) | High | Donate confirm requires `catalogUseAcknowledged === true` |
| Scope creep into print upload redesign | Medium | Parameterize existing panel; keep `/requests/artwork` unchanged in product terms |
| Index missing → Studio query fails | Medium | Add indexes in same phase; verify before signoff |
| Customers confuse Upload vs Donate | Medium | Separate routes, nav labels, and success copy |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

1. Hide Portal donate nav link and route (feature flag or revert).
2. Disable/undeploy `confirmCustomerUploadsForDonation` if needed.
3. Leave any already-confirmed donations in `pending_staff_review` for staff to exclude or process.
4. Print-request upload path remains primary customer artwork path.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md (optional one-liner if product surface listed)
- [ ] ARCHITECTURE.md (only if app surface list needs donate route)
- [x] DATA_MODEL.md
- [x] BACKEND.md
- [ ] TESTING.md (manual/smoke notes)
- [ ] DEPLOYMENT.md (Functions/indexes deploy note if process doc lists callables)
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md (ADR: catalog donation purpose + required consent)
- [x] Other: ROADMAP.md

---

## Open Questions

- [x] **Resolved in plan (assumption):** “Permission” = ownership + required donation/listing consent; any Portal customer may donate (same gate as Upload Designs).
- [ ] **Optional product confirm:** Should donate be limited to customers with a staff-set flag before first production ship? Default **no** unless owner says yes before implement.
- [ ] **Route path preference:** `/donate` vs `/catalog/donate` — default `/donate`.
- [ ] **Studio nav label:** “Donated Designs” confirmed? (plan uses this.)

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-13-portal-donate-designs-review.md
- Verdict: pending
