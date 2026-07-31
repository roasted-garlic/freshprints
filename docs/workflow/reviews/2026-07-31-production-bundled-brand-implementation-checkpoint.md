# Checkpoint: Bundled brand asset implementation — awaiting source files

| Field | Value |
|-------|-------|
| Date | 2026-07-31 |
| Approval received | `APPROVE BUNDLED BRAND ASSET IMPLEMENTATION` |
| Mapping | Previously approved (`APPROVE BRAND ASSET MAPPING` — five sources; 8% app-icon padding) |
| Plan | `docs/workflow/plans/2026-07-31-production-studio-storage-unauthorized-and-bundled-brand-plan.md` Part B |
| Status | **Paused — owner source files not present** |

## Why paused

Implementation approval is recorded, but the five owner source assets are **not** available to
copy from:

- No drop-folder sources in the repo
- Downloads / Desktop had no matching recent brand PNGs
- Working-tree brand/favicon/icon binaries currently **match git HEAD** (no pending replace)
- Earlier uncommitted local brand WIP was lost during a pre-rollout hard reset and was **not**
  recoverable from Cursor local history

Agents will **not** invent or silently reuse unrelated artwork as the new defaults.

## Drop zone (created)

`docs/workflow/setup/brand-asset-sources/` — see README there for suggested filenames.

| # | Suggested filename | Destination |
|---|--------------------|-------------|
| 1 | `01-studio-full-wordmark.png` | Studio full bundled logo |
| 2 | `02-studio-collapsed-square.png` | Studio collapsed + `generate-app-icon.mjs` (8% pad) |
| 3 | `03-portal-full-wordmark.png` | Portal full bundled logo |
| 4 | `04-portal-collapsed-square.png` | Portal collapsed |
| 5 | `05-favicon-app-mark.png` (or `.svg`) | Portal favicon + manifest set |

## After files are dropped

Reply e.g. `Brand sources ready` (or restate the implementation approval). Agent will then:

1. Inspect format / dimensions / alpha; stop on mismatch
2. Replace four logo paths; generate Studio icons; generate Portal favicon/manifest set
3. Add `AppLogo` / `PortalLogo` `onError` → bundled default
4. Run lint / typecheck / builds; stop for visual QA and separate Studio installer / Portal App Hosting release approvals

## Not started this pass

- Asset file replacement
- Icon / favicon generation
- `onError` fallback (deferred until assets are in hand so one coherent implement pass)
- Studio rebuild / Portal App Hosting branding rollout
