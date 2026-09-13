# Signoff: portal-modal-dont-show-again-and-import-smart-profile-presets

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-plan.md` |
| Review | `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-review.md` |
| Test report | `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-implementation-review.md` |
| Final status | **approved_with_notes** |

---

## Summary

This managed goal closed three coordinated DEV-only workstreams:

- Workstream A added a shared Portal browser-local "Don't show again" quality notice dismissal across Upload and Donate without changing ownership acknowledgment, catalog permission, or upload validation.
- Workstream B added an optional Studio Import Session Smart Profile presets tab with durable `smartProfileImportPresets` seed storage, provenance tracking, post-AI merge, and staff-edit synchronization.
- Workstream C added per-design Studio intake controls for Auto, Light, Dark, and Halftone across Customer Uploads and Donated Designs, plus authoritative promotion of Halftone/background metadata into AI Review designs.

Historical checkpoints are preserved below, including the initial Workstream C target mistake/rollback, the Workstream B owner UX fail and corrective, the Java-blocked Rules checkpoint, the first `promoteCustomerUploadToAiReview` deploy timeout, and the successful timeout-workaround retry.

---

## Changes Delivered

### Behavior
- Portal Upload and Donate now share a single localStorage-backed quality-notice snooze preference.
- Studio Imports now supports owner-approved Smart Profile preset entry in a dedicated tab that opens on the presets tab, remains internally scrollable, preserves in-progress values while switching tabs, and seeds durable import preset data for later AI merge.
- Smart Profile import presets persist as `smartProfileImportPresets`, preserve tracked dimension provenance, merge back in after AI enrichment and ready-catalog reprocess, and stop resurrecting removed values after later staff edits or resets.
- Studio Customer Uploads and Donated Designs now expose per-row Auto, Light, Dark, and Halftone controls with optimistic UI, retry support, stale-send blocking during pending/failed metadata writes, first-click Halftone responsiveness, default-to-Dark from Auto, preview/lightbox repainting, and authoritative promotion of Halftone/background metadata.

### Files Created
- `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakePreviewControls.tsx`
- `apps/studio/src/renderer/src/features/customer-uploads/components/customerUploadIntakePreviewControls.workstream-c.test.ts`
- `apps/studio/src/renderer/src/features/customer-uploads/utils/customerUploadPreviewBackground.ts`
- `apps/studio/src/renderer/src/features/imports/components/SmartProfilePresetsEditor.tsx`
- `apps/studio/src/renderer/src/features/imports/components/importSessionSettingsModal.workstream-b-ui.test.ts`
- `apps/studio/src/renderer/src/features/imports/constants/smartProfilePresets.ts`
- `apps/studio/src/renderer/src/features/imports/utils/smartProfilePresetEditorValues.ts`
- `docs/workflow/plans/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-plan.md`
- `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-implementation-review.md`
- `docs/workflow/reviews/2026-09-02-portal-modal-dont-show-again-and-import-smart-profile-presets-review.md`
- `functions/src/customerUploadOptimisticHalftone.workstream-c.test.ts`
- `functions/src/promoteCustomerUploadToAiReview.workstream-c.test.ts`
- `functions/src/recordCustomerUploadArtworkBackgroundStaffDecision.ts`
- `packages/shared/src/utils/smartProfileImportPresets.test.ts`
- `packages/shared/src/utils/smartProfileImportPresets.ts`
- `tests/firebase/smartProfileImportPresets.rules.test.ts`

### Files Modified
- `apps/portal/features/customer-uploads/components/ArtworkQualityNotice.tsx`
- `apps/portal/features/customer-uploads/utils/artworkQualityModalSnooze.test.ts`
- `apps/portal/features/customer-uploads/utils/artworkQualityModalSnooze.ts`
- `apps/studio/src/renderer/src/features/customer-uploads/components/CustomerUploadIntakeSection.tsx`
- `apps/studio/src/renderer/src/features/customer-uploads/hooks/useCustomerUploadIntake.ts`
- `apps/studio/src/renderer/src/features/customer-uploads/services/customerUploadIntakeService.ts`
- `apps/studio/src/renderer/src/features/designs/services/designService.ts`
- `apps/studio/src/renderer/src/features/designs/types/design.types.ts`
- `apps/studio/src/renderer/src/features/imports/components/ImportSessionSettingsForm.tsx`
- `apps/studio/src/renderer/src/features/imports/components/ImportSessionSettingsModal.tsx`
- `apps/studio/src/renderer/src/features/imports/constants/importSessionSettings.ts`
- `apps/studio/src/renderer/src/features/imports/hooks/useBatchImport.ts`
- `apps/studio/src/renderer/src/features/imports/hooks/useImportSessionSettings.ts`
- `apps/studio/src/renderer/src/features/imports/hooks/useSinglePngImport.ts`
- `apps/studio/src/renderer/src/features/imports/pages/ImportsPage.tsx`
- `apps/studio/src/renderer/src/features/imports/services/importBatchOrchestrationService.ts`
- `apps/studio/src/renderer/src/features/imports/services/importOrchestrationService.ts`
- `apps/studio/src/renderer/src/features/imports/types/batchImportOrchestration.types.ts`
- `apps/studio/src/renderer/src/styles/components/batch-import.css`
- `apps/studio/src/renderer/src/styles/layout.css`
- `firestore.rules`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/smartProfileEnrichmentWrite.test.ts`
- `functions/src/ai/smartProfileEnrichmentWrite.ts`
- `functions/src/designs/designSmartProfileStaffUpdate.ts`
- `functions/src/index.ts`
- `functions/src/promoteCustomerUploadToAiReview.ts`
- `packages/shared/src/types/catalog/smartProfile.types.ts`
- `packages/shared/src/types/customerUpload/customerUpload.types.ts`

### Documentation Updated
- `docs/project/ROADMAP.md`
- `docs/workflow/reviews/2026-09-03-portal-modal-dont-show-again-and-import-smart-profile-presets-signoff.md`
- `.cursor/workflow/state.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`
- `references/project-chatgpt-handoff/NEXT-PLANNED-GOAL.md`
- `references/project-chatgpt-handoff/03-roadmap-and-phases.md`
- `references/project-chatgpt-handoff/04-features-inventory.md`
- `references/project-chatgpt-handoff/05-workflows-summary.md`
- `references/project-chatgpt-handoff/06-data-model-essentials.md`
- `references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md`
- `references/project-chatgpt-handoff/13-recent-completed-work.md`

---

## Chronology

1. Initial Workstream C targeting was corrected and rolled back before the accepted implementation path.
2. Corrected Studio Workstream C plan/review addendum approved the scoped Halftone/background implementation.
3. Workstream B initial owner QA failed on modal presentation and required a dedicated themed tab corrective.
4. Workstream B UI corrective shipped, then a follow-up owner request intentionally changed the modal-open default to the Smart Profile presets tab.
5. Workstream C background callable started as undeployed; the owner then manually ran the narrow DEV deploy for `recordCustomerUploadArtworkBackgroundStaffDecision`.
6. Workstream B backend/Rules deployment stayed held until Java-backed Rules tests could be executed; a portable JDK 21 path was used for the required Rules coverage.
7. Focused Workstream B tests and focused Rules coverage passed, then the exact Workstream B DEV Functions + Firestore Rules package was deployed to `fresh-prints-dev`.
8. Owner Workstream B DEV QA passed.
9. The first Workstream C `promoteCustomerUploadToAiReview` deploy attempt failed on Firebase backend-spec discovery timeout before updating the function.
10. The owner authorized one narrow retry using shell-local `FUNCTIONS_DISCOVERY_TIMEOUT=60`; the retry succeeded and deployed revision `promotecustomeruploadtoaireview-00014-gev`.
11. Owner Workstream C UI/metadata QA passed, then owner Workstream C end-to-end DEV QA passed for both Customer Upload and Donated Design promotion paths.
12. Final state: A/B/C accepted on DEV, production still not authorized, and the unrelated global Firestore Rules expression-budget failure is deferred to the next owner-selected goal.

---

## Tests

### Automated
- Focused Workstream B tests: **28/28 PASS**
- Focused Workstream B Firestore Rules tests: **6/6 PASS**
- Focused Workstream C tests: **14/14 PASS**
- Earlier expanded focused A/B/C suite: **33/33 PASS**
- Functions build: **PASS**
- Touched-file lint: **PASS**
- Full Firestore Rules suite: **158/159 PASS**
  - Sole failure preserved as unrelated global follow-up:
    - File: `tests/firebase/printRequestItemResize.rules.test.ts`
    - Subtest: `allows customer size update when interactive upscale fields are present and unchanged`
    - Failure class: Firestore Rules expression-budget exhaustion

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Workstream A final owner QA | PASS | human |
| Workstream B DEV QA | PASS | human |
| Workstream C UI/metadata QA | PASS | human |
| Workstream C end-to-end DEV QA | PASS | human |
| Customer Upload promotion | PASS | human |
| Donated Design promotion | PASS | human |
| Halftone provenance = `intake` | PASS | human |
| Artwork background source = `staff_manual` | PASS | human |
| AI enrichment preservation | PASS | human |
| Reprocess preservation | PASS | human |
| Auto omit/clear behavior | PASS | human |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required | 2026-09-03 | DEV-only goal; production explicitly not authorized |
| Database migration | not required | 2026-09-03 | No migration/backfill |
| Design / UX | obtained | 2026-09-03 | Owner QA PASS for A, B, and C |
| Business / policy | not required | 2026-09-03 | No pricing/policy change |
| Secrets / env | not required | 2026-09-03 | Shell-local timeout override only; no persisted env/config change |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Full Firestore Rules suite still has one unrelated global failure in `tests/firebase/printRequestItemResize.rules.test.ts` | medium | Record the next owner-selected goal `firestore-rules-print-request-item-resize-expression-budget`; do not treat as an A/B/C defect |
| Firebase Functions Node.js 20 deploy warning | low | Informational only for this goal; handle in a future runtime-upgrade goal before decommission |

---

## Deferred Items (Roadmap)
- Next owner-selected goal: `firestore-rules-print-request-item-resize-expression-budget`
- Broad Smart Profiling remains **PARKED**
- `show-queue-batch-allocation-performance` remains **DEFERRED**
- Production deploys, Portal App Hosting, and Studio publish remain **NOT AUTHORIZED**

---

## Open Blockers
- [x] None

---

## Verdict

**approved_with_notes** is the truthful closeout verdict. The managed goal itself is complete, deployed on DEV where authorized, and fully owner-accepted across Workstreams A/B/C. The only retained note is the known unrelated full-Rules-suite expression-budget failure outside this goal's reviewed scope.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [ ] `RISK_REGISTER.md` updated if needed
- [x] **`references/project-chatgpt-handoff/CURRENT-STATE.md` updated** (required at signoff when handoff package exists)
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated (required at signoff when handoff package exists)
- [x] Other handoff files per `references/project-chatgpt-handoff/MANIFEST.md` updated where behavior/architecture changed

**Recommended next action for user:**
Authorize the separate narrow managed goal `firestore-rules-print-request-item-resize-expression-budget` when ready; do not begin it automatically.
