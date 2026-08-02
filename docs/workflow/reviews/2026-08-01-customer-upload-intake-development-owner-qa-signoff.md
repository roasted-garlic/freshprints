# Customer Upload intake development owner-QA signoff

## Results

Owner-confirmed development QA:

| Check | Result |
|---|---|
| Fresh Donated Design exclusion/restore | PASS |
| Fresh Customer Upload exclusion/restore | PASS |
| Historical purged upload | PASS |
| Delete workflow | PASS |
| Role permissions | PASS |
| General stability | PASS |
| Visible errors | None |

## Confirmed behavior

- Fresh exclusions preserve full-size source, production, preview, and thumbnail artwork.
- Fresh excluded uploads restore to Pending using the same document without duplication.
- Historical previously purged rows remain visibly but safely non-restorable.
- Donated Designs and Customer Uploads share the Pending/Excluded workflow.
- Owner/admin may delete eligible uploads; helpers may exclude/restore but cannot delete.
- Request-referenced and promoted uploads remain protected.
- Delete Upload uses an in-app modal; no native prompt, confirm, or alert appears.
- The menu prefers below-trigger placement and is not clipped.
- Eligible deletion removes the upload document and all four current schema-owned assets.
- Shared, malformed, archive, and unrelated paths fail closed.
- Partial Storage failure retains the upload document for retry.

## Verdict

**PASS.** The earlier restore failure was caused by the outdated development exclusion Function, not a remaining source defect. No production action occurred during development QA.

