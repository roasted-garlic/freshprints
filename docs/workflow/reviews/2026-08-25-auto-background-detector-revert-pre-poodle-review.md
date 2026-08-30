# Formal Review: Auto Background Detector C2b — Revert Pre-Poodle

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-auto-background-detector-revert-pre-poodle-plan.md` |
| Verdict | **approved** |

---

## Verdict: approved

Owner FAIL on C2 A∧B is binding. Restoring the known-good **pre-poodle luma detector** plus a **narrow cream/sparse secondary** for the poodle is the correct product direction. Do not continue tuning the contrast-improvement / light-ink / A∧B stack.

### Binding

| ID | Requirement |
|----|-------------|
| R1 | Restore primary gates: opaque≥64, sparse≥0.015, lightOpaque≥0.90 (luma≥0.85), meanLuma≥0.88 |
| R2 | Remove contrast-improvement Dark gate and light-ink second pass |
| R3 | Optional secondary: sparse cream/near-white line art only (bbox occupancy cap); no category hard-codes |
| R4 | Precedence / pickers / all-halftones / Dark≠Halftone unchanged |
| R5 | C1 Highland out of scope |
| R6 | After implement + automated tests → STOP for owner manual QA |

Implement may proceed under R1–R6.
