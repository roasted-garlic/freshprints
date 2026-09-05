# Fresh Prints — Current State Snapshot

**Last updated:** 2026-09-05

## FreshForge workflow

| Item | Value |
|---|---|
| Status | **IDLE** — Standard Size + Add to Request default recalibration **DONE** |
| Signoff | **approved_with_notes** |
| Autonomous | **OFF** |
| Production | untouched |
| Commit/push | none this pass |

## Just closed

| Item | Value |
|---|---|
| Goal | Standard Size preset + Add to Request default recalibration |
| Fallback | **10.5″** (`STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES`) |
| Full Back Adult | M/L/XL **11″**; 2XL–5XL **12/13/14/15″** |
| Full Back Youth Y2XL | **11″** |
| Youth key | **YXS** kept (not YXXS) |
| Firebase | **no writes / no deploys** |
| Signoff | `docs/workflow/reviews/2026-09-05-standard-size-preset-and-add-to-request-default-recalibration-signoff.md` |

## Parked

| Item | Value |
|---|---|
| TD-034 | `catalog-enrich-v35` source ready; await owner DEV deploy auth |
| Phase 2 model registry | DEFERRED |
| WS6 | BLOCKED |

## DEV default model

`gemini-2.5-flash-lite`

## Owner note

If live Studio still shows old Full Back sizes or 11″ Add to Request, Reset Standard Size defaults and set Print Request default to **10.5″** in Settings.
