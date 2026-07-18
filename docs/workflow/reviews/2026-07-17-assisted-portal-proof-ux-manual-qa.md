# Manual QA - Portal proof UX + download (residual)

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Environment | `fresh-prints-dev` / `myprintrequest.dev` (or local Portal) |
| Status | **PASS** (owner, 2026-07-17) |
| Resolution | Owner replied **PASS this** for the proof-download / Portal proof UX workstream and absorbed residuals (Completed/Approved labels, Notes dedupe, download callable, Overview 14-day, Studio modal sizing). |

## Root cause (download "Failed to fetch")

Portal briefly used a raw HTTPS Function + browser `fetch`. That failed from `myprintrequest.dev` (CORS / Gen2 URL / incomplete deploy) as TypeError **Failed to fetch**.

**Fix:** Callable `customerGetAssistedCreationApprovedProofFile` - Admin downloads Storage bytes, returns base64; Portal decodes to blob to `<a download>`. Uses Firebase callable transport (same as other Portal callables).

**Deploy:**
```bash
firebase deploy --only functions:customerGetAssistedCreationApprovedProofFile --project fresh-prints-dev
```

Portal soft-reload after client changes (no production).

## Retest steps

1. Soft-reload Portal on `myprintrequest.dev` (or local with same Functions project).
2. Open an **approved** past request → **Overview** shows compact approved preview + **Download PNG** and **14-day** copy.
3. Download → file saves as `proof-N.png` (not open-in-tab); transparency preserved.
4. Open same proof under **Proofs** → modal: header **Proof N** + **Approved**, square contain preview, Status/Sent rows, single **Notes**, 14-day hint, Close + Download.
5. **Notes** → staff proof note once (no duplicate) + customer notes; no "Proof-ready email sent".
6. Modal width feels modestly wider than before; not cramped.

### Reply with
- `PASS` / `FAIL: ...` / `PASS WITH NOTES: ...`

## Owner result

**PASS** — 2026-07-17. Owner directed closeout of this workstream; no further owner retest required for commit.
