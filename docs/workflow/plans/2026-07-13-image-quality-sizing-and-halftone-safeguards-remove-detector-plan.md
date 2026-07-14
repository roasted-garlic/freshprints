# Final Remediation: Remove automatic halftone detection

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | implementing → test after code complete |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Trigger | Owner FAIL — detector failed both directions; remove entirely |
| ADR | ADR-FP-080 (amended) |

## Product decision

Automatic pixel/AI halftone detection is removed. Halftone is human-confirmed only:

- **Portal** uploads/donations: always show optional “This artwork is a halftone design.” (default off); help explanation; nonblocking; save Yes/No immediately with saving/saved states; evidence only (`halftoneSubmitterResponse`).
- **Studio import:** no interrupt; staff decide later in AI Review.
- **Intake:** green Halftone toggle; customer yes → on else off; staff override; persist explicit true/false on promote.
- **AI Review:** green toggle; staff → intake staff → customer yes → off; AI never auto-enables; approve syncs canonical `"halftone"` tag; explicit false survives promotion/reload/reruns.

## Preserve

- 12″ automated upscale target / 10″ request default / one pass / ≤2× / 15″×16.5″ ceilings / 200 DPI request floor
- Studio create-request redirect
- Compact Portal and Studio UI remediations (list spacing, lightbox, Technical Details placement)

## Data cleanup

- Stop writing new `halftoneDetection` metadata
- Remove detector-only UI and processing code
- No destructive Firestore migration; historical detector fields may remain unread
- Retain `halftoneSubmitterResponse` and `halftoneStaffDecision`
- Remove detector-only tests; keep customer/staff/false/promote/tag tests

## Out of scope

New detector thresholds; production deploy; destructive Firestore migration.
