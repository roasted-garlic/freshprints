# Test Report: Assisted proof download CORS residual + Approved label

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Plan | docs/workflow/plans/2026-07-17-assisted-proof-download-cors-residual-plan.md |
| Environment | local + `fresh-prints-dev` |
| Status | **pending_manual** |

---

## Automated

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Functions build | `npm run build` (cwd `functions`) | 0 | **pass** |
| Unit (retention + filename) | `npx tsx --test packages/shared/src/utils/assistedCreationApprovedProofRetention.test.ts packages/shared/src/utils/assistedCreationProofFileName.test.ts` | 0 | **pass** (17/17) |
| Lint (full repo) | not run this residual | — | skipped (narrow residual) |
| Portal build | not run this residual | — | skipped; Portal is client-only wiring |
| Deploy | `firebase deploy --only functions:customerGetAssistedCreationApprovedProofDownloadUrl --project fresh-prints-dev` | 0 | **pass** (created us-central1) |

---

## Manual

See updated steps in `docs/workflow/reviews/2026-07-17-assisted-approved-proof-download-manual-qa.md` (CORS residual section).

Awaiting owner: Download from `myprintrequest.dev` without CORS/`getBlob` errors; **Approved** badge on proof list (+ modal).

---

## Notes

- Root cause of FAIL: client `getBlob` requires Storage CORS; bucket had no ACAO for Portal origin.
- Fix: signed-URL callable; CORS `gsutil` documented as backup only (`docs/workflow/setup/firebase-storage-cors.md`).
