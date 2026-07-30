# Portal Print Request Pre-Launch Stability — Amendment 6 Formal Review

- **Date:** 2026-07-27
- **Scope:** Plan Section 24, Codex takeover timer investigation correction

## Verdict

**`approved_with_changes`**

The correction is narrow, evidence-backed, and necessary before the existing Rules test can support
any production diagnosis. The fixture defects are directly confirmed against checked-in Rules and
the application schema, and the repository test command demonstrably omits the timer test.

Required changes, incorporated into the approved scope:

1. Per-operation isolation must accompany the corrected full-batch assertion so a denial is
   attributable to a path rather than inferred from an atomic batch failure.
2. The operation manifest must remain in the service/hook layer and must use path templates and
   field-name lists only; it must never serialize document values or identity data.
3. No Rules change is approved until the corrected production-shaped test identifies a local Rules
   defect, and no deployment is approved by this review.

## Blocking findings

None after the three constraints above were added to Plan Section 24.
