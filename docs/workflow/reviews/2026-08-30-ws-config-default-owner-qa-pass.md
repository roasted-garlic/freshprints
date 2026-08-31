# WS-CONFIG-DEFAULT Owner DEV QA — PASS

| Field | Value |
|-------|-------|
| Date | 2026-08-30 |
| Goal | `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale` |
| Workstream | WS-CONFIG-DEFAULT |
| Result | **PASS** |

## Owner verification

The owner verified the runtime-configurable Print Request default width works as intended.

## Preserved behavior (confirmed)

- Changing the setting affects **only new** Print Request items
- Existing request items do **not** resize
- Same open request may contain items initialized under different historical defaults
- Studio and Portal use the same current runtime setting
- Setting changes do **not** require Functions redeploy
- Duplicates preserve source item dimensions
- Standard Size presets remain independent
- DPI safety remains authoritative

## Follow-up correction (same session)

Owner clarified system fallback should be **10″**, not 11″. See fallback correction in implementation; runtime setting remains source of truth.

## Parent goal

**Not signed off** — WS-TOGGLE remains pending owner DEV QA and DEV deploy.
