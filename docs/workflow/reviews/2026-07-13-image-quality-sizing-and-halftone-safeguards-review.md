# Review: Image Quality Sizing and Halftone Safeguards

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Reviewer | Review Agent |
| Plan | docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-plan.md |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly identifies the existing donation workflow (ADR-FP-078: `/donate`, `customerUploads` + `purpose: catalog_donation`, `/donated-designs`) and does not invent a parallel path. It accurately diagnoses the main technical conflict: today’s uncapped “grow to 15″” upscale (ADR-FP-077 soft-warn) vs the required 10″-target / ≤2.0× / 15×16.5 approved-max policy. Halftone work is correctly scoped as additive detection + submitter response + staff authority, with tags only through existing approval services. Implementation may proceed after applying the required changes below.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Explicit in/out; preserves donations and 200 DPI floor |
| Architecture alignment | pass | Shared pure math; Electron/Functions processors; no third app |
| Security impact addressed | pass | Callable-only customer response; Admin SDK writes; no tag write from customer |
| Data model impact addressed | pass | Additive fields; lazy legacy derive; no bulk migration |
| Backend impact addressed | pass | Finalize/promote/AI reset/callables covered |
| Test strategy adequate | pass | Shared unit matrix + processing + manual checkpoint |
| Human checkpoints identified | pass | Manual image-processing; production deploy separate |
| Roadmap alignment | pass | Quality follow-up across Phases 3/5/8 + donations |
| Documentation plan | pass | ADR-FP-080 + architecture/data/backend/roadmap |
| No silent scope expansion | pass | Explicit conflict table; reuse ADR-FP-078 |

---

## Required challenge responses

| Challenge | Result |
|-----------|--------|
| Donation workflow correctly identified | **pass** — `/donate`, `confirmCustomerUploadsForDonation`, same collections, `/donated-designs` |
| Accidental duplicate donation flow | **pass** — plan forbids new collection/route; extends existing purpose path |
| Large images downsampled | **pass** — policy forbids production downsample; requires tests |
| 2× bypass / second upscale | **pass with implement constraint** — must update every consumer of `resolveImportUpscaleTargetPx` / `upscaleIfNeeded` / `upscaleImportImageIfNeeded` including ZIP/retry (see Required Changes) |
| Tall-image sizing | **pass** — height-capped target + example tests |
| 200 DPI unchanged | **pass** — explicit out of scope / keep ADR-FP-075 |
| Portal/Studio formula divergence | **pass** — single shared policy module |
| Legacy uneditable | **pass** — lazy derive + fallback documented |
| Transparent BG false positives | **pass** — conservative detector + fixture matrix |
| Customer response vs staff authority / tags | **pass** — separated triad; tags only on staff approve |
| Staff decision survives AI rerun + promote | **pass with implement constraint** — reset delete lists + promote copy fields must be explicit in code review |
| Bulk imports practical | **pass** — summary + per-row; no modal spam |
| Duplicate metadata | **pass with changes** — lock field names; reuse existing px fields where equivalent |
| Rules protect new fields | **pass** — customerUploads remain callable/Admin-only; design allowlists if client-updated |
| Migration/deploy checkpoints | **pass** — no bulk migration; production deploy out of phase |

---

## Architecture Review

**Findings:**
- Correctly reuses customer-upload pipeline for donations.
- Correct layering: shared pure sizing/halftone; sharp only at Electron/Functions boundaries.
- Intake provisional Halftone vs AI Review tag sync is the right split, but implementers must not write `designs.tags` from intake components.

**Required changes:**
- [x] See Required Changes #1–#3

---

## Security Review

**Findings:**
- Customer response as validated callable input is correct.
- Response must not grant catalog approval or write tags (plan clear).
- Detector fail-open avoids DoS-by-analysis-failure.

**Required changes:**
- [ ] None beyond locking callable validation enums (Yes/No/Unsure/Unanswered)

**Human approval needed before production:**
- [x] Production Functions/Hosting/Studio release — separate owner checkpoint (not this phase)

---

## Data Model Review

**Findings:**
- Additive fields on existing models are appropriate.
- Separating auto / submitter / staff is mandatory and correctly stated.
- Risk of inventing parallel dimension fields when `sourceWidthPx` / `widthPx` already exist.

**Required changes:**
- [x] Required Change #4 — freeze field map before coding

---

## Backend Review

**Findings:**
- Finalize shared path covers donations — good.
- AI reset paths must be patched or staff decisions will be wiped.
- Portal attach already uses `resolveInitialPrintRequestItemSize`; must pass approved max once persisted.

**Required changes:**
- [x] Required Changes #2 and #5

---

## Testing Review

**Findings:**
- Detector fixture list matches owner requirements.
- Manual checkpoint correctly covers donate + request + import + review + owner tall sample.
- Must include regression that a 32″-class asset is not resized down in production bytes.

**Required changes:**
- [x] Required Change #6 — add explicit “no production downsample” automated assertion

---

## Documentation Review

**Findings:**
- ADR-FP-080 number is correct (next after FP-079).
- Donation docs updates are needed in ARCHITECTURE feature inventory (thin today).
- Chatgpt `CURRENT-STATE.md` correctly noted as absent.

---

## Required Changes (approved_with_changes)

1. **Freeze the metadata field map in the plan (or implement kickoff note) before writing code.** Prefer nested objects over flat sprawl, for example:
   - Sizing: reuse `sourceWidthPx`/`sourceHeightPx`, `widthPx`/`heightPx` (production), add `upscaleFactor`, `upscalePassCount`, `approvedMaxPrintWidthInches`, `approvedMaxPrintHeightInches`, `sizingPolicyVersion`, optional `sizingWarningCode`. Add `wasTrimmed` to the shared `CustomerUpload` type if still missing.
   - Halftone triad (suggested): `halftoneDetection` `{ classification, confidence, analysisVersion, reasonCodes? }`, `halftoneSubmitterResponse` `{ value: yes|no|unsure|unanswered, respondedAt?, respondedBy? }`, `halftoneStaffDecision` `{ value: true|false|null, decidedAt?, decidedBy?, isExplicitOverride? }`.
   - Mirror the same shapes onto `designs` at promote (copy, do not re-detect as authority).

2. **Publish an implement checklist of every upscale entry point that must call the new shared policy** (no leftover 15″-floor path):
   - `apps/studio/electron/services/import/upscaleImportImage.ts`
   - `apps/studio/electron/ipc/import/pngValidator.ts` (and batch byte readers)
   - `functions/src/lib/customerUploadProcessing.ts` (`upscaleIfNeeded`)
   - ZIP finalize / retry paths that re-enter processing
   - Any soft-quality warning helpers still keyed to uncapped ≥3× (revise or retire under 2× cap per ADR-FP-080)

3. **Tag authority rule (hard):** Intake and import UI may set `halftoneStaffDecision` only. Canonical `"halftone"` tag add/remove happens exclusively in the existing AI Review approve path via tag services / `normalizeDesignTags`. Components must not write Firestore tags directly.

4. **AI rerun survival (hard):** Update `resetAiEnrichmentForProcessing` and `enqueueAiEnrichment` delete maps so `halftoneStaffDecision` (and detection/submitter copies on the design) are **not** deleted. Add a unit/integration test that proves survival across rerun.

5. **Enforcement surfaces (hard):** Approved max must be enforced in Portal item update service paths and Studio upload-backed item updates (today’s DPI gaps), plus attach initial size — not UI-only. Keep 22″ + 200 DPI as additional layers.

6. **Tests:** Include an automated case proving production pixel dimensions are unchanged for an already-large source (no downsample). Include donate finalize path asserting detector metadata persistence without print-request attach.

7. **ADR-FP-080 must explicitly supersede** the uncapped “upscale floor = 15″” behavior from ADR-FP-077 while retaining 15″ as the **approved maximum width** envelope (not the upscale target). Keep 200 DPI (FP-075) and donation model (FP-078) unchanged.

---

## Blockers

None. Plan is not blocked.

---

## Verdict Rationale

**approved_with_changes** — Repo audit and plan alignment are strong; donation reuse is correct; conflicts with current upscale policy are acknowledged and resolved. The listed changes freeze field names, close every upscale entry point, and harden AI-rerun / tag-authority / enforcement rules so implementation cannot silently diverge.

---

## Next Step

Implementation Agent may begin **after** acknowledging Required Changes #1–#7 (update plan Approach section lightly or follow them as binding implement constraints). No production deploy. Manual checkpoint after tests.
