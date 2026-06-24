# Phase 3B Step 4 — Event Emission Audit

## Purpose

Verify batch discovery progress and completion events are not duplicated during folder or multiple-PNG discovery.

**Date:** 2026-06-22  
**Scope:** Step 4 stabilization only. Step 5 not started.

---

## Investigation Summary

### A) Main-process emission (bugs found and fixed)

| Issue | Location | Effect | Fix |
| --- | --- | --- | --- |
| Redundant post-scan progress | `folderBatchDiscovery.ts` | After scan, a final `discovering` event repeated the last scan callback state (e.g. `discovering 0` on empty folders, `discovering N` when scan already emitted `N`) | Removed post-scan `discovering` emit; transition goes directly to validation or `emitDiscoveryFinished` |
| Double validation progress | `folderBatchDiscovery.ts`, `multiplePngBatchDiscovery.ts` | Each file emitted **running** then **success/rejected** (2 events per file) | One progress event per file after validation completes |
| Identical consecutive progress | All discovery runners | Same payload could be sent twice in edge cases | Per-job `createDiscoveryProgressEmitter()` deduplicates identical consecutive payloads |

### B) Listener-side behavior (not a code bug)

| Check | Result |
| --- | --- |
| `preload.ts` `subscribeImportEvent` | Single `ipcRenderer.on` per subscription; returns `removeListener` unsubscribe |
| Duplicate preload wrappers | None — one `contextBridge.exposeInMainWorld` |
| Renderer hooks using batch events | None yet (DevTools manual testing only) |
| `registerImportIpcHandlers()` | Called once on `app.whenReady()`; Electron replaces handlers on re-register |

**DevTools testing pitfall:** Running a subscription snippet multiple times without calling the returned unsubscribe function stacks listeners. That produces an exact **2×** duplicate pattern across all events (e.g. `discovering 0` twice, `complete` twice). Four validation logs for one file = 2 emissions × 2 listeners.

**Terminal events:** `emitDiscoveryFinished` intentionally emits:

1. One `batch-progress` event with `phase: "complete"`
2. One `batch-discovery-complete` event

These are different channels. Logging both as `"complete"` is expected to show two terminal signals per job with a single listener.

---

## Expected Event Counts (single listener, 3 PNG folder)

| Phase | Progress events (`onBatchProgress`) | Complete events (`onBatchDiscoveryComplete`) |
| --- | --- | --- |
| Discovering | `1 + N` where `N` = filesystem entries scanned (unique scan states) | `0` |
| Validating | `3` (one per PNG) | `0` |
| Terminal | `1` (`phase: "complete"`) | `1` |

**Total per job:** `5 + N` progress events, `1` discovery-complete event.

For multiple-PNG with 3 files: `1` discovering + `3` validating + `1` complete progress + `1` discovery-complete = **6** progress, **1** complete.

---

## Manual Verification Script

Use one subscription block per test. Always unsubscribe before re-running.

```javascript
const counts = {
  progress: 0,
  complete: 0,
  error: 0,
  byPhase: {},
};

const unsubProgress = window.freshPrints.imports.onBatchProgress((event) => {
  counts.progress += 1;
  counts.byPhase[event.phase] = (counts.byPhase[event.phase] ?? 0) + 1;
  console.log("progress", event.phase, event.fileIndex, event.message ?? "");
});

const unsubComplete = window.freshPrints.imports.onBatchDiscoveryComplete(() => {
  counts.complete += 1;
  console.log("discovery-complete");
});

const unsubError = window.freshPrints.imports.onBatchJobError(() => {
  counts.error += 1;
  console.log("job-error");
});

// Run test A/B/C/D here, then:
// console.log(counts);
// unsubProgress(); unsubComplete(); unsubError();
```

### Test matrix

| Test | Expected `counts.complete` | Expected `counts.error` |
| --- | --- | --- |
| A. Multiple PNG (3 files) | `1` | `0` |
| B. Folder (3 PNGs) | `1` | `0` |
| C. Nested folder (3 PNGs) | `1` | `0` |
| D. Cancel during scan/validation | `1` (`canceled: true`) | `0` |

Validation progress count = number of PNG files validated. No duplicate consecutive identical payloads.

---

## Files Changed

* `electron/ipc/import/batchDiscoveryHelpers.ts` — per-run deduplicating progress emitter
* `electron/ipc/import/folderBatchDiscovery.ts` — removed redundant emits; one validation event per file
* `electron/ipc/import/multiplePngBatchDiscovery.ts` — one validation event per file
* `docs/reviews/phase-3b-step4-event-audit.md` — this document

---

## Signoff Recommendation

**Approved for Step 4 signoff** after fixes above, provided manual DevTools tests use a single subscription set per run and distinguish `batch-progress` (`phase: "complete"`) from `batch-discovery-complete`.

Firebase deploy: **not required**.
