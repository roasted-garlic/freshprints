# Plan: AI Review approve permission-denied (expression budget) hotfix

| Field | Value |
|-------|-------|
| Date | 2026-08-10 |
| Status | ready_for_review |
| Workflow | managed-phase hotfix (prelaunch) |

## Goal
Restore AI Review approve on enrichment-heavy designs after Rules permission-denied regression (same class as prior catalog-metadata / approve expression-budget incidents).

## Root cause
1. AI Review draft `updateDesign` writes `halftoneStaffDecision`, which was **not** on `catalogMetadataOnlyUpdate` → full validator.
2. Approve→ready always used full `designRequiredFieldsValid`; combined with large `aiSuggestions` + explicit/companion/`censoredTerms` tips the 1000-expression limit → client sees “You do not have permission to perform this action.”

## Fix (DEV Rules only)
1. Add `halftoneStaffDecision` to `catalogMetadataOnlyUpdate`.
2. Add `catalogApprovalStatusOnlyUpdate()` for approve/reject/reopen-shaped status transitions (fails cheaply when status unchanged).
3. Expand expression-budget emulator tests; deploy `firestore:rules` to **fresh-prints-dev** only.

## Out of scope
- Prod Rules deploy, Algolia, Portal, placement defaults
