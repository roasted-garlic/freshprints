# Plan: Customer-Upload Oversized-Pixel Normalization and Processing-Timeout Followup

| Field | Value |
|-------|-------|
| Date | 2026-07-30 |
| Author | FreshForge Planning Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md` |

---

## Goal

Fix four related defects in the customer-upload (Portal "Upload Designs" / "Donate Designs")
trusted-server image pipeline, without touching Goal #9's already-signed-off bounded-ZIP-concurrency
work or Goal #10's Assisted Creation reference images:

1. Technically-oversized-but-otherwise-valid PNGs are permanently rejected instead of being safely
   normalized.
2. Some uploads spend excessive, unbounded time at the `"Trimming transparent edges…"` stage with no
   timeout/watchdog.
3. A stale "100 MB" figure exists only in handoff documentation, not in enforced source — reconcile
   the documentation, not the code.
4. ADR-FP-080's "never downsample production assets" rule needs a narrow, explicit technical-safety
   exception for this one normalization case.

## Background

Owner-observed evidence: two PNGs (~7.00 MB and ~14.05 MB, both well under the 80 MB byte ceiling)
were rejected with `"Image dimensions exceed the allowed limits."`; two lower-resolution exports of
the same artwork succeeded. Separately, PNGs at ~43.71 MB and ~53.93 MB were observed stuck at
`"Trimming transparent edges…"` for an unreasonable duration. A research investigation (this Plan's
own preparation) traced the exact current source and confirmed both root causes precisely — see
**Root Cause Findings** below. No code was changed to produce these findings; this Plan is
Investigation + Design only.

---

## Root Cause Findings (from current source, cited exactly)

### 1. Pixel-dimension rejection — exact cause

`functions/src/lib/customerUploadProcessing.ts:404-410`:
```ts
if (
  sourceWidthPx > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
  sourceHeightPx > CUSTOMER_UPLOAD_MAX_DIMENSION_PX ||
  sourceWidthPx * sourceHeightPx > CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS
) {
  return fail("image_exceeds_limits", "Image dimensions exceed the allowed limits.");
}
```
This is the **only** call site producing that exact message. `sourceWidthPx`/`sourceHeightPx` come
from `sharp(sourceBytes).metadata()` (`:377,398-399`) — the **raw, untrimmed source**. Current
constants (`packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts`):
`CUSTOMER_UPLOAD_MAX_DIMENSION_PX = 15_000` (line 9), `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS =
100_000_000` (line 11).

**Why a 7–14 MB PNG can hit this:** `sqrt(100,000,000) ≈ 10,000`. A roughly-square 10,000×10,000
canvas is exactly at the pixel ceiling; a 12,500×8,000 canvas (=100,000,000 px exactly) also hits it
while staying under the 15,000px per-side dimension cap. PNG is lossless and compresses large flat or
transparent regions extremely well, so a large-canvas design mockup with generous transparent margins
around a modest opaque design — exactly the shape of a "designer exported at oversized canvas
dimensions" file — can be single-digit-to-teens MB in byte size while carrying a 100M+-pixel canvas.
This fully explains the owner's exact symptom (small byte size, dimension rejection) without needing
to invent any other cause.

No `limitInputPixels` sharp/libvips decoder option is set anywhere in `customerUploadProcessing.ts`
(confirmed via source read of every `getSharp()(...)` call site) — sharp's own default decoder
ceiling (~268M px) is far above the app-level 100M-pixel check, so the app check is always the
binding constraint, not a hidden libvips limit.

### 2. Order of operations — dimension check runs BEFORE any trim (the core defect)

Traced the exact sequence in `processCustomerUploadImageBytes`:
1. Byte-size check (`:363`)
2. `checking_format` stage; `metadata = sharp(sourceBytes).metadata()` (`:377`)
3. Format/animated checks (`:382-396`)
4. **Dimension/pixel check on raw source metadata — `:404-410`** ← rejection happens here
5. Transparency sampling/trim (`:509` onward) — **unreachable if step 4 already returned**

**This is the actual defect.** A large-canvas image with large transparent margins that would trim
down comfortably under the pixel ceiling is rejected before trimming ever gets a chance to run. The
current architecture cannot possibly produce the product outcome the owner wants ("an otherwise-valid
transparent PNG must not be permanently rejected only because its original pixel dimensions exceed an
internal technical processing ceiling") because trim is structurally unreachable from the rejection
path.

### 3. Donate Design vs. Customer Uploads — confirmed same pipeline

`apps/portal/app/(app)/donate/page.tsx` renders the same `<CustomerUploadPanel purpose="catalog_donation">`
component from `apps/portal/features/customer-uploads/` — not a separate feature directory. Both
`print_request` and `catalog_donation` purposes call the same `finalizeCustomerUpload` callable and
the same `processCustomerUploadImageBytes`. `defaultCustomerUploadSizeLimits(_purpose)`
(`apps/portal/features/customer-uploads/services/customerUploadService.ts:178-186`) explicitly
ignores the purpose argument — one shared 80 MB byte limit, one shared pixel/dimension limit, for
both. Only *daily quota counters* differ by purpose (unrelated to this Plan's scope). **Any fix to
the shared pipeline functions automatically applies to both surfaces — no purpose-conditional
branching needs to be added or exists today.**

### 4. `"Trimming transparent edges…"` timing — confirmed root causes, no invented explanation

Traced the exact functions and their decode counts (worst case: an image with alpha that needs the
full, expensive trim path — `functions/src/lib/customerUploadProcessing.ts`):

- `countTransparentPixelsSampled` (`:138-189`) — operates on a **downscaled sample** (≤800px max
  side); cheap.
- `probeNeedsTransparentEdgeTrim` (`:194-237`) — operates on a **downscaled sample** (≤512px max
  side); cheap.
- `trimTransparentEdges` (`:239-293`) — **the only full-resolution operation**, and it decodes **three
  separate times** at full resolution:
  1. `:247` — `getSharp()(input).metadata()` just to read `originalWidth`/`originalHeight`.
  2. `:252-256` — the actual full-res decode → `.trim()` → `.png().toBuffer()`.
  3. `:258` — `getSharp()(trimmedBytes).metadata()` **just to read the trimmed output's
     width/height**, even though `.toBuffer({ resolveWithObject: true })` at step 2 would return
     `info.width`/`info.height` directly from the same operation, eliminating this third decode
     entirely.

For a 43–54 MB PNG near the 100M-pixel ceiling, decode #2 alone is a genuinely expensive full-raster
operation (hundreds of MB of raw pixel data processed through `trim()`); decodes #1 and #3 are
avoidable full-resolution re-decodes that add real, measurable, unnecessary latency on top of #2 for
no functional benefit — #1's dimensions are already known from the caller's `sourceWidthPx`/
`sourceHeightPx` in scope at both call sites (`:543`, `:599`), and #3's dimensions are available for
free from step 2's own return value.

Additionally, in the current (non-normalizing) architecture, the `probeNeedsTransparentEdgeTrim` cheap
probe can determine `needsTrim === true`, triggering a **second, independent full-resolution**
`trimTransparentEdges` call at `:599` even when the earlier `countTransparentPixelsSampled` sampling
path (`:521-537`) did not itself require a full trim — meaning it is possible for a single image to
hit `trimTransparentEdges`'s three-decode sequence more than once in one request under specific
branch combinations. This Plan's redesign (see Approach) removes this specific double-invocation risk
by unifying the trim decision into a single call site.

**Progress-stage string:** the Firestore field is `technicalProgressStage: "trimming"`
(`packages/shared/src/types/customerUpload/customerUpload.enums.ts` — exact type name
`CustomerUploadTechnicalProgressStage`, filename confirmed exact during Formal Review); the exact UI
string is rendered from `packages/shared/src/utils/customerUploadProgressLabel.ts:28-29` (`case
"trimming": return "Trimming transparent edges…";`) — a single shared source consumed by both Portal
and Studio, so no duplicate-copy risk exists for this string.

### 5. 80 MB vs. 100 MB — confirmed documentation drift, not a code/Rules conflict

`CUSTOMER_UPLOAD_MAX_SINGLE_IMAGE_BYTES = 80 * 1024 * 1024` (80 MB) is the **only** enforced byte-size
value anywhere in application source, and `storage.rules:110`'s `isValidCustomerUploadSource()`
(`request.resource.size < 80 * 1024 * 1024`) matches it exactly — Storage Rules and the shared
constant already agree. Every "100 MB" occurrence found repo-wide is inside
`references/project-chatgpt-handoff/` (stale handoff documentation only: `03-roadmap-and-phases.md`,
`CURRENT-STATE.md`, `04-features-inventory.md`, `07-backend-and-ai-pipeline.md`) — never in enforced
source, Rules, or Portal UI copy (Portal renders the limit dynamically via `formatFileSize(...)`, no
hardcoded string). **The likely origin of the "100 MB" figure is conflating
`CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000` (a pixel count) with a byte-size limit in
conversation** — the two numbers are coincidentally both "100 million." **Recommendation: correct the
four stale handoff docs to say 80 MB; do not raise the enforced byte limit to 100 MB.** No evidence
exists that 100 MB was ever an intended or approved byte ceiling — it appears to be a documentation
transcription error, not a drifted decision.

### 6. Function memory/timeout — single-image finalize (Goal #9's ZIP concurrency work is untouched)

`functions/src/finalizeCustomerUpload.ts:55` — `onCall({ timeoutSeconds: 540, memory: "2GiB" })`.
`functions/src/retryCustomerUploadProcessing.ts:43` — identical `{ timeoutSeconds: 540, memory:
"2GiB" }`. These are **separate callables from `finalizeCustomerUploadZip.ts`** (Goal #9's scope) —
this Plan's proposed fixes touch `customerUploadProcessing.ts` (shared library code both the
single-image and ZIP callables call) and, if a watchdog is added, `finalizeCustomerUpload.ts`
directly. **Goal #9's bounded-concurrency loop in `finalizeCustomerUploadZip.ts` and its
`aggregateZipProcessingResults`/`boundedConcurrencyQueue.ts` are not modified by this Plan** — any
change to `customerUploadProcessing.ts`'s internal trim/normalize logic is automatically inherited by
both callables without touching Goal #9's concurrency-orchestration code at all, since that code only
calls `processCustomerUploadImageBytes` as an opaque per-image unit.

### 7. Existing retry/status model — confirmed, no automatic per-invocation stuck-detector exists

`CustomerUploadTechnicalStatus`: `awaiting_upload | uploading | validating | processing | ready |
failed` (no "stuck"/"timeout"/"stale" value exists today). `retryCustomerUploadProcessing.ts` can
**only** retry uploads already marked `"failed"` (`:80-82`, throws otherwise) — it cannot act on an
upload currently stuck in `"processing"`. `cleanupAbandonedCustomerUploads.ts` is a **staff-invoked
callable** (not a scheduled cron — confirmed no `onSchedule` registration anywhere for customer
uploads), with a 24-hour `createdAt` cutoff; it does treat `"processing"` as eligible for cleanup
(marking it `failed`/`processing_failed`) but only at the 24-hour timescale, not at the ~540-second
function-timeout timescale the owner's report describes. **There is currently no mechanism that
detects a stuck upload within minutes of the actual processing timeout** — this is the concrete gap
Timeout/Retry design below closes.

### 8. Existing tests — confirmed gap

`functions/src/lib/customerUploadProcessing.test.ts` (7 tests) covers transparency accept/reject,
format rejection, and `skipCustomerQualityGates`/`assistedProofFastIngest` variants. **Zero existing
tests exercise the dimension/pixel-ceiling rejection path, the byte-size rejection path, or any
large-canvas/big-transparent-margin scenario.** This is a real, confirmed test gap this Plan's
regression coverage closes.

---

## Product Decision (owner-approved, restated precisely)

An otherwise-valid transparent PNG must not be permanently rejected only because its **original**
pixel dimensions exceed the internal technical processing ceiling, when safe normalization is
possible:

- Preserve the original uploaded source unchanged (never overwritten, never deleted).
- Create a normalized production derivative only when the original genuinely cannot be processed
  safely at its native resolution.
- Resize proportionally; preserve aspect ratio exactly.
- Preserve meaningful transparency.
- Never crop, stretch, or distort.
- Never upscale during this technical normalization (this is downscale-only, strictly separate from
  ADR-FP-080's existing controlled-upscale pass).
- Downscale only as much as required to fit the approved technical ceiling — not further.
- Recompute derivative pixel dimensions, supported print dimensions, and effective DPI honestly from
  the actual normalized pixels — never from the original's now-inapplicable dimensions.
- Preserve the existing 200-effective-DPI Print Request save floor (ADR-FP-075) — normalization must
  never be used to smuggle a sub-200-DPI asset past that floor; if normalization would push a design
  below what's needed for any meaningful print size, that is a genuine rejection case, not a silent
  quality loss.
- Reject only when normalization cannot safely succeed (e.g., even after normalizing to the technical
  ceiling, the design still fails an existing genuine acceptance requirement) — never for the sole
  reason that the original file happened to be authored at an oversized canvas.

---

## Recommended Processing Order (with justification)

Four orders were explicitly compared, per the required investigation:

| Order | Description | Memory | Decode safety | Transparency preserved | Trim eliminates need to normalize? | Verdict |
|---|---|---|---|---|---|---|
| 1. Metadata → reject/normalize decision → decode → trim | Decide up front from raw metadata alone whether to normalize, without ever attempting a trim-based rescue | Lowest | Safest (never decodes an oversized source at full res) | Yes | **No** — a large-canvas, large-transparent-margin image that would trim under the ceiling is normalized (downscaled) unnecessarily instead of being accepted at its true trimmed size | Rejected — needlessly downscales images that didn't actually need it, contradicting the product goal of preserving quality wherever safely possible |
| 2. Metadata → **bounded** decode → trim → normalize | Decode is explicitly bounded (sharp `limitInputPixels` set to the app ceiling, or a resize-on-load hint) so the full-res decode itself cannot exceed the memory budget even for a still-oversized source; trim runs on the bounded decode; normalize only if still over the ceiling after trim | Bounded and predictable | Safe — the decode step itself cannot blow the memory budget even for a maximally-oversized source | Yes | Yes — trim is given the chance to rescue the image before any lossy normalization happens | **Selected** |
| 3. Metadata → proportional pre-normalization → trim | Always downscale first (before knowing whether trim alone would have sufficed), then trim the already-downscaled image | Predictable, but always pays a resize cost even for many images that never needed it | Safe | Yes, but at reduced resolution before trim runs, which can leave unnecessarily large transparent margins baked into the final trimmed result at a resolution lower than trim-first would have produced | Trim runs on a resolution already reduced, so it can only remove margins proportionally, not recover the resolution loss | Rejected — pays a normalization cost (and precision loss) for every oversized image even when trim alone would have been sufficient, and produces a lower-fidelity result than trim-first |
| 4. Metadata → decode with processor input-pixel override → trim → normalize | Functionally the same core idea as Option 2, phrased as "override the decoder's own pixel ceiling" rather than "bound the decode" | Same as Option 2 | Same as Option 2 | Yes | Effectively identical to Option 2 — the distinction is cosmetic (this Plan treats Option 2 and 4 as the same mechanism, described precisely below) | Folded into Option 2 |

**Selected: Option 2 (bounded decode → trim → normalize-if-still-oversized).** Rationale:

- **Memory impact:** bounding the decode (via `sharp`'s own `limitInputPixels` set to
  `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`, which sharp already supports as a decode-time option — this
  does not require inventing a new mechanism) guarantees the single largest in-memory buffer any
  image's pipeline holds is capped at the ceiling's byte-equivalent (≈381.5 MiB at 100M px, matching
  ADR-FP-123's already-established RGBA-decode arithmetic), regardless of how large the original
  source's dimensions claim to be. This is the same memory-safety property Option 1 has, without
  Option 1's product downside.
- **Decode safety:** a maximally-oversized (e.g., 30,000×30,000) source cannot cause an unbounded
  decode-time memory spike, because `limitInputPixels` causes sharp to reject the decode with a
  controlled error *before* allocating the full raster — this becomes a new, explicit,
  actionable-error rejection path (see below), not a silent OOM risk.
- **Trim before normalize:** exactly implements the product requirement — an image that trims down
  under the ceiling is accepted at its true, full-fidelity trimmed resolution; only an image that
  *still* exceeds the ceiling after trim is normalized (downscaled).
- **Fewer full-resolution decodes than today:** replacing `trimTransparentEdges`'s 3-decode sequence
  (metadata → trim → metadata-of-result) with a single `.toBuffer({ resolveWithObject: true })` call
  (which returns `info.width`/`info.height` from the same operation) removes 2 of 3 full-resolution
  decodes from the hot path — directly addressing the `"Trimming transparent edges…"` timing
  complaint with a proven, not speculative, mechanism.
- **How many full-resolution buffers are held at once:** at most one (the current trim/decode
  buffer) plus, only when normalization is actually triggered, one additional (smaller, since it's a
  downscale) normalized buffer — never two full-size buffers simultaneously, since the original's
  buffer can be released once the normalized derivative is produced and the original bytes are
  already safely persisted to Storage as the untouched original before processing begins (see
  Storage Strategy below).

---

## Original-Source and Normalized-Derivative Storage Strategy

### Original source
- Unchanged from today's architecture: the raw uploaded bytes are already written to
  `customer-uploads/{uid}/{uploadId}/source` (Storage path convention confirmed unchanged from Goal
  #9's investigation) **before** `processCustomerUploadImageBytes` ever runs — this write happens in
  the finalize callable, not inside the processing function. This Plan does not change when or how
  the original source is written; it remains the authoritative, permanently-preserved uploaded file,
  regardless of whether normalization later occurs.
- Never overwritten by a normalized derivative. Never deleted by this Plan (no Storage
  cleanup/migration is in scope).

### Production derivative (new: only created when normalization is technically required)
- Reuses the exact same production-path convention already in place for the *unnormalized* case
  (`getCustomerUploadProductionStoragePath`, unchanged function) — this Plan does not introduce a new
  Storage path family. The existing `productionStoragePath` field already distinguishes "the bytes
  actually used for production/printing" from "the original source," so normalization simply changes
  *what bytes* get written to that already-existing path, not *where* they get written.
- Deterministic: the same `uploadId` always maps to the same production path, exactly as today — a
  retry that re-runs normalization overwrites the same object rather than creating a new one (see
  Retry below).
- Metadata (`widthPx`, `heightPx`, `printWidthInches`, `printHeightInches`, `effectiveDpi`,
  `wasUpscaled` — plus this Plan's new field(s), see Data Model below) is always computed from the
  **actual bytes that were written**, never from the original's pre-normalization dimensions — this
  is the "recompute honestly" requirement, satisfied structurally by computing metadata after, not
  before, normalization.

### Existing normal-size files
- Untouched by this Plan's normalization logic — the `limitInputPixels`-bounded decode only changes
  behavior for images that would have exceeded the ceiling; an image already under the ceiling decodes
  and processes exactly as it does today, byte-for-byte identical pipeline. This is proven by the
  Formal Review's required regression test #1 and #19 (unchanged normal-size behavior).

---

## Data Model Changes (minimal, additive)

Per `references/project-chatgpt-handoff/06-data-model-essentials.md` and current source — exact
filenames confirmed during Formal Review:
`packages/shared/src/types/customerUpload/customerUpload.enums.ts` and
`packages/shared/src/types/customerUpload/customerUpload.types.ts`.

- **New optional boolean field** on the customer-upload document, e.g. `wasNormalizedForDimensions:
  boolean` (exact name TBD during Implement) — `true` only when this Plan's new downscale-only
  normalization path actually ran. **Independent of, and not mutually exclusive with, the existing
  `wasUpscaled` field** (ADR-FP-080's separate, opposite-direction operation) — the type system does
  not structurally enforce mutual exclusivity between the two, so Implement must not write logic that
  assumes only one can ever be true; in this Plan's current scope normalization is downscale-only and
  upscale only ever applies to already-in-range images, so the two are not expected to co-occur in
  practice today, but the fields themselves must remain independently readable/writable, not coupled.
- **New optional numeric fields** for the pre-normalization source dimensions (`preNormalizationWidthPx`,
  `preNormalizationHeightPx`, exact names TBD) — needed so Studio staff and any future audit can see
  what the *original* source's true dimensions were, since `widthPx`/`heightPx` will now reflect the
  *normalized* production dimensions when normalization occurred, not the original.
- **New technical-status/progress-stage value(s)** for the timeout/retry design — see below. This
  requires an additive enum change, not a breaking one (existing values unchanged).
- No existing field's meaning changes. No migration/backfill of historical documents is proposed —
  historical uploads that predate this Plan simply have `wasNormalizedForDimensions` absent/`false`
  and are otherwise unaffected, exactly matching ADR-FP-080's own "no migration without separate
  approval" precedent (item 12).

**This is a schema/data-model change and is flagged as a Human Checkpoint below**, per the resume
prompt's explicit requirement, even though it is additive-only.

---

## Timeout and Idempotent Retry Design

### Bounded stage timeout / watchdog

Requirement: an upload must not remain indefinitely at `"trimming"` (or any stage). Design:

- The finalize callable (`finalizeCustomerUpload.ts`) already runs under a firm 540-second
  `onCall` timeout — if the *entire* callable invocation times out, the Cloud Functions platform
  itself terminates it, but the Firestore document is left in whatever `technicalStatus`/
  `technicalProgressStage` it last had (`"processing"`/`"trimming"`) with **no explicit failure
  recorded** — this is the literal mechanism of "stuck in Trimming" the owner observed: not an
  infinite loop, but a platform-terminated invocation that never got to write a `failed` status
  because the write-on-failure code path never executed.
- **Proposed fix:** before starting the expensive full-resolution trim/normalize stage, the finalize
  callable schedules a narrow **stage watchdog** — a bounded, in-process timer (not a separate
  Function or Cloud Scheduler job) set well under the 540-second platform ceiling (e.g., 480s, leaving
  headroom for the platform's own timeout to never be the thing that fires first) that, if the
  trim/normalize stage has not completed by then, writes an explicit `technicalStatus: "failed"` /
  `technicalFailureCode: <new code, e.g. "processing_timed_out">` document update **before** the
  platform-level timeout can silently truncate the invocation. This requires the watchdog's write to
  happen from *within* the still-running invocation (a `Promise.race` between the trim/normalize work
  and a timer that itself performs the Firestore write) — not a separate function, since only the
  in-flight invocation has the context needed to write a specific, attributable failure.
- Exact watchdog duration, and whether it should also apply to earlier stages (not just trimming), is
  an **implementation-detail decision within the approved scope**, not a re-opening of scope — the
  Formal Review should confirm 480s (or a specific alternative) as the exact value during Implement,
  based on a measured baseline of the *current* full pipeline's typical/worst-case duration once the
  redundant-decode fix (root cause #4) is already applied, so the watchdog isn't tuned against the
  unfixed, artificially-slower baseline.

### Idempotent retry

- The existing `retryCustomerUploadProcessing.ts` callable already re-runs
  `processCustomerUploadImageBytes` from the original source bytes and re-writes to the same
  deterministic production/preview/thumbnail Storage paths — this is **already idempotent by
  construction** for the "failed, retry from source" case, and this Plan's fixes do not change that
  property.
- **New requirement:** `RETRYABLE_FAILURE_CODES` (`retryCustomerUploadProcessing.ts:30-40`) must
  include the new `processing_timed_out` code so a customer/staff can retry a timeout the same way
  they retry any other recoverable failure today.
- **No duplicate objects:** confirmed by design — retry always targets the same `uploadId`-derived
  Storage paths (`getCustomerUploadProductionStoragePath(uid, uploadId)` etc., unchanged function),
  so a retry overwrites, never duplicates, the production/preview/thumbnail objects. The original
  source object is never re-uploaded by retry (retry re-downloads the *already-persisted* source, it
  does not re-run the client-side upload step) — confirmed via the existing `retryCustomerUploadProcessing.ts`
  logic, unchanged by this Plan.
- **No duplicate Firestore records:** retry operates on the existing `customerUploads/{uploadId}`
  document by ID — it cannot create a second document for the same logical upload.
- **No duplicate print-request items:** confirmed out of the retry path's reach — print-request item
  creation happens in a separate confirm/attach callable, not in finalize/retry, and is unaffected by
  this Plan.

---

## ADR Resolution Recommendation

**Recommend a narrow amendment to ADR-FP-080**, not a new standalone ADR, since this is a targeted
exception to an existing, still-otherwise-correct rule, matching this repository's own precedent for
handling scoped exceptions (e.g., ADR-FP-080 itself amended ADR-FP-077 in place rather than issuing a
fully separate decision). Recommended amendment text (for Implement to finalize and record — **not
written into `docs/project/DECISIONS.md` during this Plan/Review phase**, per the resume prompt's
explicit instruction):

> **Amendment — narrow technical-safety downscaling exception (customer-upload pixel-ceiling
> normalization):**
> ADR-FP-080 item 2's "never downsample production assets" rule is amended with one narrow exception:
> when a customer-upload source image's pixel dimensions exceed the trusted processor's safe
> technical ceiling (`CUSTOMER_UPLOAD_MAX_DIMENSION_PX`/`CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`) even after
> transparent-edge trimming, the pipeline may downscale proportionally, exactly enough to fit the
> ceiling, to produce a normalized production derivative. This exception applies only to this one
> technical-safety scenario — it does not authorize general-purpose downsampling, does not apply to
> catalog import, and does not apply to any image already within the technical ceiling. The original
> uploaded source remains preserved and untouched regardless of whether this exception is invoked.
> All other ADR-FP-080 provisions (upscale ceiling, halftone policy, no automatic classification,
> shared sizing code in `packages/shared`) are unaffected.

This preserves ADR-FP-080's core intent (never lose quality by downsampling a processable image)
while resolving the actual conflict (an unprocessable-at-native-resolution image was previously being
permanently rejected instead of safely normalized).

---

## 80 MB / 100 MB Reconciliation — Recommended Action

**No code change.** The enforced 80 MB byte limit is already consistent across every layer (shared
constant, Storage Rules, Portal UI). The only inconsistency is in stale handoff documentation. Fix:
update the four affected files
(`references/project-chatgpt-handoff/03-roadmap-and-phases.md`,
`references/project-chatgpt-handoff/CURRENT-STATE.md`,
`references/project-chatgpt-handoff/04-features-inventory.md`,
`references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md`) to say "80 MB," and — since the
likely root cause of the confusion is `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS = 100_000_000` being
conflated with a byte limit — add one clarifying sentence distinguishing "80 MB per-file byte
ceiling" from "100,000,000-pixel total-pixel ceiling" in the handoff doc that discusses limits, so
this exact confusion cannot recur. This is a documentation-only fix; it is listed in this Plan's
scope (In Scope: file-size limit reconciliation) but is not a source-code or Rules change.

---

## Scope

### In Scope

- `functions/src/lib/customerUploadProcessing.ts` — reorder dimension/pixel validation to occur after
  a bounded decode + trim attempt, not before; eliminate the two redundant full-resolution metadata
  decodes inside `trimTransparentEdges`; add the downscale-only normalization path (triggered only
  when the trimmed image still exceeds the technical ceiling); recompute all derived metadata
  (dimensions, DPI, print size) from actual post-normalization bytes.
- `functions/src/finalizeCustomerUpload.ts` — add the stage watchdog for the trim/normalize stage;
  write the new `processing_timed_out` failure code on watchdog trip.
- `functions/src/retryCustomerUploadProcessing.ts` — add `processing_timed_out` to
  `RETRYABLE_FAILURE_CODES`.
- `packages/shared/src/constants/customerUpload/customerUploadLimits.constants.ts` — no numeric value
  change; may gain a new named export if `limitInputPixels` needs its own explicit constant separate
  from `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS` (TBD during Implement based on whether sharp's
  `limitInputPixels` should exactly equal the app ceiling or include headroom — Formal Review to
  confirm).
- `packages/shared/src/types/customerUpload/customerUpload.enums.ts` (or exact confirmed filename) —
  additive new `technicalFailureCode` value (`processing_timed_out`); additive new document fields
  (`wasNormalizedForDimensions`, pre-normalization dimension fields — exact names TBD).
- Sanitized per-stage timing instrumentation (see Observability below).
- Focused regression tests per the Required Regression Coverage table below.
- Reconciling the four stale "100 MB" handoff docs to "80 MB" plus a clarifying sentence.
- Recommending the ADR-FP-080 amendment text (finalized/recorded during Implement, not this phase).
- Dev-only deployment planning (commands, scope, checkpoints) — **no deployment in this phase.**

### Out of Scope

- Assisted Creation reference images (Goal #10 — signed off, do not reopen).
- `finalizeCustomerUploadZip.ts`'s bounded-concurrency loop, `aggregateZipProcessingResults`,
  `boundedConcurrencyQueue.ts` (Goal #9 — signed off; this Plan's changes to
  `customerUploadProcessing.ts` are inherited by the ZIP path automatically without touching its
  orchestration code).
- Catalog derivative consolidation (Goal #12).
- Deleting or migrating existing Storage objects; any Storage cleanup.
- Production deployment.
- Changing the 200-effective-DPI Print Request save floor (ADR-FP-075) — preserved exactly.
- Adding client-authoritative image processing — the Portal client remains a non-authoritative
  preflight only; all normalization decisions remain server-side in Cloud Functions.
- Unrelated Portal/Studio redesign.
- Changing the existing bounded ZIP concurrency value (3) without new evidence — none was found;
  Goal #9's concurrency-3 decision stands unmodified.
- Raising the 80 MB byte limit to 100 MB, or any other byte-limit value change — no evidence supports
  changing the enforced limit; only documentation is corrected.
- Building a new scheduled/cron stuck-upload detector — the in-invocation watchdog design (above)
  solves the reported symptom without needing a new scheduled Function; `cleanupAbandonedCustomerUploads.ts`'s
  existing 24-hour sweep remains the coarse, staff-invoked backstop, unmodified.

---

## Affected Areas

### Files / Modules (expected — verify exact paths at Implement start, before editing)

| File | Status (confirmed during Formal Review) | Change |
|---|---|---|
| `functions/src/lib/customerUploadProcessing.ts` | exists | Reorder validation; eliminate redundant decodes; add normalization path |
| `functions/src/finalizeCustomerUpload.ts` | exists | Add a call to the new pure watchdog helper (Required Change 1) around the trim/normalize stage |
| `functions/src/retryCustomerUploadProcessing.ts` | exists | Add new retryable failure code |
| `packages/shared/src/types/customerUpload/customerUpload.enums.ts` | exists, filename confirmed | Additive failure code; additive status/field types |
| `packages/shared/src/types/customerUpload/customerUpload.types.ts` | exists, filename confirmed | Additive document fields |
| `functions/src/lib/customerUploadProcessing.test.ts` | exists | New regression tests |
| `packages/shared/src/utils/customerUploadFinalizeWatchdog.ts` (or equivalent name TBD) | **new file** | Pure, directly-testable stage-watchdog helper (Required Change 1), following the `withTimeout.ts` extraction precedent from Goal #10 |
| `packages/shared/src/utils/customerUploadFinalizeWatchdog.test.ts` | **new file** | Focused tests for the extracted watchdog helper — this is what satisfies regression items #13/#24, not a `finalizeCustomerUpload.test.ts` integration test |
| `functions/src/retryCustomerUploadProcessing.test.ts` | **confirmed does not exist — new file** | New focused tests for retry idempotency (items #14-#16) |
| `references/project-chatgpt-handoff/03-roadmap-and-phases.md`, `CURRENT-STATE.md`, `04-features-inventory.md`, `07-backend-and-ai-pipeline.md` | exist | "100 MB" → "80 MB" + clarifying sentence |
| `references/project-chatgpt-handoff/06-data-model-essentials.md` | exists | Update only if Implement's first-step read of its current content shows it needs correction (Required Change 3) — Implement must state the resolution explicitly either way |
| `docs/project/DECISIONS.md` | exists | New ADR amendment, recorded during Implement |

**Note on `finalizeCustomerUpload.test.ts`:** confirmed during Formal Review that this file does
**not** currently exist. Per Required Change 1, the watchdog logic itself must be extracted as a pure
function before Implement, specifically so it does not need a new `onCall`-integration test file at
all — this repository has no live-callable integration-test harness (confirmed during Goal #10's
Amendment 1), so watchdog behavior must be provably correct via the extracted pure-function tests
above, not via a new, harder-to-build callable-level test file.

No other file is expected to change. `finalizeCustomerUploadZip.ts`, `boundedConcurrencyQueue.ts`,
`finalizeCustomerUploadZipAggregation.ts` (all Goal #9) are explicitly not on this list and must not
be touched.

### Architecture Impact

- [x] None to the Component → Hook → Service → Callable boundary. All new logic stays within the
  existing trusted-server Functions layer (`functions/src/lib/`); the Portal client gains no new
  authoritative validation.
- The bounded-decode/normalize logic is pure/testable library code, consistent with the existing
  `customerUploadProcessing.ts` structure — no new architectural layer introduced.

### Security Impact

- [x] No authentication/ownership/Rules change. `storage.rules`'s existing 80 MB check is unchanged
  (already correct); no new Storage path is introduced (normalization reuses the existing production
  path).
- The bounded-decode (`limitInputPixels`) change is itself a **security-positive** change — it
  converts a theoretical unbounded-decode risk (a maliciously or accidentally huge source image) into
  a controlled, immediate rejection at decode time, before any large buffer is allocated.

### Data Model Impact

- [x] Additive only — see Data Model Changes above. No existing field's meaning changes; no
  migration/backfill of historical records.

### Backend Impact

- [x] `functions/src/lib/customerUploadProcessing.ts` behavior changes for the specific oversized/slow
  cases described; behavior for already-valid, already-fast uploads is unchanged (proven by
  regression tests #1, #19, #20).
- No Function memory/timeout **configuration** change proposed — the existing 540s/2GiB values remain;
  the watchdog operates *within* that budget, not by extending it. If evidence during Implement proves
  the existing budget is insufficient even after the redundant-decode fix, that is an explicit Stop
  Condition requiring a Plan amendment (a Function config change is a Human Checkpoint), not a
  silent Implement-phase decision.

### UI / UX Impact

- [x] Minimal — a previously-permanent rejection becomes either a silent success (image normalized
  transparently) or, for the timeout case, a new retryable-failure state with actionable copy instead
  of an indefinite spinner. No new UI screen; existing progress-stage/retry UI patterns are reused.

### Migration Impact

- [x] None. New fields are additive/optional; no backfill of historical `customerUploads` documents.

---

## Approach

1. **File paths already confirmed during Formal Review** (`customerUpload.enums.ts`,
   `customerUpload.types.ts` exist as expected; `finalizeCustomerUpload.test.ts` and
   `retryCustomerUploadProcessing.test.ts` confirmed **not** to exist — both are new files if
   created, per Required Change 1's watchdog-extraction requirement below).
2. **Baseline measurement first.** Before changing any processing logic, add sanitized per-stage
   timing instrumentation (see Observability) to the *current* pipeline and capture a baseline for a
   representative large (~50 MB-class) transparent PNG, so the "which stage is actually slow" claim in
   this Plan (the two redundant `trimTransparentEdges` decodes) is confirmed empirically, not only
   architecturally, before the fix is applied. This directly satisfies the resume prompt's "measurement
   work required if it cannot yet be proven statically" instruction for item 4.
3. **Eliminate the two redundant full-resolution decodes** in `trimTransparentEdges` by using
   `.toBuffer({ resolveWithObject: true })`'s returned `info.width`/`info.height` instead of a second
   `.metadata()` call, and by having both call sites (`:543`, `:599`) pass in the already-known
   `sourceWidthPx`/`sourceHeightPx` instead of re-deriving `originalWidth`/`originalHeight` via a
   fresh decode. Re-measure against the same baseline fixture to confirm the latency improvement is
   real before proceeding.
4. **Add `limitInputPixels`-bounded decoding** to the metadata/trim/normalize call sites, set to
   `CUSTOMER_UPLOAD_MAX_TOTAL_PIXELS`. Confirmed during Formal Review: `limitInputPixels?: number |
   boolean | undefined` exists in the installed sharp version (`^0.33.5`,
   `functions/node_modules/sharp/lib/index.d.ts:921,1507`) and already has a working precedent in
   this exact codebase (`functions/src/lib/portalOgImageCompose.ts:39`,
   `PORTAL_OG_MAX_INPUT_PIXELS`) — follow the same named-constant convention rather than passing the
   raw pixel-ceiling constant directly.
5. **Move the dimension/pixel rejection check to run after the trim attempt**, not before — restructure
   `processCustomerUploadImageBytes` so trim is attempted first (using the now-bounded decode), then
   the resulting (possibly already-smaller) dimensions are what's evaluated against the ceiling, not
   the original source's raw dimensions.
6. **Add the downscale-only normalization branch**, triggered only when post-trim dimensions still
   exceed the ceiling: proportional resize (no crop, no distort, no upscale), recompute all derived
   print-size/DPI metadata from the actual normalized bytes, set `wasNormalizedForDimensions: true`
   and the pre-normalization dimension fields.
7. **Extract the stage watchdog as a pure, directly-testable helper** (Required Change 1) — a
   `Promise.race`-based function parameterized by duration and an "on timeout" callback, mirroring
   `packages/shared/src/utils/withTimeout.ts`'s exact precedent from Goal #10 (including its
   `clearTimeout`-on-resolve cleanup behavior, to avoid a stray timeout firing after genuine
   completion). Wire this helper into `finalizeCustomerUpload.ts` around the trim/normalize stage,
   writing `processing_timed_out` on trip; add the new failure code to `RETRYABLE_FAILURE_CODES` in
   the retry callable. Test the extracted helper directly — do not attempt a full `onCall`
   integration test, since this repository has no live-callable integration-test harness.
8. **Add regression tests** per the Required Regression Coverage table, using programmatically
   generated `sharp`-created fixtures (matching the existing test file's established pattern —
   `makeTransparentPng`/`makeOpaquePng` helpers already exist and can be extended to generate
   large-canvas fixtures without committing large binary files).
9. **Correct the four stale handoff docs.**
10. **Record the ADR-FP-080 amendment** in `docs/project/DECISIONS.md` (Implement-phase action, per
    the resume prompt).
11. Run the full verification matrix; produce the Test Report; run an independent Implementation
    Review.

---

## Observability / Sanitized Stage Timing

New structured log entry (pattern matching the existing `logger.info(...)` convention already used
elsewhere in this codebase — e.g., `finalizeCustomerUploadZip.processingBatch` from Goal #9) emitted
once per finalize invocation, containing **only**:

- sanitized per-stage duration (ms) for: byte-size validation, format validation, metadata read,
  transparency sampling, trim probe, trim operation, dimension-limit evaluation, normalization (if
  triggered), upscale (if triggered by existing ADR-FP-080 policy), DPI/print-size assessment, preview
  generation, production-image generation, Storage writes, Firestore finalization write
- source width/height (px), total pixels, source byte size
- normalized width/height (px), when normalization occurred
- whether trim occurred (boolean)
- whether normalization occurred (boolean)
- which stage (if any) the watchdog fired at
- a retry-attempt counter/identity (e.g., `retryAttempt: number`, incrementing per
  `retryCustomerUploadProcessing` invocation for the same `uploadId`)

**Never logged:** artwork pixel content, customer name/email/request text, Storage download URLs,
secrets, or any customer identifier beyond the already-necessary `uploadId` (an opaque generated ID,
not a customer identifier) — consistent with the existing codebase's established sanitized-logging
pattern (e.g., `storagePathPrefixForLog` redacting the `{uid}` segment in Assisted Creation's
services, confirmed during Goal #10's investigation).

---

## Required Regression-Test Coverage (mapped to implementation files)

| # | Test | File |
|---|---|---|
| 1 | Valid transparent PNG below all limits — unchanged output | `customerUploadProcessing.test.ts` |
| 2 | Oversized-dimension PNG proportionally normalized, succeeds | `customerUploadProcessing.test.ts` (new fixture) |
| 3 | Original source object preserved unchanged | Finalize-callable-level test or documented as structurally guaranteed (source write precedes processing) — confirm exact test seam during Implement |
| 4 | Transparency survives normalization | `customerUploadProcessing.test.ts` |
| 5 | Aspect ratio survives normalization | `customerUploadProcessing.test.ts` |
| 6 | No crop occurs | `customerUploadProcessing.test.ts` |
| 7 | No distortion occurs | `customerUploadProcessing.test.ts` |
| 8 | Normalization does not upscale | `customerUploadProcessing.test.ts` |
| 9 | Effective DPI recomputed correctly post-normalization | `customerUploadProcessing.test.ts` |
| 10 | Maximum printable dimensions recomputed correctly | `customerUploadProcessing.test.ts` |
| 11 | Normalized derivative below 200 DPI at requested size is blocked by existing sizing rules | `customerUploadProcessing.test.ts` + existing print-size test suite (unchanged rules, new input case) |
| 12 | Source that cannot be safely decoded fails with actionable error | `customerUploadProcessing.test.ts` (`limitInputPixels` rejection path) |
| 13 | Processing timeout becomes a retryable failure | New focused test of the extracted pure watchdog helper (Required Change 1) — not a `finalizeCustomerUpload.test.ts` integration test |
| 14 | Retry is idempotent | New file `functions/src/retryCustomerUploadProcessing.test.ts` (confirmed does not exist today) |
| 15 | Retry creates no duplicate Storage objects | same |
| 16 | Retry creates no duplicate Firestore records/print-request items | same |
| 17 | Multiple concurrent large uploads stay within approved concurrency/memory bounds | Existing Goal #9 ZIP concurrency tests re-run unmodified to confirm no regression; no new concurrency test needed since this Plan doesn't change concurrency |
| 18 | Authoritative byte limit identical across Portal/constants/callables/ZIP/copy/tests | `storageRulesAlignment.test.ts`-style check, or confirm existing coverage suffices |
| 19 | Existing normal-size PNG uploads unchanged | `customerUploadProcessing.test.ts` (existing tests re-run) |
| 20 | Existing WebP uploads unchanged | `customerUploadProcessing.test.ts` (existing tests re-run) |
| 21 | ZIP uploads use the same authoritative final image rules | Confirm `finalizeCustomerUploadZip.ts` calls the same (now-fixed) `processCustomerUploadImageBytes` — no separate test needed beyond confirming the call site is unchanged |
| 22 | Donate Design follows the same normalized-image behavior | Confirmed structurally (same pipeline, §3 above) — a focused test using `purpose: "catalog_donation"` fixtures if a purpose-conditional seam exists, otherwise documented as covered by #1-#12 since no purpose branching exists in the processing function |
| 23 | Sanitized stage timings identify the actual expensive stage | New test asserting the timing log structure/fields, using mocked timers |
| 24 | An upload cannot remain indefinitely at "trimming" | Watchdog test — simulate a stage exceeding the watchdog duration, assert the failure write occurs |

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Toolchain record | `npx tsc -v` | yes |
| Functions build | `npm run build --prefix functions` | yes; exit 0 |
| Repository lint | `npm run lint` | yes; exit 0 |
| Changed-file lint | `npx eslint <exact changed files> --report-unused-disable-directives --max-warnings 0` | yes |
| Focused customer-upload processing tests | `npx tsx --test functions/src/lib/customerUploadProcessing.test.ts` | yes |
| Focused finalize/retry tests | `npx tsx --test functions/src/finalizeCustomerUpload.test.ts functions/src/retryCustomerUploadProcessing.test.ts` (exact filenames TBD) | yes |
| Focused ZIP tests (regression-only, confirming Goal #9 untouched) | `npx tsx --test functions/src/finalizeCustomerUploadZip.test.ts functions/src/lib/finalizeCustomerUploadZipAggregation.test.ts` | yes |
| Portal typecheck/build | `npm run typecheck --workspace @fresh-prints/portal`, `npm run build:portal` | yes, if any Portal file changes (progress-label copy, if any) |
| Diff integrity | `git diff --check` | yes |

### Manual

- [x] Conditional. A reduced owner QA checkpoint is expected after Implement, covering: (1) upload a
  real oversized-dimension transparent PNG and confirm it now succeeds via normalization instead of
  rejecting; (2) upload a large (~50 MB-class) PNG and confirm processing completes without the
  previous stuck-at-trimming delay; (3) confirm a genuinely-undecodable or still-too-large-after-trim
  file still fails with an actionable message, not silently. Exact steps to be finalized once
  Implement confirms the watchdog timing.

---

## Human Checkpoints Anticipated

- [x] **Schema/data-model change** — additive new fields/enum values on `customerUploads` documents;
  requires owner awareness even though non-breaking and non-migrating.
- [x] **Business/product-policy decision** — the exact watchdog timeout duration (proposed 480s) and
  the exact new failure-code copy shown to customers are narrow implementation choices within the
  approved product decision, not new decisions, but should be confirmed during Implement's Formal
  Review pass if Implement's own findings suggest a different value than 480s.
- [ ] Migration/backfill — not applicable, none proposed.
- [ ] Deletion of old objects — not applicable, none proposed.
- [x] **Functions deployment** — required to make any of this live in `fresh-prints-dev`; a separate,
  explicit checkpoint after Implementation Review approval, matching Goal #9 and Goal #10's precedent.
- [ ] Storage Rules deployment — not expected; no Rules change proposed (80 MB already correct).
- [ ] Production deployment — not in scope for this goal.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| `limitInputPixels` throws a different error shape than expected when tripped | Low | Confirmed during Formal Review that the option exists in the installed sharp version (`^0.33.5`) with a working precedent already in this codebase (`portalOgImageCompose.ts:39`); Implement should follow that file's existing error-handling pattern for the rejection case rather than inventing a new one |
| Watchdog timer implementation races with the actual processing promise incorrectly, causing a false-positive timeout on an otherwise-succeeding image | High | Use `Promise.race` with careful cleanup (clear the watchdog timer on genuine completion, exactly mirroring the existing `withTimeout` pattern's `clearTimeout`-on-resolve behavior already proven in this codebase — Goal #10's `packages/shared/src/utils/withTimeout.ts`) |
| Redundant-decode removal in `trimTransparentEdges` subtly changes trim output (e.g., if the two decodes were ever non-idempotent for some edge-case input) | Medium | Add a test asserting identical trim output bytes/dimensions before and after the refactor, using the existing test fixtures |
| Normalization introduces a quality-loss customer complaint distinct from the original rejection complaint | Medium | Normalization only triggers when the alternative is permanent rejection — always strictly better for the customer than today's behavior; downscale-only, proportional, no crop/distort, matching the explicit product decision |
| Watchdog interacts unexpectedly with Goal #9's bounded ZIP concurrency (multiple images processing concurrently, each with its own watchdog) | Low | Each watchdog is scoped to one image's processing promise within the existing per-image task the bounded-concurrency queue already isolates — no shared timer state; confirm via a regression test that concurrent watchdogs don't interfere |
| ADR-FP-080 amendment text drifts from what Implement actually builds | Low | Formal Review requires the amendment be written to match the final Implement diff, not written speculatively in advance of it |

## Rollback Plan

No deployment or migration occurs in this Plan/Review phase. Once Implement runs (a future phase),
rollback is reverting the changed files to their pre-Implement state and redeploying the two affected
callables — no data migration exists to roll back, since new fields are additive/optional and existing
documents are never modified by this goal.

## Documentation Updates Required

- [x] `docs/project/DECISIONS.md` — ADR-FP-080 amendment, recorded during Implement.
- [x] `references/project-chatgpt-handoff/03-roadmap-and-phases.md`,
  `references/project-chatgpt-handoff/CURRENT-STATE.md`,
  `references/project-chatgpt-handoff/04-features-inventory.md`,
  `references/project-chatgpt-handoff/07-backend-and-ai-pipeline.md` — "100 MB" → "80 MB" correction.
- [x] `references/project-chatgpt-handoff/06-data-model-essentials.md` — new additive fields, if this
  doc is determined during Implement to need updating for accuracy.
- [x] Workflow Plan, Formal Review, and (during Implement) test report, Implementation Review,
  signoff/state, handoff records.

## Acceptance Criteria

- [ ] Current source and deployed behavior are traced — done above, cited exactly.
- [ ] Customer Uploads and Donate Design both mapped — done (confirmed same pipeline).
- [ ] Exact width/height/total-pixel/decoder/memory/timeout limits identified — done.
- [ ] Exact source of the observed dimension error identified — done (`:404-410`, pre-trim ordering).
- [ ] Exact source of the 80 MB vs. 100 MB discrepancy identified — done (documentation-only drift).
- [ ] Goal #9 completed work preserved — confirmed unmodified file list; concurrency logic untouched.
- [ ] Safe original-plus-normalized-derivative design documented — done.
- [ ] Processing order justified — done (Option 2 selected with explicit comparison table).
- [ ] Memory and concurrency implications documented — done.
- [ ] Stage timing design documented — done (Observability section).
- [ ] Timeout and idempotent retry design documented — done.
- [ ] ADR resolution specified — done (ADR-FP-080 narrow amendment, text drafted for Implement).
- [x] Exact files to change identified from repository evidence — done; all filenames independently
  confirmed during Formal Review (existing files confirmed present; `finalizeCustomerUpload.test.ts`/
  `retryCustomerUploadProcessing.test.ts` confirmed absent, correctly reclassified as new files).
- [x] Regression tests mapped to implementation files — done (24-item table).
- [x] Deployment and migration checkpoints identified — done (Functions deployment checkpoint;
  no migration).
- [x] Formal Review gives an explicit verdict — **approved_with_changes**, see Approval below.
- [x] No implementation occurs before Plan approval — confirmed, no source file was modified in this
  Plan/Review phase.

## Open Questions

- [ ] **Implement-phase confirmation, not a blocking owner decision:** exact watchdog duration
  (proposed 480s) — to be finalized once a real baseline measurement (Approach step 2) is available.
- [x] Sharp `limitInputPixels` API shape confirmed during Formal Review — `number | boolean |
  undefined`, matching this Plan's assumption, with a working precedent already live in
  `functions/src/lib/portalOgImageCompose.ts:39`.
- [x] No blocking owner-policy decision remains — the product decision itself was already given in
  the resume prompt.

---

## Approval

- Review doc: `docs/workflow/reviews/2026-07-30-customer-upload-oversized-pixel-normalization-and-processing-timeout-followup-review.md`
- Verdict: **approved_with_changes** (2026-07-30) — three binding required changes carried into a
  future Implement phase, none requiring a Plan amendment: (1) extract the stage watchdog as a pure,
  directly-testable helper (mirroring `withTimeout.ts`'s precedent) before writing its tests, since
  this repository has no live-callable integration-test harness; (2) explicitly treat
  `wasNormalizedForDimensions` and `wasUpscaled` as independent, non-mutually-exclusive booleans, not
  structurally coupled; (3) resolve the `06-data-model-essentials.md` update question definitively
  during Implement's first step and report the resolution explicitly.
