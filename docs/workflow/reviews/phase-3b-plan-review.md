# Phase 3B Plan Review

## Document status

| Field | Value |
| --- | --- |
| **Reviewed artifact** | `docs/plans/phase-3b-implementation-plan.md` |
| **Review type** | Architecture and security plan review (pre-implementation) |
| **Prerequisite verified** | Phase 3A complete (`docs/reviews/phase-3a-final-signoff.md`) |
| **Review date** | 2026-06-20 |
| **Reviewer** | AI-assisted architecture review |
| **Implementation status** | Not started — review only |

**Reference documents reviewed:**

* `docs/AI_RULES.md`
* `docs/ARCHITECTURE.md`
* `docs/CODING_STANDARDS.md`
* `docs/DATA_MODEL.md`
* `docs/FIREBASE.md`
* `docs/SECURITY.md`
* `docs/ROADMAP.md`
* `docs/STYLE_GUIDE.md`
* `docs/WORKFLOWS.md`
* `docs/plans/phase-3b-implementation-plan.md`
* `docs/plans/import-pipeline-plan.md`
* `docs/setup/electron-security-setup.md`
* Phase 3A implementation (`electron/ipc/import/`, `importOrchestrationService`)

---

## Executive summary

The Phase 3B implementation plan is **architecturally sound**, aligns with Fresh Prints layer boundaries, and correctly extends the proven Phase 3A single-file pipeline into batch sources without placing Firebase or filesystem logic in the wrong layer.

The plan satisfies `docs/ROADMAP.md` Phase 3 objectives for ZIP import and batch processing while appropriately deferring thumbnails, strict DPI rejection, and retry polish to Phase 3C.

**Recommendation:** **Approved with modifications**

Five modifications are required before implementation begins (see Section 8). None block the overall approach; they close gaps in IPC completeness, session security, ZIP disk safety, and internal plan consistency.

---

## 1. Architecture evaluation

### 1.1 Main process responsibilities — **Pass**

The plan correctly assigns to the main process:

* Native dialogs (multi-file, folder, ZIP)
* Recursive folder scanning with root jail
* ZIP extraction with Zip Slip protection
* PNG binary validation (authoritative probe)
* Job orchestration (`importJobRunner`)
* Progress event emission
* Temp directory lifecycle

This matches `docs/ARCHITECTURE.md` (filesystem, ZIP extraction, validation in desktop/Electron layer) and `docs/WORKFLOWS.md` (extract → discover → validate before upload).

The plan correctly forbids Firebase, Firestore, and React in main.

**Note:** `docs/ARCHITECTURE.md` references `src/main/` as the canonical path; the live codebase uses `electron/`. The plan follows the **implemented** layout (`electron/ipc/import/`, `electron/services/import/`). No change required — update `ARCHITECTURE.md` separately if path normalization is desired.

### 1.2 Renderer responsibilities — **Pass**

The plan correctly keeps in the renderer:

* Imports page and batch UI components
* Firebase Storage upload (`importUploadService`)
* Firestore catalog writes (`designService.createDesign`)
* Batch upload queue with concurrency control
* Permission gating (`permissionService.canImportDesigns`)

This matches `docs/FIREBASE.md` (Storage and Firestore in renderer services), `docs/CODING_STANDARDS.md` (no Firebase in components), and Phase 3A patterns.

### 1.3 Service boundaries — **Pass with minor note**

| Boundary | Assessment |
| --- | --- |
| `folderScanner` / `zipExtractor` — discovery only | Correct |
| `importJobRunner` — discover + validate, no Firebase | Correct |
| `importBatchOrchestrationService` — upload queue, no FS | Correct |
| `importOrchestrationService` — per-file upload + create | Correct reuse target |
| `designService` — sole Firestore catalog writer | Correct per `docs/FIREBASE.md` |

**Minor note:** `pngValidator.ts` already exists in `electron/ipc/import/pngValidator.ts` and is used by current 3A handlers. Plan Step 7 ("extract validation core") should be reframed as **extend or relocate existing validator**, not greenfield extraction from `validateSelectedPngFile.ts` (that handler already delegates to `validatePngFile`).

### 1.4 Hook boundaries — **Pass**

`useBatchImport` owning job state, progress merge, cancel `AbortSignal`, and event subscriptions — while delegating ZIP/scan/upload logic to services — follows `docs/AI_RULES.md` and `docs/CODING_STANDARDS.md` hook rules.

Separating `useSinglePngImport` (unchanged 3A UX) from `useBatchImport` (new batch section) prevents state coupling and regression risk.

### 1.5 Reuse of Phase 3A pipeline — **Strong pass**

The plan correctly identifies reuse targets:

| 3A asset | 3B reuse |
| --- | --- |
| `importOrchestrationService.uploadValidatedPng` | Refactor shared per-file helper for batch queue |
| `importUploadService` + Storage rollback | Per-file failure handling |
| `designService.createDesign` | No bypass; per-file create |
| `importFileSession` pattern | Extended to `importBatchSession` |
| `ImportIpcResult<T>` contract | All new invoke handlers |
| Preload allowlist pattern | New channels + event subscriptions |
| `status: "imported"`, empty thumbnail paths | Unchanged catalog contract |

This is the correct incremental extension model endorsed in `docs/reviews/phase-3a-final-signoff.md`.

### 1.6 Architecture gaps (non-blocking)

| Gap | Severity |
| --- | --- |
| `finish-batch-job` IPC mentioned in Steps 9 and ZIP cleanup but **missing** from Section 3.2 channel table | Medium — must add before coding |
| Dual session (`importFileSession` + `importBatchSession`) interaction not specified | Medium — see Modification 4 |
| `read-selected-png-bytes` currently checks only `importFileSession` + `isValidatedImportFilePath` | Expected — batch extension required in plan Step 2 |

---

## 2. Security evaluation

### 2.1 IPC exposure — **Pass with modification**

**Strengths:**

* Invoke for commands, push events for progress — appropriate split
* No large buffers in progress events
* `ImportIpcResult<T>` error contract preserved
* Job ownership tied to `webContents.id` — good isolation
* Extends 3A allowlist pattern from `docs/setup/electron-security-setup.md`

**Concern:**

`StartBatchDiscoveryRequest` accepts `folderPath` and `zipFilePath` from the renderer. Per `docs/SECURITY.md` ("Never trust renderer input"), these paths must be **session-registered at dialog time**, not passed as trusted strings from React state alone.

Multi-select `filePaths` are correctly described as "session-registered on pick." Folder and ZIP paths need the same guarantee.

**Required:** Register folder root and ZIP source path in `importBatchSession` (or a dialog registry) when the native dialog returns; `start-batch-discovery` must reject paths not in that registry.

### 2.2 Filesystem access — **Pass**

* All paths from native dialogs only
* Folder root jail with Windows case-insensitive check
* Symlink skip by default
* Ignore list for `.git`, `node_modules`, system folders
* Staff UI shows `displayName` / relative path, not customer-facing full paths

Aligns with `docs/SECURITY.md` Filesystem Security and Phase 3A session model.

### 2.3 ZIP extraction safety — **Pass with modification**

Zip Slip checklist in the plan is complete and matches `docs/WORKFLOWS.md` Step 2 requirements:

1. Reject absolute paths
2. Reject `..` segments
3. `path.resolve` jail to temp root
4. Extract `.png` only

**Additional requirement (Modification 5):** Archive size limit (`200 MB`) does not cap **extracted** disk usage. A 200 MB ZIP could decompress to multiple gigabytes. Add `MAX_EXTRACTED_BYTES` or cumulative extracted-size guard during extraction, not only `MAX_ZIP_SIZE_BYTES`.

`MAX_ZIP_ENTRIES` (500) and optional compression ratio check are appropriate zip-bomb mitigations.

### 2.4 Session path validation — **Pass with modification**

Extending `importFileSession` to job-scoped `importBatchSession` is the correct 3A evolution.

Current 3A handler pattern (`validateFilePathInput` → `isRegisteredImportFilePath` → `isValidatedImportFilePath` for byte read) must be extended so batch-validated paths registered during `importJobRunner` satisfy byte-read checks without going through the single-file `markImportFileValidated` IPC path.

**Required:** Unified read-path gate: allow if `(single-file session validated)` OR `(batch session validated for jobId)`.

### 2.5 Temp directory cleanup — **Pass**

Retain temp dir until upload completes, then delete via `finish-batch-job` — correct security and operational choice. Avoids holding up to 100 × 50 MB in renderer memory.

**Required (Modification 3):** Mandate `finishBatchJob` on **all** exit paths: success, cancel, fatal error, and window-close / `beforeunload` best-effort cleanup.

Stale-dir cleanup on app start (optional housekeeping) is a good low-likelihood leak mitigation.

### 2.6 Upload protections — **Pass**

* `permissionService.canImportDesigns` in UI
* `storage.rules`: staff-only, `image/png`, `< 50 MB` (`storage.rules` line 24)
* `designService.createDesign` service-layer permission checks
* No Admin SDK in renderer

Defense in depth per `docs/SECURITY.md`.

---

## 3. Performance evaluation

### 3.1 100 file batch limit — **Appropriate**

| Factor | Assessment |
| --- | --- |
| `designService.DEFAULT_LIST_LIMIT = 100` | Batch cap aligns with current library fetch limit |
| Truncation warning | Correct UX when cap hit |
| Risk | Staff importing 100 designs may not see all in library without pagination — plan documents this as **High** risk |

**Confirm** the 100-file cap for 3B. Document in UI when truncated. Pagination remains Phase 2B/4 follow-up per `docs/reviews/phase-2b-signoff.md`.

### 3.2 200 MB ZIP limit — **Appropriate with caveat**

Reasonable guard for upload time and extraction duration on desktop.

**Caveat:** Compressed size ≠ extracted size. Requires extracted-size guard (Modification 5). Suggested `MAX_EXTRACTED_BYTES`: **500 MB** or `MAX_BATCH_FILES × MAX_SINGLE_PNG_SIZE_BYTES` (whichever is smaller during extraction).

### 3.3 50 MB PNG limit — **Required — no change**

Matches:

* `shared/constants/importValidation.constants.ts` (`MAX_SINGLE_PNG_SIZE_BYTES`)
* `storage.rules` (`request.resource.size < 50 * 1024 * 1024`)
* `docs/SECURITY.md` staff upload limits

Rejecting at validation (main) before IPC byte transfer is correct.

### 3.4 2-upload concurrency — **Appropriate**

| Factor | Assessment |
| --- | --- |
| Peak renderer memory | ~2 × 50 MB buffers = ~100 MB max in flight |
| Storage throughput | Modest parallelism avoids rule thrashing |
| IPC | One read-bytes per file; no duplicate path reads |
| Firestore | Sequential per-file create — acceptable per `docs/FIREBASE.md` |

Sequential validation in main (`VALIDATION_CONCURRENCY = 1`) correctly prioritizes memory safety over scan speed for 3B.

Progress throttle (10/sec) and optional list virtualization at 50+ rows are sensible.

---

## 4. Batch lifecycle evaluation

### 4.1 Discovery — **Pass**

| Source | Main action | Assessment |
| --- | --- | --- |
| `files` | Multi-select paths, verify registration | Correct |
| `folder` | `folderScanner.scan` | Correct |
| `zip` | `zipExtractor.extract` → temp paths | Correct |

Deterministic sort, skip vs reject distinction, and `MAX_FOLDER_SCAN_ENTRIES` (10,000) guard are well specified.

### 4.2 Validation — **Pass**

Main-process authoritative validation reuses 3A rules:

* Extension + magic bytes + dimensions + DPI warnings
* No hard DPI reject in 3B (consistent with 3A and plan scope)
* Rejected files excluded from session registration

Aligns with `docs/WORKFLOWS.md` validation requirements while respecting 3A-2 warning-only policy.

### 4.3 Upload — **Pass**

Renderer queue with concurrency 2, `readSelectedPngFileBytes` per file, `uploadOriginalPng` — mirrors proven 3A path.

### 4.4 Firestore create — **Pass**

Per-file `designService.createDesign` with `status: "imported"` — correct per `docs/DATA_MODEL.md` and `docs/FIREBASE.md`.

No batch Firestore writes in 3B — correct tradeoff for error isolation.

### 4.5 Reporting — **Pass**

`BatchImportFinalReport` assembled in renderer from manifest + upload outcomes. Per-file rows with skipped / rejected / failed / imported distinction matches `docs/plans/import-pipeline-plan.md` Section 7.

Link to Design Library `?status=imported` reuses 3A UX.

### 4.6 Cleanup — **Pass with modification**

**Correct final strategy:** retain ZIP temp dir until upload completes → `finishBatchJob` → delete temp + clear batch session.

**Plan internal inconsistency:** Section 5.3 first states cleanup in `finally` before upload, then revises to retain until upload. Implementation must follow the **revised** strategy only. Update plan Section 5.3 to remove the contradictory `finally` block (documentation fix).

| Cleanup trigger | Action |
| --- | --- |
| Job success | `finishBatchJob` |
| Cancel | `finishBatchJob` after partial upload |
| Fatal discovery error | Delete temp immediately in main |
| App crash | Stale-dir cleanup on next start |

---

## 5. Failure handling evaluation

### 5.1 Per-file failures — **Pass**

| Failure | Storage | Firestore | UI outcome |
| --- | --- | --- | --- |
| Validation | None | None | `rejected` |
| Read bytes | None | None | `failed` |
| Upload | Partial → delete if allocated | None | `failed` |
| Create | Rollback delete (3A) | None | `failed` + cleanup warning |
| Cancel | In-flight completes; rollback if needed | None | `cancelled` |

Matches Phase 3A `ImportOrchestrationError` + orphan cleanup pattern.

### 5.2 Partial batch failures — **Pass**

Partial success banner, no rollback of successful imports, staff can verify in library — correct operational model for batch imports.

### 5.3 Storage rollback — **Pass**

Reuses `importUploadService.deleteOriginalPng(designId)` from 3A. Surfaces `cleanupWarning` when delete fails — do not swallow.

### 5.4 Firestore rollback — **Pass**

Firestore failure → Storage delete, no document. Never create document without successful upload. Never auto-delete Firestore on cancel.

Correct per `docs/FIREBASE.md` orphan prevention and 3A implementation.

### 5.5 Retry strategy — **Acceptable gap (3C)**

No per-file retry in 3B. Plan defers to 3C (`import-pipeline-plan.md` Section 8.4). Acceptable for MVP batch import; note in UI copy that staff must re-run import for failed files.

---

## 6. Open decisions — confirm or reject

| Decision | Verdict | Rationale |
| --- | --- | --- |
| **100 file batch limit** | **Confirm** | Aligns with `designService.DEFAULT_LIST_LIMIT = 100`; truncation UX required |
| **200 MB ZIP limit** | **Confirm** | Reasonable desktop guard; pair with extracted-size limit (Modification 5) |
| **50 MB PNG limit** | **Confirm** | Matches `storage.rules` and existing constants — non-negotiable |
| **2 concurrent uploads** | **Confirm** | Balances throughput and ~100 MB peak renderer memory |
| **Delete temp ZIP contents immediately after successful processing** | **Reject (immediate delete after validation)** | Would force full in-memory retention or break upload-from-temp paths |
| **Delete temp after batch upload completes** | **Confirm** | Via `finishBatchJob` IPC — correct approach in plan's revised Section 5.3 |

---

## 7. Risks

### 7.1 High

| Risk | Description | Mitigation in plan |
| --- | --- | --- |
| **Library visibility after large batch** | `useDesigns` / `listDesigns` default limit 100 may hide older records after importing up to 100 designs | Cap batch at 100; truncation warning; pagination follow-up |
| **Extracted ZIP disk exhaustion** | 200 MB archive limit does not bound extracted bytes | **Add Modification 5** — not fully mitigated in current plan |

### 7.2 Medium

| Risk | Description | Mitigation in plan |
| --- | --- | --- |
| **Zip Slip / path traversal** | Malicious ZIP entries | Entry normalization, temp root jail, unit tests |
| **ZIP bomb** | Entry count / compression attacks | `MAX_ZIP_ENTRIES`, optional ratio check |
| **Memory pressure** | Large PNG buffers in renderer | 50 MB cap, concurrency 2, no batch previews |
| **IPC buffer limits** | Full-file read over IPC | Size cap before read; clear errors |
| **Partial Storage orphans** | Rollback delete fails | `cleanupWarning` per file (3A pattern) |
| **Cancel race** | In-flight upload during cancel | Complete in-flight; one `designId` per file |
| **Dialog path trust** | Renderer-supplied folder/ZIP paths | **Add Modification 2** |
| **Dual session confusion** | Single + batch sessions overlap | **Add Modification 4** |

### 7.3 Low

| Risk | Description | Mitigation in plan |
| --- | --- | --- |
| **Temp dir leak on crash** | Orphan temp folders | Stale cleanup on app start |
| **Windows path casing** | Root jail bypass | Case-insensitive prefix check |
| **Symlink escape** | Read outside folder root | Skip symlinks |
| **ZIP library maintenance** | Dependency CVEs | Streaming lib, pin version, justify in PR |
| **Plan/doc drift** | `WORKFLOWS.md` ZIP flow shows thumbnails before upload | Update WORKFLOWS during implementation (plan Section 11) |

---

## 8. Recommendation

### Verdict: **Approved with modifications**

The Phase 3B plan is ready to implement after the following modifications are applied to `docs/plans/phase-3b-implementation-plan.md` (or tracked as implementation constraints).

### Required modifications

#### Modification 1 — Complete IPC channel table

Add to Section 3.2:

| Channel | Purpose |
| --- | --- |
| `fresh-prints:import:finish-batch-job` | Renderer signals upload phase complete; main deletes temp dir and clears `importBatchSession` |

Include in preload API, allowlist, `FreshPrintsImportsApi`, and implementation Step 8/9.

#### Modification 2 — Dialog-origin path registration

For `start-batch-discovery`:

* Register `folderPath` when `select-import-folder` returns
* Register `zipFilePath` when `select-import-zip` returns
* Register all multi-select paths when `select-multiple-png` returns
* Reject `start-batch-discovery` if supplied paths are not in the dialog registry for the active window

Do not trust renderer-originated path strings without main-process registration.

#### Modification 3 — Single temp cleanup strategy in plan text

Remove the contradictory "cleanup in `finally` before upload" block from Section 5.3. Document one strategy only:

```txt
Retain temp dir through upload phase → finishBatchJob → delete temp + clear session
```

Require `finishBatchJob` on success, cancel, and fatal upload-phase abandonment.

#### Modification 4 — Session mutual exclusion

Specify one of:

* **Option A (recommended):** Block `start-batch-discovery` while `importFileSession` has an active single-file selection; block single-file pickers while a batch job is `running`
* **Option B:** Unified session registry with scope (`single` \| `batch:{jobId}`)

Prevent `read-selected-png-bytes` ambiguity between sessions.

#### Modification 5 — Extracted-size limit for ZIP

Add constant, e.g. `MAX_EXTRACTED_BYTES` (recommended: **500 MB** or `MAX_BATCH_FILES × MAX_SINGLE_PNG_SIZE_BYTES`), enforced cumulatively during extraction. Abort job with `batch-job-error` if exceeded.

### Recommended (non-blocking) improvements

| Item | Action |
| --- | --- |
| Plan Step 7 | Reframe as extend existing `pngValidator.ts`, not extract from removed handler |
| Event channel allowlist | Add push channels to `importIpcChannels.ts` with `isAllowedImportEventChannel` mirror of invoke allowlist |
| `MAX_ZIP_COMPRESSION_RATIO` | Promote from optional to recommended for 3B |
| List virtualization | Make required (not optional) when `MAX_BATCH_FILES = 100` |
| `WORKFLOWS.md` | Update ZIP section to reflect 3B scope (no thumbnails until 3C) |

### What does not require modification

* Layer split (main discover/validate, renderer upload/create)
* Phase 3A single-file UX preservation
* Per-file Firestore create (no batch writes)
* Skipped vs rejected semantics
* Progress merge in `useBatchImport`
* 14-step implementation sequence (sound ordering)
* Security test requirements (Zip Slip, path jail unit tests)
* Documentation update list (Section 11)

---

## 9. Alignment checklist

| Source document | Alignment |
| --- | --- |
| `docs/AI_RULES.md` | Feature folder, service/hook boundaries, no App.tsx logic |
| `docs/ARCHITECTURE.md` | Electron main vs renderer split (path naming differs) |
| `docs/CODING_STANDARDS.md` | Services own workflows; hooks coordinate |
| `docs/DATA_MODEL.md` | `status: "imported"`; no new fields required |
| `docs/FIREBASE.md` | Renderer Storage + Firestore; no Admin SDK |
| `docs/SECURITY.md` | Session paths, IPC validation, 50 MB limit |
| `docs/ROADMAP.md` | Phase 3 ZIP + validation toward automation |
| `docs/WORKFLOWS.md` | ZIP flow directionally aligned; thumbnails deferred |
| `docs/STYLE_GUIDE.md` | Shared components, theme support referenced |
| Phase 3A signoff | Reuse foundation explicitly honored |

---

## 10. Pre-implementation gate

Before writing code:

- [ ] Apply Modifications 1–5 to the plan (or open tracking issues with same constraints)
- [ ] Confirm `MAX_EXTRACTED_BYTES` value with product/ops
- [ ] Confirm no conflicting single-file import session during batch job
- [ ] Verify `storage.rules` deployed to target Firebase project (3A prerequisite)

After implementation:

- [ ] Execute plan Section 12 verification checklist
- [ ] Create `docs/reviews/phase-3b-signoff.md`
- [ ] Update `docs/WORKFLOWS.md`, `docs/SECURITY.md`, `docs/setup/electron-security-setup.md`

---

*Review only. No implementation code included.*
