# Test report: Persist staff inbox acks in Firestore

| Field | Value |
|-------|-------|
| Date | 2026-07-10 |
| Status | passed_with_notes |
| Plan | docs/workflow/plans/2026-07-10-staff-inbox-firestore-acks-plan.md |

## Automated

| Check | Result |
|-------|--------|
| `staffInboxAck.types.test.ts` + `operationalWipeTargets.test.ts` | PASS (13/13) |
| `npm run build --prefix functions` | PASS |
| ESLint on touched Studio staff-inbox / test-data-reset files | PASS |

## Manual / deploy (outstanding)

| Check | Status |
|-------|--------|
| Deploy `firestore:rules` + `wipeOperationalTestData` to `fresh-prints-dev` | **Human required** |
| Mark Done → sync across sessions; wipe clears Done; refill full show re-alerts | Pending after deploy |

## Notes

Done writes will fail with permission errors until rules are deployed.
