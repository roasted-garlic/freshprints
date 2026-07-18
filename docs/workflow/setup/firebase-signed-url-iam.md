# Signed URL IAM for Cloud Functions (Gen2)

> Required for Admin Storage `getSignedUrl` on Gen2 callables that mint
> short-lived download URLs (e.g. `customerGetAssistedCreationApprovedProofDownloadUrl`).

## Symptom

Callable returns **Unable to prepare the download right now.** Function logs show:

```text
Permission 'iam.serviceAccounts.signBlob' denied
SigningError
```

Eligibility, ownership, and `file.exists()` can all succeed; only V4 signing fails.

## Cause

Gen2 functions run as the default Compute Engine service account. ADC signing uses
the IAM Credentials `signBlob` API, which requires
`roles/iam.serviceAccountTokenCreator` **on that service account** (self-binding).

## Fix (`fresh-prints-dev`)

Runtime SA (from function service config):

`695546728466-compute@developer.gserviceaccount.com`

Grant Token Creator to itself:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  695546728466-compute@developer.gserviceaccount.com \
  --project=fresh-prints-dev \
  --member="serviceAccount:695546728466-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

No Functions redeploy is required after the binding; cold starts pick up IAM promptly.

## Production

Do **not** apply production IAM changes without an explicit human production approval
checkpoint. Confirm the production runtime service account email from the deployed
function’s service config before binding.

## Related

- Callable: `customerGetAssistedCreationApprovedProofDownloadUrl`
- ADR-FP-093
- Optional Storage CORS backup: `docs/workflow/setup/firebase-storage-cors.md`
