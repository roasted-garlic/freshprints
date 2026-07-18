# Firebase Storage CORS (optional backup)

> **Primary download path:** Portal approved-proof download uses callable
> `customerGetAssistedCreationApprovedProofDownloadUrl` (signed URL). Bucket CORS is **not**
> required for that flow.
>
> Use this only if a client again needs `getBlob` / XHR reads of Storage objects from browser
> origins such as `https://myprintrequest.dev`.

## Apply (human — needs bucket owner credentials)

1. Save CORS JSON (example below) as `storage.cors.json` outside secrets, or reuse the sample in this repo if present.
2. From a machine with `gcloud` / `gsutil` authenticated as a project owner:

```bash
gsutil cors set storage.cors.json gs://fresh-prints-dev.appspot.com
```

If the default bucket name differs, use the bucket shown in Firebase Console → Storage.

3. Verify:

```bash
gsutil cors get gs://fresh-prints-dev.appspot.com
```

## Example `storage.cors.json`

```json
[
  {
    "origin": [
      "https://myprintrequest.dev",
      "http://localhost:3100",
      "http://127.0.0.1:3100"
    ],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "x-goog-resumable",
      "x-firebase-storage-version",
      "x-goog-meta-*"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Do **not** open write methods from browser origins unless a separate upload design requires it and is security-reviewed.

## Production

Do not apply production CORS changes without an explicit human production approval checkpoint.
