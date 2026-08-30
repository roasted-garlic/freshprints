# Test Report — Standard Size Defaults v1 Corrective

| Field | Value |
|-------|-------|
| Date | 2026-08-29 |
| Goal | `print-request-standard-size-presets` (corrective) |
| Status | **passed_with_notes** |

---

## Commands run

```bash
npx tsx --test packages/shared/src/constants/printSize/standardPrintSizesSettings.constants.test.ts packages/shared/src/constants/printSize/standardPrintSizesSettingsRulesAlignment.test.ts packages/shared/src/utils/applyStandardPrintSizePreset.test.ts
```

**Result:** 24 tests, **24 pass**, exit 0.

---

## Coverage summary

| Area | Result |
|------|--------|
| v1 catalog (7 placements, Pocket, individual sizes) | pass |
| Retired provisional keys excluded | pass |
| Forward-compatible resolve (overlay + new keys) | pass |
| Reset to defaults = canonical v1 | pass |
| Apply / manual divergence / rules alignment | pass |

---

## Not run (notes)

| Check | Notes |
|-------|-------|
| Full-repo lint/typecheck | Pre-existing failures outside scope; not re-run full monorepo |
| Firebase rules emulator | No rules changes; prior deploy tests still valid |
| Studio/Portal E2E | Deferred to owner focused re-QA |
| DEV callable redeploy | **Required before owner Save** — see workflow state |

---

## Manual QA

Owner **focused re-QA** required per `2026-08-29-print-request-standard-size-presets-focused-reqa-checkpoint.md`.
