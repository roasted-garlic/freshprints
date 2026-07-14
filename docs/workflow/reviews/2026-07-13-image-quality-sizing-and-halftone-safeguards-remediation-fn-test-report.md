# Test Report: Halftone false-negative retune (remediation 2)

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | **passed_with_notes** |

## Commands

| Command | Exit | Result |
|---------|------|--------|
| `npx tsx --test src/utils/halftoneDetection.test.ts` | 0 | 22 pass (incl. dense holes → likely; collage/text/glow stay not_detected) |
| `npm --prefix functions run build` | 0 | OK |

## Notes

- Detector version bumped to `halftone-alpha-v2.1`
- Existing Firestore uploads keep prior analysis until re-upload / technical retry
- Owner visual judgment still required on the real halftone sample
