# Plan - Print Request Create Modal Copy And Alignment

- **Date:** 2026-07-03
- **Mode:** Managed Phase
- **Goal slug:** `print-request-create-modal-copy-alignment`
- **Roadmap phase:** Phase 6 Customers And Print Requests
- **Approval:** User requested the exact copy and alignment fix on 2026-07-03.

## Goal

Make the Create request modal copy clearer and fix the customer dropdown alignment so controls in the
form share the same width.

## Scope

- Change the empty-customer helper text from `Create customers from Users before creating customer requests.` to `Create a customer before creating customer requests.`
- Adjust the create-request modal layout so request type and customer controls align with the full-width request name and notes fields.

## Out Of Scope

- No Print Request service behavior changes.
- No customer creation behavior changes.
- No Firebase, Firestore, rules, indexes, deploy, data migration, seed write, dependency, or permission changes.
- No `print-request-query-index-hardening` implementation.

## Verification

- Root TypeScript check.
- Root lint.
- `git diff --check`.

