# Owner QA — Auto Background C2b PASS WITH NOTES

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Corrective | C2b — revert pre-poodle + cream/sparse secondary |
| Result | **PASS WITH NOTES** |

## Recorded owner decisions

- Current Auto Background detector behavior is **accepted** for this refinement
- Per-image Light/Dark override remains the escape hatch for occasional edge cases
- Further Auto Background calibration is **deferred** to a future refinement (**non-blocking**)
- Owner prefers occasional **false negatives** over widespread false-positive Dark
- **No further Auto Background detector changes** in this workflow

## Implications

- C2b closed for this refinement (with deferred tuning notes)
- Refinement remains open for **C1 Highland subject specificity** only (blocking)
- Slice 5 / overall refinement signoff still blocked until C1 resolved
