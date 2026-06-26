# Electron Security Setup

## Purpose

This guide documents the Electron security model for **Fresh Prints Studio**.

It explains how the main process, preload bridge, and renderer are isolated, which APIs are safe to expose, and how to add new IPC methods without reintroducing unsafe patterns.

Phase 3A-1 hardened the preload bridge by removing broad `ipcRenderer` exposure and replacing it with a scoped `window.freshPrints.imports` API.

---

## Prerequisites

Before working on Electron security or import IPC:

1. Read `docs/standards/SECURITY.md` — Electron Security, IPC Security, Preload Security
2. Read `docs/architecture/ARCHITECTURE.md` — Desktop architecture and layer boundaries
3. Read `docs/workflow/plans/phase-3a-kickoff.md` — Phase 3A locked decisions

---

## Security Model Overview

```txt
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React)                                           │
│  - No Node.js                                               │
│  - No filesystem                                            │
│  - window.freshPrints.imports only                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ contextBridge (isolated)
┌───────────────────────────▼─────────────────────────────────┐
│  Preload (electron/preload.ts)                                │
│  - Allowlisted ipcRenderer.invoke calls only                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ IPC
┌───────────────────────────▼─────────────────────────────────┐
│  Main process (electron/main.ts + electron/ipc/)              │
│  - Filesystem, dialogs, validation (future)                   │
│  - Input validation on every handler                          │
└───────────────────────────────────────────────────────────────┘
```

---

## Required BrowserWindow Settings

These settings are **required** and must not be disabled.

| Setting | Value | Location |
| --- | --- | --- |
| `contextIsolation` | `true` | `electron/main.ts` → `webPreferences` |
| `nodeIntegration` | `false` | `electron/main.ts` → `webPreferences` |
| `preload` | `dist-electron/preload.mjs` | Built from `electron/preload.ts` |

```ts
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  preload: path.join(__dirname, 'preload.mjs'),
}
```

### Why these matter

* **`contextIsolation: true`** — Renderer JavaScript runs in an isolated world. Preload can expose only explicitly bridged APIs.
* **`nodeIntegration: false`** — Renderer cannot `require('fs')`, `require('child_process')`, or access other Node APIs directly.

---

## Safe Preload Bridge

### Allowed pattern

Expose a **narrow namespace** with named methods:

```ts
contextBridge.exposeInMainWorld('freshPrints', {
  imports: {
    selectSinglePngFile() { ... },
    validateSelectedPngFile(filePath) { ... },
  },
})
```

Renderer usage:

```ts
const result = await window.freshPrints.imports.selectSinglePngFile();
```

### Forbidden pattern (removed in Phase 3A-1)

```ts
// NEVER expose this
contextBridge.exposeInMainWorld('ipcRenderer', {
  on, off, send, invoke,
})
```

---

## Why Raw `ipcRenderer` Is Unsafe

Exposing `window.ipcRenderer` with unrestricted `invoke`, `send`, and `on` allows the renderer to:

1. **Call any IPC channel** — including channels added later for destructive operations
2. **Bypass intentional API boundaries** — business logic cannot be constrained to validated entry points
3. **Amplify XSS impact** — if renderer content is ever compromised, attackers gain full IPC access
4. **Hide security review surface** — channel usage is scattered instead of centralized in preload

Fresh Prints previously exposed broad `ipcRenderer` and a test `main-process-message` listener in `src/main.tsx`. Phase 3A-1 removed both.

---

## Allowed Import APIs (Phase 3A)

Namespace: `window.freshPrints.imports`

### Single-file import (Phase 3A — implemented)

| Method | IPC channel | Behavior |
| --- | --- | --- |
| `selectSinglePngFile()` | `fresh-prints:import:select-single-png` | Opens native PNG file picker; returns metadata only |
| `validateSelectedPngFile(filePath)` | `fresh-prints:import:validate-selected-png` | Validates PNG structure, dimensions, DPI warnings |
| `readSelectedPngFileBytes(filePath)` | `fresh-prints:import:read-selected-png-bytes` | Reads bytes for upload; path must be session-validated |
| `readSelectedPngFileBytes({ filePath, includeDerivatives: true })` | same channel | Single IPC round-trip: original + thumbnail/preview WebP bytes (Phase 3C Step 4) |
| `readSelectedPngFileBytes({ jobId, filePath, includeDerivatives?: boolean })` | same channel | Batch session-gated read; optional derivatives in same response |
| `getSelectedPngPreview(filePath)` | `fresh-prints:import:get-selected-png-preview` | Returns resized data URL for validation preview UI |

### Batch import (Phase 3B — Step 2)

Invoke methods:

| Method | IPC channel | Current behavior |
| --- | --- | --- |
| `selectMultiplePngFiles()` | `fresh-prints:import:select-multiple-png` | Multi-select PNG dialog; registers session in main; returns `jobId`, `fileNames`, `fileCount` |
| `selectImportFolder()` | `fresh-prints:import:select-import-folder` | Folder dialog; registers session in main; returns `jobId`, `folderName` |
| `selectImportZip()` | `fresh-prints:import:select-import-zip` | ZIP dialog; enforces `MAX_ZIP_SIZE_BYTES` cap; registers session in main |
| `startBatchDiscovery(request)` | `fresh-prints:import:start-batch-discovery` | Validates session, delegates to `importJobRunner`, emits progress + complete events for all source types |
| `cancelBatchJob(request)` | `fresh-prints:import:cancel-batch-job` | Clears active batch session |
| `finishBatchJob(request)` | `fresh-prints:import:finish-batch-job` | Clears active batch session; deletes ZIP job temp dir when present (`tempDirDeleted`) |

**Session rules (Step 2):**

* Only one active batch session app-wide (`selected` or `discovering` status).
* Single PNG import is blocked while a batch session is active, and vice versa.
* `startBatchDiscovery` accepts only `jobId` and `sourceType` — file paths are read from the main-process session registry, not trusted from the renderer.
* Picker responses expose display metadata only (`fileNames`, `folderName`, `fileName`); full paths stay in main.

**Error code:** `SESSION_CONFLICT` when overlapping import modes are attempted.

Event subscriptions (allowlisted; unsubscribe function returned):

| Method | Event channel | Purpose |
| --- | --- | --- |
| `onBatchProgress(callback)` | `fresh-prints:import:batch-progress` | Discovery / validation progress |
| `onBatchDiscoveryComplete(callback)` | `fresh-prints:import:batch-discovery-complete` | File manifest after discovery |
| `onBatchJobError(callback)` | `fresh-prints:import:batch-job-error` | Fatal batch job errors |

Event channels are defined in `IMPORT_IPC_EVENT_CHANNELS` and validated by `isAllowedImportIpcEventChannel`. The preload does **not** expose generic `ipcRenderer.on`.

Shared batch types and limits:

```txt
shared/types/import/batchImport.types.ts
shared/constants/import/batchImportLimits.constants.ts
shared/constants/import/importTemp.constants.ts
```

**Temp directory rules (Step 5):**

* ZIP job temp dirs live under `{osTemp}/fresh-prints-imports/{jobId}/` in the main process only
* `createJobTempDir` / `deleteJobTempDir` validate UUID job IDs and jail paths inside the import temp root
* Symlinked job temp directories are rejected for delete operations
* ZIP extraction uses `yauzl` streaming in main with Zip Slip protection, entry limits, and compression ratio guards
* `finishBatchJob` attempts safe per-job temp cleanup; renderer never receives temp paths in Step 6

### Response shape

All import IPC methods return structured results:

```ts
type ImportIpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };
```

Handlers must **not** throw raw errors to the renderer.

---

## Forbidden Renderer Access

The renderer must **never**:

| Forbidden | Reason |
| --- | --- |
| `window.ipcRenderer` | Unrestricted IPC |
| `require('fs')` | Filesystem access (blocked by `nodeIntegration: false`) |
| `require('electron')` | Direct Electron APIs in renderer |
| Arbitrary local file paths executed without main validation | Path traversal risk |
| Shell / child process APIs | Command execution risk |
| Raw Node APIs | Violates architecture |

Filesystem work belongs in the **main process** only.

---

## IPC Channel Constants

Channels are centralized in:

```txt
electron/ipc/import/importIpcChannels.ts
```

Current invoke constants:

```ts
IMPORT_SELECT_SINGLE_PNG = 'fresh-prints:import:select-single-png'
IMPORT_VALIDATE_SELECTED_PNG = 'fresh-prints:import:validate-selected-png'
IMPORT_READ_SELECTED_PNG_BYTES = 'fresh-prints:import:read-selected-png-bytes'
IMPORT_GET_SELECTED_PNG_PREVIEW = 'fresh-prints:import:get-selected-png-preview'
IMPORT_SELECT_MULTIPLE_PNG = 'fresh-prints:import:select-multiple-png'
IMPORT_SELECT_IMPORT_FOLDER = 'fresh-prints:import:select-import-folder'
IMPORT_SELECT_IMPORT_ZIP = 'fresh-prints:import:select-import-zip'
IMPORT_START_BATCH_DISCOVERY = 'fresh-prints:import:start-batch-discovery'
IMPORT_CANCEL_BATCH_JOB = 'fresh-prints:import:cancel-batch-job'
IMPORT_FINISH_BATCH_JOB = 'fresh-prints:import:finish-batch-job'
```

Current event constants (`IMPORT_IPC_EVENT_CHANNELS`):

```ts
IMPORT_BATCH_PROGRESS = 'fresh-prints:import:batch-progress'
IMPORT_BATCH_DISCOVERY_COMPLETE = 'fresh-prints:import:batch-discovery-complete'
IMPORT_BATCH_JOB_ERROR = 'fresh-prints:import:batch-job-error'
```

**Rules:**

* Never use ad-hoc string channels in components or services
* Prefix channels with `fresh-prints:` for namespacing
* Add new invoke channels to `IMPORT_IPC_CHANNELS` and `isAllowedImportIpcChannel`
* Add new event channels to `IMPORT_IPC_EVENT_CHANNELS` and `isAllowedImportIpcEventChannel`

Shared request/response types live in:

```txt
shared/types/import/importIpc.types.ts
```

Window typings live in:

```txt
electron/electron-env.d.ts
```

---

## How To Add Future IPC Methods Safely

Follow this sequence for every new capability:

### Step 1: Define types

Add request/response types to `shared/types/import/importIpc.types.ts`.

### Step 2: Add channel constant

Add a named constant to `electron/ipc/import/importIpcChannels.ts` and include it in `IMPORT_IPC_CHANNELS` / `isAllowedImportIpcChannel`.

### Step 3: Implement main handler

In `electron/ipc/import/importIpcHandlers.ts` (or a focused handler module):

1. **Validate** all inputs (type, shape, path safety)
2. **Authorize** — confirm operation is allowed (future: staff session checks if needed)
3. **Execute** — perform filesystem or dialog work in main only
4. **Return** structured `ImportIpcResult` — never throw to renderer

### Step 4: Expose preload method

Add one named method under `window.freshPrints.imports` that calls only the new allowlisted channel via `invokeImportChannel`.

### Step 5: Update typings

Extend `FreshPrintsImportsApi` in shared types and verify `electron/electron-env.d.ts` still resolves.

### Step 6: Document and verify

* Update this guide if security surface changes
* Grep renderer for `ipcRenderer` — must return zero matches
* Test in DevTools that only `window.freshPrints` is exposed

---

## File Locations

```txt
electron/
├── main.ts                              # Registers IPC handlers on app ready
├── preload.ts                           # contextBridge → window.freshPrints
├── electron-env.d.ts                    # Window type definitions
└── ipc/import/
    ├── importIpcChannels.ts             # Channel constants + allowlist
    ├── importIpcHandlers.ts               # Main process handlers
    └── importIpcResponse.ts               # Structured response helpers

shared/types/import/
└── importIpc.types.ts                   # Shared IPC DTOs and API types
```

---

## Verification Steps

### 1. Confirm app starts

```bash
npm run dev
```

The desktop window should load without preload errors.

### 2. Inspect preload API in DevTools

1. Open the app
2. Open DevTools (`Ctrl+Shift+I` / `Cmd+Option+I`)
3. In the **Console**, run:

```js
window.freshPrints
window.freshPrints.imports
window.freshPrints.imports.selectSinglePngFile
window.freshPrints.imports.validateSelectedPngFile
```

Expected:

* `window.freshPrints` is defined with an `imports` object
* Both methods are functions

### 3. Confirm unsafe globals are gone

In DevTools Console:

```js
window.ipcRenderer
```

Expected: `undefined`

### 4. Test IPC responses (Phase 3A-2)

```js
const selection = await window.freshPrints.imports.selectSinglePngFile()
// canceled: { success: true, data: { canceled: true } }
// selected: { success: true, data: { canceled: false, file: { filePath, fileName, ... } } }

await window.freshPrints.imports.validateSelectedPngFile('/bad/../path')
// → { success: false, error: { code: 'INVALID_INPUT', ... } }

// After selecting and validating a file:
await window.freshPrints.imports.readSelectedPngFileBytes(selection.data.file.filePath)
await window.freshPrints.imports.getSelectedPngPreview(selection.data.file.filePath)
// → { success: true, data: { dataUrl, previewWidth, previewHeight } }
```

`validateSelectedPngFile`, `readSelectedPngFileBytes`, and `getSelectedPngPreview` only accept paths registered by the most recent `selectSinglePngFile` call. The latter two additionally require successful validation in the same session.

### 5. Grep for forbidden patterns

```bash
rg "window\.ipcRenderer|exposeInMainWorld\(['\"]ipcRenderer" src electron
```

Expected: no matches in application source.

---

## Common Mistakes

| Mistake | Consequence |
| --- | --- |
| Re-exposing `ipcRenderer` for convenience | Full IPC bypass |
| Adding channels without preload allowlist | Dead code or inconsistent security |
| Throwing errors from `ipcMain.handle` | Unhandled promise rejections in renderer |
| Trusting renderer-supplied paths without validation | Path traversal |
| Enabling `nodeIntegration` in renderer | Direct filesystem / process access |
| Skipping structured error responses | Poor UX and harder debugging |

---

## Completion Checklist

Phase 3A-1 Electron security:

- [ ] `contextIsolation: true` in `electron/main.ts`
- [ ] `nodeIntegration: false` in `electron/main.ts`
- [ ] No `window.ipcRenderer` exposure in preload
- [ ] `window.freshPrints.imports` exposed with typed methods
- [ ] IPC channels centralized in `importIpcChannels.ts`
- [ ] Handlers return structured success/error responses
- [ ] Test `main-process-message` IPC removed from main and renderer
- [ ] `docs/workflow/setup/electron-security-setup.md` reviewed after changes

---

## Native dependencies — `sharp` (Phase 3C)

Phase 3C uses [`sharp`](https://sharp.pixelplumbing.com/) in the **Electron main process** for WebP thumbnail and preview generation.

| Field | Value |
| --- | --- |
| **Package** | `sharp@0.33.5` |
| **Electron target** | `30.0.1` |
| **Why 0.33.5** | Stable release with prebuilt binaries for Node 20 / Windows x64; avoids custom compile on typical dev machines |
| **Rebuild** | Run `npx @electron/rebuild -f -w sharp` after install or Electron upgrades if native load fails |
| **Usage rule** | Import `sharp` only in `electron/services/import/` — never in renderer |

Verify after install:

```bash
node -e "import('sharp').then(m => console.log(m.default.versions.sharp))"
```

### Dev verification (Phase 3C Step 3)

In development (`!app.isPackaged`), the main process runs `verifyDerivativeGenerationInMainProcess()` on startup and logs `[Phase 3C] Derivative verification passed` or `failed`.

Optional manual re-check from renderer DevTools (dev builds only):

```js
await window.freshPrints.imports.verifyDerivativeGeneration()
```

IPC channel: `fresh-prints:import:verify-derivative-generation` — registered only in dev; uses embedded fixtures (no renderer-supplied bytes).

### Read with derivatives (Phase 3C Step 4)

DevTools manual check after selecting and validating a PNG:

```js
// Original bytes only (existing behavior)
await window.freshPrints.imports.readSelectedPngFileBytes(filePath)

// Original + derivatives in one round-trip
await window.freshPrints.imports.readSelectedPngFileBytes({ filePath, includeDerivatives: true })
```

Expect `data.derivatives.thumbnailBytes`, `data.derivatives.previewBytes`, and metadata on success. If generation fails, expect `data.derivativeError` with original `data.bytes` still present.

---

*References: `docs/standards/SECURITY.md`, `docs/architecture/ARCHITECTURE.md`, `docs/workflow/plans/phase-3a-kickoff.md`, `docs/workflow/plans/import-pipeline-plan.md`, `docs/workflow/plans/phase-3c-kickoff.md`*
