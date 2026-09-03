# Implementation Review — portal-modal-dont-show-again-and-import-smart-profile-presets

**Date:** 2026-09-03  
**Goal:** `portal-modal-dont-show-again-and-import-smart-profile-presets`  
**Plan:** `docs/workflow/plans/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-plan.md`  
**Formal Review:** `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-review.md`  
**Baseline HEAD:** `ab7edcacd63f8a716ddd229dcf03a2afcc9c1fc9`  
**Verdict:** **approved_with_notes**

---

## Verdict summary

| Workstream | Code | Focused tests | Notes |
|---|---|---|---|
| **A** Portal forever dismiss | Complete | Pass | Ready for Owner QA |
| **B** Import Smart Profile presets | Complete | Pass | Ready for Owner QA |
| **C** Studio intake Halftone + Artwork Background | Complete | Pass (contract) | Code-level first-toggle fix applied; **Electron Studio fresh-load first click not executed in this agent session** — Owner QA C1–C4 is required before DEV deploy |

DEV deploy: **AUTHORIZED & PERFORMED** (fresh-prints-dev)  
Commit/push: **NOT PERFORMED**  
Production: **NOT AUTHORIZED**

---

## Workstream A checklist

| ID | Result |
|---|---|
| A1 shared dismissal | **PASS** — `ArtworkQualityNotice` |
| A2 browser-local only | **PASS** — localStorage |
| A3 one shared preference | **PASS** — single forever key |
| A4 no Firestore | **PASS** |
| A5 no Functions | **PASS** |
| A6 no Rules | **PASS** |
| A7 ownership acknowledgment intact | **PASS** — untouched |
| A8 catalog permission intact | **PASS** — untouched |
| A9 technical validation intact | **PASS** — untouched |
| A10 Upload/Donate usable when dismissed | **PASS** — notice only |
| A11 Portal C absent | **PASS** — no Portal bg picker / authoritative Halftone elevation |

---

## Workstream B checklist

| ID | Result |
|---|---|
| B1 existing dimensions only | **PASS** |
| B2 subjects mapping | **PASS** — label “Subject / Person” |
| B3 places mapping | **PASS** — label “Place / Location” |
| B4 zero/one/multiple dims | **PASS** |
| B5 transient session state | **PASS** — clear on cancel/complete |
| B6 durable seed | **PASS** — `smartProfileImportPresets` |
| B7 post-AI merge | **PASS** — queue + ready_backfill |
| B8 human values preserved | **PASS** — staff > preset > AI |
| B9 dedupe | **PASS** |
| B10 retry durability | **PASS** — seed retained on design |
| B11 reset/reprocess durability | **PASS** — seed not deleted by reset/clear |
| B12 staff removal no resurrection | **PASS** — `syncImportPresetSeedOnStaffEdit` on edit + dimension reset |
| B13 narrow Rules | **PASS** — `isOptionalMap(..., "smartProfileImportPresets")` on design create allowlist |
| B14 no person/location keys | **PASS** |
| B15 no Algolia redesign | **PASS** |
| B16 no migration/index | **PASS** |
| B17 broad Smart Profiling parked | **PASS** |

---

## Workstream C checklist

| ID | Result |
|---|---|
| C1 Customer Uploads controls | **PASS** — shared intake section |
| C2 Donated Designs controls | **PASS** — same section |
| C3 shared `CustomerUploadIntakeSection` | **PASS** |
| C4 Portal NO C | **PASS** |
| C5 first Halftone click instant | **CODE PASS / RUNTIME PENDING OWNER** — optimistic patch + snapshot override preserve; Studio Electron not run here |
| C6 subsequent click instant | **CODE PASS / RUNTIME PENDING OWNER** |
| C7 optimistic before await | **PASS** |
| C8 trusted staff path | **PASS** — existing Halftone callable |
| C9 OFF vs unset preserved | **PASS** — existing model |
| C10 `halftoneStaffDecision` | **PASS** |
| C11 promote source `intake` | **PASS** |
| C12 Import picker reused | **PASS** — adapter |
| C13 Auto/Light/Dark | **PASS** — Auto clears fields; Light/Dark → `staff_manual` |
| C14 background source `staff_manual` | **PASS** for explicit Light/Dark |
| C15 per-row independence | **PASS** |
| C16 pending/failed tracked | **PASS** |
| C17 Send-to-AI blocks stale | **PASS** — pending **or** failed |
| C18 Retry works | **PASS** — Retry metadata save |
| C19 promote Halftone | **PASS** |
| C20 promote Background | **PASS** |
| C21 AI/reprocess preserves | **PASS** — existing pipeline; not rewritten |
| C22 no flattening | **PASS** |
| C23 no customer permission broaden | **PASS** |
| C24 no C Rules | **PASS** |
| C25 no Storage | **PASS** |
| C26 no index/migration | **PASS** |

### C first-toggle root cause (confirmed)

Studio intake previously awaited `recordCustomerUploadHalftoneStaffDecision` **before** `patchRowLocally`.  
Additional companion: `onSnapshot` full `setRows(shellRows)` could wipe optimistic state mid-flight.

### C final performance fix

1. Optimistic `patchRowLocally` **before** any await  
2. `metadataOverridesRef` reapplied on every snapshot remap until persist succeeds  
3. Failed saves keep intended UI + block promote until Retry

---

## Functions changed (exact)

| Function | Change | DEV redeploy? |
|---|---|---|
| `recordCustomerUploadArtworkBackgroundStaffDecision` | **ADD** — staff bg writer (Auto clear / Light-Dark staff_manual) | **YES** |
| `promoteCustomerUploadToAiReview` | **CHANGE** — copy bg; stamp `halftoneDecisionSource: "intake"` | **YES** |
| `designSmartProfileStaffUpdate` (staff edit + dimension reset) | **CHANGE** — sync `smartProfileImportPresets` seed | **YES** (same functions package) |
| AI enrichment write path (`aiEnrichmentPipeline` / `smartProfileEnrichmentWrite`) | **CHANGE** — merge import presets | **YES** |
| `recordCustomerUploadHalftoneStaffDecision` | **UNCHANGED** | No |
| Portal Halftone response callable | **UNCHANGED** | No |

`functions/src/index.ts` exports the new artwork-background callable.

---

## Rules / Storage / Indexes / Migration

| Area | Changed? | Reason |
|---|---|---|
| Firestore Rules | **YES** — Workstream B only | Allow optional `smartProfileImportPresets` map on design create validation |
| Storage Rules | **NO** | — |
| Indexes | **NO** | — |
| Migration | **NO** | — |

---

## Verification results

### Focused unit tests

```text
npx tsx --test packages/shared/src/utils/smartProfileImportPresets.test.ts \
  apps/portal/features/customer-uploads/utils/artworkQualityModalSnooze.test.ts \
  functions/src/ai/smartProfileEnrichmentWrite.test.ts \
  functions/src/customerUploadOptimisticHalftone.workstream-c.test.ts \
  functions/src/promoteCustomerUploadToAiReview.workstream-c.test.ts
```

**Result:** exit **0** — **41** tests pass (suites covering A snooze, B merge/seed/sync, C gate/promote mapping).

### Functions build

```text
npm run build --prefix functions
```

**Result:** exit **0**

### Firestore Rules tests

```text
npm run test:rules
```

**Result:** exit **1** — emulator could not start: `Could not spawn java -version` (Java not on PATH in this environment).  
**Goal-path Rules change** is additive optional map allowlist only; full suite **not claimed passed**.

### Portal typecheck

```text
npm run typecheck --workspace @fresh-prints/portal
```

**Result:** exit **2** — pre-existing errors in `catalogService.ts` (`interactiveEnhanced*` fields), **not** in Workstream A files.

### Studio typecheck

```text
npx tsc --noEmit -p apps/studio/tsconfig.json
```

**Result:** exit **2** — many pre-existing errors outside goal path. Goal-path ImportsPage `"complete"` phase compare fixed.

### Touched-file lint

```text
npx eslint <touched A/B/C sources> --max-warnings 0
```

**Result:** exit **0** after unused-var / hooks-deps fixes.

### Portal C regression

No Portal Workstream C intake picker / authoritative Halftone elevation / metadata promote gate added.

---

## DEV deployment inventory (DEPLOYED / authorized for this Workstream B slice)

### Workstream A
- Portal: **YES**
- Studio: **NO**
- Shared: **NO**
- Functions: **NO**
- Firestore Rules: **NO**
- Storage: **NO** / Indexes: **NO** / Migration: **NO**

### Workstream B
- Portal: **NO**
- Studio: **YES**
- Shared: **YES** (`smartProfileImportPresets` util/types)
- Functions: **YES** (enrichment merge + staff seed sync)
- Firestore Rules: **YES** (narrow)
- Storage: **NO** / Indexes: **NO** / Migration: **NO**

### Workstream C
- Portal: **NO**
- Studio: **YES**
- Shared: **YES** (upload types / artwork-background source literals already present)
- Functions: **YES** (`recordCustomerUploadArtworkBackgroundStaffDecision`, `promoteCustomerUploadToAiReview`)
- Firestore Rules: **NO**
- Storage: **NO** / Indexes: **NO** / Migration: **NO**

### Combined DEV allowlist (when later authorized)
1. Portal hosting (A)
2. Studio publish (B+C)
3. Functions: artwork-background callable + promote + smart-profile staff update + AI enrichment merge paths
4. Firestore Rules (B seed field only)

---

## 2026-09-03 — Workstream B DEV deploy + verification (fresh-prints-dev)

### Functions deployed (exact 4)
Deployed with:
`firebase deploy --only "functions:enqueueAiEnrichment,functions:onCatalogReprocessJobWritten,functions:updateDesignSmartProfileDimensions,functions:resetDesignSmartProfileDimension" --project fresh-prints-dev`

Verified ACTIVE (Gen 2, runtime `nodejs20`, traffic on latest revision):
- `enqueueAiEnrichment` — region `us-central1`, state `ACTIVE`, revision `enqueueaienrichment-00084-lom`, allTrafficOnLatestRevision=`true`
- `onCatalogReprocessJobWritten` — region `us-central1`, state `ACTIVE`, revision `oncatalogreprocessjobwritten-00006-yex`, allTrafficOnLatestRevision=`true`
- `updateDesignSmartProfileDimensions` — region `us-central1`, state `ACTIVE`, revision `updatedesignsmartprofiledimensions-00002-xor`, allTrafficOnLatestRevision=`true`
- `resetDesignSmartProfileDimension` — region `us-central1`, state `ACTIVE`, revision `resetdesignsmartprofiledimension-00002-xeg`, allTrafficOnLatestRevision=`true`

No unrelated Functions were deployed (deploy command used exact `--only` allowlist).

### Firestore rules deployed
Deployed with:
`firebase deploy --only firestore:rules --project fresh-prints-dev`

Result: compilation succeeded and the rules were released to `cloud.firestore`.
Rules contain the reviewed additive allowlist for the optional durable seed field:
`isOptionalMap(data, "smartProfileImportPresets")`

Post-deploy Workstream B end-to-end behavior verification remains **PENDING OWNER** (B1–B16 checklist).

---

## Owner QA preparation

### A
A1–A9 as authorized (Upload notice → Don't show again → Donate shares dismiss; ownership/catalog/validation unchanged; Portal Halftone old behavior; no Portal Artwork Background picker).

### B
Disposable ≥3-design batch: no presets / subjects Dolly Parton / subjects+places; seed merge; retry/reprocess; staff remove no resurrection; next batch clean; lifecycle Imports → AI Review; Autonomous OFF.

### C
**Hard:** Studio hard restart → Customer Uploads → **first** Halftone click must be instant; Donated Designs same; pending/failed gate + Retry; promote fields (`halftoneStaffDecision`, source `intake`, bg + `staff_manual`); reprocess survival; Portal has no C controls.

---

## Parked / deferred confirmations

- Broad Smart Profiling: **PARKED**
- Autonomous Smart Profiling: **OFF**
- show-queue-batch-allocation-performance: **DEFERRED**
- Production: **NOT AUTHORIZED**

## [NEEDS OWNER DECISION]

1. Owner to confirm post-deploy Workstream B QA evidence (B1–B16 checklist) before any further signoff/production steps.  
2. Provide Java 21+ on PATH only if the Rules suite must be re-run in this environment for future troubleshooting (not required for this checkpoint).

---

## 2026-09-03 — Owner QA corrective: Workstream B modal UX

### Owner QA result (historical; preserved)

**OWNER QA B UI: FAIL**

Reason: the preset editor layout, raw/default-looking controls, and ever-growing modal structure did
not meet Fresh Prints Studio UX expectations. Presets were embedded beneath Import settings instead
of having a dedicated tab.

### Narrow corrective implemented

- Added dedicated **Import settings** and **Smart Profile presets** tabs inside the existing modal.
- Kept both tab panels mounted and hid only the inactive panel so tab changes do not discard current
  session values or per-dimension input drafts.
- Moved the preset UI into `SmartProfilePresetsEditor.tsx`; no parallel modal was introduced.
- Reused Studio `form-field`, `button`, `tag-chip`, and `tag-chip-remove` control styles and existing
  design tokens for surfaces, borders, spacing, hover, focus, and disabled states.
- Arranged reviewed dimensions in a two-column grid above 700px and one column at narrower widths.
- Capped the modal to the viewport and made the active tab panel the single vertical scrolling area;
  header, tab navigation, and footer remain fixed and usable.
- Reused `normalizeSmartProfileStringList` for trim, limits, and canonical dedupe. Enter and Add share
  the same add path; removal remains dimension-local.
- Preserved the existing editable-dimension list and friendly mappings (`subjects` = Subject / Person,
  `places` = Place / Location). No `person` or `location` persisted keys were added.

### Corrective verification

```text
npx tsx --test apps/studio/src/renderer/src/features/imports/components/importSessionSettingsModal.workstream-b-ui.test.ts packages/shared/src/utils/smartProfileImportPresets.test.ts
```

Result: exit **0** — **24/24 tests passed** (5 corrective UI/interaction contract tests plus 19
existing Workstream B merge/seed/synchronization tests).

```text
npx eslint apps/studio/src/renderer/src/features/imports/components/ImportSessionSettingsModal.tsx apps/studio/src/renderer/src/features/imports/components/ImportSessionSettingsForm.tsx apps/studio/src/renderer/src/features/imports/components/SmartProfilePresetsEditor.tsx apps/studio/src/renderer/src/features/imports/components/importSessionSettingsModal.workstream-b-ui.test.ts apps/studio/src/renderer/src/features/imports/utils/smartProfilePresetEditorValues.ts --max-warnings 0
```

Result: exit **0** — no warnings or errors.

```text
npx tsc --noEmit -p apps/studio/tsconfig.json
```

Result: exit **1** — existing repository-wide errors outside the corrective files (26 diagnostics in
Electron export/import, AI Review, Workstream C customer uploads, Designs, Print Requests, Staff Inbox,
and shared tests). **No corrective-file or Imports goal-path diagnostic was reported.**

Studio package build: **not run**. The package build invokes the same failing `tsc` gate before Vite
and Electron packaging; repeating it would not provide a distinct build signal.

### Corrective scope audit

- Workstream B data model, persistence, AI merge/precedence, lifecycle, Rules, and Functions: **UNCHANGED**
- Workstream A: **UNTOUCHED by this corrective**
- Workstream C: **UNTOUCHED by this corrective**
- DEV deploy: **NOT AUTHORIZED / NOT PERFORMED**
- Commit/push: **NOT AUTHORIZED / NOT PERFORMED**
- Production: **NOT AUTHORIZED / NOT PERFORMED**

### Corrective verdict

**approved_with_notes** — code review, focused tests, and touched-file lint are acceptable. Owner
visual re-QA is still required for viewport fit, internal scrolling, responsive layout, and full
Studio theme fit before any DEV deployment authorization.

### 2026-09-03 follow-up correction

- Owner requested the tab order be reversed. The visible order is now **Smart Profile presets** then
  **Import settings**; opening the modal still defaults to Import settings.
- Owner reported `Internal` when changing Artwork Background on Upload/Donate. The client is calling
  the new `recordCustomerUploadArtworkBackgroundStaffDecision` callable, but that function has not
  been deployed because DEV deployment remains unauthorized. This is a deployment-boundary blocker,
  not a preset or picker-state failure. Deploying the DEV callable requires explicit Owner approval.
- The previous corrective note's “26 diagnostics” count was inaccurate. A fresh full check initially
  reported **30**. Three Workstream C deep-link optionality errors were fixed by converting nullable
  enrichment fields to the optional argument contract. The full check now reports **27** unrelated
  diagnostics and no current-goal diagnostic.
- Expanded focused A/B/C corrective command: exit **0**, **33/33** tests passed. Focused lint: exit
  **0**.

### 2026-09-03 owner-run DEV callable verification

- Owner then requested one additional Workstream B UX adjustment: when opening Import Session Settings,
  the modal should land on **Smart Profile presets** instead of **Import settings**.
- `ImportSessionSettingsModal.tsx` now initializes and resets `activeTab` to `presets` on modal open.
- Tab order remains **Smart Profile presets** first and **Import settings** second.
- No Workstream B data contract, Functions, Rules, or persistence behavior changed.

- Owner manually deployed **only** `recordCustomerUploadArtworkBackgroundStaffDecision` to
  `fresh-prints-dev`.
- Verification command `firebase functions:list --project fresh-prints-dev` shows
  `recordCustomerUploadArtworkBackgroundStaffDecision` present as a v2 callable in `us-central1`
  (`256Mi`, `nodejs20`).
- Verification command
  `gcloud functions describe recordCustomerUploadArtworkBackgroundStaffDecision --gen2 --region us-central1 --project fresh-prints-dev --format=json`
  reports:
  - `state: "ACTIVE"`
  - `environment: "GEN_2"`
  - `allTrafficOnLatestRevision: true`
  - revision `recordcustomeruploadartworkbackgroundstaffdecision-00001-qul`
  - `GCLOUD_PROJECT=fresh-prints-dev`
- Verification command
  `firebase functions:log --only recordCustomerUploadArtworkBackgroundStaffDecision --project fresh-prints-dev`
  shows deployment rollout, successful startup probe, and authenticated callable verification log
  entries. No additional deploy was executed during this verification.
- Local Studio remains configured for `fresh-prints-dev` via `apps/studio/.env.local`
  (`VITE_FIREBASE_PROJECT_ID=fresh-prints-dev`).
- Workstream C UI metadata persistence is therefore **deployment-ready/testable** on DEV. Promotion
  mapping still depends on the separately changed `promoteCustomerUploadToAiReview` function, which is
  not verified as redeployed in this checkpoint.
- Rules remain blocked by missing Java on PATH; `npm run test:rules` is still **not** claimed passed.
- The remaining **27** unrelated Studio TypeScript diagnostics remain explicitly deferred as a
  separate managed cleanup candidate.

### Post-deploy C runtime QA status

- Customer Uploads background save result: **PENDING OWNER / MANUAL STUDIO QA**
- Donated Designs background save result: **PENDING OWNER / MANUAL STUDIO QA**
- Customer Uploads first Halftone click result: **PENDING OWNER / MANUAL STUDIO QA**
- Donated Designs first Halftone click result: **PENDING OWNER / MANUAL STUDIO QA**
- Per-row independence result: **PENDING OWNER / MANUAL STUDIO QA**
- Auto clear/omit behavior result: **PENDING OWNER / MANUAL STUDIO QA**
- Send-to-AI metadata gate result after durable save: **PENDING OWNER / MANUAL STUDIO QA**

### Amendment verdict

**approved_with_notes** — the owner-run DEV callable deployment is verified live and correctly
targeted at `fresh-prints-dev`, but the post-deploy Workstream C runtime interaction results still
require manual Studio QA before any further DEV deployment authorization.

### 2026-09-03 owner corrective: Halftone default-dark + visible preview mat

- Owner clarified that on Studio Upload/Donate intake, clicking **Halftone** should auto-select
  **Dark** when the row background is still Auto, while still allowing staff to switch back to
  **Light** without turning Halftone off.
- Fixed the intake preview rendering path so the visible row preview and the lightbox now resolve and
  paint the effective artwork background instead of always showing the static theme preview mat.
- `useCustomerUploadIntake` now treats Halftone-on + Auto as a coupled optimistic/default-dark
  action, persists Halftone first, then persists the default-dark background using the existing
  `recordCustomerUploadArtworkBackgroundStaffDecision` callable.
- Existing explicit Light/Dark choices remain authoritative and are not overwritten by toggling
  Halftone on.
- Added focused contract coverage for:
  - Auto + Halftone => Dark preview
  - explicit Light + Halftone => Light preview
  - explicit Dark remains Dark
  - section wiring of the default-dark behavior

```text
npx tsx --test apps/studio/src/renderer/src/features/customer-uploads/components/customerUploadIntakePreviewControls.workstream-c.test.ts functions/src/customerUploadOptimisticHalftone.workstream-c.test.ts functions/src/promoteCustomerUploadToAiReview.workstream-c.test.ts
```

Result: exit **0** — **14/14 tests passed**.

```text
npx eslint apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakePreviewControls.tsx apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts apps/studio/src/renderer/src/features/customer-uploads/components/customerUploadIntakePreviewControls.workstream-c.test.ts apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadPreviewBackground.ts --max-warnings 0
```

Result: exit **0**.

No additional Function, Rules, Storage, index, migration, commit, push, or production action was
performed for this corrective.
