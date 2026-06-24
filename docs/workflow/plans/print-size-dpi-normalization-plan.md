# Print Size and DPI Normalization Plan

## Document status

| Field | Value |
| --- | --- |
| **Type** | Planning + Phase 3D Step 2 foundation implemented |
| **Prerequisite** | Phase 3C signoff (import pipeline + Design Library rendering complete); Phase 3D Step 1 (archive restore) complete |
| **Parent context** | `docs/plans/import-pipeline-plan.md`, `docs/DATA_MODEL.md`, `docs/WORKFLOWS.md` |
| **Related deferred work** | Phase 3C Step 11 (strict DPI toggle) — superseded by this plan’s pixel-based acceptance model |
| **Out of scope** | PNG rewriting, production RIP integration, customer-facing print calculators, queue/AI changes |

**Goal:** Define how Fresh Prints should interpret PNG pixel dimensions, embedded DPI metadata, and **physical print size in inches** so staff can confidently accept imports for DTF production — including files whose metadata says 72 DPI but whose pixel resolution supports large prints at 300 DPI.

---

## 1. Executive summary

Today the import pipeline:

* Reads **pixel width/height** from the PNG IHDR chunk
* Reads **DPI metadata** from the PNG `pHYs` chunk when present (`electron/ipc/import/pngParser.ts`)
* Warns when DPI is missing or below `MIN_DPI` (300) — **does not block import** (`shared/constants/importValidation.constants.ts`)
* Stores `width`, `height`, and `dpi` on the Firestore design record from validation (`resolveImportDpi` uses `min(dpiX, dpiY)`)

The warning model conflates **metadata DPI** with **production suitability**. A 10800 × 9000 px file tagged 72 DPI is often rejected mentally by staff even though it can print **36″ × 30″ at 300 DPI**.

**Recommended direction:**

1. Treat **pixel dimensions** as immutable facts from the source file.
2. Treat **physical print size (inches)** as the staff-facing production intent — editable, with aspect ratio locked by default.
3. Treat **effective DPI** as a **derived value**: `pixels ÷ inches` — never manually typed.
4. Accept imports when normalized print width at 300 DPI is **≥ 8″** (minimum); **≥ 10″** preferred (informational).
5. **Preserve the original PNG** in Storage; store print interpretation in Firestore only (phase 1).

---

## 2. Concepts and definitions

### 2.1 Pixel dimensions

| Term | Meaning | Source | Mutable? |
| --- | --- | --- | --- |
| `widthPx` | Image width in pixels | PNG IHDR | **No** after import |
| `heightPx` | Image height in pixels | PNG IHDR | **No** after import |

Current Firestore fields `width` and `height` already represent pixel dimensions. This plan recommends keeping that meaning explicit in documentation and types (alias or rename in a future type pass — not required for phase 1).

### 2.2 DPI metadata (embedded)

| Term | Meaning | Source | Mutable? |
| --- | --- | --- | --- |
| `metadataDpiX`, `metadataDpiY` | Values from PNG `pHYs` (or absent) | File header | **No** — audit/reference only |
| `metadataDpi` | `min(metadataDpiX, metadataDpiY)` when both present | Computed at validation | **No** |

Metadata DPI describes how the file *claims* it should be printed. It is often wrong (72 DPI exports from design tools) or missing.

**Metadata DPI must not be the sole acceptance gate.**

### 2.3 Physical print size (inches)

| Term | Meaning | Source | Mutable? |
| --- | --- | --- | --- |
| `printWidthInches` | Intended production width | Staff intent / normalization | **Yes** |
| `printHeightInches` | Intended production height | Staff intent / normalization | **Yes** |

Physical size answers: *“How large will we print this design?”*

### 2.4 Effective DPI (production DPI)

| Term | Meaning | Formula | Mutable? |
| --- | --- | --- | --- |
| `effectiveDpi` | Resolution at declared print size | See Section 6 | **No** — derived on read or stored as computed snapshot |

When aspect ratio is locked, width and height DPI values are equal:

```txt
effectiveDpi = widthPx ÷ printWidthInches
             = heightPx ÷ printHeightInches
```

When aspect ratio is unlocked (discouraged), use the **limiting** (minimum) axis so production never overstates quality:

```txt
effectiveDpi = min(
  widthPx ÷ printWidthInches,
  heightPx ÷ printHeightInches
)
```

### 2.5 Worked example

| Input | Value |
| --- | --- |
| Pixels | 10800 × 9000 |
| Metadata DPI | 72 |
| Metadata-implied size | 150″ × 125″ (misleading) |
| **Normalized size at 300 DPI** | **36″ × 30″** |
| Meets minimum (8″ wide)? | **Yes** |
| Meets preferred (10″ wide)? | **Yes** |

---

## 3. Business rules

### 3.1 Acceptance thresholds

Constants (`shared/constants/printSize.constants.ts`):

| Constant | Value | Purpose |
| --- | --- | --- |
| `TARGET_PRINT_DPI` | `300` | Normalization and display target |
| `MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES` | `3.5` | Hard minimum — reject below this |
| `STANDARD_PRINT_WIDTH_INCHES` | `8` | Standard apparel tier boundary |
| `PREFERRED_PRINT_WIDTH_INCHES` | `10` | Preferred apparel tier |

**Acceptance rule (implemented — Phase 3D Step 3 correction):**

```txt
maxPrintWidthAtTargetDpi = widthPx ÷ TARGET_PRINT_DPI

IF maxPrintWidthAtTargetDpi >= PREFERRED_PRINT_WIDTH_INCHES (10)
  → accept
ELSE IF maxPrintWidthAtTargetDpi >= STANDARD_PRINT_WIDTH_INCHES (8)
  → warn (standard apparel)
ELSE IF maxPrintWidthAtTargetDpi >= MIN_SMALL_FORMAT_PRINT_WIDTH_INCHES (3.5)
  → small_format (import with stronger warning)
ELSE
  → reject
```

8 inches is not a universal reject threshold. Upscaling for larger apparel prints is planned separately and not implemented.

### 3.2 Preferred vs minimum messaging

| Condition | Import outcome | UI tone |
| --- | --- | --- |
| `widthPx / 300 ≥ 10` | Accept | Success / informational |
| `8 ≤ widthPx / 300 < 10` | Accept | Warning: standard apparel |
| `3.5 ≤ widthPx / 300 < 8` | Accept | Warning: small-format only |
| `widthPx / 300 < 3.5` | **Reject** | Error: below minimum |

### 3.3 Aspect ratio

| Mode | Default | Behavior |
| --- | --- | --- |
| **Locked** | **Yes** | Editing width recalculates height (or vice versa) using pixel aspect ratio |
| **Unlocked** | No | Staff may edit width and height independently; show strong warning; `effectiveDpi` uses limiting axis |

Pixel aspect ratio (immutable):

```txt
aspectRatio = heightPx ÷ widthPx
```

Locked edit (width-driven example):

```txt
printHeightInches = printWidthInches × aspectRatio
effectiveDpi = widthPx ÷ printWidthInches
```

### 3.4 DPI is never manually editable

Staff edit **inches**, not DPI. The Edit Design form already shows DPI as read-only (post–Phase 3C QA). This plan extends that rule permanently.

---

## 4. Recommended data model

### 4.1 Firestore `designs` document — proposed fields

Extend `Design` (`src/renderer/src/features/designs/types/design.types.ts`):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `width` | `number` | Keep | Pixel width (existing) |
| `height` | `number` | Keep | Pixel height (existing) |
| `printWidthInches` | `number` | New | Staff-facing production width |
| `printHeightInches` | `number` | New | Staff-facing production height |
| `dpi` | `number` | Keep | **Legacy metadata DPI** at import; retained for backward compatibility |
| `metadataDpiX` | `number` | Optional | Raw axis metadata (audit) |
| `metadataDpiY` | `number` | Optional | Raw axis metadata (audit) |
| `effectiveDpi` | `number` | New | **Production-facing** effective DPI (derived) |
| `printAspectRatioLocked` | `boolean` | New | Default `true` |
| `printSizeSource` | enum | Optional | `"import_normalized"` \| `"staff_edited"` \| `"metadata_inferred"` |

**Deprecation note:** Today `dpi` stores metadata-derived DPI from import. Phase 3D Step 2 types add `effectiveDpi` as the production source; `dpi` remains for backward compatibility until import and edit wiring migrate writes.

### Phase 3D Step 2 — completed foundation

| Deliverable | Location | Status |
| --- | --- | --- |
| Constants | `shared/constants/printSize.constants.ts` | Done |
| Types | `shared/types/printSize/`, `design.types.ts` | Done |
| Pure math helpers | `shared/utils/printSizeMath.ts` | Done |
| Unit tests | `shared/utils/printSizeMath.test.ts` | Done |
| Import wiring | `pngValidator`, orchestration, `designService.createDesign` | Done (Step 3) |
| Edit Design UI | `DesignFormFields.tsx` | Not started |
| Firestore persistence | `designService` | Not started |

### 4.2 Validation result types (IPC)

Extend `ValidateSelectedPngFileResult` (`shared/types/import/importIpc.types.ts`):

```ts
interface PrintSizeAssessment {
  targetDpi: number;
  maxPrintWidthInchesAtTarget: number;
  maxPrintHeightInchesAtTarget: number;
  meetsMinimumWidth: boolean;
  meetsPreferredWidth: boolean;
  suggestedPrintWidthInches: number;
  suggestedPrintHeightInches: number;
  metadataDpi?: number;
}
```

### 4.3 What not to store

* Do not store permanent Storage download URLs
* Do not store metadata-implied print size as production truth unless explicitly chosen

### 4.4 Indexes

No new composite indexes required for phase 1. Future search filters (“printable at 10″+”) may add indexes in Phase 4.

---

## 5. DPI and print size formulas

### 5.1 Normalized print size at target DPI (import default)

```txt
suggestedPrintWidthInches  = widthPx  ÷ TARGET_PRODUCTION_DPI
suggestedPrintHeightInches = heightPx ÷ TARGET_PRODUCTION_DPI
suggestedEffectiveDpi      = TARGET_PRODUCTION_DPI
```

### 5.2 Effective DPI from staff-edited inches

**Aspect locked (width edited):**

```txt
printHeightInches = round(printWidthInches × (heightPx ÷ widthPx), precision)
effectiveDpi      = widthPx ÷ printWidthInches
```

**Aspect locked (height edited):**

```txt
printWidthInches  = round(printHeightInches ÷ (heightPx ÷ widthPx), precision)
effectiveDpi      = heightPx ÷ printHeightInches
```

**Aspect unlocked:**

```txt
effectiveDpi = min(
  widthPx ÷ printWidthInches,
  heightPx ÷ printHeightInches
)
```

### 5.3 Rounding policy

| Value | Precision | Rule |
| --- | --- | --- |
| Inches (display/input) | 2 decimal places | Round half-up |
| Effective DPI (display) | Integer | `Math.round(effectiveDpi)` |
| Internal calculations | Full float | Round only at persistence boundary |

### 5.4 Minimum width check (any edit)

After any print size change:

```txt
IF printWidthInches < MIN_PRINT_WIDTH_INCHES
  → block save / show validation error
```

Optionally warn when `effectiveDpi < TARGET_PRODUCTION_DPI` after unlock (staff chose a larger print than pixels support).

---

## 6. Import validation behavior

### 6.1 Validation layers (unchanged architecture)

```txt
Main process (pngValidator)
  → pixel dimensions, metadata DPI, print size assessment
Renderer (importOrchestrationService)
  → staff confirmation, Firestore create
```

### 6.2 Proposed validation outcomes

| Scenario | Pixel math | Metadata DPI | Outcome |
| --- | --- | --- | --- |
| Large pixels, low metadata DPI | ≥ 8″ at 300 | 72 | **Accept** + normalization info |
| Large pixels, missing metadata | ≥ 8″ at 300 | absent | **Accept** + normalization info |
| Small pixels, high metadata DPI | < 8″ at 300 | 300 | **Reject** (pixels insufficient) |
| Adequate pixels, preferred width | ≥ 10″ at 300 | any | **Accept** |
| Adequate pixels, marginal width | 8–10″ at 300 | any | **Accept** + preferred-width warning |

### 6.3 Replace metadata-only warnings

| Current warning | Future behavior |
| --- | --- |
| `DPI_BELOW_TARGET` | Replace with `PRINT_SIZE_NORMALIZED` when pixel math passes; keep metadata note as info |
| `DPI_METADATA_MISSING` | Info only if pixel math passes; no longer primary concern |

New warning codes (proposed):

| Code | When |
| --- | --- |
| `PRINT_SIZE_BELOW_PREFERRED` | Accept but width at 300 DPI is 8–10″ |
| `PRINT_SIZE_NORMALIZED` | Metadata DPI differed; canonical size shown |
| `PRINT_SIZE_REJECTED` | Cannot reach 8″ width at 300 DPI |

### 6.4 Import UX flow (recommended)

```txt
Select PNG → validate (main)
    ↓
Show assessment card:
  • Pixels: W × H
  • Metadata DPI (if any) — informational
  • Normalized print size at 300 DPI: W″ × H″
  • Effective DPI at normalized size: 300
  • Accept / reject badge
    ↓
IF rejected → stop (no upload)
IF accepted → staff confirms upload (single) or proceeds (batch)
    ↓
createDesign with:
  width, height (pixels)
  printWidthInches, printHeightInches (normalized)
  dpi = 300 (effective)
  metadataDpi* (audit)
  printAspectRatioLocked = true
  printSizeSource = "import_normalized"
```

**Staff confirmation:** Required when metadata DPI was missing or differed from normalized interpretation by more than a tolerance (e.g. effective metadata-implied width differs from normalized width by > 10%). Batch imports may use a summary row with expandable detail per file.

**Auto-normalization on import:** Yes — default print size = pixel dimensions ÷ 300. Do **not** rewrite the PNG file.

### 6.5 Batch import

Same rules per file. Rejected files do not upload. Validated files carry `PrintSizeAssessment` in manifest for discovery UI.

### 6.6 Strict rejection toggle

Phase 3C Step 11 “strict DPI toggle” should be **replaced** by this pixel-based rejection model. No separate metadata-DPI reject flag.

---

## 7. Edit Design UI behavior

### 7.1 Editable fields (staff with `canEditDesigns`)

| Field | Control | Notes |
| --- | --- | --- |
| Title, description, category, tags | Existing | Unchanged |
| **Print width (inches)** | Number input | Min 8″ validation |
| **Print height (inches)** | Number input | Locked when aspect locked |
| **Lock aspect ratio** | Toggle | Default on; unlock shows warning modal |
| Width/height (pixels) | Read-only | From source file |
| DPI | Read-only | Computed live as inches change |
| Storage paths, design ID | Read-only | Unchanged (post–3C QA) |

### 7.2 Status editing

Unchanged from post–3C QA: **owner/admin only** (`permissionService.canEditDesignStatus`). Print size editing does not change status workflow.

### 7.3 Live DPI preview

As staff types print width (locked mode):

```txt
onChange(printWidthInches):
  printHeightInches = printWidthInches × (heightPx / widthPx)
  effectiveDpi = widthPx / printWidthInches
  update read-only DPI field
```

Show helper text:

```txt
300 DPI target · 10″+ preferred · 8″ minimum
```

### 7.4 Unlock aspect ratio warning

Modal copy (draft):

> Unlocking aspect ratio allows non-proportional print dimensions. Effective DPI will use the limiting axis and may drop below 300 DPI. Continue?

Require explicit confirm. Set `printAspectRatioLocked = false` on save.

### 7.5 Design Details display

Show:

* Pixels: `width × height`
* Print size: `printWidthInches″ × printHeightInches″`
* Effective DPI: `dpi`
* Metadata DPI (if present): secondary/audit line

---

## 8. Existing imported designs

### 8.1 Backfill strategy

Designs imported before this feature have `width`, `height`, `dpi` (metadata-derived) but no print inches.

**Recommended backfill (one-time tool or lazy migration):**

```txt
IF printWidthInches missing AND width present:
  IF metadata dpi present AND width/dpi >= MIN_PRINT_WIDTH_INCHES:
    printWidthInches  = width / metadataDpi
    printHeightInches = height / metadataDpi
    effectiveDpi      = metadataDpi
    printSizeSource   = "metadata_inferred"
  ELSE IF width / TARGET_PRODUCTION_DPI >= MIN_PRINT_WIDTH_INCHES:
    printWidthInches  = width / TARGET_PRODUCTION_DPI
    printHeightInches = height / TARGET_PRODUCTION_DPI
    effectiveDpi      = TARGET_PRODUCTION_DPI
    printSizeSource   = "import_normalized"
  ELSE:
    flag for staff review (below minimum at 300 DPI)
```

Optional Phase 3C Step 12 backfill tool can be extended for print size fields.

### 8.2 Staff edit on legacy records

Once backfilled (or on first open), staff use the same Edit Design print size controls. `printSizeSource` becomes `"staff_edited"` on save.

---

## 9. Storage behavior

### 9.1 Phase 1 recommendation — metadata only

| Asset | On import | On print size edit |
| --- | --- | --- |
| `/originals/{designId}.png` | Upload unchanged bytes | **No change** |
| `/thumbnails/{designId}.webp` | Derivative pipeline | **No change** |
| `/previews/{designId}.webp` | Derivative pipeline | **No change** |
| Firestore print fields | Set at create | Update on edit |

**Rationale:**

* Pixel data does not change when interpretation changes
* Preserves audit trail and AI-readiness (`originalPath` stable)
* Matches WORKFLOWS.md: *“Original files should remain unchanged”*
* Avoids main-process PNG rewrite complexity in phase 1

### 9.2 Future options (not phase 1)

| Option | When | Tradeoff |
| --- | --- | --- |
| **Rewrite PNG `pHYs` chunk** | RIP software requires embedded DPI | Requires main-process rewrite + re-upload; version original |
| **Normalized production copy** | Separate print pipeline | New Storage path `/production/{designId}.png`; original preserved |
| **On-demand export** | Staff exports for RIP | Desktop-only temp file; no Firestore change |

**Recommendation:** Defer file rewriting until a specific RIP integration requirement is documented.

### 9.3 Derivative generation

Thumbnail/preview dimensions remain independent of print size. Do not regenerate derivatives when print inches change.

---

## 10. Firestore impact

### 10.1 Schema

Add optional fields (Section 4.1). Existing documents remain valid.

### 10.2 Security rules

`firestore.rules` — ensure new fields follow same staff edit rules as `width`/`height`. No customer write access.

Validate on write (service layer):

* `printWidthInches >= MIN_PRINT_WIDTH_INCHES`
* `printHeightInches > 0`
* `dpi` matches computed effective DPI within tolerance (or compute server-side and ignore client `dpi`)

### 10.3 `designService.updateDesign`

* Accept `printWidthInches`, `printHeightInches`, `printAspectRatioLocked`
* Recompute `dpi` in service — **do not trust client-supplied DPI**
* Reject updates to `width`/`height` pixels from edit form (already restricted in UI)

---

## 11. Security impact

| Area | Impact | Mitigation |
| --- | --- | --- |
| Renderer edit form | Staff could tamper with inches/DPI | Service-layer recomputation of `dpi`; pixel fields immutable |
| Import validation | Must run in main process | Keep assessment in `pngValidator`; renderer displays only |
| Context menu / IPC | No change | N/A |
| Storage | Original preserved | No new attack surface from rewrite |
| Firestore rules | New fields | Staff-only writes; validate numeric ranges |

No new Cloud Functions required for phase 1.

---

## 12. Architecture and layer placement

| Concern | Layer | Location (proposed) |
| --- | --- | --- |
| Print size assessment math | Shared constants + utils | `shared/constants/printSize.constants.ts`, `shared/utils/printSizeMath.ts` |
| PNG validation + assessment | Main | `electron/ipc/import/pngValidator.ts` |
| Import UX / confirmation | Renderer components | `features/imports/components/` |
| Persist print fields | Renderer service | `designService.createDesign` / `updateDesign` |
| Edit form inches/DPI | Renderer components | `DesignFormFields.tsx` |
| Business rules | Feature service | `features/designs/services/printSizeService.ts` |

Components must not compute authoritative DPI for persistence — delegate to service.

---

## 13. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Staff confusion (metadata vs effective DPI) | Medium | Clear import summary; audit fields; training copy |
| Legacy records without print inches | Medium | Backfill tool + lazy defaults on edit |
| Unlocked aspect ratio prints below 300 DPI | Medium | Warning modal; show limiting DPI prominently |
| RIP expects embedded 300 DPI in file | Medium | Document deferral; plan phase 2 production export |
| Batch UI clutter with per-file assessments | Low | Collapsible warnings; summary counts |
| Firestore `dpi` meaning changes | Medium | Migration renames metadata to `metadataDpi`; version docs |
| Helpers edit print size incorrectly | Low | Min width validation; optional owner-only edit (not recommended initially) |

---

## 14. Testing checklist

### 14.1 Unit tests (`printSizeMath.ts`)

- [ ] `10800×9000` at 300 DPI → 36″ × 30″; meets preferred
- [ ] `2400×2400` at 300 DPI → 8″ × 8″; meets minimum only
- [ ] `2399×2399` → fails minimum width at 300 DPI
- [ ] `3000×1500` → 10″ × 5″ at 300 DPI; meets preferred width
- [ ] Locked aspect: edit width → height and DPI recalculate
- [ ] Unlocked aspect: limiting DPI uses min axis
- [ ] Rounding: inches to 2 decimals, DPI integer

### 14.2 Main process validation

- [ ] 72 DPI metadata + large pixels → accept with normalization
- [ ] Missing metadata + adequate pixels → accept
- [ ] 300 DPI metadata + tiny pixels → reject
- [ ] Warnings map correctly to new codes

### 14.3 Import UI

- [ ] Single PNG shows normalized print size before upload
- [ ] Staff confirm when metadata differs significantly
- [ ] Rejected file does not upload or create Firestore record
- [ ] Batch discovery shows per-file print assessment

### 14.4 Edit Design

- [ ] Print width/height editable; DPI read-only and live-updates
- [ ] Pixel dimensions read-only
- [ ] Lock toggle default on
- [ ] Unlock warning modal required
- [ ] Save blocked below 8″ width
- [ ] Helper cannot edit status; can edit print size (if policy confirmed)

### 14.5 Design Details

- [ ] Shows pixels, print inches, effective DPI, metadata DPI (audit)

### 14.6 Regression

- [ ] Import pipeline (single + batch) still creates originals + derivatives
- [ ] Design Library thumbnails unaffected
- [ ] Existing designs backfill or lazy-init without crash

### 14.7 Security

- [ ] Client cannot persist arbitrary `dpi` — service recomputes
- [ ] Client cannot change pixel `width`/`height` via API

---

## 15. Recommended implementation phase

### Placement: **Phase 3D** (post–3C signoff, pre–Phase 4 search)

Rationale: Completes the import/production metadata story started in Phase 3A–3C without coupling to AI (Phase 7) or queue (Phase 6).

### Suggested sequence

| Step | Scope | Deliverable |
| --- | --- | --- |
| **3D-1** | Archive restore status correction | Done (Step 1) |
| **3D-2** | Shared math + constants + types | Done (Step 2 foundation) |
| **3D-3 correction** | Acceptance tier update | 3.5″ minimum reject; small-format tier 3.5–8″ |
| **3D-4** | Edit Design print size controls | Done — staff edit print inches, derived effective DPI, `staff_edited` source |
| **3D-5** | Import UI polish | Assessment display done in Step 3; staff confirm on misleading metadata deferred |
| **3D-6** | Edit Design UI | Inches inputs; lock toggle; live DPI; validation |
| **3D-7** | Design Details | Print size display |
| **3D-8** | Backfill | Optional tool for existing `imported` designs |
| **3D-9** | Docs + signoff | Update `FIREBASE.md`; `phase-3d-signoff.md` |

**Explicitly not in 3D:** PNG rewrite, production asset path, customer print calculator.

### Relationship to Phase 3C Step 11

Step 11 (strict DPI toggle) should **not** be implemented as planned. This phase replaces it with pixel-based acceptance.

---

## 16. Documentation updates (at implementation time)

| Document | Updates |
| --- | --- |
| `docs/DATA_MODEL.md` | Print size fields; `dpi` = effective DPI |
| `docs/WORKFLOWS.md` | Validation step uses print size assessment |
| `docs/FIREBASE.md` | Field definitions; no Storage rewrite |
| `docs/SECURITY.md` | Service-layer DPI authority |
| `docs/ROADMAP.md` | Phase 3D milestone |
| `docs/plans/phase-3c-implementation-plan.md` | Note Step 11 superseded |

---

## 17. Open decisions for stakeholder signoff

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | Reject below 8″ at 300 DPI on import? | **Yes** — hard reject |
| 2 | Require staff confirm on normalization? | **Yes** when metadata DPI misleading |
| 3 | Helpers edit print size? | **Yes** (same as other catalog edits) |
| 4 | Store `metadataDpi` on every import? | **Yes** — audit trail |
| 5 | Phase 2 PNG `pHYs` rewrite? | **Defer** until RIP requirement known |
| 6 | Max print width cap? | **Defer** — pixel math is natural cap |

---

## 18. Completion criteria (planning)

This planning artifact is complete when:

- [x] Pixel vs metadata vs physical size defined
- [x] 8″ minimum / 10″ preferred rules documented
- [x] DPI formulas and aspect lock behavior specified
- [x] Import, edit, storage, and backfill behaviors proposed
- [x] Data model, security, risks, and tests outlined
- [x] Implementation phase recommended

**No code, Firebase, or UI changes are part of this document.**

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/WORKFLOWS.md`, `docs/ROADMAP.md`, `docs/plans/import-pipeline-plan.md`, `docs/plans/phase-3c-implementation-plan.md`, `shared/constants/importValidation.constants.ts`, `electron/ipc/import/pngValidator.ts`*
