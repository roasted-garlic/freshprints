# Implementation Review: Donated Designs Amendment 2

Date: 2026-08-01
Verdict: **approved_with_note**

## Findings

- Exact unsupported source removed: `window.prompt` in `useCustomerUploadIntake.deleteEligible`. The intake feature now contains no native prompt, confirm, or alert; exclusion's former `window.confirm` was also replaced.
- `CustomerUploadDeletionDialog` uses existing Fresh Prints Modal/Button primitives and the existing preview/delete service. Preview must allow hard delete before the destructive button appears; submission is single-flight and rechecks server-side.
- Cancel and Escape cause no write, Cancel receives initial focus, Tab wraps inside the dialog, and cancel returns focus to the overflow trigger. Row/filter remounting prevents stale target identity.
- Exact label is **Delete Upload**. No action was added.
- Client capability and both trusted callables now allow active owner/admin and deny helper/nonstaff. Permission mapping remains centralized.
- Safe-delete eligibility is unchanged in substance: any `printRequestItems.customerUploadId` reference blocks; nonempty `promotedDesignId` blocks. The execute callable repeats preview before deleting.
- Successful cleanup deletes only source, production, preview, and thumbnail paths present on the upload, then the `customerUploads` document. It does not rewrite/delete requests, items, allocations, designs, batches, customers, or history.
- Exclusion now changes only `catalogReviewStatus` and `updatedAt`. It preserves upload metadata/assets, request references, and technical state; newly excluded uploads remain restorable. Already-purged historical donations remain nonrestorable without migration, and no migration was introduced.
- Functions source changed; Firestore/Storage Rules did not. A later scoped deployment of `previewCustomerUploadDeletion`, `deleteEligibleCustomerUpload`, and `excludeCustomerUploadFromCatalog` will be required after production merge and explicit approval.

## Note

Automated verification passes. Development owner/admin/helper QA and the separate Whatnot QA remain required before production diff review, PR, merge, or installer.
