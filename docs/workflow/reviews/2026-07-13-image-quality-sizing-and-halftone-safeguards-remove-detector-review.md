# Remediation Review — Remove automatic halftone detection

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Plan | `docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-remove-detector-plan.md` |
| Status | **approved_with_changes** — proceed under owner FAIL directive |

## Decision

Owner rejected further detector threshold work. Automatic halftone detection is removed entirely. Human confirmation only (Portal optional checkbox; Studio/AI Review staff toggle). Sizing policy and compact UI remediations are preserved.

## Required changes (implementation scope)

1. Delete/stop calling detector utilities in shared, Studio Electron, Functions finalize, and Portal clients.
2. Stop writing new `halftoneDetection`; leave historical fields unread.
3. Portal: always-on optional “This artwork is a halftone design.” control.
4. Intake/AI Review: init from staff → customer yes → off; no AI auto-enable; tag sync on approve.
5. Update ADR-FP-080, architecture/data model/backend docs, tests, and manual checkpoint.
6. No production deploy; no destructive Firestore migration.

## Not in scope

Detector retunes; production deploy; bulk data migration.
