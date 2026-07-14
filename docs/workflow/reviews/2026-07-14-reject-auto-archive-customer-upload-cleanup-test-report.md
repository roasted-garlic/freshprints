# Test Report: Reject auto-archive + customer-upload full-size cleanup

| Field | Value |
|-------|-------|
| Date | 2026-07-14 |
| Goal | reject-auto-archive-customer-upload-cleanup |
| Status | passed |

---

## Automated

| Check | Exit | Result |
|-------|------|--------|
| `npx tsx --test` rejectedDesignAutoArchive + customerUploadFullSizeRetention | 0 | pass (8) |
| `npm --prefix functions run build` | 0 | pass |

---

## Deploy required before manual

```bash
firebase deploy --only functions:archiveStaleRejectedDesigns,functions:purgeIdleCustomerUploadFullSize,firestore:indexes --project fresh-prints-dev
```

Then (from a signed-in owner/admin context, e.g. Functions shell / temporary Studio call / script with ID token):

```text
archiveStaleRejectedDesigns({ dryRun: true })
archiveStaleRejectedDesigns({ dryRun: false })
purgeIdleCustomerUploadFullSize({ dryRun: true })
purgeIdleCustomerUploadFullSize({ dryRun: false })
```

Indexes for `designs` status+aiReviewedAt / status+updatedAt ASC may take a few minutes.

---

## Manual

| Test | Result | Date |
|------|--------|------|
| Studio Retention maintenance dry run + real (reject archive + upload purge) | **PASS** (owner) | 2026-07-14 |

### Notes
- `functions:shell` unusable without auth; Studio Test Data Reset panel used instead
- Donation exclude immediate full-size purge added mid-phase (separate deploy)
