# Manual Checkpoint — Studio import auto-start AI processing

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `studio-import-auto-start-ai-processing` |
| Environment | Fresh Prints Studio desktop + `fresh-prints-dev` / emulators |
| Result | **PASS** (owner 2026-07-13) |

## Why automated tests are insufficient

Import → background sequential AI needs live Studio + Firebase/AI.

## Prerequisites

- Studio desktop app running
- Auto advance unset or ON (default)
- At least one valid PNG for import

## Manual Test Checkpoint

### Steps

1. Clear session (or ensure Auto advance toggle is ON) → **Expected:** Auto advance defaults ON.
2. Import a single PNG successfully → **Expected:** Stay on **Imports**; AI starts in the background (no forced navigate to AI Processing).
3. Import another PNG while the first is still processing → **Expected:** Can import back-to-back; AI continues sequentially (not a parallel storm).
4. Optionally open AI Processing → **Expected:** Can see designs processing / move to Needs Review when done.
5. Turn Auto advance **OFF**, import another PNG → **Expected:** Import stays manual (no background enqueue).
6. Batch import 2+ PNGs with Auto advance ON → **Expected:** Stay on Imports; designs enqueue one-at-a-time in the background.

### Pass criteria

- [x] Auto advance defaults ON
- [x] Successful import starts background sequential AI without leaving Imports
- [x] Back-to-back imports still work while AI runs
- [x] Auto advance OFF keeps manual Start AI
- [x] No concurrent enqueue storm from import

### Owner reply

**PASS** — 2026-07-13
