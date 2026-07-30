# Plan: Increase the MB Limit for Custom-Request (Assisted Creation) Reference Images

| Field | Value |
|-------|-------|
| Date | 2026-07-29 |
| Author | FreshForge Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md` |

---

## Goal

Present evidence-based options for safely raising the current 15 MB per-file limit on Assisted
Creation ("custom-request") reference images, without weakening validation, silently drifting
between enforcement layers, reviving the previously-fixed preview-hang bug class, or touching the
unrelated customer-upload artwork pipeline. **No new limit is chosen in this Plan.** This Plan stops
for an explicit owner decision on the target MB value before any Implement phase begins.

## Background

Goal #9 (`customer-upload-oversized-image-normalization-and-processing-performance`, signed off
2026-07-29) scoped this work as "Workstream B" and explicitly declined to implement it or invent a
target value, since no ADR, plan, or review anywhere in the repository records an intended
replacement number. This Plan re-verifies every fact from Goal #9's Workstream B section against
current source (all matched — no drift found) and extends the investigation into areas Goal #9 did
not cover in depth: the full enforcement-layer count, upload/download memory behavior, the
already-documented preview-hang bug class, cleanup/retry gaps, and abuse-protection posture.

**Critical scope boundary, verified:** custom-request reference images
(`assistedCreationRequests/{id}.referenceImages`, Storage prefix `assisted-creation/`) are an
entirely separate feature from customer-upload print-request artwork (`customerUploads`,
`customerUploadBatches`, `finalizeCustomerUpload`/`finalizeCustomerUploadZip`, Storage prefix
`customer-uploads/`). They share no code, no Storage path, no Firestore collection, and no
validation constant. Goal #9's bounded-concurrency ZIP fix and ADR-FP-123 are untouched by this
Plan.

---

## Exact Files and Storage Paths Discovered

### Client (Portal)

| Concern | File | Notes |
|---|---|---|
| File picker UI | `apps/portal/features/assisted-creation/components/AssistedCreationReferenceUpload.tsx` | `<input type="file" multiple accept="image/jpeg,image/png,image/webp">`; truncates selection to `ASSISTED_CREATION_MAX_REFERENCE_IMAGES` at line 55; copy string (line 44-47) reads the byte constant directly — no separate hardcoded MB string to update |
| Upload/validation/download service | `apps/portal/features/assisted-creation/services/assistedCreationService.ts` | `validateReferenceFiles` (:326-339, real enforcement), `uploadPendingReferences` (:354-377, sequential `uploadBytes` calls), `getDownloadUrl`/`getPreviewObjectUrl` (:487-538, `getDownloadURL`-first + timed `getBytes` fallback, `STORAGE_DOWNLOAD_TIMEOUT_MS = 12_000` at :58) |
| Step-level gating | `apps/portal/features/assisted-creation/utils/assistedCreationStepValidation.ts:51-57` |  |
| Portal display consumers | `apps/portal/features/assisted-creation/components/AssistedCreationMediaThumbs.tsx`, `AssistedCreationDetailPanels.tsx` | `[NEEDS REPO CHECK during Implement: confirm exact preview-loading call sites in these two files use the same `getPreviewObjectUrl` service function before any Implement change touches them]` |

### Client (Studio)

| Concern | File | Notes |
|---|---|---|
| Staff request view / reference loader | `apps/studio/src/renderer/src/features/customer-requests/components/AssistedCreationRequestsSection.tsx` | `loadAssistedReferencePreview` (:216-266) — same `getDownloadUrl`-first-then-`getBytes`-fallback pattern, blob-URL revoke on unmount (:192-198) |
| Studio download/service | `apps/studio/src/renderer/src/features/customer-requests/services/assistedCreationRequestsService.ts` | `getDownloadUrl` (:475-483, 12s timeout), `downloadBytes` (:499-501, 12s timeout); also builds the staff-only proof (:402) and final-source (:438) Storage paths |

### Shared

| Concern | File | Notes |
|---|---|---|
| **Constants (the file Goal #9 referenced by name, path confirmed)** | `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` | `ASSISTED_CREATION_MAX_REFERENCE_IMAGES = 8` (:11), `ASSISTED_CREATION_MAX_REFERENCE_BYTES = 15 * 1024 * 1024` (:12), `ASSISTED_CREATION_ALLOWED_REFERENCE_TYPES = ["image/jpeg","image/png","image/webp"]` (:16-20), `ASSISTED_CREATION_MAX_PROOF_BYTES = 25 * 1024 * 1024` (:22, separate staff-only constant, already live precedent — see Options below), `ASSISTED_CREATION_APPROVED_PROOF_RETENTION_DAYS = 14` (:30) |
| Server-side validation (submit path) | `packages/shared/src/utils/assistedCreationValidation.ts:478-539` (`parseAssistedCreationReferenceImageInputs`) |  |
| Server-side validation (update path — duplicated logic) | same file, `:400-476` (`parseAssistedCreationReferenceImageUpdateInputs`) | Independently re-implements the same count/type/size checks — a second manual-sync point (see Consistency Findings) |
| Type definition | `packages/shared/src/types/assistedCreation/assistedCreation.types.ts:44-52` | `AssistedCreationReferenceImage { id, storagePath, fileName, contentType, sizeBytes, uploadedAt }` — no thumbnail/derivative field exists |

### Storage / Rules

| Concern | Location | Notes |
|---|---|---|
| Storage Rules block | `storage.rules:142-184` | `isValidAssistedCreationImage()` (:150-153, hardcoded literal `15 * 1024 * 1024` — **cannot import the TS constant**, must be manually kept in sync per the file's own comment at :143); pending path `assisted-creation/{userId}/pending/{fileId}` (:160-166, customer-writable); durable path `assisted-creation/{userId}/{requestId}/references/{fileId}` (:168-171, **`allow create, update, delete: if false` — clients can never write here, only server-side copy**) |
| Promote/copy logic | `functions/src/lib/assistedCreationReferencePromote.ts` (79 lines, read in full) | Pure GCS `bucket.file().copy()` + best-effort `delete()` of the pending source — **no image processing, no Sharp, no resize**. Idempotent (already-promoted paths pass through unchanged, :36-39). Silently degrades on copy failure (keeps the old, still-owner-readable pending path) rather than throwing. |
| Callable entrypoints | `functions/src/assistedCreationRequests.ts` | 10 exported `onCall(...)` callables, **none with a `memory`/`timeoutSeconds` option** — confirmed via direct grep, every call is bare `onCall(async (request) => ...)`; no `setGlobalOptions` exists anywhere in `functions/src/*.ts`. Only `submitAssistedCreationRequest` (:252, calls `promoteAssistedCreationReferenceImages` at :326) ever invokes the promote function. |

---

## Confirmed Current Limits (every enforcement layer)

| Layer | Value | File:line |
|---|---|---|
| Client truncation (file count) | 8 | `AssistedCreationReferenceUpload.tsx:55` |
| Client validation (count + type + size) | 8 files, JPEG/PNG/WebP, 15 MB/file | `assistedCreationService.ts:326-339` |
| Server validation — submit path | 8 files, JPEG/PNG/WebP, 15 MB/file | `assistedCreationValidation.ts:478-539` |
| Server validation — update path (separate function) | 8 files, JPEG/PNG/WebP, 15 MB/file | `assistedCreationValidation.ts:400-476` |
| Storage Rules (the only *authoritative* byte-size gate — cannot be spoofed by client-reported `sizeBytes`) | 15 MB, `image/jpeg\|png\|webp` | `storage.rules:150-153` |
| **Total enforcement points for the 15 MB value** | **4 independent, manually-synced locations** | — |

**8-file count limit:** confirmed current and enforced identically in all 4 locations above; this
Plan does not propose changing it (out of scope unless the owner explicitly directs otherwise).

**Total-request byte ceiling:** **confirmed absent at every layer.** No code anywhere sums
`sizeBytes` across the reference-image array. The only implicit ceiling is `8 × per-file limit`
(currently 120 MB worst case). See "Should a Total-Request Ceiling Be Added?" below.

**Consistency finding:** the client-supplied `sizeBytes` field in the callable payload is **trusted
metadata, not independently re-verified against the real Storage object**
(`assistedCreationValidation.ts:462-464,525-527` only check `typeof item.sizeBytes === "number"` and
the numeric ceiling — they never call `bucket.file(storagePath).getMetadata()` to confirm the actual
uploaded object size). This is not a security gap in practice, because Storage Rules independently
and authoritatively enforces the real `request.resource.size` at write time — a customer cannot
write an oversized object regardless of what `sizeBytes` they later claim in the callable. It does
mean the 4-location "sync" is slightly misleading: 3 of the 4 (client, submit-parser, update-parser)
are advisory/UX-layer checks against a self-reported number, and only Storage Rules is the real
security boundary. This should be preserved exactly as-is; it is not a defect this Plan should fix.

---

## Full Pipeline Trace (all 20 required items)

1. **Portal file selection** — `AssistedCreationReferenceUpload.tsx:49-61`, multi-file `<input>`, local `URL.createObjectURL` previews, revoked on unmount.
2. **Client-side file validation** — `assistedCreationService.ts:326-339` (`validateReferenceFiles`), called from `uploadPendingReferences` before any upload begins.
3. **File-count validation** — enforced client-side at selection (`:55`) and again in `validateReferenceFiles`; server-side in both parser functions.
4. **Per-file byte validation** — 4 layers, see table above.
5. **Total-request byte validation** — **none found**, confirmed absent.
6. **Storage destination/naming** — no shared path-builder function exists for this feature (unlike customer-uploads' `customerUploadStoragePaths.ts`); paths are built inline as string templates: pending `assisted-creation/${uid}/pending/${id}` (`assistedCreationService.ts:363`), durable `assisted-creation/${customerUid}/${requestId}/references/${id}` (`assistedCreationReferencePromote.ts:26,48-49`), proofs `assisted-creation/${uid}/${requestId}/proofs/${id}`, final `assisted-creation/${uid}/${requestId}/final/${id}` (both Studio-only, `assistedCreationRequestsService.ts:402,438`).
7. **Storage Rules enforcement** — full block `storage.rules:142-184`, reproduced and reviewed in the Files table above; durable references path is `create/update/delete: if false` for all clients, so real byte enforcement for this feature only ever fires at the `pending/` write.
8. **Callable/server-side validation** — `functions/src/assistedCreationRequests.ts`, 10 callables, reference-image bytes never pass through any callable body (client uploads directly to Storage via the SDK; callables only receive small JSON metadata arrays).
9. **Upload authorization** — two layers: Storage Rules path-segment ownership check (`userId == request.auth.uid`) plus callable-side `requirePortalCustomer` + `storagePath.startsWith(pendingPrefix)` check preventing a customer from claiming another customer's pending path in the JSON payload.
10. **Metadata persistence** — `AssistedCreationReferenceImage[]` array field `referenceImages` on `assistedCreationRequests/{id}` (Firestore), written at `assistedCreationRequests.ts:294-297,317`.
11. **Staff access (Studio)** — `AssistedCreationRequestsSection.tsx:216-266` + `assistedCreationRequestsService.ts:475-509`.
12. **Customer access (Portal)** — `assistedCreationService.ts:487-538`.
13. **Preview/download behavior** — `getDownloadURL()` first (12s timeout), fallback to timed `getBytes()` → `Blob` → `URL.createObjectURL()`. Identical pattern in both apps.
14. **Copy/promote** — `assistedCreationReferencePromote.ts`, pure GCS copy+delete, no image processing, called only from `submitAssistedCreationRequest`.
15. **Cleanup/deletion** — **no expiry or scheduled cleanup exists for abandoned `pending/` reference uploads.** (Proofs have a 14-day retention purge; references do not.) This is a pre-existing gap, not something this goal is introducing or required to fix, but it interacts with a larger limit (see Cost analysis).
16. **Retry/partial-failure** — `uploadPendingReferences` uploads sequentially in a `for` loop; the first failure throws immediately, leaving already-uploaded files as orphaned pending objects (compounding the item-15 gap) with no automatic cleanup or user-facing retry.
17. **Abuse protection/quotas** — only an indirect one-open-request-per-customer cap (`assistedCreationRequests.ts:279-290`); no daily/hourly upload-count or byte-volume quota exists for reference images specifically (unlike customer-uploads' `CUSTOMER_UPLOAD_DAILY_FINALIZE_IMAGE_LIMIT`).
18. **Function memory/timeout/request-size** — all 10 callables use v2 platform defaults (256 MiB / 60s, `firebase-functions ^6.3.0`, no override anywhere); **irrelevant to a byte-limit increase** because callables never receive image bytes, only JSON metadata well under the ~10 MB v2 callable body ceiling.
19. **Browser/SDK upload constraints** — single-shot `uploadBytes` (not resumable `uploadBytesResumable`), no progress callback, no cancel UI.
20. **Email/notification interaction** — the proof-ready email trigger (`onEmailDeliveryJobCreated.ts`) does not read or embed `referenceImages` at all — confirmed no interaction.

---

## Answers to Required Questions

- **Is 8 files/request still correct?** Not proposed to change in this Plan (out of scope unless the
  owner explicitly directs otherwise in Review).
- **Total-request byte ceiling exists today?** No.
- **Should one be added when the per-file limit increases?** **Yes, recommended.** Raising the
  per-file limit without an aggregate ceiling multiplies the implicit worst case linearly
  (`8 × new limit`) with no counterbalancing control. See Options below — each option includes a
  paired total-request recommendation.
- **Are uploads resumable?** No — `uploadBytes`, single-shot.
- **Read entirely into browser/Function memory?** Browser: yes, on the upload side (`File` object
  held in memory pre-upload — normal browser behavior, not a new risk). Function: no — bytes never
  pass through a callable. On the *read* side, both apps' fallback path (`getBytes()`) pulls the
  full object into renderer/browser memory as a `Blob`, up to the per-file ceiling, when
  `getDownloadURL()` fails.
- **Does the server copy without decoding?** Yes, confirmed — `assistedCreationReferencePromote.ts`
  is a pure byte-level GCS `copy()`, no image library involved.
- **Are dimensions/megapixels validated?** No — confirmed absent (unlike customer-upload artwork's
  `CUSTOMER_UPLOAD_MAX_DIMENSION_PX`/`CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`). Not proposed to add in this
  Plan (would be a new validation dimension, out of the "MB limit" scope) but flagged as a residual
  risk in Security Impact below.
- **Non-image files or animated formats blocked?** MIME-type allowlist only (3 image types); no
  extension check; **animated WebP is not blocked** (same content-type as static WebP, no
  frame-count check anywhere).
- **MIME type and extension both validated?** **Only MIME type.** No extension allowlist/regex
  exists anywhere in the pipeline.
- **Compressed file expanding into excessive decoded memory on preview?** Only a risk on the
  `getBytes()` fallback path, and only proportional to file size (no decompression-bomb-style
  amplification exists for JPEG/PNG/WebP raster formats the way it can for archives — these are
  raster image formats, not compressed containers with extreme expansion ratios).
- **Does Studio fetch the full file just for a thumbnail?** **Yes — confirmed no thumbnail/preview
  derivative exists for reference images**, unlike catalog Designs. Every preview render (Studio grid,
  Portal detail view) loads the full-resolution original.
- **Signed URLs or getBytes?** `getDownloadURL()` first (informally called "signed" in code
  comments, but is actually a Firebase Storage download-token URL, not a cryptographic GCS v4 signed
  URL), falling back to timed `getBytes()`.
- **Could a larger limit revive the previously-fixed hang?** See dedicated section below — this is
  the single most important risk this Plan must address.
- **Do mobile customers need clearer progress/cancel/timeout copy?** Given no progress callback or
  cancel UI exists today, and a larger limit increases upload/download duration on slow connections,
  **yes, this should be considered** — see Options and Risks.
- **New quota/abuse control required?** Recommended alongside a total-request ceiling — see Options.
- **Material Storage/egress cost increase?** Quantified per option below.
- **Should the limit stay a shared code constant, or become configurable?** Recommended: **stay a
  shared code constant**, consistent with `ASSISTED_CREATION_MAX_PROOF_BYTES`'s existing precedent
  and this repo's stated preference (per the Formal Review process) against introducing new runtime
  configuration surfaces without a specific need — no evidence in this investigation suggests the
  limit needs to change without a code deploy (unlike, e.g., customer-upload quotas, which *are*
  Studio-Settings-configurable for a documented operational reason not present here).

---

## The Preview-Hang Risk — Direct Analysis

`docs/project/DECISIONS.md:525-550` (undesignated ADR, "Related: ADR-FP-110 proof hardening; Studio
ref-thumb hang hotfix," 2026-07-21) records that `getBytes()` could hang indefinitely in
Electron/Studio and sometimes Portal on certain network/CORS conditions — **this was a hang bug
caused by network/CORS behavior, not file size**, and reference-image previews were the *first*
place this was hardened (proofs were fixed later, to parity). The fix already in place
(`getDownloadURL()`-first, 12-second timeout, settle-to-"Preview unavailable" rather than hang
forever) is **independent of file size** — it bounds wall-clock time, not bytes.

However, a larger per-file limit does have one real, size-correlated effect: on the `getBytes()`
fallback path (which only triggers when `getDownloadURL()` itself fails), a larger file takes
proportionally longer to transfer within that same 12-second window on a slow connection, raising
the probability that the fallback *also* times out (correctly, per the existing "settle to
unavailable" design — this is not a hang, it is the intended timeout behavior firing more often).
This is a real but bounded UX-degradation risk, not a regression of the fixed hang bug itself.

**Direct empirical precedent:** `ASSISTED_CREATION_MAX_PROOF_BYTES = 25 MB` already runs successfully
in production today, through the **identical** `getDownloadURL`-first/`getBytes`-fallback/12s-timeout
architecture (proofs and references share the same download-service pattern). This is strong
evidence that at least 25 MB is already proven safe against the hang-bug class at this repo's
current architecture, since it is already live.

---

## Evidence-Based MB-Limit Options

All three options assume the per-file byte constant, its 4 enforcement-layer copies, and a paired
total-request ceiling change together (never independently — see Consistency Findings).

### Option 1 — Conservative: 15 MB → 20 MB

| Factor | Assessment |
|---|---|
| Max 8-file total | 160 MB (up from 120 MB) |
| Browser memory impact | Negligible — well within normal `File`/`Blob` handling; no change in kind, only degree |
| Upload-time impact | ~33% longer worst-case single-file upload vs. today; still well under the proof-upload precedent |
| Storage impact | ~33% more Storage bytes per fully-loaded request in the worst case |
| Function impact | **None** — bytes never pass through a callable |
| Preview/download impact | Marginal increase in `getBytes()` fallback duration; stays safely below the 25 MB proof precedent already live in production |
| Mobile-network risk | Low — smallest of the three options |
| Abuse/cost | Minimal increase; recommend pairing with a 100 MB total-request ceiling (below the current implicit 160 MB worst case) |
| Rules/constants/UI/tests/Functions changes needed | Constant value (1 file), Storage Rules literal (1 file), 2 validation-parser numeric ceilings (already read the constant — no separate edit needed if implemented correctly), UI copy (auto-derives from constant, no edit needed), tests (update any test asserting the literal `15` MB boundary) |
| Runtime config change required | No |
| **Recommendation weight** | Safest, smallest real-world improvement; appropriate if the actual customer pain point is only marginally larger phone-camera JPEGs, not scanner/high-DPI PNG references |

### Option 2 — Balanced (recommended): 15 MB → 25 MB, matching the existing proof-upload ceiling

| Factor | Assessment |
|---|---|
| Max 8-file total | 200 MB (up from 120 MB) |
| Browser memory impact | Still negligible in kind — modern browsers routinely hold single-digit-hundred-MB `File`/`Blob` objects without issue |
| Upload-time impact | ~67% longer worst-case vs. today, but **exactly matches** the already-proven-safe `ASSISTED_CREATION_MAX_PROOF_BYTES` ceiling |
| Storage impact | ~67% more Storage bytes per fully-loaded worst-case request |
| Function impact | **None** |
| Preview/download impact | **Directly matches the already-live proof-download precedent** — this is the strongest evidence-backed option, since 25 MB through this exact architecture is not hypothetical, it is already running in `fresh-prints-dev`/production today for proofs |
| Mobile-network risk | Moderate but bounded by the existing 12s-timeout-and-settle design, exactly as proofs already are |
| Abuse/cost | Recommend pairing with a 150 MB total-request ceiling |
| Rules/constants/UI/tests/Functions changes needed | Same shape as Option 1 |
| Runtime config change required | No |
| **Recommendation weight** | **Recommended.** Reuses an already-approved, already-production-proven value rather than inventing a new one — directly satisfies this Plan's evidence requirement, since "does this size work through this exact download architecture" is not a projection, it's an observed fact about the live proof-upload feature. |

### Option 3 — Highest reasonably safe: 15 MB → 40 MB

| Factor | Assessment |
|---|---|
| Max 8-file total | 320 MB (up from 120 MB) |
| Browser memory impact | Still generally fine for modern browsers, but the *margin* for a low-end mobile device holding 8 concurrent large `File` objects during multi-select shrinks meaningfully |
| Upload-time impact | Well over 2.5× today's worst case; **exceeds** the proven 25 MB proof precedent, so this option's safety is **projected, not observed** |
| Storage impact | Over 2.5× more Storage bytes in the worst case per fully-loaded request |
| Function impact | **None** |
| Preview/download impact | Meaningfully higher risk of hitting the 12s `getBytes()` fallback timeout on slower connections, since this is untested territory beyond the 25 MB precedent |
| Mobile-network risk | **Elevated** — this is the option most likely to produce visible "Preview unavailable" states on cellular connections, even though that is a safe (non-hanging) failure mode by design |
| Abuse/cost | More material — recommend pairing with a firm 200 MB total-request ceiling *and* revisiting whether a daily reference-upload quota is warranted (currently none exists) |
| Rules/constants/UI/tests/Functions changes needed | Same shape as Options 1/2, plus recommend the new daily-quota discussion in Backend Review |
| Runtime config change required | No |
| **Recommendation weight** | Only appropriate if there is a known, specific customer need for files this large (e.g., professional scanner output, raw high-DPI reference art) that the owner can confirm exists; otherwise this exceeds what current evidence supports as "reasonably safe" without live measurement |

### Recommendation

**Option 2 (15 MB → 25 MB)**, because it is the only option backed by a live, already-approved,
already-production-running precedent through the *exact same* download architecture (proof uploads
at 25 MB), rather than an extrapolation. It also has the cleanest story for Formal Review: "this
number already works in this codebase today, for a sibling feature using identical code paths."

**This recommendation is not a decision.** The owner must explicitly select Option 1, 2, 3, or a
different value before Implement begins.

---

## Total-Request Ceiling Recommendation

Add a new paired constant (name TBD during Implement, e.g.
`ASSISTED_CREATION_MAX_REFERENCE_TOTAL_BYTES`) enforced at the same layers as the per-file limit
(client `validateReferenceFiles`, both server parsers). **Storage Rules cannot enforce a
cross-object aggregate** (each Storage Rules evaluation only sees one object's `request.resource`),
so the total-request ceiling is necessarily an application-layer-only control, not a
Rules-authoritative one — this must be documented plainly in the Implement-phase ADR so a future
reader does not assume Rules covers it. Recommended value: comfortably below the worst-case
`8 × per-file limit` for whichever option the owner selects (e.g., for Option 2, a 150 MB total
against a 200 MB theoretical worst case), to meaningfully bound the item-15/16 orphaned-pending-file
exposure without being so tight it blocks a legitimate 8-file submission at moderate sizes.

---

## Security Impact

- [x] No authentication, ownership, or role-enforcement change — the existing dual-layer ownership
  model (Storage Rules path-segment check + callable `requirePortalCustomer`/prefix check) is
  untouched.
- [x] Default-deny durable-path Storage Rules (`create/update/delete: if false` on
  `.../references/{fileId}`) remains — only the Admin SDK promote function can ever write there.
- [x] Storage Rules remains the sole authoritative byte-size gate; client/callable `sizeBytes`
  checks remain advisory/UX-layer only, exactly as today — no change to this trust model.
- [x] No secrets, download tokens, or reference-image content in logs — not present today, not
  introduced by a limit change.
- **Residual risk carried forward, not fixed by this Plan (flagged for awareness, not required to
  resolve):** no dimension/megapixel validation, no file-extension check, animated WebP not blocked,
  no cleanup for abandoned pending uploads, no per-image malware/content scanning. None of these are
  *caused* by raising the MB limit — they exist identically today at 15 MB — but a larger limit
  marginally increases the blast radius of each (e.g., a larger unvalidated-dimension image consumes
  marginally more renderer memory when displayed). If the owner wants any of these addressed, that
  requires a separate, explicitly scoped goal — not silently folded into this MB-limit change.

## Architecture Impact

- [x] None. Component → Hook → Service → Firebase/Callable boundary preserved; no Firebase call
  moves into a component; the existing `assistedCreationService.ts`/`assistedCreationRequestsService.ts`
  service-layer functions remain the sole Firebase Storage touchpoints in each app.
- Only one shared constants file is the source of truth
  (`packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts`) — Implement must
  not create a second, conflicting limit constant anywhere.

## Data Model Impact

- [x] None to the `AssistedCreationReferenceImage` type shape. If a total-request ceiling is added,
  it is enforced against the existing `sizeBytes` field already present on each array entry — no new
  field is required.

## Backend Impact

- [x] No Function memory/timeout/concurrency change required or proposed — confirmed irrelevant
  because reference-image bytes never pass through a callable body.
- [x] No new dependency.
- Open question for Formal Review: should a daily reference-upload quota be added alongside Option 3
  specifically (not required for Options 1/2, per the analysis above)?

## UI/UX Impact

- [x] Minimal — the existing UI copy string already derives from the shared constant
  (`AssistedCreationReferenceUpload.tsx:44-47`), so no separate copy edit is needed for the numeric
  value itself. Whether to add upload progress/cancel UI is a judgment call for Formal Review, not
  strictly required by evidence gathered here (today's 15 MB limit already has no progress/cancel UI
  and is not reported as a problem).

## Migration Impact

- [x] None. No existing reference image needs backfill; a larger limit only affects future uploads.
  Existing 15 MB-and-under reference images remain valid and unaffected.

---

## Files Expected to Change During Implement (once the owner selects a value)

- `packages/shared/src/constants/assistedCreation/assistedCreation.constants.ts` — update
  `ASSISTED_CREATION_MAX_REFERENCE_BYTES`; add the new total-request ceiling constant.
- `storage.rules` — update the hardcoded literal in `isValidAssistedCreationImage()`; this is a
  security-sensitive file and its own diff must be scrutinized carefully in Implementation Review.
- `packages/shared/src/utils/assistedCreationValidation.ts` — add total-request-ceiling enforcement
  to both parser functions (per-file ceiling already reads the shared constant, no edit needed there
  beyond the constant's own value change).
- Any test file asserting the literal `15` MB boundary or the absence of a total-request ceiling
  (exact files: `[NEEDS REPO CHECK during Implement]` — Goal #9's research did not enumerate
  Assisted-Creation-specific test files; Implement must locate and list them before editing).
- `docs/project/DECISIONS.md` — new ADR recording the selected MB value, the total-request ceiling,
  and this Plan's precedent-based rationale.

No other file is expected to change. Implement must not touch `customer-uploads/`,
`finalizeCustomerUpload*.ts`, or any file already modified under Goal #9.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Toolchain record | `npx tsc -v` | yes |
| Functions build | `npm run build --prefix functions` | yes; exit 0 |
| Portal typecheck/build | `npm run typecheck --workspace @fresh-prints/portal`, `npm run build:portal` | yes |
| Repository lint | `npm run lint` | yes; exit 0 |
| Changed-file lint | `npx eslint <exact changed files> --report-unused-disable-directives --max-warnings 0` | yes |
| Focused unit tests | `npx tsx --test <affected assistedCreationValidation/service tests>` | yes — exact files TBD during Implement per the file-discovery step above |
| Diff whitespace/integrity | `git diff --check` | yes |

Required test coverage during Implement: per-file boundary at the new limit (accept at limit, reject
one byte over), total-request ceiling boundary (accept at ceiling, reject one byte over across
multiple files), the update-path parser's independent enforcement of both, and a proof that Storage
Rules' literal matches the shared constant's value (a comment-based manual check is not sufficient
evidence — Implement should add an automated test asserting the two values agree, closing the
long-standing manual-sync risk this Plan's research surfaced twice, for both this feature and Goal
#9's customer-upload feature).

### Manual

- [x] Conditional owner QA after Implement: submit an Assisted Creation request with reference
  images at the new per-file ceiling (both near-limit accept and over-limit reject), and confirm
  Studio staff can still view/download them without hitting the "Preview unavailable" fallback state
  under normal network conditions.
- Dev deployment (Storage Rules change) is its own separate Human Checkpoint — see below.

## Human Checkpoints Anticipated

- [x] **Business logic decision — the target MB value itself.** This Plan explicitly stops here;
  Formal Review must not select a number on the owner's behalf.
- [x] **Secrets / env vars — N/A.**
- [x] **Other: dev Storage Rules deployment.** Any Storage Rules change requires its own owner
  approval before deployment, per standard practice for this repository — Implement produces the
  change; deployment is a separate, later checkpoint, not implied by Implementation Review approval.
- [ ] Manual UI/UX review — only if Formal Review decides progress/cancel UI is in scope (not
  required by current evidence).
- [ ] Design approval — not expected.
- [ ] Production deploy — not in this goal.
- [ ] Database migration — not in this goal.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Owner or Review selects a value without evidence, defeating the purpose of this Plan | High | This Plan presents 3 evidence-backed options and explicitly withholds a default; Formal Review must not implement a value itself |
| Raising the per-file limit without a total-request ceiling multiplies worst-case Storage/abuse exposure | Medium | Every option above is paired with a recommended total-request ceiling |
| The 4-location manual-sync risk (client/2 parsers/Storage Rules) drifts during Implement, with one location updated and another missed | Medium | Implement's required test list includes an explicit "Storage Rules value matches the shared constant" automated assertion, not just a code comment |
| A larger limit increases `getBytes()` fallback-timeout frequency on slow connections, degrading (not breaking) preview UX | Low–Medium | Recommended Option 2 has a live 25 MB precedent through the identical architecture; Option 3 carries this risk without equivalent proof |
| Abandoned pending-upload cleanup gap (pre-existing) becomes more costly at a larger limit | Low | Flagged for awareness; not required to fix in this goal, but the total-request ceiling partially bounds worst-case exposure per abandoned attempt |
| Scope creep into customer-upload artwork or Goal #9's bounded-concurrency fix | Low | File-boundary list above is exhaustive; both features share zero files |

## Rollback Plan

No deployment or migration occurs in this Plan/Review phase. Once Implement runs (a future phase,
not authorized here), rollback is reverting the constant value, Storage Rules literal, and parser
ceiling to the prior 15 MB/no-ceiling state — no data migration exists to roll back, since existing
reference images at or under 15 MB remain valid regardless of the limit's direction.

## Documentation Updates Required

- [x] `docs/project/DECISIONS.md` — new ADR during Implement (not written in this Plan/Review phase).
- [x] Workflow Plan, Formal Review, and (during a future Implement phase) test report, Implementation
  Review, and signoff records.
- [ ] `ARCHITECTURE.md`/`DATA_MODEL.md`/`BACKEND.md` — not expected to change.

## Acceptance Criteria

- [ ] Exact reference-image files and Storage paths are identified — done above.
- [ ] Current per-file limit confirmed from every enforcement layer — done (4 layers, 15 MB, all
  matching).
- [ ] Current 8-file limit confirmed — done.
- [ ] Any total-request byte limit identified — done (none exists today).
- [ ] Client/Rules/backend validation compared for consistency — done (4-location manual-sync risk
  documented; Storage Rules is the sole authoritative gate).
- [ ] Upload/copy/preview/download/cleanup paths traced — done (all 20 required items answered).
- [ ] Browser and server memory behavior documented — done.
- [ ] Function request/timeout/memory constraints documented — done (confirmed irrelevant to this
  change).
- [ ] Security/ownership behavior preserved — done, no change proposed.
- [ ] At least 3 evidence-based MB-limit options presented — done (20/25/40 MB).
- [ ] Each option includes 8-file total exposure and cost/performance tradeoffs — done.
- [ ] A recommended option is provided but not implemented — done (Option 2, 25 MB).
- [ ] Total-request ceiling need explicitly addressed — done, recommended for all three options.
- [ ] Automated tests and owner manual QA defined — done.
- [ ] Dev deployment is a separate human checkpoint — done, explicitly flagged.
- [ ] Production remains untouched — confirmed, out of scope.
- [ ] Plan stops for an explicit owner MB-limit decision — confirmed, no value is implemented.
- [ ] Formal Review completed before implementation — pending, see Approval below.
- [ ] **(Required Change 1, binding)** An automated test asserts the Storage Rules literal for the
  reference-image byte ceiling equals the shared TS constant's value — not merely a code comment.
  This is a separate, mandatory acceptance item, not folded into the general test-coverage list,
  because this exact manual-sync risk has now surfaced unresolved across two consecutive goals
  (Goal #9's customer-upload feature and this goal).
- [ ] **(Required Change 2, binding)** If a total-request byte ceiling is implemented, it is enforced
  as a client-side pre-upload check (summing selected `File.size` values before any `uploadBytes`
  call begins for that submission), with the existing server-side parser check retained as
  defense-in-depth only — not implemented as a server-only check that would leave partially-uploaded
  files orphaned with no cleanup path.

## Open Questions

- [ ] **Owner decision required (blocking Implement):** select Option 1 (20 MB), Option 2 (25 MB,
  recommended), Option 3 (40 MB), or specify a different target value with rationale.
- [ ] **Owner input welcome, not blocking:** is there a known specific customer pain point (e.g.,
  scanner output, professional photography) driving this request, which would help calibrate between
  Options 2 and 3?
- [ ] Formal Review to confirm: should the 8-file count limit also be revisited, or does it remain
  fixed per this Plan's scope?

---

## Amendment 1 (2026-07-29) — Owner QA FAIL: stale 15 MB enforcement on live Submit

### What happened

Owner QA (`docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-qa-checkpoint.md`)
returned **FAIL**. A reference image between 15 MB and 40 MB was accepted by the Portal file picker
("1 file(s) selected") but rejected at Submit with the stale message *"Each reference image must be
15 MB or smaller."*

### Root cause (confirmed, not assumed)

**This is a deployment gap, not a source-code defect.** `submitAssistedCreationRequest` and
`customerUpdateAssistedCreationRequest` are Cloud Functions callables
(`functions/src/assistedCreationRequests.ts:252,409`) that call
`parseAssistedCreationReferenceImageInputs`/`parseAssistedCreationReferenceImageUpdateInputs`
(`packages/shared/src/utils/assistedCreationValidation.ts`) — the exact functions Goal #10's
Implement phase updated to enforce 40 MB. Cloud Functions bundle their own compiled copy of
`packages/shared` at **deploy** time, entirely independent of Storage Rules deployment.

Goal #10's only deployment action to date was `firebase deploy --only storage` (Storage Rules only —
confirmed via the dev-rules-deployment-checkpoint and this Plan's own restriction against deploying
Functions without a separate checkpoint). **Cloud Functions in `fresh-prints-dev` were never
redeployed**, so `submitAssistedCreationRequest`'s live compiled code still contains the pre-Goal-#10
15 MB check and its exact error string, byte-for-byte matching the owner's screenshot.

Confirmed via direct investigation, not inference:
- Repo-wide search for `15 * 1024 * 1024`, `15MB`, `15728640`, and `"Each reference image must be"`
  found **zero** stale literals anywhere in `apps/`, `functions/src/`, or `packages/shared/src/` — the
  message is template-interpolated from `ASSISTED_CREATION_MAX_REFERENCE_BYTES` at both call sites
  (`assistedCreationValidation.ts:487,552`), which is `40 * 1024 * 1024` in current source.
- `functions/src/assistedCreationRequests.ts` is the **only** file anywhere in `functions/src` that
  calls either reference-image parser — no duplicate/forgotten validator exists.
- `git log --oneline -- functions/src/assistedCreationRequests.ts
  packages/shared/src/utils/assistedCreationValidation.ts` shows no commit since before Goal #10
  began — these files' current state exists only in the uncommitted working tree, never built into a
  Functions deployment artifact and pushed to `fresh-prints-dev`.
- The Portal file picker correctly accepting the file (owner's own evidence, step 2 of the
  reproduction) is independent confirmation that Portal's *client* code is current and correct —
  Portal is served from local source in this workflow, not a stale build; the defect is isolated to
  the **deployed Functions artifact**, not Portal.

**Answers to the required investigation questions:**
1. *Which exact function produces the stale message?* The live (deployed, not local-source)
   `submitAssistedCreationRequest` → `parseAssistedCreationReferenceImageInputs`, running Functions
   code compiled before Goal #10's constant change.
2. *Duplicated literal, stale constant, old helper, or mapped server error?* None of those — it is
   the correct, single-source-of-truth helper, simply **not yet redeployed**.
3. *Stale runtime build or genuinely wrong current source?* Stale **deployed** runtime build. Current
   local source is correct (confirmed by the passing `storageRulesAlignment.test.ts` and
   `assistedCreationValidation.test.ts` boundary tests, both already using 40 MB).
4. *Does final submit revalidate separately from initial selection?* Yes, by design — Portal's client
   picker validates first (UX), then the callable independently re-validates server-side
   (trust boundary) — this second, correct validation is what surfaced the deployment gap, working
   exactly as the architecture intends.
5. *Does the upload service receive real `File` objects and recheck size?* Yes — `uploadPendingReferences`
   uploads the actual selected files to Storage (now correctly gated at 40 MB by the deployed Storage
   Rules); the callable's rejection happens on the JSON metadata check, before/independent of the
   Storage write outcome.
6. *Do submit and update paths use the same current shared validator?* Yes in source; both are
   equally stale in the currently-deployed Functions artifact, since neither has been redeployed.
7. *Any compiled/generated files or cached bundles masking the change?* Yes — precisely the deployed
   Cloud Functions artifact in `fresh-prints-dev`, which is a real, separate build artifact from the
   Storage Rules that were deployed. Not a browser cache issue — ruled out by the owner's own evidence
   that the picker (client-side) already reflects the new limit correctly.

### Scope of this amendment

**No source-code change is required to fix the reported symptom.** The 40 MB/8-file/320 MB
enforcement logic already implemented and tested in Goal #10's original Implement phase is correct.
The fix is a **Functions redeployment** to `fresh-prints-dev`, bringing the live callables in sync
with the already-correct, already-tested source.

This amendment does, however, add the regression coverage the resume prompt requires — composed
tests that exercise the actual parser functions the deployed callables call (as close to the real
call path as this repo's existing Functions test conventions reach, since no live-callable
integration-test harness exists in this codebase — see Testing section below) — to make this class of
gap (source correct, deployment stale) provable by a test rather than only by a live owner QA
reproduction next time.

### In Scope (this amendment)

- Add composed tests against `parseAssistedCreationReferenceImageInputs` and
  `parseAssistedCreationReferenceImageUpdateInputs` that specifically assert: a 15 MB + 1 byte file is
  accepted; a file below 40 MB is accepted; exactly 40 MB is accepted; 40 MB + 1 byte is rejected with
  a message containing "40 MB", never "15 MB"; submit and update paths produce identical
  accept/reject decisions for the same inputs; the 320 MB combined ceiling and 8-file count remain
  enforced by the same functions.
- Prepare (but do not execute without a separate checkpoint) the exact Functions redeployment command
  and scope.
- No change to `storage.rules` (Storage Rules deployment already correctly reflects 40 MB and needs
  no correction — confirmed by the owner's own QA evidence that Storage Rules deployment was not the
  problem).
- No change to the 40 MB, 8-file, or 320 MB values.
- No change to customer-upload artwork processing.

### Out of Scope (this amendment)

- Any application source-code fix beyond the new regression tests — there is no source defect to fix.
- Redeploying Storage Rules again (already correct and live).
- Starting Goal #11 or Signoff.
- Production.

### Required Functions Deployment (separate checkpoint, not executed by this amendment)

If this amendment's Formal Review confirms the root-cause analysis, the concrete fix is:

```bash
firebase use fresh-prints-dev
firebase deploy --only functions:submitAssistedCreationRequest,functions:customerUpdateAssistedCreationRequest
```

Scoped to only the two callables that read reference-image validation, per this repo's convention of
narrow `--only functions:<name>` deploys over a blanket `--only functions` (avoids redeploying every
Cloud Function in the project for a two-function-scoped fix). This requires its own owner-approved
Human Checkpoint before execution — Implement for this amendment does not deploy anything.

### Test Strategy (amendment)

| Check | Command | Required |
|-------|---------|----------|
| Composed submit-path regression tests | `npx tsx --test packages/shared/src/utils/assistedCreationValidation.test.ts` (new cases added) | yes |
| Existing pure client-validator tests (must still pass, proving no regression there) | `npx tsx --test apps/portal/features/assisted-creation/utils/assistedCreationReferenceFilesValidation.test.ts` | yes |
| Storage Rules alignment (must still pass, confirming Rules remain correctly untouched) | `npx tsx --test packages/shared/src/constants/storageRulesAlignment.test.ts` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Portal build | `npm run build:portal` | yes |
| Repository lint | `npm run lint` | yes |
| Changed-file lint | `npx eslint <changed files> --report-unused-disable-directives --max-warnings 0` | yes |
| Diff integrity | `git diff --check` | yes |

No live-callable integration-test harness (mocked `onCall`/Firestore/Storage) exists anywhere in this
repository's Functions test suite (confirmed during Goal #10's original Implement phase). Composed
tests therefore exercise `parseAssistedCreationReferenceImageInputs`/`...UpdateInputs` directly — the
exact functions the deployed callables invoke — with fixtures shaped as the real callable payload
(array of `{id, storagePath, fileName, contentType, sizeBytes}`), which is the closest provable
approximation of the real submit path available without introducing new test infrastructure (out of
scope for a narrow amendment).

### Human Checkpoints (amendment)

- [x] **Functions deployment** — required to actually fix the live symptom; not performed until a
  separate, explicit owner approval following this amendment's Implementation Review.
- [x] No other checkpoint type applies (no new Rules, no schema, no config, no dependency change).

### Acceptance Criteria (amendment)

- [ ] Root cause confirmed as a Functions deployment gap, not a source-code defect (done above).
- [ ] New composed tests prove the parser functions accept 15 MB+1 byte, accept <40 MB, accept exactly
  40 MB, reject 40 MB+1 byte with a "40 MB" (never "15 MB") message.
- [ ] Submit-path and update-path parsers proven behaviorally identical for the same inputs.
- [ ] 320 MB ceiling and 8-file count proven still enforced by the same functions.
- [ ] No `storage.rules` change.
- [ ] No change to the 40 MB / 8-file / 320 MB values.
- [ ] Portal typecheck, Portal build, repository lint, changed-file lint, `git diff --check` all exit
  0.
- [ ] Independent Implementation Review approves the actual final diff.
- [ ] Functions redeployment command and scope documented as a separate, not-yet-executed checkpoint.
- [ ] No Storage Rules redeployment, no production action, no Goal #11 start, no Signoff.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-review.md`
- Verdict: **approved_with_changes** (2026-07-29) — two binding required changes carried into a
  future Implement phase: (1) an automated test must assert the Storage Rules literal matches the
  shared TS constant, not just a code comment; (2) any total-request byte ceiling must be enforced as
  a client-side pre-upload check, with the server-side parser check as defense-in-depth only.
- **Amendment 1 Review doc:** `docs/workflow/reviews/2026-07-29-assisted-creation-reference-image-mb-limit-increase-amendment-1-review.md`
- **Amendment 1 Verdict:** **approved** (2026-07-29) — one binding condition on the future deployment
  checkpoint (not on Implement): before executing the scoped Functions redeploy, confirm via `git
  diff` that only this goal's reference-image validation change rides along, no other unrelated
  in-flight Functions work.
