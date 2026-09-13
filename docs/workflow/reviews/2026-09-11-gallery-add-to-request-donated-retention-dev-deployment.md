# DEV deployment — Gallery Add-to-Request + donated 30-day shelf life

**Date:** 2026-09-11  
**Project:** `fresh-prints-dev`  
**Branch:** `development`  
**Owner phrase:** “Please dev deploy”

## Deployed

```text
firebase deploy --project fresh-prints-dev --only functions:attachExistingCustomerUploadsToPrintRequest,functions:confirmCustomerUploadsForDonation,functions:promoteCustomerUploadToAiReview,functions:purgeExpiredCustomerUploadCatalogRetention,functions:purgeExpiredCustomerUploadCatalogRetentionScheduled,firestore:indexes
```

**Result:** exit 0 — Deploy complete.

| Target | Result |
|--------|--------|
| `attachExistingCustomerUploadsToPrintRequest` | **created** |
| `confirmCustomerUploadsForDonation` | updated |
| `promoteCustomerUploadToAiReview` | updated |
| `purgeExpiredCustomerUploadCatalogRetention` | updated |
| `purgeExpiredCustomerUploadCatalogRetentionScheduled` | updated |
| `firestore:indexes` | deployed (new `catalogExclusionReason` + `catalogRetentionStartedAt` composite) |

## Not deployed

- Production
- Firestore Rules / Storage Rules
- App Hosting
- Bare `--only functions`

## Notes

- Portal gallery Add-to-Request UI is local (no App Hosting on DEV); hard-refresh Portal against `fresh-prints-dev`.
- New donation confirms start the 30-day `unpromoted_donation` clock; existing donations may lack the field until re-confirmed or a backfill (out of scope).
- Index may show as building briefly in Firebase console before donation retention queries are ready.
