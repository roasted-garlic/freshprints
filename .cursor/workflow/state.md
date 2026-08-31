## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Phase | **Test — Owner DEV QA production export parity (gang sheet + ZIP)** |
| Plan Status | **amended** — production export must honor `artworkEnhanceMode` per item |
| Review Status | **approved_with_changes** — `2026-08-31-ws-toggle-production-export-parity-implementation-review.md` |
| Implementation Status | **WS-TOGGLE production export parity corrective complete** |
| WS-CONFIG Owner DEV QA | **PASS** (2026-08-30) |
| WS-TOGGLE Interactive Owner DEV QA | **PASS** (2026-08-31) — toggle/state machine |
| WS-TOGGLE Export Parity Owner DEV QA | **pending** — gang sheet + ZIP must use active variant |
| Test Status | **passed_with_notes** — 39/39 focused export/gang-sheet regression (2026-08-31) |
| Signoff Status | **n/a** — blocked on export parity owner QA |
| Human Checkpoint Required | **yes** — Owner DEV QA production export parity Tests A–E |
| Blocked | **no** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** |
| Last updated | 2026-08-31 |
| Last Completed Step | Production export parity implementation + focused tests |

---

## Allowed Actions

- Owner manual DEV QA (export parity Tests A–E)
- Owner reload/rebuild Studio (client-only)
- Owner approve + deploy DEV Firestore rules for interactive gang-sheet `originalPathSnapshot` paths (if manual builder used with enhanced items)

## Forbidden Actions

- Production deploy
- Signoff (until export parity owner QA PASS)
- Smart Profiling

---

## Decision Log

- 2026-08-31: **Owner DEV QA PASS (WS-TOGGLE interactive)** — toggle, reuse, reset, size/standard changes preserve mode, DPI correct.
- 2026-08-31: **Remaining blocker** — production export parity (gang sheet + ZIP); implementation complete; owner QA pending.
- 2026-08-31: **Owner DEV QA FAIL (size edit)** — fixed via `mapPrintRequestItemData` preserve `artworkEnhanceMode`.
- 2026-08-31: **Binding rule** — `artworkEnhanceMode` on persisted item selects production asset; absent = baseline; enhanced + missing derivative = fail closed.

---

## Next Required Step

Owner DEV QA production export parity — Tests A–E in `docs/workflow/reviews/2026-08-31-ws-toggle-production-export-parity-implementation-review.md`. Rebuild/reload Studio first. DEV Firestore rules deploy needed only if testing manual gang-sheet builder with enhanced placement.
