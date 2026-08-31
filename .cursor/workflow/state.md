## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Phase | **Test — Owner DEV QA production export parity (gang sheet + ZIP + manual builder)** |
| Plan Status | **amended** — production export must honor `artworkEnhanceMode` per item |
| Review Status | **approved_with_changes** — `2026-08-31-ws-toggle-production-export-parity-implementation-review.md` |
| Implementation Status | **production export parity committed + DEV rules deployed** |
| Export parity commit | `c84ec449a688f1ffac53cc22a75525a9315ec8c3` |
| WS-CONFIG Owner DEV QA | **PASS** (2026-08-30) |
| WS-TOGGLE Interactive Owner DEV QA | **PASS** (2026-08-31) |
| WS-TOGGLE Export Parity Owner DEV QA | **pending** — Tests A–F |
| DEV Deploy | **2026-08-31** — `firestore:rules` → `fresh-prints-dev` (exit 0); SHA `c84ec449` |
| Test Status | **passed_with_notes** — 39/39 focused export/gang-sheet regression (2026-08-31) |
| Signoff Status | **n/a** — blocked on export parity owner QA |
| Human Checkpoint Required | **yes** — Owner DEV QA production export parity Tests A–F |
| Blocked | **no** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** |
| Last updated | 2026-08-31 |
| Last Completed Step | Git checkpoint + DEV Firestore rules deploy for export parity QA |

---

## Allowed Actions

- Owner manual DEV QA (export parity Tests A–F)
- Owner restart Studio DEV (`npm run dev:studio` after `git pull`)

## Forbidden Actions

- Production deploy
- Signoff (until export parity owner QA PASS)
- Smart Profiling

---

## Decision Log

- 2026-08-31: **Owner approved** DEV Firestore rules deploy for interactive `gangSheetItems.originalPathSnapshot` (manual builder QA).
- 2026-08-31: **Commit** `c84ec449` — production export parity; pushed to `origin/development`.
- 2026-08-31: **Owner DEV QA PASS (WS-TOGGLE interactive)** — toggle, reuse, reset, size/standard changes preserve mode.
- 2026-08-31: **Binding rule** — `artworkEnhanceMode` on persisted item selects production asset; absent = baseline; enhanced + missing derivative = fail closed.

---

## Next Required Step

Owner DEV QA production export parity — Tests A–F. Restart Studio after pull. Deploy record: `docs/workflow/reviews/2026-08-31-ws-toggle-production-export-parity-dev-deploy-record.md`.
