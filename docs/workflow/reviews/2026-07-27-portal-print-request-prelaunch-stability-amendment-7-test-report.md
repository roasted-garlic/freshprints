# Portal Print Request Pre-Launch Stability — Amendment 7 Test Report

- **Date:** 2026-07-27
- **Scope:** Plan Section 25 / Amendment 7
- **Environment:** local checkout and Firebase emulators only
- **Production or dev deployment:** none

## Failing-before Rules evidence

The exact timer fixture was executed against the pre-correction Rules with Temurin Java 21:

```text
npx firebase emulators:exec --only firestore \
  "npx tsx --test tests/firebase/studioProductionTimer.rules.test.ts"
```

Result: **exit 1; 12 tests; 11 pass; 1 fail**. The only unexpected failure was the active-owner
atomic timer batch containing one show update and two allocation updates. The second allocation was
mapper-compatible and carried the synthetic preserved field `legacyProductionMarker`; its isolated
timer update was also denied by the pre-correction Rules. This fixture is a source-backed
reproduction of the observed three-operation failure class, **not** a claim that the historical live
field name or exact live allocation shape was recovered.

The live documents were no longer available through the read-only query performed during
investigation, so the exact historical field name remains unrecovered. Incomplete allocation
warnings are recorded separately from the operation manifest because mapper-rejected documents are
skipped before batch construction.

## Passing-after evidence

The corrected Rules require active staff, an existing `pending` or `queued` allocation, proposed
`in_progress`, and a diff containing only `status`, `updatedBy`, and `updatedAt`. Timer-start
transitions cannot fall through the ordinary full-schema update branch. Tests cover the exact
one-show/two-allocation atomic batch, isolated attribution, active owner/admin/helper, customer and
inactive-staff denial, invalid transition, unrelated-field addition, and changing or removing the
preserved legacy field.

```text
npm run test:rules
```

Result: **exit 0; 28 tests; 28 pass; 0 fail**.

## Callable and diagnostic evidence

The callable's authoritative transaction decision is extracted to
`getPortalQueueTransactionBlockReason` and invoked with values recomputed from the transaction's
fresh request-allocation and show-allocation reads. Its behavior-level tests prove:

- different request B: `22 + 3 = 25` allowed;
- different request B: `22 + 4 = 26` blocked;
- `23 + 2 = 25` allowed and `23 + 3 = 26` blocked;
- re-queuing request A is denied even when capacity remains.

Supplementary source-wiring tests confirm the transaction uses
`freshRequestHasAllocation`, `freshCustomerOnShowQty`, `batchQuantity`, and limit `L`, and the
callable remains exported. Diagnostic tests confirm parser classifications contain field names
only, mapper-compatible legacy allocations remain eligible for batching, and incomplete
allocations remain excluded.

Focused command result: **exit 0; 33 tests; 33 pass; 0 fail**.

## Build and static checks

| Check | Result |
|---|---:|
| Functions TypeScript build | exit 0 |
| Changed-file ESLint | exit 0 |
| `git diff --check` | exit 0 |

Earlier bounded goal verification also recorded Portal typecheck/build exit 0. Studio build remains
exit 2 due to the already-recorded baseline errors assigned to the queued
`preproduction-static-analysis-cleanup` goal; Amendment 7 did not claim that baseline as passing.

## Gate status

Local implementation and verification are complete. Owner QA remains paused. Independent
Implementation Review 8 must re-review these corrections before either dev deployment approval can
be requested.
