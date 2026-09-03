# Review: Portal modal “Don't show again” + Import Smart Profile presets + Studio intake Halftone/Background

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-plan.md` |
| Baseline | `ab7edcacd63f8a716ddd229dcf03a2afcc9c1fc9` |
| Verdict | **approved_with_changes** (Studio Workstream C correction) |
| Scope this turn | Rollback verified + Plan/Review C amendment only — **STOP before implement** |
| Correction | Workstream C retargeted from Portal → **Studio** `/customer-uploads` + `/donated-designs` |

---

## Summary

A and B remain as previously approved. **Workstream C is re-reviewed from scratch for Studio staff intake.** Prior Portal-oriented C review is superseded (historically incorrect). Studio Halftone already uses authoritative `halftoneStaffDecision` via staff callable, but **awaits before paint**. Intake lacks artwork-background UI; promote copies Halftone but **not** background today. Prefer reusing Studio Import background picker; stamp provenance `"intake"` (not `"customer"`). Portal C impact = **NONE**. Umbrella A+B+C still reasonable.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | **pass** | A Portal; B Imports presets; C Studio intake |
| Architecture alignment | **pass** | C uses shared `CustomerUploadIntakeSection` |
| Security | **pass** | Staff callables; no customer write broaden |
| Data model | **pass** | Additive upload bg fields; existing design fields |
| Backend | **pass** | Promote bg copy + staff bg writer; Halftone UX fix |
| Test strategy | **pass** | Separate A/B/C + Studio first-toggle QA |
| No silent scope expansion | **pass** | Portal C removed; Smart Profiling parked |
| Independently revertible | **pass** | A/B/C separate inventories |
| Rollback of aborted implement | **pass** | Exact-path restore+delete; residuals Plan/Review/state/.worktrees only |

---

## Architecture Review

**Findings:**

- A/B unchanged and independently modeled.
- **C (Studio):** shared `CustomerUploadIntakeSection`; Halftone **await-before-paint** is the latency bug; reuse Import bg picker in-renderer; promote needs bg copy + `halftoneDecisionSource: "intake"`.
- Portal C impact **NONE**.

**Required changes:** See numbered Required Changes list (A/B prior locks + Studio C items 10–15).

---

## Security Review

**Findings:** A instructional-only; B Functions-owned smartProfile + staff seed; **C** staff callables only — no Portal/customer write broaden; Storage unchanged.

**Required changes:** B Rules allowlist for seed; C prefer callable-only (Rules likely NO).

**Human approval needed before production:** Yes for Functions (+ B Rules).

---

## Data Model Review

**Findings:** B additive seed; C additive `customerUploads` artwork background fields; design Halftone/bg already exist; no migration; no new Person/Location keys.

**Required changes:** Document B seed + C intake bg + promote + `intake` provenance. Use `staff_manual` for intake bg source.

---

## Backend Review

**Findings:** B queue merge + seed retain; **C** optimistic Halftone client UX; new/extended staff bg writer; promote must copy bg + stamp `"intake"`; reprocess already preserves design Halftone/bg.

**Required changes:** As C22–C23 allowlist.

---

## Testing Review

**Findings:** Separate A/B/C; C needs first-toggle paint + Send gate + promote map tests.

---

## Documentation Review

**Findings:** DATA_MODEL/BACKEND/DECISIONS for B+C. No ADR-FP-080 Portal Halftone authority change (withdrawn).

---

## Required Changes (approved_with_changes)

1. **A persistence:** Forever localStorage dismiss (About pattern); shared Upload+Donate preference; no Firestore.
2. **A consent firewall:** Do not modify ownership/catalog checkbox requirements or callables.
3. **B dimensions:** Use existing editable keys only; UI labels may say Person/Location but persist `subjects`/`places`.
4. **B architecture:** Durable `smartProfileImportPresets` + post-AI merge; not prompt-only.
5. **B provenance:** `importPresetDimensionKeys` on provenance.
6. **B durability:** Retain seed on AI reset/reprocess clear; re-merge on enrich.
7. **B staff edit:** Sync seed when staff removes/changes preset values.
8. **B merge default:** Union model — preset values guaranteed present.
9. **B parking boundary:** No Autonomous ON, tag retirement, Portal facet UX expansion, mass backfill, new dimension keys.
10. **C target:** Studio `/customer-uploads` + `/donated-designs` shared `CustomerUploadIntakeSection` only — **Portal C = NONE**.
11. **C Halftone UX:** Optimistic local paint; stop awaiting `recordCustomerUploadHalftoneStaffDecision` before visual update.
12. **C Halftone authority:** Keep existing `halftoneStaffDecision`; stamp `halftoneDecisionSource: "intake"` at promote (not `"customer"`).
13. **C OFF/unset:** Preserve current resolver semantics (explicit `false` vs missing boolean).
14. **C background:** Reuse Import Auto/Light/Dark picker/resolver; persist on uploads; source `staff_manual`; promote must **add** hex/source copy (missing today).
15. **C Send gate:** Track pending/failed metadata saves; block Send to AI Review until durable.
16. **Independence:** Any of A/B/C may proceed alone.

---

## Blockers

None. Prior Portal-C product supersession of ADR-FP-080 customer evidence is **withdrawn** for this goal (Portal Halftone remains evidence-only). Studio staff Halftone is already authoritative.

---

## Verdict Rationale

**approved_with_changes** — Corrected three-workstream umbrella. C is Studio intake UX + staff bg persistence + promote bg mapping + instant Halftone; not a Portal redesign and not broad Smart Profiling.

---

## Next Step

**STOP.** Await Owner authorization to Implement. Do not deploy, commit, or push.

---

## 2026-09-03 Narrow C corrective review addendum

### Requested corrective

Owner clarified two Studio-only C expectations:

1. Clicking Halftone on Upload/Donate in Studio should default that row's background selection to
   **Dark** when the row was previously Auto.
2. The visible preview background must actually change with the selected background state.

### Review result

**approved_with_changes** — acceptable as a narrow corrective within Workstream C, provided:

1. Only Auto rows are auto-promoted to Dark on Halftone enable.
2. Existing explicit Light/Dark choices are preserved.
3. Staff can still switch to Light while Halftone remains on.
4. No new persisted fields, Functions, Rules, or promote-contract changes are introduced.
5. The preview surface uses the established artwork-background resolver path already used by Studio
   preview components.

### Implementation allowance

Proceed with renderer-only / minimal hook wiring changes under the existing goal. Do not broaden into
Portal, broader Smart Profiling, new backend surfaces, or deploy actions.

---

# WORKSTREAM A — Formal Review outputs

### A1. Exact Upload modal/component

- Route: `/requests/artwork`
- Page: `apps/portal/app/(app)/requests/artwork/page.tsx`
- Component: `ArtworkQualityNotice` with `purpose="print_request"`
- File: `apps/portal/features/customer-uploads/components/ArtworkQualityNotice.tsx`

### A2. Exact Donate modal/component

- Route: `/donate`
- Page: `apps/portal/app/(app)/donate/page.tsx`
- Component: **same** `ArtworkQualityNotice` with `purpose="catalog_donation"`

### A3. Informational vs mandatory

| Piece | Type |
|-------|------|
| Artwork quality modal body (DPI, transparency, marketplace guidance) | Optional instructional — **suppressible** |
| Soft footer “By continuing, you confirm…” | UI-only soft confirm — suppressible with modal |
| Inline “Print-ready artwork required” collapsible | Keep available after suppress |
| Ownership checkbox in `CustomerUploadPanel` | **Mandatory every submit** |
| Catalog-use checkbox | Upload optional / Donate required — **never dismissed by this preference** |
| Technical validation | Unchanged |

### A4. Preference persistence options

| Option | Description |
|--------|-------------|
| **OPTION A** | Browser localStorage (About modal pattern) |
| **OPTION B** | Account-level Firestore customer preference |

### A5. Recommended persistence

**OPTION A — browser-local forever dismiss** (plus honor any remaining snooze-until until expiry during transition).

Rationale: established Portal convention for instructional modals; no Rules/Functions/schema; convenience-only preference.

### A6. Shared vs separate suppression preference

**ONE shared preference** for Upload + Donate.

Rationale: identical requirements copy; existing shared snooze key; Donate only adds thanks chrome.

### A7. Exact files expected to change

- `apps/portal/features/customer-uploads/utils/artworkQualityModalSnooze.ts` (or rename to `artworkQualityModalPreference.ts`)
- `apps/portal/features/customer-uploads/utils/artworkQualityModalSnooze.test.ts`
- `apps/portal/features/customer-uploads/components/ArtworkQualityNotice.tsx`

Must **not** change for suppress: `CustomerUploadPanel.tsx` consent gates, upload callables, terms versions.

### A8. Backend impact

**None.**

### A9. Rules impact

**None.**

### A10. Tests

- Unit: forever dismiss / should-open mount logic
- Portal typecheck + lint
- Manual Owner QA A–H

### A11. Owner QA

- A. Upload modal appears initially
- B. Don't show again suppresses only optional explanation
- C. Upload remains directly accessible
- D. Ownership acknowledgment still required
- E. Catalog-use permission remains explicit
- F. Donate preference works (shared)
- G. Reload/persistence (localStorage)
- H. Shared preference: Upload dismiss affects Donate

### A12. Production inventory

| Surface | |
|---------|--|
| Portal | YES |
| Studio / Shared / Functions / Rules / Storage / Indexes / Migration | NO |

### A13. [NEEDS OWNER DECISION]

| ID | Topic | Review default if Owner silent |
|----|-------|--------------------------------|
| A-D1 | Shared vs separate forever keys | **Shared** |
| A-D2 | Forever-only vs keep 24h when unchecked | **Forever when checked; close without write when unchecked** (current non-checkbox behavior) |

Non-blocking for implement authorization.

---

# WORKSTREAM B — Formal Review outputs

### B1. Exact current Smart Profile type/schema

- `DesignSmartProfile` / `SmartProfileDimensionLists` / `SmartProfileProvenance` in `packages/shared/src/types/catalog/smartProfile.types.ts`
- Persisted on `designs/{id}.smartProfile` (+ root `smartProfileAiSnapshot`)
- Version: `smart-profile-v1`

### B2. Current allowed dimensions

From `SMART_PROFILE_EDITABLE_DIMENSION_KEYS`:

`subjects`, `objects`, `styles`, `themes`, `interests`, `professionsGroups`, `occasions`, `places`, `colors`, `visibleText`, `searchConcepts`

Plus category fields owned elsewhere (`categoryId`/`categoryName`/alternatives/gap) — **not** import-preset V1 targets (category governance stays existing flows).

### B3. Person support

**No** `person` field. Semantically correct existing field: **`subjects`** (“animals/people/characters…”).

### B4. Location support

**No** `location` field. Semantically correct existing field: **`places`**.

### B5. Arbitrary-dimension support

**No.** Fixed typed keys only. Free-form persisted keys **disallowed**.

### B6. Current provenance model

`SmartProfileProvenance`: pipeline metadata (`provider`, `model`, `promptVersion`, `normalizerVersion`, automation fields, warnings) + human staff-edit keys (`staffEditedDimensionKeys`, `staffEditedAt`, `staffEditedBy`). No per-token history array. No `import_preset` source today — **add** `importPresetDimensionKeys` (Review required change).

### B7. Exact import → design → AI enqueue path

1. Studio `/imports` → select files/folder/ZIP → main-process batch session (`importBatchSession.ts`)
2. Validate / discover → upload → `designService.createDesign` (`status: imported`, `aiReviewStatus: pending`, **no smartProfile**)
3. Derivatives success → `enqueueImportedDesignsForBackgroundAi` → `enqueueAiEnrichment` (**queue** mode)
4. Pipeline: Gemini (`catalog-enrich-v30`) → parse → `buildDesignSmartProfile` → `normalizeDesignSmartProfile` (`smart-profile-normalizer-v4`) → **replace** `smartProfile`

### B8. Current Smart Profile AI merge/normalization path

- Normalize via shared `smartProfileNormalization.ts`
- Queue mode: wholesale replace + write `smartProfileAiSnapshot`
- Ready backfill only: `mergeAiSmartProfileWithStaffPreserved` using `staffEditedDimensionKeys`

### B9. Recommended preset persistence architecture

1. Transient UI: extend `ImportSessionSettings` with typed preset rows (page/session scoped)
2. On successful design create: write **`smartProfileImportPresets`**
3. On every enrich that builds a new profile: **post-AI merge** from seed (Option A+C)
4. No Firestore import-batch collection

### B10. Human preset vs AI precedence

1. Latest explicit staff Smart Profile edit (and seed sync)
2. Import preset seed values (guaranteed present on merge)
3. AI generated

Conflict: preset values win (remain present); default **union** within dimension (AI extras allowed).

### B11. Reprocess / re-run durability

**Required YES.** Retain `smartProfileImportPresets` when deleting `smartProfile` on reset/Needs Review clear; re-merge on next enrich.

### B12. Later human-edit behavior

Staff may change/remove via existing Smart Profile editors (Ready gate today). Import presets are **not** permanently immutable. Clearing/changing must update durable seed.

### B13. UI location in Imports

Studio `/imports` — extend session settings alongside existing Halftone/Background controls (`ImportSessionSettingsForm` / batch panel). Exact component wiring at implement from current Imports shell.

### B14. One vs multiple preset rows

**Multiple rows required** (zero / one / many dimensions).

### B15. Cardinality per dimension

Follow existing `string[]` model: **multiple values per dimension allowed** (chip/add or repeated rows). Caps: existing `SMART_PROFILE_MAX_ITEMS_PER_DIMENSION` / string length limits.

### B16. Schema changes

- Additive optional `designs.smartProfileImportPresets`
- Additive optional `provenance.importPresetDimensionKeys`
- **No** new Person/Location dimension keys
- **No** migration/backfill

### B17. Functions changes

**YES** — enrichment write/merge; reset retain; reprocess clear retain; staff-edit seed sync.

### B18. Rules changes

**YES** — allowlist optional seed field for staff; keep `smartProfile` client-immutable.

### B19. Algolia / search impact

**No Algolia schema change.** Existing subject/place facets will reflect values after normal indexing. **Do not** ship new Portal Smart Filter UX in this goal.

### B20. Indexes

**None expected.**

### B21. Migration / backfill

**None.** Additive optional fields only. No Ready Catalog mass reprocess.

### B22. Exact files expected to change

**Studio**

- `apps/studio/src/renderer/src/features/imports/constants/importSessionSettings.ts`
- Import session form/hook/panel components under `.../imports/`
- `.../imports/services/importOrchestrationService.ts` / batch orchestration
- `.../designs/services/designService.ts` + design create types

**Shared**

- `packages/shared/src/types/catalog/smartProfile.types.ts`
- New `packages/shared/src/utils/smartProfileImportPresets.ts` (+ tests)
- Export barrel if required by package patterns

**Functions**

- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/smartProfileEnrichmentWrite.ts` (+ tests)
- `functions/src/resetAiEnrichmentForProcessing.ts`
- `functions/src/catalogReprocess/catalogReprocessAiClear.ts`
- `functions/src/designs/updateDesignSmartProfileDimensions.ts` (and related reset-dimension callable if needed)

**Rules / docs**

- `firestore.rules`
- `docs/architecture/DATA_MODEL.md`
- `docs/architecture/BACKEND.md`
- `docs/project/DECISIONS.md` (ADR)

### B23. Tests

- Shared merge/validate/dedupe unit tests
- Functions enrichment merge + reset retain contracts
- Studio session settings util tests as applicable
- Typecheck Studio + Functions build + lint
- Owner QA disposable batch scenarios A–M

### B24. DEV deployment scope

Shared + Studio + Functions + Firestore Rules. Not Portal/Storage/indexes/migration/Algolia config.

### B25. Owner QA

Disposable ≥3-design batch: no presets; Person only; Person+Location; all designs receive values; AI adds others; AI does not remove; re-run survives; manual edit/remove; next import clean; retry retains; AI Review unchanged; no Autonomous; no tag retirement.

### B26. Production inventory

| Surface | Needed? |
|---------|---------|
| Shared | YES |
| Studio | YES |
| Functions | YES |
| Firestore Rules | YES |
| Portal | NO |
| Storage Rules | NO |
| Indexes | NO |
| Migration | NO |
| Algolia app config | NO |

### B27. Remains a narrow Smart Profiling slice?

**YES** — import-time presets onto existing dimensions + merge durability only. Autonomous OFF; Shadow/reviewed state unchanged; no tag retirement; no taxonomy redesign; no mass backfill; no Portal filter redesign.

### B28. [NEEDS OWNER DECISION]

| ID | Topic | Review default |
|----|-------|----------------|
| B-D1 | Person/Location as new schema keys vs map to `subjects`/`places` | **Map to existing** (MODEL 1). If Owner requires new keys → **split B** / stop expand |
| B-D2 | Union vs replace-entire-dimension | **Union** (preset values guaranteed) |
| B-D3 | Dimension picker: all editable keys vs curated subset | **All editable keys** with friendly labels (exclude category governance) |

If B-D1 is rejected in favor of MODEL 3: mark **[NEEDS OWNER DECISION]** and split Workstream B into its own managed goal — **do not silently expand this umbrella**.

---

## Independence / removeability

| If blocked… | Then… |
|-------------|-------|
| Workstream C blocked | A and/or B may proceed alone |
| Workstream B blocked | A and/or C may proceed alone |
| Workstream A blocked | B and/or C may proceed alone |
| Revert A | Portal preference util + ArtworkQualityNotice |
| Revert B | Studio Imports/shared/Functions/Rules for presets |
| Revert C | Studio intake Halftone UX + bg picker + staff bg callable + promote bg/`intake` source |

**Umbrella:** Still reasonable after Studio C correction. Prior Portal-C Formal Review section is **superseded**.

---

# WORKSTREAM C — Formal Review outputs (Studio correction — supersedes Portal C)

> Prior C answers that targeted Portal Upload/Donate are **void**. Re-reviewed against HEAD `ab7edcac…`.

### C1. Exact Customer Uploads route/component

- Route: `/customer-uploads`
- Page: `apps/studio/src/renderer/src/features/customer-uploads/pages/CustomerUploadsPage.tsx`
- Shell title: Uploaded Designs
- `purposeScope: "print_request"`
- UI: `CustomerUploadIntakeSection`

### C2. Exact Donated Designs route/component

- Route: `/donated-designs`
- Page: `…/pages/DonatedDesignsPage.tsx`
- `purposeScope: "catalog_donation"`
- UI: **same** `CustomerUploadIntakeSection`

### C3. Shared `CustomerUploadIntakeSection`?

**YES** — one shared intake for both purpose filters.

### C4. Exact current Studio Halftone control

- `Toggle` label “Halftone” in `CustomerUploadIntakeSection`
- Checked via `resolveIntakeHalftoneStaffToggle`
- `onChange` → `intake.setHalftoneDecision(row.id, checked)`

### C5. Exact current Halftone persistence path

`useCustomerUploadIntake.setHalftoneDecision` → `customerUploadIntakeService.recordHalftoneStaffDecision` → callable **`recordCustomerUploadHalftoneStaffDecision`** → Admin `customerUploads/{id}.halftoneStaffDecision` update.

### C6. Exact await-before-paint latency cause

**`await recordHalftoneStaffDecision(...)` completes before `patchRowLocally`.** Visual state derives from row data → first click waits on callable RTT/cold start. (Portal optimistic analysis does **not** apply.)

### C7. Proposed instant local-state architecture

1. Optimistically patch local row (or local draft) **immediately**
2. Persist staff callable in background
3. On failure: keep optimistic selection + Retry; mark failed for Send gate
4. Track pending/failed in metadata gate map (include in `pendingByUploadId` or sibling)

### C8. Authoritative Halftone fields

- Upload/design: `halftoneStaffDecision` (`value: boolean`, `decidedAt`, `decidedBy`, `isExplicitOverride`)
- Design optional: `halftoneDecisionSource`
- Trail: `halftoneSubmitterResponse` (customer evidence; unchanged Portal)

### C9. Staff provenance/source semantics

- Type union includes `"intake"` | `"import_batch"` | `"ai_review"` | `"customer"`
- Today: staff callable writes decision **without** source; promote does **not** stamp source
- **Required:** stamp **`"intake"`** when promoting boolean staff decision — **not** `"customer"`

### C10. Explicit OFF vs unset

| State | Persistence | UI |
|-------|-------------|-----|
| Unset | No boolean staff `value` | May show ON if customer yes |
| Explicit OFF | `halftoneStaffDecision.value === false` | OFF; wins over customer yes |
| Explicit ON | `value === true` | ON |

Preserve this contract; do not invent a new tri-state UI.

### C11. Exact Import background picker

`apps/studio/.../imports/components/ImportArtworkBackgroundQuickPicker.tsx` — Auto / Light / Dark.

### C12. Direct component reuse appropriate?

**YES** — same Electron renderer. Prefer reuse with thin adapter props (`autoSuggestsDark: false`, session modes defaulted for intake). Do not rebuild a lookalike.

### C13. Background domain resolver/types

- `resolveImportArtworkBackgroundDecision`
- `ImportItemBackgroundOverride`
- `artworkBackground.constants.ts` / `artworkBackgroundSource.types.ts`

### C14. Background persistence fields

- Add to `customerUploads`: `artworkBackgroundHex?`, `artworkBackgroundSource?`
- Designs already have both
- Promote must copy both (**not present on HEAD promote today**)

### C15. Background source/provenance

Use existing **`staff_manual`** for Studio intake selections (staff-authored). Do not invent Portal/`customer_upload` source for C.

### C16. Per-design independence

Controls are per intake row/`uploadId`. No batch inheritance.

### C17. Persistence failure/retry

Keep optimistic UI; show error + Retry; leave failed flag until success.

### C18. Send-to-AI Review gating

Block `promote` while Halftone/bg metadata save is pending or failed for that `uploadId`. Smallest gate: extend pending map used by promote/exclude.

### C19. Promotion mapping

`promoteCustomerUploadToAiReview`: create design from upload; copy sizing + Halftone fields; enqueue AI via client `enqueueImportedDesignsForBackgroundAi`.

### C20. Promotion already copies Halftone/background?

| Field | Copies today? |
|-------|----------------|
| Halftone staff/submitter/detection | **YES** |
| `artworkBackgroundHex` / `Source` | **NO** — **CHANGE REQUIRED** |
| `halftoneDecisionSource: "intake"` | **NO** — **CHANGE REQUIRED** |

### C21. Reprocess / re-run preservation

**YES** on designs — `CATALOG_REPROCESS_PRESERVED_FIELD_KEYS` includes Halftone + artwork background. Add regression coverage; do not rewrite pipeline.

### C22. Exact Functions requiring modification

| Function | Verdict |
|----------|---------|
| `recordCustomerUploadHalftoneStaffDecision` | **Likely UNCHANGED** (UX is client optimistic); optional source write |
| Staff artwork-background writer (new or extend existing staff metadata callable) | **CHANGE REQUIRED** (new capability) |
| `promoteCustomerUploadToAiReview` | **CHANGE REQUIRED** — copy bg + stamp `halftoneDecisionSource: "intake"` |
| Reset / catalog reprocess clear | **UNCHANGED** (already preserves design fields) |
| `recordCustomerUploadHalftoneResponse` (Portal) | **UNCHANGED** — out of C scope |

### C23. Anticipated DEV Function deploy allowlist

1. New/extended **staff artwork-background persistence** callable (exact name at implement)
2. **`promoteCustomerUploadToAiReview`**
3. Optionally **`recordCustomerUploadHalftoneStaffDecision`** only if source field added server-side

Do **not** redeploy unrelated Functions.

### C24. Firestore Rules impact

**Likely NONE** for C — keep `customerUploads` client write deny; Admin callables only. (B Rules for design seed remain separate.)

### C25. Storage Rules impact

**NONE.**

### C26. Indexes

**NONE.**

### C27. Migration

**NONE.** No backfill.

### C28. Exact Studio files expected to change

- `CustomerUploadIntakeSection.tsx`
- `useCustomerUploadIntake.ts`
- Intake services / row builders / types under `features/customer-uploads/`
- Possibly thin adapter importing `ImportArtworkBackgroundQuickPicker`

### C29. Exact Shared files expected to change

- `packages/shared/src/types/customerUpload/customerUpload.types.ts` (+ bg fields)
- Tests for resolver adapter / promote field builders as needed
- **Not** required: new `person`/`location` Smart Profile keys

### C30. Tests

- Optimistic Halftone (no await before paint)
- Metadata Send gate
- Promote copies bg + `intake` source
- OFF/unset resolver regression
- Studio typecheck/lint; Functions build for touched callables

### C31. Fresh-load first-toggle performance verification

Owner QA: hard restart Studio → open Customer Uploads → **first** Halftone click instant; repeat Donated Designs.

### C32. Owner QA

1. Hard restart Studio  
2. Open Customer Uploads  
3. First Halftone click instant  
4. Subsequent click instant  
5. Second upload independent  
6. Background picker matches Imports  
7–8. Different backgrounds independent  
9. Persistence completes  
10. Pending/failed blocks stale Send to AI  
11. Send to AI Review  
12–13. Promoted design Halftone + background intact  
14. Repeat on Donated Designs  
15–17. Reprocess: Halftone + background survive  
18. Transparency/source untouched  

### C33. Workstream C DEV inventory

Studio + Shared + Functions (allowlist above). Portal **NO**. Rules likely NO. Storage/indexes/migration NO.

### C34. Workstream C production inventory

Same as DEV inventory; production **NOT AUTHORIZED**.

### C35. Portal Workstream C impact

**NONE.** Portal evidence Halftone checkbox and Upload/Donate flows unchanged by C. Only Portal work in umbrella is **A**.

### C36. Broad Smart Profiling PARKED

**Confirmed.** Autonomous **OFF**. C does not unpark Smart Profiling.

### C37. [NEEDS OWNER DECISION]

| ID | Topic | Review default |
|----|-------|----------------|
| C-D1 | Auto without detector | `autoSuggestsDark: false` |
| C-D2 | Write `halftoneDecisionSource` on callable vs promote-only | **Promote stamps `"intake"`** (minimum) |
| C-D3 | Keep A+B+C umbrella | **Yes** |

---

## Parking confirmation

Broad Smart Profiling **PARKED**. Autonomous **OFF**. B remains the only Smart Profile unpark slice.

---

## Stop gate

Rollback **complete**. Plan + Formal Review **amended for Studio C**. Verdict **approved_with_changes**.

**Do not implement. Do not deploy. Do not commit/push. Production NOT AUTHORIZED.**
