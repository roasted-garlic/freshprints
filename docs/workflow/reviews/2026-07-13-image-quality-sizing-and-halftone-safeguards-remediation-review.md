# Review: Image Quality Mid-Checkpoint Remediation

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-remediation-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

Remediation correctly addresses owner FAIL without abandoning the advisory detector. Scope is bounded: detector quality/parity, UX polish, staff-decision propagation (especially explicit `false`), create-request navigation, and 12″ production upscale vs 10″ request default. Implementation may proceed with the binding changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit out-of-scope preserves 200 DPI / ceilings / no remove detector |
| Architecture alignment | pass | Shared pure detector + adapters |
| Security impact | pass | Callables unchanged in intent |
| Data model | pass | Additive; explicit false persistence |
| Test strategy | pass | Parity + sizing examples + UI state |
| Human checkpoints | pass | Revised manual checkpoint |
| No silent scope expansion | pass | |

---

## Required changes

1. **Separate init helpers** — `resolveIntakeHalftoneStaffToggle` vs `resolveAiReviewHalftoneStaffToggle` (do not reuse the old detector/AI auto-on path for intake).
2. **Analyze pre-upscale trimmed alpha** in both Studio `pngValidator` and Functions (after trim, before upscale).
3. **Customer UI gate** — prompt only when `likely`; store `possible` for staff only.
4. **Policy version** — bump sizing to `image-quality-v2` and detector to `halftone-alpha-v2`.
5. **Create-request navigate** — use returned id; cover Working Empty case in manual steps.

---

## Verdict Rationale

**approved_with_changes** — Owner FAIL items map cleanly to remediation; constraints prevent reintroducing false-positive-prone auto-on and ambiguous 10″ naming.

## Next Step

Implement remediation scope; then automated tests + revised manual checkpoint.
