# Fresh Prints — Current State Snapshot

> **Refresh before every external AI session.**
> Source: `.cursor/workflow/state.md` (authoritative) + `docs/project/ROADMAP.md`
> Last updated: **2026-07-04**

---

## At a Glance

| Field | Value |
|-------|-------|
| **App** | Fresh Prints — DTF design catalog & print planning |
| **Active app** | Fresh Prints Studio (Electron desktop, staff only) |
| **Roadmap phase** | **Phase 6** — Customers and Print Requests PASS WITH NOTES; item preview/DPI polish signed off |
| **Managed workflow goal** | `print-request-item-preview-and-dpi-polish` — signed off PASS |
| **Workflow phase** | Signoff complete |
| **Status** | Automated verification passed; user-run manual QA passed; signoff complete |
| **Human checkpoint** | No active checkpoint |

---

## Workflow Snapshot (FF)

```txt
Mode:           managed-phase
Goal:           print-request-item-preview-and-dpi-polish
Phase:          signoff
Status:         implementation complete; automated verification passed; user-run manual QA passed; signoff complete
Plan:           docs/workflow/plans/2026-07-04-print-request-item-preview-and-dpi-polish-plan.md
Test report:    docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-test-report.md
Signoff:        docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md
DONE:           yes
```

### Current Managed Phase

`print-request-item-preview-and-dpi-polish` is signed off PASS. The planning artifact is:

- `docs/workflow/plans/2026-07-04-print-request-item-preview-and-dpi-polish-plan.md`

The automated verification artifact is:

- `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-test-report.md`

The signoff artifact is:

- `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`

The phase implements narrow Print Request item-card polish from the previous oversized-selection
signoff follow-up notes:

- TD-019: Print Request item thumbnails should use contained fit in the same card footprint.
- TD-020: Print Request item thumbnails should open in a lightbox preview.
- TD-021: Oversized requested item dimensions should still show accurate calculated DPI instead of
  `0 DPI`.

Implementation, automated verification, and user-run authenticated manual QA are complete.

Implemented behavior:

- `PrintRequestItemCard.tsx` now renders item thumbnails with `imageFit="contain"` in the existing
  item-card footprint.
- Item thumbnails reuse `DesignPreviewLightbox`.
- Item preview URL resolution follows the existing Design Library pattern:
  `design.previewPath ?? design.thumbnailPath`.
- Missing/unresolved images keep the fallback thumbnail state and do not render a broken lightbox.
- `assessPrintRequestItemSize()` now calculates requested-size DPI and quality before applying the
  22-inch standard-size save block.
- Over-22 requested dimensions still block autosave with the existing Custom Request guidance.
- Over-22 requested dimensions no longer show `0 DPI` solely because they are oversized.
- Quantity, width, and height inputs now keep transient text state while editing, allow blank
  width/height without coercing to `0`, block autosave for blank/invalid values, and auto-select
  their current value on focus.

Automated verification passed on 2026-07-04:

- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestOversizedSelection.test.ts` — PASS, 21/21.
- `npx tsc --noEmit` — PASS.
- `npm run lint` — PASS.
- `npx vite build` — PASS with the existing circular manual-chunk warning only.
- `git diff --check` — PASS with standard Windows LF/CRLF warnings only.

Manual authenticated QA passed in the user's dev session on 2026-07-04:

- Opened `/print-requests`.
- Opened a request with items.
- Confirmed quantity, width, and height inputs auto-select their current value on focus.
- Confirmed blank width/height edits do not coerce to `0`, show validation, and do not autosave.
- Confirmed valid width/height edits recalculate the paired dimension through aspect-ratio lock and autosave.
- Confirmed quantity edits autosave cleanly.
- Confirmed over-22 requested dimensions still show Custom Request guidance, still block autosave,
  and still show accurate DPI instead of `0 DPI`.
- Confirmed item thumbnails keep the same card footprint, use contained fit, and open in a
  closable lightbox.
- Confirmed duplicate/remove behavior, CR/IR naming, and request origin badges still work.
- Confirmed catalog dimensions and image files are unchanged.
- Confirmed no design lifecycle status changes occurred.

No Firebase deploy, Firestore rules/index deploy, migration/backfill, image mutation/regeneration/
resizing/compression/downscaling, catalog dimension mutation, request naming change, origin badge
change, Portal, Print Runs, Custom Requests, or design lifecycle change was performed.

### Recent Print Request Signoffs

- `print-request-oversized-selection-unblock` signed off PASS WITH FOLLOW-UP NOTES on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-oversized-selection-unblock-signoff.md`.
- Manual QA verified that an approved `30 x 36` catalog/default-size test design now adds
  successfully from Design Library request-selection mode, initializes as about `10 x 12`
  requested inches, keeps catalog/default dimensions at `30 x 36`, does not mutate image files,
  still blocks over-22 requested item edits, autosaves after resizing back to 22 inches or less,
  preserves duplicate requested size, and does not affect CR/IR naming, origin badges, or design
  lifecycle status.


- `print-request-origin-tracking` signed off PASS on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-origin-tracking-signoff.md`.
- Dev Firestore rules were deployed for origin tracking with:
  `firebase deploy --only firestore:rules --project fresh-prints-dev`.
- Manual authenticated QA passed for new and legacy origin badges, unchanged CR/IR naming, item
  autosave, duplicate/remove behavior, no Portal/customer Auth behavior, and no design lifecycle
  status changes.

- `print-request-item-preview-and-dpi-polish` signed off PASS on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-item-preview-and-dpi-polish-signoff.md`.
- Manual authenticated QA passed for contained item thumbnails, thumbnail lightbox open/close,
  accurate oversized DPI feedback, blank width/height edits that no longer coerce `0`, focus
  auto-select on quantity/width/height, unchanged CR/IR naming and origin badges, unchanged
  catalog dimensions/image files, and no design lifecycle status changes.


- `print-request-detail-autosave-and-name-locking` signed off PASS on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-detail-autosave-and-name-locking-signoff.md`.
- That implemented scope covered:

- Print Request item autosave for normal quantity/width/height edits.
- Removing native browser number spinners from quantity, width, and height inputs.
- Replacing item-level save buttons and noisy success alerts with a subtle item autosave indicator.
- Updating duplicate item behavior so the detail list updates dynamically without disruptive page-wide reloads.
- Stable request item visual ordering so saves do not move items to the top.
- Locking customer request names and request sequence numbers.
- Hiding request status editing from the Print Request detail page.
- Revising customer request names to `username-CR001`.
- Revising internal request names to `baseName-IR001`, with editable internal base name and locked `IR` sequence.
- Internal create uses an `Internal base name` input that starts blank; blank input normalizes to
  `internal` on create.
- Item quantity, item width, and item height autosave through the subtle bottom-right indicator.
- Request Detail fields do not autosave. Internal base-name edits update the generated request-name
  preview while staff type, and visible request notes/internal base-name changes persist only when
  staff manually saves the Request Detail section.
- Legacy internal requests remain readable. They upgrade only when staff edits internal base name
  and a usable locked `requestSequenceNumber` exists; otherwise their legacy name is not guessed or
  rewritten.
- Stable item ordering must keep existing items without `sortOrder` visible. Preferred first
  implementation keeps reads request-scoped by `printRequestId` and sorts client-side by
  `sortOrder`, then `createdAt`, then document ID.
- Local Firestore rules were updated and deployed to `fresh-prints-dev` for
  `printRequests.internalBaseName`, `printRequests.nameFormatVersion`, and
  `printRequestItems.sortOrder`.
- Dev rules deploy command used:
  `firebase deploy --only firestore:rules --project fresh-prints-dev`.
- QA correction after user observation: Request Detail uses manual save; item fields remain autosave.

Automated verification passed on 2026-07-04:

- `npx tsx --test src/renderer/src/features/print-requests/utils/printRequestItemSizingAndNaming.test.ts src/renderer/src/features/print-requests/utils/printRequestQueryPlanning.test.ts` — 20/20 tests.
- `npx tsc --noEmit` — pass.
- `npm run lint` — pass.
- `npx vite build` — pass with existing circular manual-chunk warning.
- `git diff --check` — pass with standard Windows LF/CRLF warnings.

Manual authenticated QA passed in the user's dev session on 2026-07-04. The user verified request
cards, customer labels, item counts, internal/customer request naming, locked status/sequence/name
fields, item autosave, dynamic duplicate/remove behavior, stable item ordering, legacy item
visibility, hidden standard item notes/status UI, no design lifecycle status changes, and the
corrected Request Detail manual-save behavior.

- `print-request-item-sizing-and-username-naming` signed off PASS WITH FOLLOW-UP NOTES on 2026-07-04:
  `docs/workflow/reviews/2026-07-04-print-request-item-sizing-and-username-naming-signoff.md`.
- Dev Firestore rules were deployed for that phase with:
  `firebase deploy --only firestore:rules --project fresh-prints-dev`.
- Manual authenticated QA passed for customer usernames, username reservations, request counters,
  item sizing/DPI validation, duplicate same-design rows, quantity controls, hidden standard item
  notes/status UI, and no design lifecycle status changes.
- `print-request-query-index-hardening` signed off on 2026-07-03:
  `docs/workflow/reviews/2026-07-03-print-request-query-index-hardening-signoff.md`.
- Dev Firestore indexes for Print Request query hardening were deployed with:
  `firebase deploy --only firestore:indexes --project fresh-prints-dev`.

### AI Processing Baseline

AI Processing local fixes through the July 2026 provider/prompt work are signed off locally. Some
Cloud Functions prompt/provider changes still require a separate human-approved Functions deploy
before they are live in Firebase environments.

Notes:

- Cloud Functions changes from the latest provider/prompt work still require a separate human-approved `firebase deploy --only functions` before taking effect wherever not already deployed.
- `print-request-item-preview-and-dpi-polish` is signed off PASS. No active Print Request
  follow-up is currently in implementation or test.

---

## Roadmap Phase Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation (Auth, roles, shell) | Complete |
| 2 | Design Library (2A–2C) | Complete |
| 3 | Import System (3A–3D) | Complete |
| 4 | Catalog Search & Cleanup | Complete |
| 5 | AI Review Workflow / enrichment baseline | Complete through Phase 0 deploy gate |
| **5** | **AI Review Workflow / enrichment baseline** | **Complete through Phase 0 deploy gate; advanced AI controls signed off locally** |
| **6** | **Customers & Print Requests** | **PASS WITH NOTES; item preview/DPI polish signed off** |
| 7 | Print Runs / Upcoming Shows | Planned |
| 8 | Fresh Prints Portal (customer web) | Planned |
| 9 | Custom Request Q&A | Planned |
| 10 | Analytics & Popularity | Planned |

---

## Studio Workspaces (live routes)

| Route | Workspace | Purpose |
|-------|-----------|---------|
| `/designs` | Design Library | Approved catalog only (`status: ready`) |
| `/imports` | Imports | ZIP/folder batch import, validation, AI review intake |
| `/ai-review` | AI Review | Processing / Needs Review / Rejected tabs |
| `/print-requests` | Print Requests | Internal/customer request lists and request items |
| `/users` | Team management | Owner/admin team CRUD plus customer record create/edit |
| `/settings` | Settings | AI enrichment model + reasoning selection plus owner/admin AI playground |
| `/show-queue` | Legacy placeholder | Future Print Runs (Phase 7) |
| `/customer-requests` | Legacy placeholder | Future Custom Requests (Phase 9) |

Default landing: `/designs` (Design Library).

---

## Open Blockers & Risks

1. **No `npm test` script / no CI** — tests are run through explicit `npx tsx --test ...`, lint, typecheck, and build commands.
2. **Functions deploy is a separate human checkpoint** — pushing Cloud Function source to GitHub does not deploy it.
3. **Old Firestore AI records may show historical provider/prompt metadata** — do not backfill without an approved migration.
4. **Portal not built** — customer-facing app is Phase 8; all current UI is Studio.
5. **Existing circular manual-chunk warning remains** — `npx vite build` still reports the
   pre-existing `vendor -> react-vendor -> vendor` circular chunk warning, which remains unrelated
   to the signed-off Print Request phases.

---

## How to Update This File

1. Read `.cursor/workflow/state.md`
2. Update **Workflow Snapshot**, **Roadmap Phase Status**, and **Next Managed Bug**
3. Move completed items into **Recent Completed Work**
4. Bump **Last updated** date
5. Upload this file to your external AI chat
