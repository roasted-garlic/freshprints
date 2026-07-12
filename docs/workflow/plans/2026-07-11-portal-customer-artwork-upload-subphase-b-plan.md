# Plan: Portal Customer Artwork Upload — Sub-phase B (Trusted Backend)

| Field | Value |
|-------|-------|
| Date | 2026-07-11 |
| Author | Agent |
| Status | approved |
| Workflow | managed-phase |
| Parent | `docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` (revised; approved_with_changes) |
| Related | `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-subphase-b-review.md` |
| Depends on | Sub-phase A complete (`…-subphase-a-plan.md`, test passed_with_notes) |
| ADR | ADR-FP-073 |

---

## Goal

Ship the **trusted customer-upload backend and security boundary**: Cloud Functions for batch create + image/ZIP finalize, Firestore/Storage rules, required indexes, server-side validation/normalization/derivatives, and abuse controls — so Portal upload UI (Sub-phase C) can later be enabled only after this layer is deployed and verified.

**Planning only until this plan’s review is approved.** Do not implement Portal UI. Do not touch parked wipe.

---

## Background

Sub-phase A delivered shared types, limits, storage path helpers, transparency assessment, additive request-item source fields, ADR-FP-073, and design docs. No Functions/rules for customer uploads exist yet. `sharp` is already a Functions dependency (AI image prep only). No ZIP library in Functions today — Sub-phase B adds a streaming extractor (proposed: `yauzl`) under dependency review/owner approval.

---

## Scope

### In Scope

1. `createCustomerUploadBatch` callable  
2. Direct-image upload record creation (as part of batch create)  
3. `finalizeCustomerUpload` callable  
4. `finalizeCustomerUploadZip` callable (trusted server extract)  
5. Shared server image validation / transparency / normalize / derivatives  
6. Immutable source preservation; production PNG + preview/thumbnail WebP  
7. Technical status transitions; per-file failures; catalog status stays `not_eligible`  
8. Daily per-UID abuse counters + concurrent finalize leases  
9. Firestore rules, Storage rules, Firestore indexes  
10. Focused automated tests + docs (`BACKEND`/`FIREBASE`/`SECURITY`/`TESTING` as needed)  
11. Deploy + smoke-test instructions (owner-approved deploy)

### Out of Scope

- Portal upload UI / CTAs / confirmation UI / attach-to-request  
- Show Queue, Gang Sheet, export, Studio intake, AI promote/exclude/enqueue/prompt  
- Wipe integration; scheduled abandoned cleanup  
- Production Portal deploy; unrelated Studio tsc fixes (`StaffInboxBell`, audit trail)  
- Changing locked limits or transparency thresholds without owner approval  

**Portal upload UI remains hidden/unavailable until B Functions + rules + indexes are deployed and smoke-verified.**

---

## Affected Areas

### New (Functions)

| Path | Role |
|------|------|
| `functions/src/createCustomerUploadBatch.ts` | Batch + upload record create |
| `functions/src/finalizeCustomerUpload.ts` | Direct-image finalize |
| `functions/src/finalizeCustomerUploadZip.ts` | ZIP finalize + extract |
| `functions/src/lib/customerUploadProcessing.ts` | Decode, transparency, trim/upscale, derivatives, print-size metadata |
| `functions/src/lib/customerUploadZip.ts` | Safe ZIP scan/extract |
| `functions/src/lib/customerUploadRateLimit.ts` | Daily counters + concurrency leases |
| `functions/src/lib/customerUploadValidation.ts` | Request payload validation (+ tests) |
| `functions/src/lib/customerUploadStatus.ts` | Allowed technical-status transitions |
| Optional shared request/response types under `packages/shared/src/types/customerUpload/` | Callable DTOs |

### Modified

| Path | Change |
|------|--------|
| `functions/src/index.ts` | Export three callables |
| `functions/package.json` | Add ZIP dependency (e.g. `yauzl`) after owner ack |
| `firestore.rules` | `customerUploads`, `customerUploadBatches`, rate-limit/lease/idempotency docs |
| `storage.rules` | `/customer-uploads/...` before catch-all |
| `firestore.indexes.json` | Five composites from parent plan |
| Docs | `BACKEND.md` / `FIREBASE.md`, `SECURITY.md`, `TESTING.md`, `DATA_MODEL` (rate-limit docs) |

### Reuse (do not duplicate)

- `packages/shared/.../customerUpload*.ts`, transparency utils, storage path helpers, limits  
- `buildImportPrintSizeCreateFields`, `printSizeMath`, `derivativeGeneration.constants`  
- `requirePortalCustomer`, `errors.*`, `adminDb` / `adminStorage`, `withoutUndefinedFields`  
- Existing `sharp` (extend usage; no new image lib)

### Do not modify

- Portal/Studio UI feature folders  
- Wipe callable / parked wipe track  
- `printRequestItems` client create rules (still catalog/`designId` only — attach is Sub-phase C)

---

## Architecture Impact

- [x] Trusted boundary: client uploads bytes to Storage only; Admin SDK + callables own Firestore processing fields and derivatives.  
- [x] No Electron imports into Functions.  
- [x] No Storage trigger required for v1 (finalize-after-upload).  

---

## Security Impact

- [x] New public Portal callables + Storage write surface for customers.  
- [x] Rules deny direct processing-field writes; lifecycle in finalize.  
- [x] Human checkpoints for dependency add + all deploys.  

---

## Data Model Impact

- [x] Runtime writes to `customerUploads` / `customerUploadBatches` (schema from A).  
- [x] New operational collections for rate limits, concurrency leases, client idempotency keys (below).  
- [x] `catalogReviewStatus` remains **`not_eligible`** throughout B.  

---

## Backend Impact

- [x] Three `onCall` Functions; recommended `{ timeoutSeconds: 180, memory: "1GiB" }` for finalize/ZIP (image work; above AI’s 512MiB if needed — confirm during implement; floor **512MiB / 180s** like `enqueueAiEnrichment`).  
- [x] ZIP: streaming library; never send image/ZIP bodies through callable payloads.  

---

## Approach

### High-level flow

```text
createCustomerUploadBatch
  → Admin creates batch + (direct) upload docs awaiting_upload + returns paths
  → Client uploads source OR archive.zip to Storage
finalizeCustomerUpload | finalizeCustomerUploadZip
  → rate limit + concurrency lease
  → validate Storage object + ownership + status
  → process → ready | failed
```

### Callable options (locked intent)

| Callable | Auth | Memory / timeout |
|----------|------|------------------|
| `createCustomerUploadBatch` | `requirePortalCustomer` | default OK (or 60s) |
| `finalizeCustomerUpload` | `requirePortalCustomer` | **≥512MiB**, **180s** |
| `finalizeCustomerUploadZip` | `requirePortalCustomer` | **≥512MiB**, **180s** (prefer **1GiB** if extract+multi-image) |

---

## 1. `createCustomerUploadBatch`

### Input (validated)

```ts
{
  mode: "direct_images" | "zip";
  /** Required for direct_images: 1..25 declared files */
  files?: Array<{ originalFilename: string; declaredSizeBytes: number }>;
  /** Required for zip: declared compressed size */
  declaredZipSizeBytes?: number;
  /** Client idempotency key (UUID). Required. */
  clientRequestId: string;
}
```

### Behavior

1. `requirePortalCustomer(uid)`.  
2. Validate `clientRequestId` (non-empty, max 128 chars, `[A-Za-z0-9_-]+`).  
3. **Idempotency:** read `customerUploadIdempotency/{uid}_{clientRequestId}`; if exists and points to a batch, return that batch payload (no new quota).  
4. Enforce daily create-batch cap (**10**) via rate-limit transaction (skip increment on idempotent replay).  
5. Validate mode + counts/sizes against shared limit constants (declared sizes must not exceed caps; server re-checks on finalize).  
6. Generate `batchId` and (for direct) N `uploadId`s with Admin `doc().id`.  
7. Build paths via shared helpers only (`getCustomerUploadSourceStoragePath`, `getCustomerUploadBatchZipStoragePath`).  
8. Write `customerUploadBatches` + `customerUploads` (direct mode) with Admin SDK:
   - `technicalStatus: awaiting_upload`
   - `catalogReviewStatus: not_eligible`
   - confirmations false/null; no client-supplied paths/status/dims  
9. Write idempotency doc → `{ batchId, createdAt }`.  
10. Return `{ batchId, mode, uploads?: [{ uploadId, sourceStoragePath, originalFilename }], zipStoragePath? }`.

### ZIP mode at create

- Create batch only (no per-image uploads yet).  
- Return `zipStoragePath` for `archive.zip`.  
- Per-image docs created during `finalizeCustomerUploadZip`.

---

## 2. `finalizeCustomerUpload` (direct image)

### Flow

1. Auth + ownership of `uploadId` / `batchId`.  
2. Daily finalize-image cap (**50**); **idempotent success does not increment**.  
3. Acquire concurrency lease (max **3**).  
4. Load upload; require `customerUid` match.  
5. If `technicalStatus === ready` → release lease → return existing success (**no quota**).  
6. Allowed start states: `awaiting_upload` | `uploading` | `failed` | `validating` | `processing` (recover partial).  
7. Set `validating` → verify Storage object at **exact** `sourceStoragePath` from doc (fail `upload_missing` / `path_mismatch`).  
8. Download source bytes (size ≤ 25 MB).  
9. Magic/decode with `sharp` (`failOn: "error"` for security where practical):
   - Accept PNG / static WebP only  
   - Reject JPEG/GIF/SVG/PDF/AVIF/HEIC  
   - Reject animated WebP / APNG (pages/frames > 1 or format flags)  
10. Enforce dimension / pixel limits.  
11. Measure alpha → `assessMeaningfulTransparency` (Sub-phase A). Fail → `background_not_transparent` / user message **“Background is not transparent.”**  
12. Set `processing`: trim (Studio-aligned) → upscale if width &lt; 3000 → production PNG buffer.  
13. Write derivatives to canonical paths via Admin Storage (`save`/`upload`); **never overwrite source**.  
14. `buildImportPrintSizeCreateFields` for print metadata.  
15. Update upload → `ready` + paths/dims/transparency metadata; bump batch `readyCount` once (transactional guard).  
16. Release lease.  

### Idempotent derivative writes

- Derivative paths are deterministic per `uploadId`.  
- Re-finalize after `failed` may overwrite **only** production/preview/thumbnail for that uploadId.  
- Source object is immutable.

---

## 3. `finalizeCustomerUploadZip`

### Flow

1. Auth + batch ownership; mode must be `zip`.  
2. Daily ZIP finalize cap (**5**); successful idempotent replay no quota.  
3. Acquire concurrency lease.  
4. If batch already has extraction complete marker (`zipExtractionStatus: complete` on batch) → return existing per-file summaries.  
5. Verify `archive.zip` at canonical path; compressed size ≤ 50 MB.  
6. Stream-extract with **yauzl** (or equivalent streaming API):
   - Reject nested `.zip` entries  
   - Path safety: no `..`, absolute, drive letters, backslash tricks, duplicate names, symlinks  
   - Cap entries scanned (100), decompressed total (200 MB), ratio 20:1, accepted images ≤ 25  
7. For each accepted PNG/WebP candidate:
   - Create or reuse deterministic upload doc id: prefer `batchId` + stable hash of sanitized entry name (stored on batch `zipManifest`) so retries don’t duplicate  
   - Upload extracted bytes to that upload’s `source` path  
   - Run **same** `customerUploadProcessing` pipeline as direct finalize  
   - Persist per-file `ready`/`failed`  
8. Update batch `readyCount` / `failedCount` / `fileCount`; set `zipExtractionStatus: complete` (or `failed` if archive-level failure).  
9. Release lease.  

### Partial failure

- Ordinary per-image validation failures: continue other entries.  
- Archive safety violations (traversal, bomb, nested ZIP): fail closed for the ZIP operation; do not trust partial unsafe extract.

---

## 4. Daily rate-limit counter design

### Collection

```text
customerUploadRateLimits/{customerUid}_{yyyyMMdd}
```

`yyyyMMdd` = UTC calendar day (e.g. `20260711`).

### Fields

```ts
{
  customerUid: string;
  utcDay: string; // "2026-07-11"
  createBatchCount: number;
  finalizeImageCount: number;
  finalizeZipCount: number;
  updatedAt: Timestamp;
}
```

### Transaction strategy

- In a Firestore transaction: read doc (create if missing with zeros); if count ≥ cap → `resource-exhausted` / `failedPrecondition` with user-safe message; else increment by 1 and commit **after** authorization checks but **before** heavy work for create; for finalize, increment only when this invocation will perform **new** processing (not when short-circuiting `ready` / completed ZIP).  
- Clients cannot write this collection (rules deny all client access; Admin only).

### Expiration / cleanup

- Docs are tiny; no TTL required in B. Optional later: wipe/cleanup of docs older than 30 days (out of scope).  

### Quotas vs retries

| Case | Quota |
|------|-------|
| New batch create | +1 create |
| Idempotent `clientRequestId` replay | +0 |
| Finalize already `ready` | +0 |
| Finalize new / retry from `failed` | +1 image |
| ZIP already `zipExtractionStatus: complete` | +0 |
| ZIP first successful complete | +1 zip (charge at start of first non-complete attempt; if crash mid-way, next retry may re-charge — accept or use `quotaChargedAt` flag on batch once charged) |

**Locked preference:** set `quotaCharged: true` on batch/upload when a finalize attempt begins after passing the rate-limit increment, so crash mid-process does not double-charge on retry of the **same** upload/batch. New uploads still charge.

---

## 5. Concurrent finalize design

### Collection

```text
customerUploadFinalizeLeases/{leaseId}
```

`leaseId` = Auto-ID. Fields:

```ts
{
  customerUid: string;
  kind: "image" | "zip";
  targetId: string; // uploadId or batchId
  acquiredAt: Timestamp;
  expiresAt: Timestamp; // acquiredAt + 4 minutes
}
```

### Acquire

Transaction / query: count non-expired leases for `customerUid` where `expiresAt > now`. If ≥ **3**, reject with user-safe busy message. Else create lease.

Index: `customerUploadFinalizeLeases`: `customerUid` ASC + `expiresAt` ASC (add to indexes).

### Release

Delete lease in `finally` after finalize returns.

### Unexpected termination

- Stale leases expire after **4 minutes** and no longer count toward the cap.  
- No manual client clear.  
- Optional: on acquire, delete own expired leases for that uid (Admin query).

---

## 6. Technical status transitions

Allowed (server-enforced):

| From | To |
|------|-----|
| `awaiting_upload` | `uploading`, `validating`, `failed` |
| `uploading` | `validating`, `failed` |
| `validating` | `processing`, `failed` |
| `processing` | `ready`, `failed` |
| `failed` | `validating` (retry) |
| `ready` | (terminal for B; no further change except future C confirmations on other fields) |

Client never writes these fields.

`catalogReviewStatus` always `not_eligible` in B.

---

## 7. Firestore rules

### `customerUploadBatches/{id}` / `customerUploads/{id}`

- **Read:** customer if `resource.data.customerUid == auth.uid`; staff via `isStaff()`.  
- **Create/update/delete:** **deny** all client writes (Admin SDK only).  

### `customerUploadRateLimits/{id}`, `customerUploadFinalizeLeases/{id}`, `customerUploadIdempotency/{id}`

- **Deny all** client read/write (Admin only).  

### Do not

- Relax `printRequestItems` for upload-backed creates.  
- Weaken design/customer rules.  

---

## 8. Storage rules

Add **before** catch-all:

```text
/customer-uploads/{userId}/{uploadId}/source
/customer-uploads/{userId}/batches/{batchId}/archive.zip
```

| Rule | Behavior |
|------|----------|
| Write source / archive | `isCustomer()` && `userId == auth.uid` && size ≤ limit && contentType allowlist (image/png, image/webp, application/zip / octet-stream for zip) |
| Write production/preview/thumbnail | **deny** customers |
| Read | owner customer or `isStaff()` |
| Unauthenticated / other uid | deny |
| Catch-all | remains deny |

Lifecycle/status **not** in Storage rules — finalize callables enforce.

Do **not** use ready-design derivative public-read helpers for this tree.

---

## 9. Firestore indexes

Add to `firestore.indexes.json`:

1. `customerUploads`: `catalogReviewStatus` ASC + `createdAt` DESC  
2. `customerUploads`: `customerUid` ASC + `createdAt` DESC  
3. `customerUploads`: `printRequestId` ASC + `createdAt` DESC  
4. `customerUploads`: `technicalStatus` ASC + `updatedAt` DESC  
5. `customerUploadBatches`: `customerUid` ASC + `createdAt` DESC  
6. `customerUploadFinalizeLeases`: `customerUid` ASC + `expiresAt` ASC  

---

## 10. ZIP security (implementation checklist)

Reuse Studio path-safety ideas conceptually; implement in `customerUploadZip.ts`:

- Reject absolute paths, `..`, encoded traversal, duplicates, drive letters, `\` traversal  
- Reject symlink / unsupported entry types  
- Nested ZIP depth 0  
- Entry count / decompressed budget / ratio / per-file size  
- Sanitize `originalFilename` for display only; Storage paths from server IDs  
- Temp files under Functions `/tmp` with cleanup in `finally`  
- Never use entry name as Storage path  

**New dependency:** `yauzl` (streaming) — **human checkpoint** before add. Alternative `adm-zip` loads more into memory — prefer streaming.

---

## 11. Failure codes (align with A enums)

Map to `technicalFailureCode` + user-safe `technicalFailureMessage`:

| Situation | Code |
|-----------|------|
| Source missing | `upload_missing` |
| Path mismatch | `path_mismatch` |
| Decode error | `could_not_decode` |
| No/opaque alpha | `background_not_transparent` |
| Animation | `animated_rejected` |
| Format | `unsupported_format` |
| Size/dims/pixels | `image_exceeds_limits` |
| ZIP limits/safety | `archive_exceeds_limits` / `nested_archive_rejected` |
| Derivative/Firestore failure | `processing_failed` |
| Quota | throw callable error (not necessarily upload failed status) |
| Concurrency | throw callable error |

---

## 12. Test strategy

### New / extended tests

- `functions/src/lib/customerUploadValidation.test.ts`  
- `functions/src/lib/customerUploadRateLimit.test.ts` (pure helpers: day key, quota math, lease expiry)  
- `functions/src/lib/customerUploadStatus.test.ts`  
- `functions/src/lib/customerUploadZip.test.ts` (fixture buffers: traversal, nested zip, ratio — where feasible without full GCS)  
- `functions/src/lib/customerUploadProcessing.test.ts` (fixtures: opaque/transparent PNG/WebP, upscale math hooks; sharp in Functions test env)  
- Extend `packages/shared/.../storageRulesAlignment.test.ts` (or new) for 25 MB customer source / ZIP caps string alignment  
- Firestore rules: **no harness today** — document manual/emulator checklist; optional add `@firebase/rules-unit-testing` only if owner approves new dependency (not required to start B)

### Commands (test phase)

```bash
npm run lint
npm run typecheck --workspace @fresh-prints/portal
npm --prefix functions run build
npx tsx --test functions/src/lib/customerUpload*.test.ts packages/shared/src/constants/storageRulesAlignment.test.ts
```

Studio tsc: confirm no **new** errors from B file set; do not fix unrelated StaffInbox/audit failures.

---

## 13. Deployment sequence

1. Owner approves new ZIP dependency (if any).  
2. Implement + unit tests + `functions` build.  
3. Owner approves deploy to **`fresh-prints-dev`** (not production):  
   - `firebase deploy --only functions:createCustomerUploadBatch,functions:finalizeCustomerUpload,functions:finalizeCustomerUploadZip,firestore:rules,storage,firestore:indexes --project fresh-prints-dev`  
   (exact filter syntax per project conventions)  
4. Smoke test (below).  
5. **Only then** may Sub-phase C enable Portal UI.  

No production project deploy without separate approval. Never touch wipe allowlist.

### Smoke-test checklist (dev)

- [ ] Test customer creates direct batch; uploads PNG to returned path; finalize → `ready` + three derivatives  
- [ ] Opaque PNG → failed + “Background is not transparent.”  
- [ ] JPEG → unsupported  
- [ ] Second finalize on ready → success, no duplicate  
- [ ] ZIP with two PNGs → two uploads; nested ZIP rejected  
- [ ] Other customer cannot read Storage/Firestore  
- [ ] 11th batch create same UTC day rejected  
- [ ] Portal UI still has no upload CTA  

---

## Human Checkpoints Anticipated

- [x] Add ZIP npm dependency  
- [x] Deploy Functions / Firestore rules / Storage rules / indexes  
- [x] Change locked limits or transparency thresholds  
- [x] Weaken customer isolation  
- [x] Enable Portal upload UI (Sub-phase C gate)  
- [x] Production Firebase project  
- [x] App Check (optional later — not a B dependency)

---

## Documentation Updates Required

- [x] `docs/architecture/BACKEND.md` or `FIREBASE.md` — callables, limits, deploy  
- [x] `docs/standards/SECURITY.md` — rules summary already sketched; mark B as implemented when done  
- [x] `docs/standards/TESTING.md` — B test commands  
- [x] `docs/architecture/DATA_MODEL.md` — rate-limit / lease / idempotency collections  

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| ZIP bombs / memory | High | Streaming extract; hard budgets; 1GiB function memory |
| Quota double-charge on crash | Medium | `quotaCharged` flag on target |
| Lease leak | Medium | 4-minute expiry |
| Sharp OOM | Medium | Dimension/pixel caps before full decode where possible |
| Rules gap | High | Deny client writes; smoke cross-customer access |

---

## Open Questions

- [ ] Owner: approve `yauzl` (or chosen ZIP lib) before implement  
- [ ] Owner: confirm Functions memory **512MiB vs 1GiB** for ZIP finalize at deploy time  
- [ ] None other for plan review — limits/transparency locked  

### `[NEEDS REPO CHECK]` → resolved

| Item | Resolution |
|------|------------|
| Portal customer auth helper | `requirePortalCustomer` in `functions/src/lib/portalCustomer.ts` |
| Sharp in Functions | Present `^0.33.5`; used in `prepareAiAnalysisImage.ts` |
| Storage Admin pattern | `adminStorage.bucket().file(path).download()` |
| Idempotency precedent | Registration `alreadyProvisioned`; no request-token framework — B introduces `clientRequestId` + `customerUploadIdempotency` |
| Rules test harness | None for Firestore; Storage alignment test only |
| ZIP dependency | None — must add |

---

## Acceptance Criteria

(As listed in the Sub-phase B request — batch create, direct finalize, ZIP, security, deployment readiness.) Implementation/signoff must evidence each checkbox.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-11-portal-customer-artwork-upload-subphase-b-review.md`
- Verdict: **approved** (2026-07-11)
- Implementation: allowed after this approval; deploys and ZIP dependency remain human checkpoints
- Portal UI: **still out of scope** until B deploy + smoke verification
