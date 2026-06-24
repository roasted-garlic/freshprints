# Phase 3C Plan Review

## Document status

| Field | Value |
| --- | --- |
| **Reviewed artifact** | `docs/plans/phase-3c-implementation-plan.md` |
| **Review type** | Architecture, security, scalability, maintainability, workflow, and roadmap review (pre-implementation) |
| **Prerequisites verified** | Phase 3A approved (`docs/reviews/phase-3a-final-signoff.md`), Phase 3B approved (`docs/reviews/phase-3b-signoff.md`) |
| **Review date** | 2026-06-20 |
| **Reviewer** | AI-assisted architecture review |
| **Implementation status** | Not started — review only |

**Reference documents reviewed:**

* `docs/AI_RULES.md`
* `docs/ARCHITECTURE.md`
* `docs/CODING_STANDARDS.md`
* `docs/DATA_MODEL.md`
* `docs/FIREBASE.md`
* `docs/ROADMAP.md`
* `docs/SECURITY.md`
* `docs/STYLE_GUIDE.md`
* `docs/WORKFLOWS.md`
* `docs/plans/phase-3c-implementation-plan.md`
* `docs/plans/phase-3b-implementation-plan.md`
* `docs/plans/import-pipeline-plan.md`
* `docs/reviews/phase-3a-final-signoff.md`
* `docs/reviews/phase-3b-signoff.md`
* `docs/reviews/phase-3b-step10-signoff.md`
* Live codebase verification: `importOrchestrationService.ts`, `storage.rules`, `firestore.rules`, `designStoragePaths.ts`, `DesignCard`, `DesignThumbnailPanel`

---

## 1. Overview

Phase 3C is the final sub-phase of the desktop import pipeline. It closes the deliberate gap left by Phase 3A/3B: designs are created with `status: "imported"`, originals in Storage, and empty `thumbnailPath` / `previewPath`. Phase 3C adds WebP derivative generation (main process), derivative Storage uploads (renderer), Firestore path population, status transition to `ready`, and Design Library image rendering via catalog-path URL resolution.

The plan correctly extends the proven 3A/3B pipeline rather than rewriting it. Layer boundaries are respected: `sharp` in main, Firebase in renderer services, UI in components/hooks. Exclusions (AI, queue, customer catalog, retry polish) align with `docs/ROADMAP.md` and prior signoffs.

**Overall assessment:** The plan is architecturally sound, data-model compatible, and roadmap-aligned. Several gaps require resolution before implementation — primarily IPC byte-transfer efficiency, session-gate consistency for derivative generation, `processing` status semantics vs `WORKFLOWS.md`, and explicit success-criteria wording.

**Recommendation:** **Approved with modifications**

Seven required modifications are listed in Section 10. None block the overall approach.

---

## 2. Scope Review

### 2.1 Scope correctness — **Pass**

Phase 3C is properly scoped as the derivative-generation and library-presentation completion of Phase 3. It matches:

| Source | Expected 3C scope | Plan alignment |
| --- | --- | --- |
| `docs/plans/import-pipeline-plan.md` | Thumbnails, previews, `ready` transition, Design Library images | Aligned |
| `docs/reviews/phase-3b-signoff.md` | Explicit handoff: derivatives deferred to 3C | Aligned |
| `docs/ROADMAP.md` Phase 3 | Import pipeline completion before Phase 4 | Aligned |
| `AGENTS.md` milestone gate | No Phase 4/6/7 work until foundation complete | Aligned |

In-scope items (14 capabilities in Section 4.1) are necessary and sufficient for the stated goal. Optional items (strict DPI toggle, backfill, `processing` filter) are appropriately marked optional.

### 2.2 Scope creep — **None material**

The plan does not introduce:

* AI enrichment, queue integration, or customer catalog access
* ZIP/folder discovery rewrites
* Cloud Functions orchestration (correctly deferred)
* New Firestore schema fields without approval

Optional strict DPI and backfill are bounded and match `import-pipeline-plan.md` language.

### 2.3 Missing requirements — **Minor gaps**

| Gap | Severity | Notes |
| --- | --- | --- |
| **Success criteria ambiguity** | Medium | Exit criteria (Section 21) say thumbnails for "every successful import" while failure policy retains `imported` on derivative failure. Must define tiers: *import success* (original + Firestore) vs *pipeline success* (derivatives + `ready`). |
| **Storage rules WebP size cap** | Low | Plan mentions size limit but does not propose a numeric cap for derivatives (originals use 50 MB). Recommend explicit max (e.g. 10 MB) in rules. |
| **`sharp` setup documentation** | Low | Plan references electron-rebuild; should require `docs/setup/electron-security-setup.md` update with native module build steps before Step 3. |
| **Firestore rules** | None | Correctly states no change required — verified against `firestore.rules`. |
| **Batch cancel during derivatives** | Low | Correctly deferred; document that cancel mid-derivative may leave `imported` or `processing` designs (acceptable). |

### 2.4 Scope verdict

**Properly scoped** with minor documentation clarifications required.

---

## 3. Architecture Review

### 3.1 Layer model — **Pass**

The plan preserves the required stack:

```txt
React (components)
    ↓
Hooks (useSinglePngImport, useBatchImport, useDesignAssetUrl)
    ↓
Services (importDerivativeService, importUploadService, designService, designStorageUrlService)
    ↓
Firebase SDK / IPC (importDesktopService → preload → main)
    ↓
Storage / Firestore / derivativeGenerator (main)
```

| Layer | Plan assignment | Verdict |
| --- | --- | --- |
| Main | `derivativeGenerator`, IPC handler | Correct |
| Preload | Allowlisted `generate-design-derivatives` channel | Correct |
| Renderer services | Upload, Firestore updates, URL resolution | Correct per `docs/FIREBASE.md` |
| Hooks | Progress, partial success state | Correct per `docs/CODING_STANDARDS.md` |
| Components | Render resolved URLs only | Correct |

No architecture violations identified for Firebase-in-components, renderer filesystem access, or `App.tsx` business logic.

### 3.2 Reuse of Phase 3A/3B pipeline — **Strong pass**

Extending `importValidatedPngFile` after `createDesign` is the correct incremental model endorsed in Phase 3A/3B signoffs. Rollback for Firestore-create failure (delete original) remains unchanged. Derivative-only failure does not delete originals — correct.

### 3.3 Architecture concern — IPC byte flow — **Modification required**

**Issue:** Section 8.2 states "reuse in-memory bytes from the validated read" in main, but the **implemented** flow is:

```txt
main: readSelectedPngFileBytes (session-gated)
    ↓ IPC returns bytes to renderer
renderer: uploadOriginalPng(bytes)
    ↓
renderer: createDesign
    ↓
renderer: generateDesignDerivatives(bytes)  ← proposed new IPC sends bytes BACK to main
```

This implies **two full IPC transfers** of up to 50 MB per file (main → renderer → main). Section 16 acknowledges "IPC buffer copy acceptable" but Section 8.2 claims avoidance of redundant reads without addressing the double transfer.

**Recommended approach (see Modification 1):** Generate derivatives inside the existing session-gated read handler before returning to renderer, returning `{ bytes, thumbnailBytes, previewBytes, dimensions }` in one IPC round-trip. This preserves session gates, eliminates duplicate transfer, and matches the plan's performance intent.

A separate `generate-design-derivatives` IPC remains valid for **optional backfill** (renderer downloads original from Storage, then invokes main).

### 3.4 Service placement — **Pass**

| Service | Location | Verdict |
| --- | --- | --- |
| `importDerivativeService` | `features/imports/services/` | Correct — import workflow |
| `designStorageUrlService` | `features/designs/services/` | Correct — reusable outside imports |
| `markDesignReady` | `designService` | Correct — sole catalog writer |

### 3.5 WORKFLOWS.md ordering deviation — **Accepted with documentation**

`docs/WORKFLOWS.md` describes generate-then-upload-then-create. Phase 3A/3B inverted this intentionally. The plan documents the extension model (Section 3.5) and requires `WORKFLOWS.md` update in Step 13. **Acceptable** provided the workflow doc is updated to describe the implemented order and rationale.

### 3.6 Architecture verdict

**Pass with one required IPC design modification.**

---

## 4. Data Model Review

### 4.1 Schema compatibility — **Pass**

No migration required. Existing `Design` interface already includes `originalPath`, `thumbnailPath`, `previewPath`, `status`, `width`, `height`, `dpi`, `aiProcessed`, `aiReviewed`, and audit fields. `firestore.rules` `designRequiredFieldsValid` requires `thumbnailPath` as string (empty `""` valid on create) and allows optional `previewPath`.

### 4.2 Status lifecycle — **Pass with semantic note**

Canonical lifecycle per `docs/DATA_MODEL.md`:

```txt
imported → processing → ready → queued → printed → archived
```

Plan usage:

| Status | 3C meaning | Compatible |
| --- | --- | --- |
| `imported` | Original + record; derivatives incomplete | Yes |
| `processing` | Derivative work in progress | Yes — but see WORKFLOWS conflict below |
| `ready` | Derivatives complete | Yes — matches default Design Library filter |
| `rejected` | Not used for import failures | Yes — consistent with 3A/3B |

`firestore.rules` does not enforce status transition guards — staff may update `imported` → `processing` → `ready` via `designService.updateDesign`. No rules change needed.

### 4.3 Path fields — **Pass**

Canonical paths from `designStoragePaths.ts` are unchanged. Plan correctly requires `isCanonicalDesignStoragePath` validation on `updateDesign` for thumbnail/preview paths. `originalPath` must not be overwritten during derivative processing.

### 4.4 Audit metadata — **Pass**

`markDesignReady` / `updateDesign` will set `updatedBy` and `updatedAt` per existing `designService` patterns. `createdBy`, `createdAt`, `uploadedBy` remain immutable. No conflict.

### 4.5 AI readiness — **Pass with documentation requirement**

Phase 7 requirements preserved:

* Stable `originalPath` for vision pipeline
* `aiProcessed: false`, `aiReviewed: false` on import
* No `aiMetadata` writes in 3C
* Source `width`/`height`/`dpi` not overwritten with derivative dimensions

### 4.6 `processing` status semantic collision — **Modification required**

`docs/WORKFLOWS.md` Step 8 assigns `processing` to **AI queue** work; Step 9 returns to `ready`. Phase 3C also uses `processing` for **derivative** work.

This is not a schema conflict (same status, serial lifecycle), but it is a **documentation and Phase 7 design risk** if AI pipeline assumes `processing` means AI-only.

**Resolution (Modification 2):** Update `WORKFLOWS.md` to define `processing` as generic "background enrichment" with ordered sub-stages (derivatives in 3C, AI in Phase 7). Phase 7 should transition `ready` → `processing` → `ready` without assuming empty derivative paths.

### 4.7 Schema risks — **Low**

| Risk | Assessment |
| --- | --- |
| Empty `thumbnailPath` on `ready` via manual edit | Pre-existing — `designService` should validate paths when setting `ready` (Modification 3) |
| `restoreDesign` sets `ready` without path check | Pre-existing in `designService.restoreDesign` — out of 3C scope but note for backfill |
| New optional fields (`derivativeError`, etc.) | Correctly deferred |

### 4.8 Data model verdict

**Pass** with WORKFLOWS clarification and optional `markDesignReady` validation.

---

## 5. Security Review

### 5.1 IPC additions — **Pass with modification**

| Control | Plan | Live codebase | Verdict |
| --- | --- | --- | --- |
| Allowlist pattern | Required | Matches `importIpcChannels.ts` pattern | Pass |
| Payload size cap | 50 MB | Matches `MAX_SINGLE_PNG_SIZE_BYTES` | Pass |
| Session/batch gates on byte read | Preserve | `validateReadPngFileBytesRequest` enforces single + batch session | Pass |
| Session gates on generate IPC | "Bytes only from orchestration" | **Not specified on generate handler** | **Gap** |

**Issue:** Proposed `generate-design-derivatives` accepts `{ pngBytes }` without `jobId`, session, or validated-path coupling. Unlike `READ_SELECTED_PNG_BYTES`, a standalone generate channel would lack the same trust gates (CPU/memory DoS from repeated large buffers; defense-in-depth).

**Mitigation (Modification 1):** Prefer combined read+generate in session-gated handler. If separate channel is kept for backfill, require explicit `mode: "backfill"` with staff-only orchestration and consider a lower concurrency cap.

### 5.2 Sharp in main process — **Pass**

Correct placement per `docs/SECURITY.md` and `docs/AI_RULES.md`. Renderer does not gain native image processing. Input is bytes only — no new filesystem trust surface for import flow.

### 5.3 Storage rules — **Update required (planned)**

Current `storage.rules` denies all paths except `/originals/{fileName}`. Plan correctly requires staff read/write for `/thumbnails/` and `/previews/` with:

* Canonical filename pattern (`{designId}.webp`)
* `contentType == "image/webp"`
* Size limit

**Addition (Modification 4):** Mirror `isCanonicalOriginalFileName` with `isCanonicalDerivativeFileName` and define explicit WebP max size.

Customer access correctly remains denied until Phase 6.

### 5.4 Derivative generation flow — **Pass**

No main-process Firebase access. No Storage download during import (when IPC design is corrected). Original preservation policy prevents destructive operations.

### 5.5 Download URL resolution — **Pass with caution**

`designStorageUrlService` using `getDownloadURL` is appropriate for staff-only Storage rules. URLs are time-limited tokens.

**Requirements:**

* Do not persist download URLs in Firestore (plan compliant)
* Do not log full URLs with tokens
* Cache with TTL (plan proposes 5–15 min) — acceptable

### 5.6 Batch compatibility — **Pass**

Per-file derivative lifecycle in batch orchestration preserves 3B isolation model. Session cleanup via `finishBatchJob` unchanged. Partial derivative failure does not roll back batch.

### 5.7 Temp directory interactions — **Pass**

Derivatives run on in-memory bytes after validation — no new temp file reads for import flow. ZIP temp cleanup unchanged.

### 5.8 Firestore rules — **Pass**

Staff `update` with `designRequiredFieldsValid` supports path and status updates. No escalation risk.

### 5.9 Security verdict

**Pass with modifications** to IPC gating and Storage rule specificity.

---

## 6. Storage Review

### 6.1 Canonical path usage — **Pass**

Paths remain centralized in `designStoragePaths.ts`. Upload helpers use `designId` generated before any Storage write — consistent with 3A.

### 6.2 Rollback strategy — **Pass**

| Failure | Action | Verdict |
| --- | --- | --- |
| Thumbnail upload fails | No Firestore update; stay `imported` | Correct |
| Preview fails after thumbnail | Delete thumbnail; stay `imported` | Correct |
| `updateDesign` fails after both uploads | Delete both derivatives | Correct |
| Derivative failure | Never delete original | Correct |
| Firestore create fails after original | Delete original (3A pattern) | Unchanged — correct |

### 6.3 Orphan prevention — **Pass**

Partial derivative uploads are rolled back. Orphaned originals without derivatives are acceptable operational state (`imported` filter). Orphaned derivatives without Firestore paths are prevented by upload-then-update ordering with rollback.

### 6.4 Storage rule requirements — **Pass (pending deploy)**

Plan correctly gates QA on `firebase deploy --only storage`. This is **mandatory** — derivative upload will fail against current production rules.

### 6.5 Weaknesses

| Weakness | Severity | Mitigation |
| --- | --- | --- |
| Staff-only thumbnails until Phase 6 | Low | Document Phase 6 rule migration for customer read |
| No cross-object transactional guarantee (Storage + Firestore) | Medium | Existing 3A pattern — best-effort cleanup; acceptable |
| Backfill downloads original then IPC | Medium | Use same session/size caps; staff-only trigger |

### 6.6 Storage verdict

**Pass** — rollback and orphan policies are sound.

---

## 7. Performance Review

### 7.1 Sharp processing — **Pass with monitoring**

`sharp` in main is appropriate for large print PNGs. Plan proposes sequential generation per file within worker slot — correct default.

### 7.2 Memory usage — **Medium risk**

| Scenario | Concern |
| --- | --- |
| Single 50 MB PNG | Main holds buffer; sharp decodes to larger bitmap transiently |
| Batch concurrency 2 | Two files in parallel = 2× decode pressure in main + 2× buffers in renderer if double IPC |

**Mitigation (Modification 5):** Single IPC round-trip per file; consider global main-process mutex for `sharp` (max 1 concurrent decode) independent of `UPLOAD_CONCURRENCY = 2`.

### 7.3 Batch imports — **Pass**

Derivative work inline per file in existing worker slots avoids unbounded pools. Batch report extension for `derivativesReady` / `derivativeFailed` is appropriate.

### 7.4 URL resolution strategy — **Pass**

In-memory TTL cache in `designStorageUrlService` addresses N+1 `getDownloadURL` for grid views. Lazy load on card visibility is appropriate. Plan acknowledges 100-design query limit as existing debt.

### 7.5 WebP generation — **Pass**

Proposed dimensions (320px thumbnail, 1280px preview) and quality (80/85) are reasonable. Typical thumbnail <100 KB target is achievable.

### 7.6 Bottlenecks

| Bottleneck | Severity | Notes |
| --- | --- | --- |
| Double IPC byte transfer (if not fixed) | **High** | Up to 100 MB transferred per file across processes |
| `sharp` native build on Windows | Medium | Document rebuild; verify in CI |
| Sequential Firestore creates in large batches | Low | Acceptable per `import-pipeline-plan.md`; optimize later |
| Grid URL resolution for 100 cards | Low | Cache + lazy load sufficient for 3C |

### 7.7 Performance verdict

**Pass with IPC and concurrency modifications.**

---

## 8. Future Compatibility Review

### 8.1 Phase 4 — Search — **Compatible**

Search indexes title, tags, category, status — not image bytes. Thumbnails improve grid UX but do not affect search architecture. `designStorageUrlService` is orthogonal to search services.

### 8.2 Phase 6 — Queue — **Compatible**

Queue requires `ready` designs with presentation assets. Phase 3C transition to `ready` with populated paths **enables** Phase 6. Staff-only Storage rules in 3C are correct; Phase 6 must add customer read rules for `/thumbnails/` (and possibly `/previews/`) per `docs/SECURITY.md`. Plan documents this deferral.

Default Design Library filter (`ready`) means newly imported designs appear after derivative completion — aligned with queue eligibility.

### 8.3 Phase 7 — AI Processing — **Compatible with documentation**

| Requirement | 3C alignment |
| --- | --- |
| Read `originalPath` from Storage | Preserved — never overwritten |
| `aiProcessed` / `aiReviewed` flags | Preserved at `false` on import |
| No premature `aiMetadata` | Compliant |
| AI vision on full-resolution source | Original PNG unchanged in Storage |

**Conflict to resolve:** `processing` status used for both derivatives (3C) and AI queue (`WORKFLOWS.md` Step 8). Serial lifecycle (`ready` after derivatives, then `processing` for AI in Phase 7) is viable if documented. Phase 7 must not assume `processing` implies missing thumbnails.

### 8.4 Import pipeline parent milestone — **Aligned**

Completing 3C satisfies `import-pipeline-plan.md` Phase 3 exit criteria (originals + derivatives + library presentation).

### 8.5 Future compatibility verdict

**Compatible** — no blocking conflicts.

---

## 9. Risk Assessment

### High

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Double IPC transfer of full PNG buffers** | Memory spikes, slow batch imports, OOM on large files | Modification 1: combine read + generate in single session-gated IPC |
| **Storage rules not deployed before QA** | All derivative uploads fail silently or with permission errors | Step 4 deploy gate; T4 manual test; block signoff without deploy verification |

### Medium

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **`sharp` native module build failure** | App fails to start or IPC errors on Windows | Step 1 kickoff: verify Electron version; document `electron-rebuild`; CI smoke test |
| **`processing` status semantic overlap with Phase 7** | Confusion, incorrect UI filters, AI workflow bugs | Modification 2: WORKFLOWS.md update; Phase 7 plan note |
| **Concurrent sharp + upload (2 workers)** | Main process memory pressure | Modification 5: global sharp concurrency limit |
| **Partial success UX confusion** | Staff thinks import failed when original succeeded | Clear ImportResultPanel / batch summary copy (planned in Steps 7–8) |
| **Standalone generate IPC without session gates** | Defense-in-depth gap | Modification 1 or session coupling on generate |
| **Success criteria wording** | Signoff disagreement | Modification 6: define import vs pipeline success tiers |

### Low

| Risk | Impact | Mitigation |
| --- | --- | --- |
| WebP support in Electron Chromium | None — supported | N/A |
| URL cache staleness after re-upload | Stale image briefly | TTL + invalidate on design update |
| Designs stuck at `imported` without backfill | Manual re-processing needed | Optional Step 12 backfill |
| Filter flash (`imported` → `ready` in same action) | Brief UX flicker | Acceptable; optional `processing` badge |
| `restoreDesign` → `ready` without derivatives | Broken thumbnail | Pre-existing; backfill or validation in future |

---

## 10. Required Modifications

The following modifications must be addressed before or during Step 1 kickoff. No code in this review — implementation guidance only.

### Modification 1 — IPC byte flow (required)

**Problem:** Proposed `generate-design-derivatives` IPC with renderer-supplied `pngBytes` causes double transfer of up to 50 MB per file and bypasses read-handler session gates.

**Required change:** For the import flow, generate derivatives **inside the existing session-gated read path** in main (`readSelectedPngFileBytes` / batch equivalent) and return derivative buffers in the **same IPC response** as original bytes. Keep a separate generate IPC only for optional backfill (Storage-downloaded bytes).

**Update plan sections:** 8.2, 8.4, 11.1, 16.1, Step 3.

### Modification 2 — WORKFLOWS.md `processing` semantics (required)

**Problem:** `docs/WORKFLOWS.md` Step 8 uses `processing` for AI only; 3C uses it for derivatives.

**Required change:** In Step 13 documentation, redefine `processing` as generic background enrichment. Document ordered stages: derivatives (3C) then AI (Phase 7). Add note that Phase 7 re-enters `processing` from `ready`.

### Modification 3 — `markDesignReady` validation (recommended)

**Problem:** Setting `status: "ready"` without populated canonical paths could produce broken library cards.

**Required change:** `markDesignReady` must validate non-empty `thumbnailPath` and `previewPath` via `isCanonicalDesignStoragePath` before setting `ready`. Reject or throw if paths invalid.

### Modification 4 — Storage rules specificity (required)

**Problem:** Plan mentions size limit for WebP paths but does not specify values or filename validation helpers.

**Required change:** Add `isCanonicalDerivativeFileName` (mirror originals pattern), `contentType == "image/webp"`, and explicit max size (recommend 10 MB — derivatives are far smaller than originals). Document in `docs/setup/firebase-storage-setup.md`.

### Modification 5 — Main-process sharp concurrency (required)

**Problem:** `UPLOAD_CONCURRENCY = 2` with separate generate IPC could run two `sharp` decodes concurrently on large PNGs.

**Required change:** Add a main-process concurrency limit of **1** for `sharp` decode/encode (mutex or queue), independent of renderer upload concurrency. Document in Step 3.

### Modification 6 — Success criteria definitions (required)

**Problem:** Section 21 exit criteria conflate "successful import" with "derivatives complete."

**Required change:** Define two outcomes in types, UI, and signoff:

* **Import success:** original uploaded + Firestore `imported` record
* **Pipeline success:** derivatives uploaded + paths set + `ready`

Exit criteria should require pipeline success for signoff **when derivative generation succeeds**; partial import success must be explicitly reported when derivatives fail.

### Modification 7 — Implementation sequence checkpoint (required)

**Problem:** Steps 7–8 integrate derivatives into import UI before Steps 9–10 add library rendering. Staff could complete imports with `ready` designs but still see placeholders until Step 10.

**Required change:** Add explicit testing checkpoint after Step 10 before signoff. Optionally note Steps 9–10 can begin in parallel with Step 7 after Step 5 completes (derivatives in orchestration), but **signoff requires Step 10 complete**.

---

## 11. Implementation Sequence Review

### 11.1 Step order — **Pass with Modification 7**

| Step | Assessment |
| --- | --- |
| 1 Kickoff decisions | Correct — lock constants, sharp, DPI default |
| 2 Constants/types | Correct |
| 3 Main derivative generator | Correct — after Modification 1/5 |
| 4 Storage layer + deploy | Correct — before upload QA |
| 5 Derivative orchestration | Correct |
| 6 Status lifecycle | Correct |
| 7–8 Import integration | Correct |
| 9–10 Library URL + rendering | Correct — required for signoff |
| 11–12 Optional | Correctly optional |
| 13 Documentation | Correct — include WORKFLOWS, SECURITY, FIREBASE |

### 11.2 Missing prerequisites — **Addressed by modifications**

* Sharp/Electron compatibility → Step 1 kickoff (Appendix C item 4)
* Storage deploy → Step 4 gate
* IPC design → Modification 1 before Step 3

### 11.3 Missing testing checkpoints

| Checkpoint | When |
| --- | --- |
| Storage rules deploy verification | After Step 4 (T17.4 in plan) |
| Single-file derivative E2E | After Step 7 |
| Batch derivative E2E | After Step 8 |
| Library rendering E2E | After Step 10 (**signoff gate**) |
| 3A/3B regression | After Steps 7–8 (T9, T10) |

### 11.4 Missing documentation updates

Plan covers `WORKFLOWS.md`, `FIREBASE.md`, `SECURITY.md`, `ROADMAP.md`, setup docs. Add:

* `docs/DATA_MODEL.md` — clarify `processing` usage (if not only in WORKFLOWS)
* `docs/ARCHITECTURE.md` — derivative generator in main process diagram (optional)

---

## 12. Recommendation

### **Approved with modifications**

Phase 3C is the correct final step for the import pipeline milestone. The plan:

* Properly scopes derivative generation and library presentation
* Preserves React → Hooks → Services → Firebase/IPC architecture
* Aligns with the existing data model and Firestore rules
* Correctly requires Storage rule extension and deployment
* Defers AI, queue, and customer catalog appropriately
* Integrates with single and batch import without rewriting 3B

**Approve implementation** after the seven modifications in Section 10 are incorporated into the plan (or recorded in Step 1 kickoff decisions) and Appendix C open decisions are resolved:

1. Thumbnail/preview dimensions and WebP quality — lock constants
2. Use `processing` during derivatives — yes, with WORKFLOWS update (Modification 2)
3. Strict DPI rejection — default off
4. `sharp` version and Electron rebuild — verify before Step 3
5. Backfill — optional Step 12
6. Customer thumbnail read rules — staff-only until Phase 6

**Do not begin Phase 4, Phase 6, or Phase 7 until Phase 3C signoff is recorded.**

---

*Review complete. No application files were modified. No code was written.*
