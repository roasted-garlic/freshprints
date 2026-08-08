# Amendment 9 P0 Independent Implementation Review

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| First verdict | APPROVED WITH REQUIRED CHANGES |
| Re-review verdict | **APPROVED** |
| Implement authorized previously | Owner phrase: APPROVE IMPLEMENT AMENDMENT 9 P0 |

## First-pass required change

Replace tautological budget simulator with spy-measured helper proving 0 `reloadDesigns` / 0 `onQueueChanged` on success.

**Applied:** extracted `reconcileSuccessfulInboxManualAction` / `recoverFailedInboxManualAction`; 45-design fixture spies those deps; unit spies assert never-called on success and once each on failure.

## Challenge table (final)

| # | Check | Result |
|---|---|---|
| 1 | Success no `reloadDesigns` | **PASS** |
| 2 | Success no three-tab `reloadCounts` | **PASS** |
| 3 | Failure bounded | **PASS** |
| 4 | Processing `onQueueChanged` intact | **PASS** |
| 5 | K=∞ / no timers | **PASS** |
| 6 | Count deltas correct | **PASS** |
| 7 | Returned Design used | **PASS** |
| 8 | No P1/P3/P4/1B | **PASS** |
| 9 | No Firebase/prod | **PASS** |
| 10 | Selection advance preserved | **PASS** |

## Residual risks (non-blocking)

Inbound Needs Review drift under K=∞ (accepted); rare count race while badges still null; patched rows remain in `rawDesigns` until remount.

## Signoff

**Not recorded.** Awaiting owner manual QA.
