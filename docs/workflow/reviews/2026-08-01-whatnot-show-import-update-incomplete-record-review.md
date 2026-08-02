# Formal Review: Whatnot show import update — incomplete existing record

| Field | Value |
|---|---|
| Date | 2026-08-01 |
| Plan | `docs/workflow/plans/2026-08-01-whatnot-show-import-update-incomplete-record-plan.md` |
| Verdict | **approved_with_changes** |

## Independent review findings

The source trace confirms the Plan’s core finding: `planWhatnotShowImport` retains the existing document ID, while `useWhatnotShowImport` discards it and invokes a rematching upsert. The strict mapper both precedes update merging and hides ten distinct field failures behind one generic error. No callable or Rules validation participates.

## Required changes incorporated

1. The dedicated update path must verify both the Firestore document ID and expected Whatnot ID; a mismatch must stop and must never create.
2. The update payload must be constructed by an exported pure helper so tests can prove its exact allowlist and absence of internal fields.
3. Missing matched document, missing/mismatched Whatnot identity, missing title, and invalid scheduled timestamp must have safe specific errors.
4. Legacy compatibility must not synthesize or persist capacity/lifecycle defaults. Existing internal values remain untouched by omission from `updateDoc`.
5. The create path must remain on the current strict default-producing implementation.
6. Returning/refetching the updated show may use the normal mapper only when the existing record satisfies its contract; legacy-update success itself must not depend on strict remapping. Refresh of the live list remains the caller’s responsibility.

## Security and scope

The proposed direct-ID read stays within the existing staff-authorized Studio service boundary. The narrow update payload reduces overwrite risk. No customer data, allocation data, callable, Rules, or production repair is added.

**Verdict: approved_with_changes.** Implementation may proceed only with all six required changes above.
