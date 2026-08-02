# Customer upload intake parity Amendment 4 implementation review

## Review

The implementation uses the existing shared `CustomerUploadIntakeSection` for both routes. It adds one restore modal and shared action wiring without duplicating route logic, changing backend authorization, or changing upload/request data behavior.

- Exact label `Restore to Pending` is visible for excluded records on both surfaces.
- Restorable rows use a focused in-app confirmation modal; cancel/Escape do not call restore.
- Confirmation invokes the pre-existing callable-backed handler for the selected upload.
- Historical `fullSizePurgedAt` rows retain a visible disabled action and clear explanation instead of offering an impossible restore.
- Pending promotion/exclusion and owner/admin Delete Upload remain separate.
- Helpers retain exclude/restore and cannot see an active delete trigger.
- Status query boundaries keep `not_eligible` uploads out of catalog-review tabs/actions.
- The existing keyed detail remount clears menus/modals on selection or tab changes; route unmount clears route changes.
- No Functions, Rules, Whatnot source, or production surface changed.

## Verdict

**APPROVED WITH NOTE** — ready for authenticated development owner QA; promotion remains blocked.
