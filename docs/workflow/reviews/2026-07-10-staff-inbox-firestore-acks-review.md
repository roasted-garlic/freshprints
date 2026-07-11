# Review: Persist staff inbox acks in Firestore

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | approved |
| Plan | docs/workflow/plans/2026-07-10-staff-inbox-firestore-acks-plan.md |

## Verdict

**approved** — scope matches ADR-FP-069; security is least-privilege (own docs only); wipe expansion is coherent with inbox lifecycle.

## Notes

- Rules deploy is a hard gate before Done writes succeed in live Studio.
- Wipe callable must be redeployed so `staffInboxAcks` is deleted with operational wipes.
