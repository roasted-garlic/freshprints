# Plan: Portal modal “Don't show again” + Import Smart Profile presets + Studio intake Halftone/Background

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review (amended — Workstream C **Studio correction**) |
| Workflow | managed-phase |
| Goal | `portal-modal-dont-show-again-and-import-smart-profile-presets` |
| Baseline | `ab7edcacd63f8a716ddd229dcf03a2afcc9c1fc9` (`HEAD == origin/development`) |
| Related | `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-review.md` |
| Scope gate | Plan → Formal Review → **STOP** (no implement / deploy / commit this turn) |
| Amendment history | 2026-09-02 initial C targeted **Portal** (incorrect). 2026-09-03 Owner correction: C = **Studio** Customer Uploads / Donated Designs intake. Aborted Portal-oriented implement rolled back before accepted deploy. |

---

## Goal

Deliver three independently removable Owner fast-follows under one FreshForge umbrella:

1. **Workstream A** — Portal Upload / Donate optional artwork-quality instructional modal “Don't show again” (unchanged).
2. **Workstream B** — Studio Imports optional batch-level Smart Profile presets (unchanged; Person→`subjects`, Location→`places`).
3. **Workstream C** — **Studio** Customer Uploads + Donated Designs intake: per-design staff **Halftone** (instant + authoritative) and **Artwork Background** picker matching Studio Imports — before Send to AI Review. **Portal C impact = NONE.**

Workstreams share Plan/Review/Test/Signoff **process** only. They must not share runtime implementation (A ≠ B ≠ C).

---

## Background

- Prior closed goal: `customer-specific-temporary-print-request-and-show-quota-override`.
- Baseline HEAD `ab7edcac…`; aborted A+B+C implement source rolled back (Plan/Review/state preserved).
- Smart Profiling **PARKED** (Autonomous OFF). Unpark only B import presets.
- Phase alignment:
  - **A** = Phase 8 Portal UX fast-follow
  - **B** = narrow Phase 5 / Smart Catalog import-enrichment fast-follow
  - **C** = Studio staff catalog intake fast-follow (Uploaded Designs + Donated Designs)
- Production **NOT AUTHORIZED**. Batch-allocation **DEFERRED**.

### Workstream C correction record (do not erase)

| | |
|--|--|
| Prior planning target | Fresh Prints **Portal** `/requests/artwork` + `/donate` — **INCORRECT** |
| Owner correction | Fresh Prints **Studio** `/customer-uploads` + `/donated-designs` |
| Timing | Corrected **before** accepted implementation/deployment |
| Portal C | **ZERO** intended scope; Portal Halftone evidence checkbox remains pre-goal behavior |

---

## Umbrella scope rules

### In Scope (umbrella)

- Separate Plan subsections, acceptance, tests, QA, deploy inventories for **A, B, C**
- Independently removable/revertible
- C is Studio staff intake only

### Out of Scope (umbrella)

- Implementation / deploy / commit / push (this turn)
- Production
- Broad Smart Profiling / Autonomous ON / tag retirement / Smart Filter redesign / mass backfill
- Batch-allocation
- Combining B presets with C per-design controls
- Flattening artwork / Storage byte changes for Halftone/bg
- Any Portal Halftone authority elevation or Portal artwork-background picker (C)

---

> **Workstreams A and B** remain as previously planned in this document’s earlier sections (Portal Don’t-show-again; Studio Import Smart Profile presets). They are unchanged by the Studio C correction. Full A/B detail is retained below via the Formal Review cross-references and prior Plan content through B Open questions — see companion Formal Review for locked A/B verdicts. The **authoritative C section is fully replaced below**.

---

# WORKSTREAM A — Portal Upload / Donate “Don't show again”

**Status: UNCHANGED by Studio C correction.**

Full prior Plan scope remains in force (shared `ArtworkQualityNotice`; forever localStorage dismiss; shared Upload+Donate preference; no Firestore/Functions/Rules; ownership/catalog/validation untouched). Locked by Formal Review **A1–A13**.

---

# WORKSTREAM B — Import Smart Profile presets

**Status: UNCHANGED by Studio C correction.**

Full prior Plan scope remains in force (Person→`subjects`, Location→`places`; durable `smartProfileImportPresets` + `importPresetDimensionKeys`; post-AI merge; reprocess durability; staff-edit seed sync; Smart Profiling parked). Locked by Formal Review **B1–B28**.

---

# WORKSTREAM C — Studio Customer Uploads / Donated Designs Halftone + Artwork Background

## C — Correction banner

| | |
|--|--|
| Prior Plan/Review target | **Portal** Upload/Donate — **INCORRECT** |
| Corrected target | **Studio** `/customer-uploads` + `/donated-designs` |
| Portal C scope | **NONE** |
| Aborted implement | Exact-path restore + delete completed; HEAD `ab7edcac…` |

## C — Goal

On Studio staff intake for Uploaded Designs and Donated Designs, provide **per-design**:

1. Instant, authoritative **Halftone** toggle
2. **Artwork Background** picker matching Studio Imports (Auto / Light / Dark)

…before **Send to AI Review**, with durable trusted persistence and no artwork flattening.

## C — Repo audit findings (HEAD)

### Surfaces — shared intake YES

| Surface | Route | Page | Purpose |
|---------|-------|------|---------|
| Customer Uploads | `/customer-uploads` | `CustomerUploadsPage.tsx` | `print_request` |
| Donated Designs | `/donated-designs` | `DonatedDesignsPage.tsx` | `catalog_donation` |

Both use **`CustomerUploadIntakeSection`** + **`useCustomerUploadIntake({ purposeScope })`**.

### Halftone today

| Item | Evidence |
|------|----------|
| Control | `Toggle` “Halftone” in `CustomerUploadIntakeSection` |
| Persistence | `setHalftoneDecision` **awaits** `recordCustomerUploadHalftoneStaffDecision` **then** `patchRowLocally` |
| Latency root cause | **Await-before-paint** (Studio-specific) |
| Field | `halftoneStaffDecision` `{ value: boolean, decidedAt, decidedBy, isExplicitOverride: true }` |
| Source | Callable does **not** write `halftoneDecisionSource`; type allows `"intake"` |
| OFF vs unset | Unspecified = no boolean staff value; explicit OFF = `value: false` wins (`resolveIntakeHalftoneStaffToggle`) |
| Promote | Copies `halftoneStaffDecision` (+ submitter/detection); **no** bg copy today; **no** `halftoneDecisionSource` stamp today |
| Send gate | Promote writes missing boolean via callable first; toggle saves **not** in `pendingByUploadId` → race |

### Artwork background today

| Item | Evidence |
|------|----------|
| Intake UI | **None** |
| `customerUploads` types | **No** artworkBackground fields at HEAD |
| Import picker | `ImportArtworkBackgroundQuickPicker` Auto/Light/Dark + shared resolver |
| Design fields | `artworkBackgroundHex` + `artworkBackgroundSource` (`import_*` / `code_auto` / `staff_manual`) |
| Reprocess | Design Halftone + bg already in `CATALOG_REPROCESS_PRESERVED_FIELD_KEYS` |

## C — Scope

### In Scope

- Optimistic Halftone paint + background staff callable persistence
- Metadata pending/failed gate on Send to AI Review
- Per-design Import-parity background picker (prefer direct Studio reuse of `ImportArtworkBackgroundQuickPicker`)
- Persist bg on `customerUploads`; copy at promote onto designs
- Stamp `halftoneDecisionSource: "intake"` (not `"customer"`) when staff decision is boolean
- Bg source: existing **`staff_manual`** for Studio intake selections
- Regression coverage for promote + reprocess preserve
- Docs DATA_MODEL / BACKEND

### Out of Scope

- Portal C (any)
- Flattening / Storage changes
- Broad Smart Profiling / Autonomous
- Batch-wide inheritance
- Coupling to Workstream B presets

## C — Approach

1. Halftone: paint immediately; persist via existing staff callable asynchronously; Retry; track pending in gate map.
2. Background: Auto/Light/Dark via Import picker + resolver (`autoSuggestsDark: false`); staff callable writes hex/omit + `staff_manual`.
3. Promote: copy bg fields; set `halftoneDecisionSource: "intake"` when staff boolean present.
4. Send gate: block while metadata pending/failed for that upload.
5. Reprocess: reuse existing preserve keys; add regression tests only.
6. Security: staff permissionService + Admin callables; no customer write broaden.

## C — Acceptance (summary)

Instant first/subsequent Halftone on both Studio surfaces; per-design independence; bg matches Imports; persistence + Send gate; promote retains Halftone+bg; reprocess retains; transparency unchanged; Portal unchanged for C.

## C — Tests / performance

- Unit: no-await-before-paint; promote map; OFF/unset
- Functions: bg writer; promote copy; optional source stamp
- Studio typecheck/lint; Functions build
- Owner QA: fresh Studio load first click; Donated Designs; reprocess

## C — Expected files

- Studio intake section/hook/services/row builders (+ Import picker wiring)
- Shared: `customerUpload.types.ts` (+ bg fields); tests
- Functions: staff bg persistence (new/extend); `promoteCustomerUploadToAiReview`; Halftone staff callable likely unchanged except optional source
- Portal / Storage / Indexes / Migration: **NO** for C
- Rules: likely **NO** (callable-only)

## C — Deploy inventories (future)

| Surface | C |
|---------|---|
| Studio | YES |
| Shared | YES |
| Functions | YES |
| Portal | **NO** |
| Firestore Rules | Likely **NO** |
| Storage / Indexes / Migration | **NO** |

## C — Open questions

- [ ] Auto without detector (`autoSuggestsDark: false`) — recommended
- [ ] `halftoneDecisionSource` at promote vs also on callable — recommended **promote minimum** (`"intake"`)
- [ ] Keep A+B+C umbrella — recommended **yes**

## 2026-09-03 Narrow C Corrective Addendum

### Goal

Adjust Studio intake preview behavior so:

1. enabling Halftone defaults the same row to **Dark** background when that row is still on Auto
2. staff may immediately switch that row back to **Light** while keeping Halftone on
3. the visible Upload/Donate preview background actually changes in the current row UI

### Scope

- Studio only: shared `CustomerUploadIntakeSection` path used by `/customer-uploads` and
  `/donated-designs`
- Renderer interaction and preview presentation only, plus minimal hook wiring needed to persist the
  coupled default-dark behavior safely
- Preserve existing callables, fields, promote mapping, and send-gate contract

### Out of scope

- Portal changes
- New persisted fields or schema changes
- New Functions, Rules, Storage, index, or migration work
- Changes to Workstream B import-preset behavior

### Corrective approach

1. Treat Halftone-on as a **default-to-dark** shortcut only when the row background is currently Auto.
2. If the row already has an explicit Light/Dark choice, preserve it.
3. Keep the decision overridable: staff can set Light after Halftone stays on.
4. Render the intake preview using the same resolved artwork-background path already used by Studio
   preview surfaces, not a static CSS-only default.
5. Preserve optimistic preview updates and promote gating while persisting the background choice.

### Test strategy addendum

- Focused Workstream C contract test for:
  - Halftone-on + Auto => default Dark
  - explicit Light preserved while Halftone remains on
  - preview background resolves from the same row state shown in the control
- Touched-file lint
- Owner manual QA on `/customer-uploads` and `/donated-designs`

---

## Cross-workstream rules

- Separate acceptance, tests, QA, deploy inventories for A / B / C
- Independently removable
- **A** = only Portal change; **C Portal impact = NONE**
- **B vs C** independently modeled
- Smart Profiling parked except B; Autonomous OFF
- Production NOT AUTHORIZED

---

## Human checkpoints anticipated

- [x] Formal Review A+B
- [x] Formal Review incorrect Portal C (superseded)
- [x] Formal Review corrected Studio C
- [ ] Owner authorize Implement
- [ ] Owner QA A/B/C
- [ ] DEV deploy authorization
- [ ] Production — **not authorized**

---

## Documentation updates required (at implement)

- [ ] DATA_MODEL.md — B seed; C intake bg + promote + intake provenance
- [ ] BACKEND.md — B enrichment; C staff bg + promote
- [ ] DECISIONS.md — B ADR; C Studio intake Halftone UX / bg parity note
- [ ] ROADMAP.md — when closed
- [ ] TESTING.md — only if new commands

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-review.md`
- Verdict: pending Formal Review Studio-C amendment
