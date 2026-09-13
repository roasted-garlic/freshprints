# Plan: Customer Upload Artwork Quality Gate

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal ID | `customer-upload-artwork-quality-gate` |
| Prerequisite | `ai-review-stuck-processing-recovery` **DONE** + FreshForge **IDLE** |
| Production | **NOT AUTHORIZED** |
| Smart Profiling | **PARKED** |

---

## Goal

Harden Portal customer artwork uploads (`print_request` and `catalog_donation`) so only genuine, production-usable DTF artwork with **real PNG bytes**, **meaningful transparent exterior canvas**, and **acceptable native quality within existing upscale/DPI contracts** reaches `technicalStatus: ready` and can attach to Print Requests or confirm for Donation.

---

## Background

Owner reports that obvious opaque screenshots, phone/editor captures, white-background previews, and watermarked mockups are reaching **READY / attachable** today despite an existing server-side meaningful-transparency gate (2026-07-30 early-transparency work).

Repo audit shows validation **already exists** in `processCustomerUploadImageBytes` but policy thresholds are **too permissive** for the owner's product contract, and client/Storage layers do not decode pixels.

Prior plan locked PNG + static WebP with 0.5% transparent-pixel ratio **OR** ≥1% trim-shrink pass (`docs/workflow/plans/2026-07-11-portal-customer-artwork-upload-plan.md` §9). Owner now requires stricter PNG + genuine transparency semantics.

---

## Audit Answers (current `development`)

### 1. What upload formats are currently allowed?

| Layer | Allowed | Authority |
|-------|---------|-----------|
| Portal `classifyFiles` | `.png`, `.webp` by extension/MIME | Client UX only |
| Storage rules | `image/png`, `image/webp`; ZIP | Rules |
| Server `detectFormat` | PNG + static WebP after Sharp decode | **Authoritative** |
| JPEG | Rejected on customer path; allowed only `assistedProofFastIngest` staff path | Server |

### 2. Is static WebP part of the live contract?

**Yes** — original Portal customer upload plan (2026-07-11) explicitly accepts static WebP with meaningful transparency. Storage rules, Portal accept list, and `detectFormat` all allow WebP.

Owner's new requirement says **PNG artwork**. **Retiring WebP is a product-contract change** → see [NEEDS OWNER DECISION] in Open Questions.

### 3. How is PNG detected today?

Sharp metadata after decode in `processCustomerUploadImageBytes` (`functions/src/lib/customerUploadProcessing.ts` L496–516). Not magic-byte pre-check before decode, but undecodable/mislabeled files fail at decode or `unsupported_format`. Client extension/MIME is **not** authoritative.

### 4. Is meaningful transparency actually implemented?

**Yes** — shared policy in `packages/shared/src/utils/customerUploadTransparency.ts` + Sharp measurement in `meaningfulTransparencyMeasurement.ts`, invoked at `checking_transparency` **before** trim/upscale (ADR-FP-126 ordering fix).

Current pass conditions (either suffices):
- `transparentPixelRatio >= 0.005` (0.5%) with alpha &lt; 250 on 800px sample
- **OR** trim-shrink ≥ 1% width **or** height (lossless transparent-edge trim probe)

### 5. Why did owner screenshots pass?

Most likely causes (deterministic, not missing gate entirely):

1. **Trim-only pass loophole** — screenshot/mockup with a thin transparent margin (≥1% shrink) passes **without** meaningful global transparency.
2. **Low ratio threshold (0.5%)** — anti-aliased edges, soft shadows, compression artifacts, or UI chrome can exceed 0.5% on an otherwise opaque capture.
3. **RGBA screenshots** — tools export phone/editor captures as PNG with alpha channel + mostly opaque pixels; passes if (1) or (2) triggers.
4. **Client/Storage do not block** — bad files only fail at finalize; if they pass policy, they become attachable.
5. **Not** assisted-proof bypass on Portal customer path (`skipCustomerQualityGates` / `assistedProofFastIngest` are staff-only).

### 6–10. Proposed fixes (summary)

See **Approach** below.

---

## Scope

### In Scope

- Strengthen shared meaningful-transparency policy (deterministic pixel analysis)
- Optional PNG-only enforcement for Portal customer purposes (pending owner decision on WebP)
- Customer-facing error copy mapping (server messages + Portal display alignment)
- Reuse existing pipeline order, trim, upscale, DPI assessment — **fix policy, not duplicate pipeline**
- Fixture-backed unit tests for owner failure modes
- Align Storage rules / Portal accept list if PNG-only approved
- Functions deploy for DEV QA (processing logic change)

### Out of Scope

- AI screenshot/watermark/mockup classifier (review-only recommendation unless gap remains after V1)
- Client-side background removal
- New `technicalStatus` lifecycle values
- Firestore schema migration / new indexes
- Production deploy
- Changing 6× upscale cap, 15″ approved-max envelope, or 22″ print-request item ceiling contracts
- Auto-queue / Studio import changes (share transparency **math** only where already shared)

---

## Affected Areas

### Files / Modules (expected)

| Area | Path |
|------|------|
| Transparency policy (pure) | `packages/shared/src/utils/customerUploadTransparency.ts` |
| Transparency measurement | `packages/shared/src/utils/meaningfulTransparencyMeasurement.ts` |
| Customer upload processor | `functions/src/lib/customerUploadProcessing.ts` |
| Processor tests | `functions/src/lib/customerUploadProcessing.test.ts` |
| Measurement tests | `functions/src/lib/meaningfulTransparencyMeasurement.test.ts`, `packages/shared/src/utils/customerUploadTransparency.test.ts` |
| Customer failure copy mapper (new or extend) | `packages/shared/src/utils/customerUploadFailureMessages.ts` (proposed) |
| Portal file accept / UX | `apps/portal/features/customer-uploads/services/customerUploadService.ts`, `CustomerUploadPanel.tsx`, `useCustomerUploadBatch.ts` |
| Storage rules (if PNG-only) | `storage.rules` |
| Confirm guards (verify only) | `functions/src/confirmCustomerUploadsAndAttachToRequest.ts`, `confirmCustomerUploadsForDonation.ts` |
| Shared types (verify only) | `packages/shared/src/types/customerUpload/*` |

### Architecture Impact

- [x] **Details:** Harden existing Functions processor + shared pure policy. Portal UX/copy only. No second pipeline.

### Security Impact

- [x] **Details:** Server remains authoritative; confirm callables already require `technicalStatus === "ready"`. No client-trusted validation.

### Data Model Impact

- [x] None — reuse `technicalStatus`, `technicalFailureCode`, `technicalFailureMessage`, existing progress stages.

### Backend Impact

- [x] **Details:** Functions processing policy change + optional Storage rules MIME narrowing. **DEV deploy required** for QA.

### UI / UX Impact

- [x] **Details:** Clear rejection reasons; rejected uploads show `failed` with mapped copy (no infinite spin).

### Migration Impact

- [x] None — forward-only behavior change for new finalize/retry processing.

---

## Approach

### A. Pipeline order (verified + preserved)

Required order matches current main customer path (`customerUploadProcessing.ts`):

| Step | Stage | Action |
|------|-------|--------|
| A | pre-decode | Read bytes; size limits |
| B | `checking_format` | Sharp decode metadata; **actual format** PNG (± WebP per decision) |
| C | decode safety | Reject animated / undecodable |
| D | native dims | Record true `sourceWidthPx` / `sourceHeightPx` |
| E | `checking_transparency` | **Hardened** meaningful transparency (before trim) |
| F | reject | Fail closed → `technicalStatus: failed` |
| G | `trimming` | Transparent-edge trim only after pass |
| H | record trimmed dims | Update production base |
| I | normalize downscale | Dimension ceiling (ADR-FP-125) if needed |
| J | `upscaling` | Existing `resolveImportUpscaleDecision` / `upscaleIfNeeded` (≤6×, 15″ target) |
| K | `checking_print_size` | `assessPrintSizeCapability`; reject `acceptanceLevel === "reject"` (&lt;72 effective DPI) |
| L | `creating_previews` | Preview/thumbnail WebP |
| M | `saving` / ready | Derivatives persisted; `technicalStatus: ready` |

**Do not** trim before transparency. **Do not** upscale before transparency/quality rejection.

Both `finalizeCustomerUpload` and `finalizeCustomerUploadZip` call the same `processCustomerUploadImageBytes`.

### B. PNG enforcement

**Default recommendation:** Portal customer uploads (`print_request`, `catalog_donation`) accept **PNG only** at all layers:

- Server `detectFormat`: PNG only (customer path)
- Portal `classifyFiles` + file input `accept`
- Storage rules source content-type

**WebP retirement** conflicts with 2026-07-11 contract → **owner decision required** before implement (see Open Questions).

Magic bytes: rely on Sharp decode (`metadata.format === "png"`). Reject mislabeled JPEG/HEIC renamed `.png` at format stage.

### C. Hardened meaningful-transparency algorithm (proposed V1)

Replace permissive **OR trim-pass** with deterministic **exterior-canvas** semantics.

**Step 1 — Alpha channel required**  
Source `metadata.hasAlpha` must be true. RGB PNG (no alpha) → `no_alpha_channel`.

**Step 2 — Reject uniformly opaque RGBA**  
If every sampled pixel has `alpha >= 250` → `background_not_transparent`.

**Step 3 — Exterior reachable transparency (primary gate)**  
On downsampled RGBA buffer (max side 800px, same as today):

- Flood-fill (4-connected) from **all canvas edge pixels** where `alpha < 250`.
- Compute `exteriorTransparentRatio = reachableTransparentPixels / totalPixels`.
- **Pass exterior gate** if `exteriorTransparentRatio >= EXTERIOR_TRANSPARENT_MIN_RATIO` (initial proposal: **2%**, calibrate with fixtures).

Rationale: DTF artwork on a transparent canvas has edge-connected transparency forming the exterior. Opaque screenshots with only a thin decorative margin typically reach &lt;2% exterior reach.

**Step 4 — Remove trim-only pass**  
Trim-shrink ≥1% must **not** alone satisfy transparency. Trim probe remains for processing after pass, not as alternate pass.

**Step 5 — Anti–single-pixel / anti–thin-margin fallback**  
If `exteriorTransparentRatio < PERIMETER_ONLY_REJECT_RATIO` (e.g. **3%**) **and** opaque content bounding box (alpha ≥250) covers ≥ **90%** of canvas → fail as `background_not_transparent`.

**Step 6 — Legitimate full-bleed artwork safeguard**  
If exterior gate fails but **global** `transparentPixelRatio >= FULL_BLEED_MIN_RATIO` (e.g. **1%**) **and** opaque bbox covers ≤ **92%** of canvas → pass (preserves art with internal transparency / anti-aliased fringes touching edges).

Constants live in `customerUploadTransparency.ts` with fixture-driven tests; tune only with listed fixtures, not arbitrary production guesses.

**False positives considered:** solid lettering, white foreground ink, square art, edge-touching subjects — addressed by full-bleed safeguard and bbox ratio, not perimeter-only rejection.

### D. Native resolution / quality (reuse existing contract)

After trim + optional upscale:

- **Upscale:** `imageQualitySizingPolicy` — single pass, `MAX_UPSCALE_FACTOR = 6`, target width 15″ at 300 DPI when eligible.
- **Import reject floor:** `assessPrintSizeCapability` → `acceptanceLevel === "reject"` when effective DPI &lt; **72** (`MIN_ACCEPTABLE_EFFECTIVE_DPI`).
- **200 DPI** remains Print Request **item save floor** (Portal edit), not finalize reject threshold.
- **22″ ceiling** applies at print-request item sizing (`printRequestItemSizing.ts`), not customer finalize.

**New gate clarity (if needed):** Before upscale, if native trimmed dimensions cannot reach minimum production usability even at 6× (policy already encoded in upscale decision + assessment), fail with quality copy. Prefer reusing `resolveImportUpscaleDecision` / assessment warnings rather than new DPI math.

### E. Attach / Donation enforcement (verify, minimal change)

Existing server guards (no pixel re-check at confirm — by design):

- `confirmCustomerUploadsAndAttachToRequest.ts`: requires `technicalStatus === "ready"`; rejects `catalog_donation` purpose mismatch.
- `confirmCustomerUploadsForDonation.ts`: same ready gate.

Invalid uploads remain `failed` and are excluded from attach selection in Portal (`resolveCustomerUploadAttachDisabledReason`).

### F. Customer-facing error copy

Map `technicalFailureCode` → stable customer copy (shared util):

| Code / condition | Customer copy |
|------------------|---------------|
| `unsupported_format` | Please upload the original PNG artwork file. |
| `no_alpha_channel`, `background_not_transparent` | This image does not have a transparent background. Please upload the original artwork with the background removed. |
| `image_exceeds_limits` (quality/DPI) | This image is too small to produce a good-quality print. Please upload a higher-resolution original. |
| `could_not_decode`, `processing_failed`, `transparency_check_failed` | We couldn't process this artwork. Please try another file or upload the original artwork. |

Server sets `technicalFailureMessage` to mapped copy at fail sites in `customerUploadProcessing.ts`. Portal continues displaying `technicalFailureMessage`.

### G. ZIP / batch behavior

**Already per-file:** `finalizeCustomerUploadZip` processes each entry independently; failures mark individual upload `failed`; siblings can reach `ready` (ADR-FP-123 aggregation).

Portal batch UX should continue showing per-file errors without blocking valid siblings.

### H. Secondary AI visual classifier — defer V1

After hardened deterministic gate, re-evaluate residual risk (editor chrome inside trimmed transparent PNG). **Not in V1 scope** unless fixture tests prove deterministic gate insufficient for owner-provided examples.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Transparency policy | `npx tsx --test packages/shared/src/utils/customerUploadTransparency.test.ts` | yes |
| Sharp measurement | `npx tsx --test functions/src/lib/meaningfulTransparencyMeasurement.test.ts` | yes |
| Full processor | `npx tsx --test functions/src/lib/customerUploadProcessing.test.ts` | yes |
| Confirm guards | `npx tsx --test functions/src/lib/confirmCustomerUpload*.test.ts` | yes |
| Functions build | `npm run build` (functions/) | yes |

### Fixture cases (minimum)

1. Valid transparent PNG → PASS  
2. Opaque PNG white background → FAIL transparency  
3. Opaque phone screenshot PNG → FAIL  
4. RGBA all alpha=255 → FAIL  
5. Thin-margin screenshot (trim-only pass today) → FAIL after fix  
6. Legitimate transparent typography → PASS  
7. Legitimate art touching one edge → PASS  
8. Transparent art, large white foreground → PASS  
9. Tiny transparent PNG below safe upscale → FAIL quality  
10. Modest transparent PNG within 6× contract → PASS + upscale  
11. Excess transparent canvas → trim correctly  
12. Non-PNG renamed `.png` → FAIL format  
13. ZIP mixed valid/invalid → per-file outcomes  
14. Confirm attach rejects non-ready  
15. Confirm donate rejects non-ready  

### Manual owner DEV QA

See Formal Review owner QA checklist.

---

## Human Checkpoints

| Checkpoint | When |
|------------|------|
| WebP retirement decision | Before implement if PNG-only chosen |
| Functions DEV deploy | After implement, before owner QA |
| Production deploy | **NOT AUTHORIZED** |

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| False reject legitimate full-bleed art | Full-bleed safeguard + fixture tests |
| WebP customers blocked | Explicit owner decision; document in release notes |
| Functions deploy required | DEV-only QA scope documented |
| Over-tuning constants | Fixture-driven calibration; no ad-hoc percentages without tests |

Rollback: revert Functions + shared policy + optional Storage/Portal accept changes.

---

## DEV Deploy Scope

| Component | DEV deploy? |
|-----------|-------------|
| **Functions** (`finalizeCustomerUpload*`, processing lib) | **Yes** — policy change is server-side |
| **Portal** hosting | **Yes** — copy/accept list (restart dev server minimum; deploy for shared QA) |
| **Storage rules** | **Yes** if PNG-only MIME narrowing |
| Firestore rules | **No** |
| Firestore indexes | **No** |

Local: `npm run dev:portal` + Functions emulator or DEV project deploy per repo convention.

---

## Open Questions

- [ ] **WebP retirement for Portal customer uploads?** Owner says PNG; historical contract includes WebP → **[NEEDS OWNER DECISION]**
- [ ] Exact exterior-ratio constants — calibrate during implement with screenshot-like fixtures
- [ ] Semantic AI classifier — **deferred** post-V1 unless fixtures fail

---

## Implementation Gate

Do not implement until Formal Review **approved** or **approved_with_changes** and owner authorizes continuation.

---

## FreshForge Impact

| Area | Impact |
|------|--------|
| Starter Surface | None |
| Documentation | Optional note in `DATA_MODEL.md` / `BACKEND.md` customer upload section after implement |
