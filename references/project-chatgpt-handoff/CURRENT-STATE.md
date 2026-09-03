# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-03

---

## FreshForge workflow

| Item | Value |
|------|-------|
| Status | **IDLE** |
| DONE | **yes** |
| Current goal | `none` |
| Current phase | Last completed: `portal-modal-dont-show-again-and-import-smart-profile-presets` |
| Signoff | **approved_with_notes** |
| Owner QA | **PASS** — Workstream A PASS; Workstream B DEV QA PASS; Workstream C UI/metadata PASS; Workstream C end-to-end DEV QA PASS |
| DEV deploy | **complete** — exact Workstream B Functions + Firestore Rules and exact Workstream C Functions deployed to `fresh-prints-dev` |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |
| Batch allocation | **DEFERRED** (`show-queue-batch-allocation-performance`) |
| Final signoff | `docs/workflow/reviews/2026-09-03-portal-modal-dont-show-again-and-import-smart-profile-presets-signoff.md` |
| Last completed goal | `portal-modal-dont-show-again-and-import-smart-profile-presets` |
| Next owner-selected goal | `firestore-rules-print-request-item-resize-expression-budget` |
| Working tree | Should be clean after the final commit/push, except intentional untracked `.worktrees/` |

---

## Notes

This goal closed three coordinated DEV-only workstreams:

- Workstream A: Portal Upload and Donate now share one browser-local informational artwork-quality notice dismissal via localStorage only. Ownership acknowledgment, catalog permission, and upload validation remain unchanged.
- Workstream B: Studio Imports now support an optional Smart Profile presets tab with Studio-themed controls, responsive layout, internal scrolling, durable `smartProfileImportPresets`, dimension provenance tracking, post-AI merge, retry/reprocess preservation, and staff-edit/removal synchronization. The final owner-approved UX intentionally opens the modal on **Smart Profile presets**.
- Workstream C: Studio Customer Uploads and Donated Designs now support per-design Auto, Light, Dark, and Halftone controls before Send to AI Review. Halftone-on from Auto defaults that row to Dark, previews/lightbox repaint, optimistic local state survives snapshots, pending/failed metadata blocks stale promotion, retry is available, and promotion carries authoritative Halftone/background metadata into the resulting design with `halftoneDecisionSource: intake` and explicit background source `staff_manual`.

Exact DEV backend changes shipped for this goal:

- Workstream B Functions: `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `updateDesignSmartProfileDimensions`, `resetDesignSmartProfileDimension`
- Workstream B Rules: `firestore.rules`
- Workstream C Functions: `recordCustomerUploadArtworkBackgroundStaffDecision`, `promoteCustomerUploadToAiReview`

No Storage Rules, indexes, migrations, Portal App Hosting, Studio publish, or production changes were authorized.

The only retained note is an unrelated global Firestore Rules test failure:
`tests/firebase/printRequestItemResize.rules.test.ts` subtest
`allows customer size update when interactive upscale fields are present and unchanged`
due to Rules expression-budget exhaustion. That corrective is queued as the next owner-selected goal.
