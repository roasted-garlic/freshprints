# Customer upload exclusion/deletion development Functions deployment checkpoint

## Source

- Branch: `development`
- Commit: `1873b10d7874b36ba4cf95d2d0421e9c1f11bdd0`
- Reviewed ancestors confirmed: `3ea70f7a365bf77900bb94dd191b680ee3b3e840`, `830f6e7267914aec0248bf95dce76d0643c3af66`, `1873b10d7874b36ba4cf95d2d0421e9c1f11bdd0`.
- Amendment 4 Functions diff: empty.

## Predeployment verification

- Focused exclusion/deletion/restore/permission tests: **PASS**, 28/28 assertions, exit 0.
- Functions TypeScript build: **PASS**, exit 0.
- Repository lint: **PASS**, exit 0.
- `git diff --check`: **PASS**, exit 0.
- Source audit: metadata-only exclusion; owner/admin deletion; helper denial; request-item and direct promoted-design reference checks; immediate eligibility recheck; authoritative four-current-field asset manifest; partial-failure document retention.

## Deployment

Allowlist:

- `previewCustomerUploadDeletion`
- `deleteEligibleCustomerUpload`
- `excludeCustomerUploadFromCatalog`

Command:

`firebase deploy --only functions:previewCustomerUploadDeletion,functions:deleteEligibleCustomerUpload,functions:excludeCustomerUploadFromCatalog --project fresh-prints-dev`

Result: **PASS**, exit 0. Firebase reported 3 Functions deployed, 0 errored, 0 aborted.

## Postdeployment verification

All three are Gen 2 Node.js 20 callables in `us-central1`, state `ACTIVE`, source hash `039c420950489a41150ee4fbee0e2ded2790c3ca`.

| Function | Source generation |
|---|---:|
| `previewCustomerUploadDeletion` | `1785635344086300` |
| `deleteEligibleCustomerUpload` | `1785635344195705` |
| `excludeCustomerUploadFromCatalog` | `1785635305832850` |

Deployment output recorded `excludeCustomerUploadFromCatalog` revision `excludecustomeruploadfromcatalog-00011-lal`, update time `2026-08-02T01:48:25.892119003Z`. The local Google Cloud CLI was unavailable, so separate revision names/update times for the other two were not queryable; their Firebase source generations and common hash are recorded instead.

The Firebase deployment summary proves only the three allowlisted Functions were deployed. No Rules, indexes, Storage Rules, App Hosting, Auth, secrets, or data were deployed or changed.

## Owner QA

**PENDING.** Windows application control was unavailable in this session, so no authenticated fixture action was performed and no private data was inspected. The owner must use fresh post-deployment development fixtures to verify:

- new exclusion preserves all artwork and creates no `fullSizePurgedAt`;
- Restore to Pending succeeds on the same upload document;
- Donated Designs and Customer Uploads parity;
- historical purged row remains visibly disabled;
- owner/admin/helper role sanity.

No source defect conclusion or production-promotion approval is recorded until this QA passes.
