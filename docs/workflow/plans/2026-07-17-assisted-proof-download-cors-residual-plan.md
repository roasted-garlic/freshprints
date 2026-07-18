# Plan: Assisted proof download CORS residual + Approved label

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase (residual) |
| Parent | docs/workflow/plans/2026-07-17-assisted-approved-proof-download-plan.md |
| Related | docs/workflow/reviews/2026-07-17-assisted-proof-download-cors-residual-review.md |

---

## Goal

Portal customers can download the approved Assisted Creation proof from `https://myprintrequest.dev` without Storage CORS failures, and the approved proof is clearly labeled **Approved** in the proof list (and modal title).

## Background

Owner FAIL on manual QA for ADR-FP-093:

1. **Download CORS:** Portal uses client `getBlob()` against `firebasestorage.googleapis.com` (`fresh-prints-dev`). Browser reports missing `Access-Control-Allow-Origin` for origin `https://myprintrequest.dev`. `getBlob` needs CORS even when the object returns HTTP 200; thumbnails via `getDownloadURL` in `<img>` can still work.
2. **Approved label:** Proof list shows thumbnail + “Proof N (latest)” + “Has note” but no Approved indicator for the pinned approved proof.

## Scope

### In Scope

- New callable `customerGetAssistedCreationApprovedProofDownloadUrl` returning a short-lived GCS signed URL (+ fileName / contentType)
- AuthZ: authenticated Portal customer owns request; status approved; shared eligibility (not purged; within 14d / legacy rules); object exists
- Portal Download buttons call the callable and trigger browser download via the signed URL (no `getBlob`)
- Proof list + modal title: clear **Approved** badge/chip on the approved proof
- Docs: BACKEND, SECURITY, DECISIONS (amend ADR-FP-093)
- Deploy new callable to `fresh-prints-dev` only
- Document optional Storage CORS backup (`cors.json` + gsutil) — not required if signed URL works

### Out of Scope

- Production deploy
- Commits
- Changing purge lifecycle / retention days
- Making bucket public
- Fixing unrelated thumbnail CORS (img + token URL)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/.../assistedCreationActions.types.ts` — request/response types
- `functions/src/customerGetAssistedCreationApprovedProofDownloadUrl.ts` (new)
- `functions/src/index.ts` — export
- `apps/portal/.../assistedCreationService.ts` — callable + URL download helper
- `apps/portal/.../AssistedCreationDetailPanels.tsx` — Download + Approved label
- `apps/portal/.../AssistedCreationStatusPanel.tsx` — Download via callable
- `apps/portal/styles/assisted-creation.css` — badge in proof row if needed
- Docs: BACKEND.md, SECURITY.md, DECISIONS.md
- Optional: `docs/workflow/setup/firebase-storage-cors.md` + `storage.cors.json` example

### Architecture Impact

- [x] Details: Download moves from client Storage `getBlob` to Functions Admin signed URL. Previews stay on client `getDownloadURL`.

### Security Impact

- [x] Details: Callable enforces ownership + eligibility before minting URL. Signed URL TTL short (~15 min). No public ACL. Filename via `responseDisposition` only for approved object.

### Data Model Impact

- [x] None (no new persisted fields)

### Backend Impact

- [x] Details: New callable; Admin Storage `getSignedUrl`. Deploy to `fresh-prints-dev`.

### UI / UX Impact

- [x] Details: Download UX unchanged (button). Approved chip on list row + modal title.

### Migration Impact

- [x] None

---

## Approach

1. Add shared request/response types.
2. Implement callable: `requirePortalCustomer` → load request → ownership → `evaluateAssistedCreationApprovedProofDownload` → `file.exists()` → `getSignedUrl({ action: 'read', expires, responseDisposition, responseType })`.
3. Portal service: `getApprovedProofDownloadUrl(requestId)` + `triggerBrowserDownloadFromUrl(url)`.
4. Wire StatusPanel + ProofDetailModal Download buttons to callable (drop `getBlob` path for this flow).
5. Resolve approved proof id; show **Approved** badge on matching list row and modal header.
6. Update docs; deploy callable to dev; unit tests if any pure helpers added; manual retest checkpoint.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit tests | `npm test` / package script for shared retention + filename | yes (existing) |
| Functions typecheck/build | `npm run build` in `functions` (or repo script) | yes if available |

### Manual

| Check | Steps | Pass |
|-------|-------|------|
| Download from myprintrequest.dev | Approved request → Download → file saves; no CORS/`getBlob` console errors | |
| Approved label | Proofs tab → approved proof shows Approved chip; modal title includes Approved | |

---

## Human Checkpoints

- [x] Manual UI retest after deploy (download + label)
- [ ] Storage CORS gsutil apply — only if signed URL path fails; needs owner credentials

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Signed URL mint fails (IAM / ADC) | Functions default SA already uses Admin Storage; verify exists() + clear error |
| Cross-origin `download` attr ignored | Set `Content-Disposition: attachment` on signed URL |
| CORS still needed for something else | Thumbnails use token URL in img; document cors.json as backup only |

**Rollback:** Redeploy previous Functions (remove callable); Portal can temporarily hide Download. No data migration.

---

## Documentation Updates

- BACKEND.md — download via signed-URL callable
- SECURITY.md — AuthZ for URL minting
- DECISIONS.md — amend ADR-FP-093 decision #5
- Optional setup note for Storage CORS backup

---

## Open Questions

None — owner directed signed-URL callable preference.
