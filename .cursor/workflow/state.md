## FreshForge State

| Field | Value |
|-------|-------|
| Status | **ACTIVE** |
| DONE | **no** |
| Active goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Phase | **Test — Owner DEV QA WS-TOGGLE (re-test after state-machine fix)** |
| Plan Status | **amended (revised)** — WS-CONFIG-DEFAULT + WS-TOGGLE + selection-only derivative reuse |
| Review Status | **approved_with_changes** |
| Implementation Status | **WS-TOGGLE state-machine fix implemented locally (generation vs selection split)** |
| WS-CONFIG Owner DEV QA | **PASS** (2026-08-30) |
| WS-TOGGLE Owner DEV QA | **FAIL** (2026-08-31) — existing derivative re-enable blocked; Portal save permissions |
| DEV Deploy | **REQUIRED** — `setPrintRequestItemArtworkEnhanceMode` + Firestore rules to `fresh-prints-dev` |
| Test Status | **passed_with_notes** (focused suites; Firebase rules emulator not run — no Java) |
| Signoff Status | **n/a** |
| Human Checkpoint Required | **yes** — Owner DEV QA WS-TOGGLE re-test after DEV deploy |
| Blocked | **no** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **NOT STARTED** |
| Last updated | 2026-08-31 |
| Last Completed Step | WS-TOGGLE state-machine fix (selection-only reuse path) + Portal upscale parity |

---

## Allowed Actions

- Owner manual DEV QA (WS-TOGGLE checklist after DEV deploy)
- DEV deploy `setPrintRequestItemArtworkEnhanceMode` + Firestore rules (owner approval)
- Read docs, respond to owner

## Forbidden Actions

- Production deploy
- Signoff
- Smart Profiling

---

## Decision Log

- 2026-08-31: **Owner DEV QA FAIL** — derivative exists but Upscale ON conflated with first-time generation; auto-off + wrong helper at 227 DPI; Portal save permissions.
- 2026-08-31: **Binding rule** — ONE interactive derivative per lineage; OFF/ON is asset selection only after derivative exists; no regeneration on larger sizes.
- 2026-08-30: **Owner APPROVE DEPLOY** — prior WS-TOGGLE bundle to `fresh-prints-dev`.
- 2026-08-30: **WS-CONFIG-DEFAULT Owner DEV QA PASS**.

---

## Next Required Step

1. Owner **APPROVE DEPLOY** — `setPrintRequestItemArtworkEnhanceMode` + `firestore.rules` to `fresh-prints-dev`.
2. Owner re-run WS-TOGGLE DEV QA repro (enhance → reset → enlarge → Upscale ON → reuse derivative).
