# Plan: Image Quality Sizing and Halftone Safeguards

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Goal id | `image-quality-sizing-and-halftone-safeguards` |
| Related | docs/workflow/reviews/ (pending review) |
| Prior ADRs | FP-073 uploads, FP-074 library permission, FP-075 200 DPI floor, FP-077 soft upscale warning, FP-078 donations |
| Proposed ADR | **ADR-FP-080** (next available after FP-079) |

---

## Goal

Create one consistent image-quality and halftone workflow across Studio imports, Portal customer request uploads, and the **existing** Portal customer donation page (`/donate`). Preserve high-resolution artwork, perform at most one controlled upscale (≤2.0×), calculate and enforce a per-image approved maximum print size (15″ × 16.5″ quality envelope at 300 effective DPI), detect possible halftones with a shared deterministic detector, ask uploaders to confirm nonblocking, and give staff final Halftone control during Studio review/approval with canonical tag sync.

---

## Background

Phase 3 import upscale currently stretches any image under **15″ @ 300 DPI** to that width with **no hard scale-factor cap** (ADR-FP-077 only warns at ≥3×). Print-request sizing defaults to 10″ and caps at **22″**, with a global **200 DPI** save floor (ADR-FP-075). Catalog donations already exist (ADR-FP-078) as `customerUploads` with `purpose: catalog_donation`. There is **no** technical halftone detector today—only AI prompt guidance.

Product needs pixel-dimension-based quality limits, a single upscale pass capped at 2×, and separated auto / submitter / staff halftone signals—without duplicating the donation workflow or changing the 200 DPI floor.

---

## Repo audit summary (source of truth)

### Existing donation workflow (confirmed)

| Item | Exact location |
|------|----------------|
| Portal route | `/donate` → `apps/portal/app/(app)/donate/page.tsx` |
| Portal UI | Shared `CustomerUploadPanel` + `useCustomerUploadBatch` + `customerUploadService` with `purpose="catalog_donation"` |
| Confirm callable | `confirmCustomerUploadsForDonation` → `functions/src/confirmCustomerUploadsForDonation.ts` |
| Collections | Same `customerUploads` / `customerUploadBatches` (no separate donations collection) |
| Storage | Same `/customer-uploads/{uid}/{uploadId}/...` paths |
| Studio review | `/donated-designs` → `DonatedDesignsPage` → `CustomerUploadIntakeSection` (`purposeScope="catalog_donation"`) |
| Design creation | **Only after** staff `promoteCustomerUploadToAiReview` — never on customer submit |
| Consent | `ownershipConfirmed` + **required** `catalogUseAcknowledged` + `termsVersion: customer-upload-donate-terms-v1` |
| Signoff | `docs/workflow/reviews/2026-07-13-portal-donate-designs-signoff.md` |

**Conflict with stale handoff language:** Any docs still calling donations “future” are stale. ROADMAP already marks Catalog Donate Designs complete. `references/project-chatgpt-handoff/CURRENT-STATE.md` was **not found** in this repo (no chatgpt handoff package present). Update ARCHITECTURE / feature inventory during implement to name `/donate` and `/donated-designs` explicitly where missing.

### Existing sizing / upscale (confirmed)

| Behavior | Current | Required by this phase |
|----------|---------|------------------------|
| Upscale target | Always **15″** width @ 300 DPI (4500px) | Aspect-locked target starting at **10″**, height-capped at **16.5″** |
| Max upscale factor | Uncapped (soft warn ≥3×) | **≤ 2.0**, one pass |
| Near-target skip | None (any width &lt; 4500px upscales) | Skip if within **5%** of target |
| Large images | Left alone (correct) | Preserve; default request **10″**; approved max ≤15×16.5 |
| Request platform cap | **22″** (Firestore + shared assess) | **Keep 22″**; add stricter per-asset approved max |
| 200 DPI floor | Unchanged | **Must remain unchanged** |
| Shared math | `printSizeMath.ts`, `printRequestItemSizing.ts` | Extend in place; do not fork per app |

### Existing halftone / review (confirmed)

| Item | Current |
|------|---------|
| Technical detector | **Missing** |
| AI | Prompt-only guidance in `aiEnrichment.constants.ts` |
| Canonical tag | Name-based registry (`tags` collection); slug from name; **no hard-coded ID** |
| Tags persisted | On AI Review **Approve** via `aiReviewInboxService` → `designService.updateDesign` → `normalizeDesignTags` |
| Human override lock | **None** pre-approve; draft edits lost on AI rerun; approved catalog fields survive |
| Intake surfaces | `/customer-uploads` (print_request), `/donated-designs` (catalog_donation) — promote/exclude only today |

---

## Gap analysis

### Already exists — reuse / extend

- Donation route, callables, Studio Donated Designs, purpose discriminator (ADR-FP-078)
- Shared finalize processing for uploads + donations (`customerUploadProcessing.ts`)
- Studio Electron trim + upscale + PNG validation pipeline
- Shared `printRequestItemSizing` / `printSizeMath` / `printSize.constants`
- Customer upload transparency / trim helpers
- AI Review approve path + catalog tag normalizer
- Ownership / catalog consent confirmation patterns
- 200 DPI save floor (ADR-FP-075)
- 22″ standard request cap + Firestore inch helpers

### Needs modification

- Upscale policy: replace “always grow to 15″” with capped, height-aware, 10″-target policy (supersedes ADR-FP-077 soft-warn-at-3× as primary quality control; revise ADR narrative)
- Persist approved max + sizing policy version + upscale factor metadata on designs and customerUploads
- Enforce approved max in Portal + Studio item sizing (UI + services; Portal currently weak on service-side DPI)
- Studio intake + AI Review: show detector/submitter evidence; staff Halftone control; survive AI reruns
- Docs: donation surfaces in ARCHITECTURE feature inventory where thin; ROADMAP fast-follow line; next ADR

### Genuinely missing

- Shared pure halftone alpha-channel detector + tests
- Uploader Yes / No / Unsure confirmation UX + validated callable fields
- Separated auto / submitter / staff halftone metadata model
- Staff decision persistence that AI reruns must not clear
- Per-image approved maximum calculation module (versioned policy)
- Bulk-import nonblocking halftone summary (no modal spam)

### Must not do

- New donation collection/route/callable parallel to ADR-FP-078
- Auto-publish donations or uploads
- Change global 200 DPI floor
- Multiple upscale passes / AI super-resolution
- Hard-code halftone tag document IDs
- Bulk reprocess all existing artwork without separate migration plan + owner checkpoint
- Production deploy in this phase

---

## Prompt vs repository conflicts (flag before implement)

| # | Conflict | Resolution in this plan |
|---|----------|-------------------------|
| 1 | Current upscale grows to **15″** uncapped; prompt targets **10″** with **2×** max | Replace shared upscale resolution; keep 15″ as **approved-max width envelope**, not upscale floor |
| 2 | ADR-FP-077 soft warning at ≥3× assumes uncapped upscale | Cap at 2× so ≥3× cannot occur under new policy; keep/adapt soft messaging only if residual soft cases remain; document supersession in ADR-FP-080 |
| 3 | Platform **22″** vs quality **15×16.5** | Both apply: approved max ≤15×16.5 @ 300 DPI policy; absolute request still cannot exceed 22″; UI explains quality max first |
| 4 | Designs lack `wasUpscaled` / source dims as first-class fields | Add additive metadata; derive approved max lazily from production pixels when policy fields absent |
| 5 | `wasTrimmed` written on uploads but omitted from shared type | Add to `CustomerUpload` type when touching the model |
| 6 | Pre-approve AI Review edits do not survive rerun | Introduce explicit staff halftone decision fields **excluded** from AI reset delete lists |
| 7 | Stale “future donations” language in older plans/handoffs | Docs update only; code already has donations |
| 8 | Portal `updatePrintRequestItem` lacks DPI/size service enforcement | Enforce approved max + existing 200 DPI via shared assess in services/callables where items are written |

---

## Scope

### In Scope

- Studio catalog imports (Electron sharp path)
- Portal customer artwork uploads for print requests
- Existing Portal `/donate` donation workflow (extend, do not replace)
- ZIP / folder processing on current paths
- Customer-upload + donation finalize processing
- Studio customer-upload + donated-designs intake
- AI Review carry-through + staff Halftone + tag sync
- Portal + Studio print-request item sizing enforcement
- Shared sizing policy + shared halftone detector
- Unit/integration tests + one combined manual checkpoint
- Documentation + ADR-FP-080

### Out of Scope

- New donation page/workflow
- Changing 200 DPI floor
- AI super-resolution / multi-pass upscale
- Auto-publish without staff approval
- Ecommerce / shipping / payments / Phase 9
- Manual gang-sheet canvas
- Production deploy
- Unapproved bulk reprocessing migration
- Changing AI provider
- Creating duplicate halftone tags

---

## Affected Areas

### Files / Modules (verified + expected)

**Shared**

- `packages/shared/src/constants/printSize.constants.ts` — add policy constants (versioned)
- `packages/shared/src/utils/printSizeMath.ts` — replace/extend `resolveImportUpscaleTargetPx`
- `packages/shared/src/utils/printRequestItemSizing.ts` — approved-max clamp + initial size
- **New:** `packages/shared/src/utils/imageQualitySizingPolicy.ts` (+ tests) — approved max, upscale decision, policy version
- **New:** `packages/shared/src/utils/halftoneDetection.ts` (+ tests) — pure alpha detector
- `packages/shared/src/types/customerUpload/customerUpload.types.ts` — sizing + halftone metadata
- `packages/shared/src/types/import/*` — IPC warning codes / metadata as needed
- Shared design / AI types for staff halftone decision fields

**Functions**

- `functions/src/lib/customerUploadProcessing.ts` — apply new sizing + detector
- `functions/src/finalizeCustomerUpload.ts` / `finalizeCustomerUploadZip.ts` — persist new fields
- **New callable (preferred):** `recordCustomerUploadHalftoneResponse` (or extend confirm callables with optional post-finalize response) — customer-owned response only
- `functions/src/promoteCustomerUploadToAiReview.ts` — copy sizing + halftone metadata onto design
- `functions/src/resetAiEnrichmentForProcessing.ts` / `enqueueAiEnrichment.ts` — **do not delete** staff halftone decision
- `functions/src/confirmCustomerUploadsAndAttachToRequest.ts` — initial size respects approved max
- Donate confirm: unchanged consent rules; may pass through response if already recorded

**Studio Electron**

- `apps/studio/electron/services/import/upscaleImportImage.ts`
- `apps/studio/electron/services/import/trimImportImage.ts` (reuse; no formula change unless needed)
- `apps/studio/electron/ipc/import/pngValidator.ts`
- Import batch discovery surfaces — batch halftone summary counters

**Studio renderer**

- `features/imports/*` — nonblocking notice / batch summary
- `features/customer-uploads/*` — intake Halftone evidence + provisional staff control
- `features/ai-review/*` — Halftone panel; seed from precedence; tag sync on approve
- `features/print-requests/*` — clamp + copy for approved max
- `features/designs/services/*` — persist staff decision; tag sync via existing services

**Portal**

- `features/customer-uploads/*` — nonblocking halftone alert after finalize (request + donate)
- `features/print-requests/*` — approved-max UX + service enforcement

**Rules / docs**

- `firestore.rules` — customerUploads remain Admin-SDK-only writes; no client write of privileged fields (callable-only response)
- `docs/architecture/*`, `docs/project/ROADMAP.md`, `docs/project/DECISIONS.md` (ADR-FP-080), `docs/standards/TESTING.md` if new scripts

### Architecture Impact

- [x] Details: Extend shared pure utils; keep Electron/Functions as processors; no third app; no parallel donation architecture.

### Security Impact

- [x] Details: Halftone response is user input via callable; validate enum + ownership; never grants catalog approval or writes tags; staff decisions staff-only; detector never blocks upload; no secrets; Storage paths unchanged.

### Data Model Impact

- [x] Details: Additive fields on `customerUploads` and `designs` (sizing policy + halftone triad). No new collections. No bulk migration.

### Backend Impact

- [x] Details: Finalize + promote + AI reset paths; one new or extended callable for submitter response; Functions build required.

### UI / UX Impact

- [x] Details: Nonblocking halftone alerts (Portal + Studio); bulk import summary; intake + AI Review Halftone controls; sizing max copy. **Manual checkpoint required.**

### Migration Impact

- [x] None for bulk reprocess
- [x] Forward: additive fields; lazy derive approved max from production pixels when missing
- [x] Rollback: feature flags not required if additive + fail-open detector; revert code deploy leaves unused fields
- Separate owner checkpoint if a backfill migration is later desired

---

## Answers to required planning questions

1. **Where is the existing customer donation page?**  
   Portal `/donate` — `apps/portal/app/(app)/donate/page.tsx`.

2. **Which collection stores donations?**  
   `customerUploads` / `customerUploadBatches` with `purpose: "catalog_donation"`. No separate donations collection.

3. **Which Functions process donations?**  
   Shared: `createCustomerUploadBatch`, `finalizeCustomerUpload`, `finalizeCustomerUploadZip`. Donate-specific confirm: `confirmCustomerUploadsForDonation`. Staff: `promoteCustomerUploadToAiReview`, exclude/restore/retry (shared).

4. **Does donation processing already reuse customer-upload code?**  
   Yes — same finalize processor and Storage namespace; divergence only at confirm + purpose + Studio filter.

5. **Where does staff currently review donations?**  
   Studio `/donated-designs` (`DonatedDesignsPage` + `CustomerUploadIntakeSection`).

6. **Where does staff currently review customer-upload catalog candidates?**  
   Studio `/customer-uploads` (print_request scope).

7. **Do both eventually enter AI Review?**  
   Yes — after staff promote; then `/ai-review`.

8. **At what point are canonical tags currently persisted?**  
   AI Review Approve (`aiReviewInboxService.approveFromInbox` → `designService.updateDesign` tags + catalog approval). Promotion creates design with `tags: []`.

9. **Which existing fields already store image pixel dimensions?**  
   Uploads: `sourceWidthPx/HeightPx`, `widthPx/heightPx`, `printWidthInches/HeightInches`, `effectiveDpi`, `wasUpscaled`. Designs: `width`/`height`, print fields, `effectiveDpi`, legacy embedded `dpi` (ignored for quality). Trimmed dims ≈ production dims after processing; pre-trim on uploads via source fields.

10. **Does the current upscaler use a fixed scale factor or target dimensions?**  
    Target dimensions: grow width to 4500px (15″ @ 300), aspect-locked.

11. **Does the current upscaler ever downsample?**  
    No for production assets. Derivatives/export may downsample separately.

12. **How are transparent margins currently trimmed?**  
    Sharp `.ensureAlpha().trim({ background: transparent })` in Studio `trimImportImage.ts` and Functions `trimTransparentEdges`.

13. **Can existing assets derive approved maximums without reprocessing?**  
    Yes from production pixel dims ÷ 300, then clamp to 15 × 16.5 envelope. Mark derived results with policy version / `derived` source. If pixels missing, keep current 22″ + 200 DPI behavior and show softer messaging.

14. **How is a human AI Review override currently persisted?**  
    Only as final catalog fields on Approve. No field-level lock; pre-approve draft lost on rerun.

15. **How should manual halftone decisions survive AI reruns?**  
    Persist `halftoneStaffDecision` (+ actor/timestamp) on `designs`; exclude from AI reset delete lists; when seeding draft tags, apply staff decision over AI suggestion for the canonical halftone tag.

16. **How will bulk imports surface likely halftones without interrupting every file?**  
    Per-file warning code in validation result + batch summary count (“N images may be halftones”) + defer final confirmation to AI Review / intake; no per-file blocking modals in bulk.

17. **What is the safe fallback if halftone analysis fails?**  
    Classification `not_detected` (or `analysis_failed` diagnostic), continue processing, do not block upload, do not tag, log safe error code only (no image bytes/PII).

18. **How will the 15 × 16.5 envelope interact with the existing 22-inch cap?**  
    Layered limits: (a) per-asset approved max from pixels + 15×16.5; (b) global 200 DPI floor; (c) absolute platform 22″ still applies. Effective usable size = min of all three. Quality envelope is normally the binding constraint for new assets.

19. **Which changes require Firestore or Storage rule updates?**  
    Prefer **no** client writes: submitter response via Admin SDK callable (customerUploads already `allow create,update,delete: if false`). Storage rules unchanged. If any design field is client-written by Studio today for other metadata, staff halftone decision should follow existing staff design-update patterns / services—not raw component writes. Review `firestore.rules` design update allowlists during implement; add fields to allowlists only if Studio client updates designs directly for this metadata.

20. **Does any data migration require a separate owner checkpoint?**  
    Bulk reprocess: **yes, separate plan**. Lazy derive: **no**. Additive field deploy: **no** migration checkpoint. Production Functions/Hosting deploy: **yes, separate owner checkpoint** (out of this phase’s signoff).

---

## Approach

### Part 0 — Documentation baseline (early in implement)

Update ARCHITECTURE / DATA_MODEL / BACKEND / ROADMAP / feature inventory so `/donate` and `/donated-designs` are first-class current workflows (not “future”). Record ADR-FP-080 in `DECISIONS.md`.

### Part 1 — Shared image-quality sizing policy

1. Add versioned constants in shared (single source):
   - Default request width: 10″
   - Max standard print width: 15″
   - Max standard print height: 16.5″
   - Quality basis: 300 DPI
   - Max upscale factor: 2.0
   - Max upscale passes: 1
   - Near-target tolerance: 5%
   - `SIZING_POLICY_VERSION` (e.g. `"image-quality-v1"`)
2. Implement pure functions:
   - `resolveAspectLockedTargetInches` — start 10″ wide; reduce so height ≤ 16.5″
   - `resolveControlledUpscale` — skip if at/near target; else one pass ≤2.0×; never second pass; never downsample production
   - `calculateApprovedMaxPrintSize` — `min(qualityWidth, 15, maxWidthByHeight)` with aspect height
3. Rounding policy:
   - Internal math: full float
   - Persist display inches: existing `PRINT_INCHES_DECIMAL_PLACES` (2)
   - Compare near-target using relative tolerance on width (and height if width-capped)
4. Replace `resolveImportUpscaleTargetPx` consumers to call the new policy (Studio + Functions). Keep function name as thin wrapper or deprecate with clear migration in shared.
5. Persist on process success (uploads + designs at import/promote):
   - source / trimmed / production px (reuse existing where equivalent)
   - `wasUpscaled`, `upscalePassCount` (0|1), `upscaleFactor`
   - `approvedMaxPrintWidthInches`, `approvedMaxPrintHeightInches`
   - `sizingPolicyVersion`
   - optional `sizingWarningCode` when target not safely reached

### Part 2 — Request sizing enforcement

1. Extend `resolveInitialPrintRequestItemSize` / `assessPrintRequestItemSize` to accept optional approved max; clamp defaults and saves.
2. Wire Portal + Studio item cards: show max copy; clamp with feedback (suggested strings from prompt).
3. Enforce in:
   - attach callable
   - Studio `printRequestService` (including upload-backed items — close current gap)
   - Portal update paths (service-level, not UI-only)
4. Keep 200 DPI floor and 22″ cap unchanged.
5. Legacy: if approved max missing, derive from production pixels; if pixels missing, fall back to today’s 22″ + 200 DPI rules without blocking edits.

### Part 3 — Shared halftone detector

1. New pure util: input normalized alpha buffer + width/height → typed result:
   - `classification`: `not_detected` | `possible` | `likely` (finalize names in types)
   - `confidence`, `analysisVersion`, `reasonCodes`, diagnostic metrics
2. Conservative signals only (interior holes/dots, spacing, alternation, multi-region)—not raw transparency %.
3. Sharp adapters in Electron + Functions: ensure alpha, bound sample size, call shared detector.
4. Fail-open; never reject; never tag; never approve.
5. Full synthetic fixture test matrix from acceptance criteria (14 cases).

### Part 4 — Uploader confirmation

1. After finalize, if `possible`/`likely`, show nonblocking alert (Portal request + donate; Studio single-file import).
2. Options: Yes / No / I’m not sure; unanswered allowed.
3. Persist separately from detector via callable validating ownership + enum.
4. Independent of ownership/catalog consent.
5. Bulk Studio import: summary only + per-row indicator; no modal storm.

### Part 5 — Studio review / approval

1. **Intake** (`/customer-uploads`, `/donated-designs`): show auto result, submitter response, provisional staff Halftone control; persist on upload; copy to design on promote.
2. **AI Review**: show auto + submitter + AI suggestion + staff control; staff authoritative.
3. Initial toggle precedence when no explicit staff decision:
   1. Existing staff decision  
   2. Submitter Yes  
   3. Detector `likely`  
   4. AI suggested canonical `"halftone"` tag  
   5. Else unchecked  
4. On Approve: sync canonical tag via existing tag resolution (`resolveCatalogTagCandidate` / approved registry)—add if checked, remove if unchecked; no hard-coded IDs; no duplicate aliases.
5. AI rerun must not clear staff decision; draft seeding must respect it.

### Part 6 — Tests + manual checkpoint

See Test Strategy and Manual Checkpoint sections.

---

## Example expectations (policy unit tests)

| Case | Expect |
|------|--------|
| 32×32″ @ 300 | No downsample; default request 10×10; approved max 15×15 |
| 12×12″ @ 300 | No upscale; default 10×10; max 12×12 |
| 6×6″ @ 300 | One upscale ~1.67×; max ~10×10 |
| 3×3″ @ 300 | Cap at 2×; max ~6×6; cannot request 10″ |
| Tall ~9.22×16.32 | No unnecessary upscale; default ≈ native; max ≈ native; do not force 10″ width |

Owner sample image: manual only; **do not commit** to repo without permission.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Lint | `npm run lint` | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Portal build | `npm run build:portal` | yes |
| Studio Vite build | `npx vite build` (apps/studio) | yes |
| Shared sizing policy tests | `npx tsx --test packages/shared/src/utils/imageQualitySizingPolicy.test.ts` (+ printSizeMath / printRequestItemSizing) | yes |
| Halftone detector tests | `npx tsx --test packages/shared/src/utils/halftoneDetection.test.ts` | yes |
| Customer upload processing tests | `npx tsx --test functions/src/lib/customerUpload*.test.ts` | yes |
| Donate confirm / response validation | `npx tsx --test functions/src/lib/confirmCustomerUpload*.test.ts` (+ new response tests) | yes |
| Studio upscale/trim tests | `npx tsx --test apps/studio/electron/services/import/*.test.ts` | yes |
| AI reset / override survival tests | targeted Functions/Studio unit tests | yes |
| Tag sync / review-state tests | Studio feature unit tests | yes |

Exact scripts per `docs/standards/TESTING.md`. Never claim pass without running.

### Manual

Combined checkpoint (Studio import, Portal upload, Portal donate, Studio intake, AI Review, owner tall sample). See acceptance criteria in owner prompt. Artifact: `docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-manual-checkpoint.md` (created at test phase).

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — Studio + Portal image-processing behavior (required)
- [ ] Design approval — only if copy/layout needs owner preference beyond suggested strings
- [ ] Business logic decision — only if Review finds ambiguity in 15×16.5 vs 22″ messaging
- [x] Production deploy — **prohibited** in this phase; separate owner checkpoint later
- [x] Database migration — bulk reprocess only if later requested; lazy derive does not need it
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none expected
- [x] Other: Confirm canonical `"halftone"` approved tag exists in `fresh-prints-dev` during manual test (create via existing tag UI if missing—do not hard-code)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| False-positive halftone on normal transparency | high | Conservative detector + synthetic tests + fail-open |
| Accidental downsample of large art | high | Explicit no-downsample tests; large-image fixtures |
| Second upscale via another path | high | Single shared policy; audit ZIP/folder/retry paths |
| Duplicate donation flow | high | Extend ADR-FP-078 only; review gate |
| Staff decision wiped by AI rerun | high | Explicit fields excluded from reset |
| Customer response writes tags | high | Callable validates response only; tags via staff approve |
| Portal UI-only enforcement bypass | medium | Service/callable assess |
| Legacy items uneditable | medium | Documented lazy derive + fallback |
| ADR-FP-077 confusion | low | ADR-FP-080 supersedes uncapped 15″ upscale floor |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

- Revert application deploy; additive Firestore fields remain harmless.
- If policy causes bad upscales in dev: set processing to skip upscale via emergency constant only after review (prefer fix-forward).
- Do not run reverse migration that deletes customer responses without owner approval.

---

## Documentation Updates Required

- [ ] ARCHITECTURE.md — `/donate`, Donated Designs, shared quality pipeline note
- [x] DATA_MODEL.md — sizing + halftone fields on uploads/designs
- [x] BACKEND.md — new/extended callables; processing behavior
- [ ] TESTING.md — new test file commands if needed
- [x] DECISIONS.md — **ADR-FP-080**
- [x] ROADMAP.md — Phase 8 fast-follow / quality follow-up line
- [ ] Feature inventory / workflow summary where present
- [ ] Manual checkpoint + signoff artifacts under `docs/workflow/reviews/`
- Note: `CURRENT-STATE.md` / chatgpt handoff package **not present** — skip or recreate only if owner wants handoff restored

---

## Open Questions

- [ ] None blocking Plan → Review. Nonblocking: during manual test, verify owner tall sample’s trimmed px from Fresh Prints vs ~9.22×16.32 expectation.
- [ ] Confirm `halftone` approved tag present in dev during manual checkpoint (operational, not architectural).

---

## FreshForge review challenges (for Review Agent)

Review must specifically challenge:

1. Donation workflow correctly identified (no duplicate)
2. Large images not downsampled
3. 2× upscale cannot be bypassed; no second pass elsewhere
4. Tall-image sizing correct
5. 200 DPI rule unchanged
6. Portal/Studio formulas cannot diverge
7. Legacy editability preserved
8. Transparent backgrounds ≠ automatic halftone
9. Customer response ≠ staff authority / cannot create tags
10. Staff decisions survive AI rerun + promote
11. Bulk imports remain practical
12. No duplicate metadata fields where existing suffice
13. Rules protect new response/decision fields
14. Migration/deploy need separate checkpoints

---

## Binding review constraints (2026-07-13 review)

From `docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-review.md` — implement must honor:

1. **Frozen metadata map** — Prefer nested objects:
   - Sizing: reuse `sourceWidthPx`/`sourceHeightPx`, production `widthPx`/`heightPx` (designs: `width`/`height`); add `upscaleFactor`, `upscalePassCount`, `approvedMaxPrintWidthInches`, `approvedMaxPrintHeightInches`, `sizingPolicyVersion`, optional `sizingWarningCode`; add `wasTrimmed` to shared `CustomerUpload` type.
   - Halftone: `halftoneDetection`, `halftoneSubmitterResponse`, `halftoneStaffDecision` (shapes in review doc); copy onto `designs` at promote.
2. **Every upscale entry point** must use the new shared policy (Electron upscale, pngValidator, batch readers, Functions `upscaleIfNeeded`, ZIP/retry). Revise ADR-FP-077 soft-warn helpers under 2× cap.
3. **Tag authority:** intake/import set staff decision only; canonical tag sync only on AI Review approve via existing tag services.
4. **AI rerun:** do not delete staff/detection/submitter halftone fields in reset/enqueue paths; test survival.
5. **Enforcement:** Portal + Studio service/callable paths (not UI-only); keep 22″ + 200 DPI layers.
6. **Tests:** no-downsample large asset; donate finalize persists detector metadata without attach.
7. **ADR-FP-080:** supersede uncapped 15″ upscale floor; 15″ remains approved-max width envelope.

## Approval

- Review doc: docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-review.md
- Verdict: approved_with_changes

---

## Implementation sequence (after review approval)

1. Shared sizing policy + tests  
2. Wire Studio Electron + Functions processing + persist metadata  
3. Request sizing enforcement (shared + Portal + Studio + attach)  
4. Shared halftone detector + tests  
5. Wire detector into processing paths  
6. Uploader confirmation UI + callable  
7. Studio intake + AI Review Halftone + tag sync + AI reset survival  
8. Docs + ADR-FP-080  
9. Automated tests  
10. Manual checkpoint → Signoff (no production deploy)
