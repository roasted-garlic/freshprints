# Phase 3C Signoff Draft

## Document status

| Field | Value |
| --- | --- |
| **Artifact** | Phase 3C — Derivative generation and Design Library rendering |
| **Parent plan** | `docs/plans/phase-3c-implementation-plan.md` |
| **Prerequisites** | Phase 3A (`docs/reviews/phase-3a-final-signoff.md`), Phase 3B (`docs/reviews/phase-3b-signoff.md`) |
| **Draft date** | 2026-06-20 |
| **Approval status** | **DRAFT — NOT APPROVED** |
| **Reviewer** | Pending stakeholder manual QA |

This document prepares Phase 3C for final signoff. It does **not** approve the phase. Final approval requires completed manual verification and creation of `docs/reviews/phase-3c-signoff.md`.

---

## Overview

### Purpose of Phase 3C

Phase 3C completes the desktop staff import pipeline by generating WebP thumbnail and preview derivatives, uploading them to Firebase Storage, populating Firestore catalog paths, and rendering those derivatives in the Design Library and Design Details UI.

Phase 3A/3B created designs with originals only. Phase 3C adds the derivative pipeline and library presentation layer.

### Locked business rule (Step 7 correction)

`status: ready` is reserved for **post-AI-review** completion. Phase 3C import pipeline success:

* Populates `thumbnailPath` and `previewPath`
* Keeps `status: imported` until a future AI/queue phase transitions designs to `ready`

`markDesignReady` exists for future use; import orchestration calls `markDesignDerivativesComplete` instead.

### What Phase 3C delivered (Steps 1–10)

| Step | Scope | Status |
| --- | --- | --- |
| 1–3 | `sharp` integration, derivative generation in main, single IPC read+generate | Implemented |
| 4–5 | Storage rules, `designDerivativeStorageService`, WebP validation | Implemented |
| 6 | `designReadyService` status lifecycle | Implemented |
| 7 | Single PNG derivative orchestration | Implemented |
| 8 | Batch derivative orchestration | Implemented |
| 8A | Batch validation warning visibility | Implemented |
| 8B | Batch manual file exclude | Implemented |
| 9 | `designDerivativeUrlService`, URL resolution hook | Implemented |
| 10 | Rendering polish, accessibility, signoff prep | Implemented |

**Explicitly out of scope:** AI review, queue processing, `ready` transitions on import, customer-facing delivery, DPI normalization, physical size editing, right-click copy/paste.

---

## Scope Completed

### Main process

* `derivativeGenerator.ts` — WebP thumbnail and preview generation via `sharp`
* `sharpConcurrencyQueue.ts` — concurrency limited to 1
* Extended `readSelectedPngFileBytes` / batch read — derivatives generated before IPC return (single round-trip)
* Session-gated reads preserved from Phase 3B

### Renderer services

| Service | Responsibility |
| --- | --- |
| `designDerivativeStorageService` | Upload/delete WebP at canonical paths |
| `designReadyService` | `markDesignProcessing`, `markDesignDerivativesComplete`, `markDesignReady` (future) |
| `importDerivativeService` | Derivative upload + Firestore path updates |
| `importOrchestrationService` | Single PNG full pipeline |
| `importBatchOrchestrationService` | Batch pipeline with exclude support |
| `designDerivativeUrlService` | Catalog path → `getDownloadURL` with session cache |

### Shared

* `derivativeGeneration.constants.ts` — dimensions, quality, concurrency
* `derivativeWebpValidation.ts` — client-side WebP validation
* `designStoragePaths.ts` — canonical path helpers

### UI (Design Library rendering)

| Component | Behavior |
| --- | --- |
| `DesignThumbnailPanel` | Loading spinner, resolved image, unavailable/broken-image fallback, fixed aspect ratio |
| `DesignCard` | Decorative thumbnail (`object-fit: cover`) from `thumbnailPath` |
| `DesignDetailsModal` | Informative preview (`object-fit: contain`) from `previewPath` |
| `useDesignDerivativeUrl` | Hook state: `loading` / `resolved` / `unavailable` |

### Batch import UX (Steps 8A–8B)

* Per-file validation warnings in discovery
* Manual exclude/include per file before upload
* Excluded files skipped with no Storage/Firestore side effects

---

## Manual Verification Checklist

**Signoff gate tests (must pass before approval):**

| ID | Test | Expected | Result |
| --- | --- | --- | --- |
| **T1** | Import PNG → Design Library thumbnail renders | Thumbnail visible; `status` remains `imported` | ☐ Pending |
| **T7** | Design Details preview renders | Preview image in header when `previewPath` set | ☐ Pending |
| **T11** | Light/dark theme on image cards | Readable placeholders; images render in both themes | ☐ Pending |

### A. Design Library thumbnails

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| A1 | Open Design Library with imported designs that have `thumbnailPath` | Grid cards show thumbnail images | ☐ Pending |
| A2 | Observe loading state on first open | Compact spinner; no layout shift | ☐ Pending |
| A3 | Re-open library or revisit same designs | Images load from cache without repeated spinner flash | ☐ Pending |

### B. Design Details previews

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| B1 | Open design with `previewPath` | Header shows preview image | ☐ Pending |
| B2 | Verify image proportions | No stretching; `object-fit: contain` | ☐ Pending |

### C. Empty paths

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| C1 | View design without `thumbnailPath` / `previewPath` | Placeholder with label; no crash | ☐ Pending |

### D. Broken/missing Storage object

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| D1 | Design with path but missing Storage file (or simulate `onError`) | Placeholder shown; no component crash | ☐ Pending |

### E. Single PNG import regression

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| E1 | Import single PNG | Original, thumbnail, preview created | ☐ Pending |
| E2 | Check Firestore | `status: imported`; paths populated on pipeline success | ☐ Pending |
| E3 | Import result UI | Distinguishes import success vs pipeline success | ☐ Pending |

### F. Batch import regression

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| F1 | Batch import multiple PNGs | Each successful file gets original + derivatives | ☐ Pending |
| F2 | Batch summary | Derivative complete/failed counts; import vs pipeline success | ☐ Pending |

### G. Manual exclude regression

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| G1 | Exclude files in discovery; upload batch | Excluded files not uploaded; **Skipped by user** in summary | ☐ Pending |

### H. Light/dark mode

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| H1 | Toggle theme on Design Library | Thumbnails, placeholders, borders readable in both modes | ☐ Pending |
| H2 | Toggle theme in Design Details modal | Preview and header layout correct in both modes | ☐ Pending |

### I. Filter regression

| Step | Action | Expected | Result |
| --- | --- | --- | --- |
| I1 | Imported filter | Shows newly imported designs with images | ☐ Pending |
| I2 | Ready filter | Does **not** show newly imported designs (still `imported`) | ☐ Pending |

### J. Automated checks

| Step | Command | Expected | Result |
| --- | --- | --- | --- |
| J1 | `npm run lint` | Pass | ☐ Pending |
| J2 | `npx tsc --noEmit` | Pass | ☐ Pending |
| J3 | Derivative URL cache unit tests | Pass | ☐ Pending |

---

## Architecture Review

### Layer compliance — **Pass (implementation)**

| Layer | Assignment | Verdict |
| --- | --- | --- |
| Main | `sharp`, derivative generation, session-gated IPC reads | Correct |
| Preload | Allowlisted IPC channels only | Correct |
| Renderer services | Firebase Storage/Firestore, URL resolution | Correct |
| Hooks | `useDesignDerivativeUrl`, import hooks coordinate services | Correct |
| Components | Render only; no Firebase or filesystem access | Correct |

`App.tsx` contains routes/providers only. No architecture violations identified in Steps 1–10 implementation.

### Import pipeline integration — **Pass**

Single and batch imports share the corrected derivative pipeline:

```txt
read bytes + generate derivatives (main, one IPC round-trip)
    ↓
upload original → createDesign (imported)
    ↓
markDesignProcessing → upload derivatives → markDesignDerivativesComplete
    ↓
paths populated; status remains imported
```

### URL resolution — **Pass**

Firestore stores catalog paths only. `designDerivativeUrlService` resolves at display time. No URLs persisted in Firestore.

---

## Security Review

### Storage rules — **Verify deploy**

| Path | Format | Size | Access |
| --- | --- | --- | --- |
| `/originals/{designId}.png` | PNG | 50 MB | Active staff |
| `/thumbnails/{designId}.webp` | WebP | 10 MB | Active staff |
| `/previews/{designId}.webp` | WebP | 10 MB | Active staff |

**Action before signoff:** Confirm `firebase deploy --only storage` was run in the target environment and staff-only write/read rules are live.

### Renderer security — **Pass**

* No unrestricted filesystem access in renderer
* Context isolation preserved
* Download URLs are time-limited Firebase tokens; not stored in Firestore
* Missing/unauthorized Storage access returns `null` — no error propagation to UI

### Session gates — **Pass (unchanged from 3B)**

PNG reads require valid single-file or batch session. Derivative generation occurs inside gated read handlers.

---

## Storage Review

### Canonical paths

| Asset | Path pattern |
| --- | --- |
| Original | `/originals/{designId}.png` |
| Thumbnail | `/thumbnails/{designId}.webp` |
| Preview | `/previews/{designId}.webp` |

Helpers: `shared/constants/design/designStoragePaths.ts`

### Upload services

* `importUploadService` — originals (Phase 3A)
* `designDerivativeStorageService` — derivatives (Phase 3C Step 5)

### Rollback policy

On derivative failure after Firestore create: original and design record retained; `status` stays or reverts to `imported`; uploaded derivatives deleted (best-effort).

### URL cache

In-memory `path → URL` for renderer session. `designDerivativeUrlService.clearCache()` available for testing. No TTL in Step 10 — acceptable for staff desktop session; stale-token risk is low for short sessions.

---

## Data Model Review

### Design document fields (unchanged schema)

Phase 3C populates existing fields:

| Field | Phase 3C behavior |
| --- | --- |
| `originalPath` | Set at import (3A) |
| `thumbnailPath` | Set on pipeline success |
| `previewPath` | Set on pipeline success |
| `status` | Remains `imported` after Phase 3C import |
| `aiProcessed` | `false` — AI readiness preserved |
| `width`, `height`, `dpi` | From validation metadata |

No new Firestore fields introduced. Firestore rules unchanged.

### Status semantics

| Status | Phase 3C meaning |
| --- | --- |
| `imported` | Original + record exist; derivatives may or may not be complete |
| `processing` | Transient during derivative upload (orchestration) |
| `ready` | **Future** — post-AI-review only in current business rules |

---

## Known Technical Debt

| Item | Notes |
| --- | --- |
| Design Library pagination (>100 designs) | Existing Phase 2B debt; imports may exceed query limit |
| URL cache TTL | Session-only cache; no TTL invalidation in Step 10 |
| `markDesignReady` unused in import | Reserved for post-AI phase |
| `designService.restoreDesign` path validation | Pre-existing; out of 3C scope |
| Per-file / batch derivative retry | Manual re-import or future backfill tool (Step 12 optional) |
| Upload cancellation during derivatives | Not supported |
| Automated E2E tests | Manual signoff for Phase 3C |
| Customer-facing derivative delivery | Phase 6+ |
| Cloud Functions derivative generation | Deferred unless desktop limits hit |
| Strict DPI rejection default-on | Business decision pending |
| Exit criteria wording in plan Section 21 | Some bullets still reference `ready` on pipeline success — corrected in implementation via Step 7 correction |

---

## Risks

### Low

| Risk | Mitigation |
| --- | --- |
| WebP support in Electron | Chromium supports WebP |
| Filter confusion (`imported` vs `ready`) | Designs stay `imported` until AI; badges and filters document status |
| Broken image after URL resolves | `onError` fallback in `DesignThumbnailPanel` |

### Medium

| Risk | Mitigation |
| --- | --- |
| `sharp` native build on new machines | Documented in setup guides; electron-rebuild |
| Large batch soak testing | Recommend 50–100 file staging test before production |
| Storage rules not deployed | Block signoff without deploy verification |
| Long-running derivative upload on slow network | Partial success reporting per file |

### High

| Risk | Status |
| --- | --- |
| Double IPC PNG transfer | **Resolved** — single read+generate round-trip |
| `sharp` OOM on large PNGs | Mitigated by concurrency = 1 |

---

## Items Remaining Before Final Signoff

1. **Complete manual verification checklist** above (T1, T7, T11 minimum).
2. **Confirm Storage rules deployed** in target Firebase project (`firebase deploy --only storage`).
3. **Stakeholder review** of Design Library rendering in light and dark mode.
4. **Regression pass** on single PNG, batch import, and manual exclude flows.
5. **Create `docs/reviews/phase-3c-signoff.md`** with verified results — replace this draft.
6. **Optional (not blocking):** Step 11 strict DPI toggle, Step 12 backfill tool, Step 13 doc sweep (`SECURITY.md`, `ROADMAP.md`).

---

## Firebase Deploy

| Deploy | Required for Step 10? | Notes |
| --- | --- | --- |
| Storage rules (`/thumbnails/`, `/previews/`) | **Yes — for import QA** | Should already be deployed from Step 5 |
| Firestore rules | No change | — |
| Firestore indexes | No change | — |
| Cloud Functions | No change | — |

Step 10 rendering polish requires **no new Firebase deploy**. Signoff still requires confirmation that Step 5 Storage rules are live in the environment under test.

---

## Files Changed (Step 10)

| File | Change |
| --- | --- |
| `src/renderer/src/features/designs/components/DesignThumbnailPanel.tsx` | Loading, broken-image fallback, accessibility, `imageFit`, decorative mode |
| `src/renderer/src/features/designs/components/DesignCard.tsx` | Decorative thumbnail, cover fit, loading labels |
| `src/renderer/src/features/designs/components/DesignDetailsModal.tsx` | Preview polish props |
| `src/renderer/src/styles/components/design-library.css` | Fixed aspect ratio, state layers, cover/contain, resolved border |
| `src/renderer/src/features/designs/services/designDerivativeUrlCache.test.ts` | `clearCache` test |
| `docs/WORKFLOWS.md` | Step 10 rendering polish section |
| `docs/FIREBASE.md` | Rendering polish note |
| `docs/plans/phase-3c-implementation-plan.md` | Step 10 status updated |
| `docs/reviews/phase-3c-signoff-draft.md` | This document |

---

## Approval

| Role | Name | Date | Status |
| --- | --- | --- | --- |
| Implementation | AI-assisted | 2026-06-20 | Complete (Steps 1–10) |
| Manual QA | _Pending_ | — | **Not started** |
| Phase 3C approval | _Pending_ | — | **NOT APPROVED** |

---

*References: `docs/AI_RULES.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/FIREBASE.md`, `docs/SECURITY.md`, `docs/STYLE_GUIDE.md`, `docs/WORKFLOWS.md`, `docs/plans/phase-3c-implementation-plan.md`, `docs/reviews/phase-3c-plan-review.md`, `docs/reviews/phase-3a-final-signoff.md`, `docs/reviews/phase-3b-signoff.md`*
