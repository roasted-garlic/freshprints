# Implementation Review — WS-CONFIG-DEFAULT

**Date:** 2026-08-30  
**Goal:** `print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale`  
**Workstream:** WS-CONFIG-DEFAULT only  
**Verdict:** **approved_with_notes**

**DEV deploy (2026-08-30):** `fresh-prints-dev` — 4 Functions at implementation SHA `c2461238328873c281aea67b97e8a96f8c44d6de`. Record: `docs/workflow/reviews/2026-08-30-print-request-11-inch-default-15-inch-upscale-and-legacy-art-upscale-dev-deploy-record.md`

**Assisted proof 15″ bundle:** **A — YES** (documented in deploy record).

---

## Scope verified

| Requirement | Result |
|-------------|--------|
| 11″ fallback only (`STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES`) | **Pass** — used only when setting absent/invalid |
| Persisted `settings/standardPrintSizes.defaultPrintRequestWidthInches` is runtime source of truth | **Pass** |
| 10.5″ and 11.5″ supported | **Pass** — validation + tests |
| Existing items never auto-resized | **Pass** — snapshot-at-create only |
| Same open request can mix widths from different setting snapshots | **Pass** |
| Studio uses live `onSnapshot` setting | **Pass** — `useStandardPrintSizesSettings` → selection save / add paths |
| Portal client uses live setting | **Pass** — `usePortalStandardPrintSizes` → optimistic + batch selection |
| Portal server reads persisted setting at runtime | **Pass** — `loadStandardPrintSizesSettings()` per callable invocation |
| Function redeploy not required for future setting changes | **Pass** — no hardcoded width in deployed bundle |
| Customer-upload attach uses current setting | **Pass** — `confirmCustomerUploadsAndAttachToRequest` |
| Assisted proof attach uses current setting | **Pass** — `customerAddAssistedApprovedProofToPrintRequest` |
| Duplicate preserves source dimensions | **Pass** — unchanged explicit copy path |
| Explicit size / Standard Size wins | **Pass** — existing resolver ordering preserved |
| 200 DPI floor intact | **Pass** — tests unchanged |
| 22″ cap intact | **Pass** — unchanged |
| No unnecessary Rules changes | **Pass** — none |
| No migration | **Pass** |
| WS-TOGGLE not implemented | **Pass** |
| Production untouched | **Pass** |
| Smart Profiling untouched | **Pass** |

---

## Notes

- Studio/Portal full-project `tsc` reports pre-existing errors outside this workstream; changed files compile in Functions build and focused unit tests pass.
- Owner DEV QA remains **FAIL** until post-deploy retest on `fresh-prints-dev`.

---

## Deploy gate

**STOP** — await owner `APPROVE DEPLOY` before Firebase DEV deployment.
