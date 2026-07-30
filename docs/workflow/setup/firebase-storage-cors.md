# Firebase Storage CORS

**Exact dev bucket:** `gs://fresh-prints-dev.firebasestorage.app` — confirmed live via
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in `apps/portal/.env.local` and by direct HTTPS request
(`fresh-prints-dev.appspot.com` 404s; `fresh-prints-dev.firebasestorage.app` 200s). An earlier
version of this doc referenced `fresh-prints-dev.appspot.com`, which is not this project's live
Storage bucket — any CORS previously "applied" against that name would have had no effect.

## Current use (2026-07-24): Portal generated-catalog snapshot consumption

Portal fetches generated catalog JSON (`generated/portal-catalog/**`, `generated/catalog-reference/manifest.json`
and `client/**`) directly from Storage via `getDownloadURL` + `fetch` in
`apps/portal/features/catalog/services/portalCatalogAssetService.ts`. These assets are public-read
(see `storage.rules` / `docs/standards/SECURITY.md` "Generated catalog snapshot boundary"), but a
public-read object still requires bucket CORS before a **browser** `fetch` from a third-party origin
(`https://myprintrequest.dev`, `http://localhost:3100`) can read the response — confirmed by the
exact browser console error:

```
Access to fetch at 'https://firebasestorage.googleapis.com/...' from origin
'https://myprintrequest.dev' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

A plain `curl`/Node `fetch` (no `Origin` header, not subject to CORS) succeeds against the same
URL — this is a browser-only failure, not a Storage Rules or asset-content problem.

Only `GET`/`HEAD` are needed (read-only asset fetch, no upload/resumable flow) and only
`Content-Type`/`Cache-Control`/`ETag` need to be exposed to the page's JS. See `storage.cors.json`
in the repo root for the current file.

## Prior use (still valid if ever revived): Assisted Creation proof download

Portal approved-proof download uses callable `customerGetAssistedCreationApprovedProofDownloadUrl`
(signed URL) — bucket CORS is **not** required for that flow, and `getBlob`/XHR reads are not used
anywhere in the current Portal codebase (verified via repo search, 2026-07-24). If a future feature
needs `getBlob`/XHR against Storage from a browser origin, it can reuse the same origin list here,
but should add back `OPTIONS` and any additional headers (e.g. `Authorization`) that flow actually
needs — do not add unused methods/headers preemptively.

## Apply (human — needs bucket owner credentials)

1. Inspect current config before changing anything:

```bash
gcloud storage buckets describe gs://fresh-prints-dev.firebasestorage.app --format="default(cors_config)"
```

2. Save the desired CORS JSON (see `storage.cors.json` in the repo root) and apply:

```bash
gcloud storage buckets update gs://fresh-prints-dev.firebasestorage.app --cors-file=storage.cors.json
```

(`gsutil cors set storage.cors.json gs://fresh-prints-dev.firebasestorage.app` is the older
equivalent command if `gcloud storage` is unavailable.)

3. Verify:

```bash
gcloud storage buckets describe gs://fresh-prints-dev.firebasestorage.app --format="default(cors_config)"
```

## Example `storage.cors.json` (current, read-only generated-asset fetch)

```json
[
  {
    "origin": [
      "https://myprintrequest.dev",
      "http://localhost:3100",
      "http://127.0.0.1:3100"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": [
      "Content-Type",
      "Cache-Control",
      "ETag"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Do **not** open write methods from browser origins unless a separate upload design requires it and
is security-reviewed. This CORS change only affects which browser origins may read response bodies
for objects that are **already public per Storage Rules** — it does not itself grant or widen read
access, and it must not be used to add CORS entries for `generated/catalog-reference/ai/**` (private,
Admin-SDK-only; unaffected by and unrelated to this change).

## Production

Do not apply production CORS changes without an explicit human production approval checkpoint.
`https://myprintrequest.com` is intentionally **not** included in the current dev bucket CORS config
above — production CORS is its own deployment checkpoint against the production bucket, not this one.
