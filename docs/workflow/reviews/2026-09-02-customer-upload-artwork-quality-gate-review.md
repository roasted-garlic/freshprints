# Review: Customer Upload Artwork Quality Gate

| Field | Value |
|-------|-------|
| Date | 2026-09-02 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-02-customer-upload-artwork-quality-gate-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

V1 should **harden the existing shared transparency policy and reuse `processCustomerUploadImageBytes`** — not build a parallel pipeline. Root cause of owner screenshot passes is **policy permissiveness** (0.5% ratio OR 1% trim-only pass), not missing server validation. Plan correctly preserves pipeline order, attach/donate ready gates, and existing upscale/DPI contracts.

**Required before implement:** Owner decision on **WebP retirement** (plan default recommends PNG-only).

---

## Formal Review Answers

| # | Question | Answer |
|---|----------|--------|
| 1 | Current allowed formats? | Portal + Storage: PNG, WebP (+ ZIP). Server decode: PNG/WebP customer path; JPEG staff assisted only. |
| 2 | WebP in live contract? | **Yes** (2026-07-11 plan). Owner PNG-only request = contract change → **owner decision** |
| 3 | PNG detection today? | Sharp `metadata.format` post-decode in `customerUploadProcessing.ts` — authoritative, not client extension |
| 4 | Meaningful transparency implemented? | **Yes** — `customerUploadTransparency.ts` + `measureMeaningfulTransparency` before trim |
| 5 | Why screenshots passed? | Trim-only pass + 0.5% ratio threshold; RGBA captures with thin margins / anti-aliasing |
| 6 | Deterministic transparency test? | Proposed: edge flood-fill exterior reach ≥2%, remove trim-only pass, opaque-bbox guard, full-bleed safeguard — calibrate with fixtures |
| 7 | False positives considered? | Yes — full-bleed safeguard, bbox ratio, no copyright/UI AI in V1 |
| 8 | Resolution validation location? | After trim/upscale: `assessPrintSizeCapability` in `checking_print_size`; reject &lt;72 effective DPI |
| 9 | Upscale/DPI rules reused? | **Yes** — `imageQualitySizingPolicy`, 6× cap, 15″ automated target, 72 DPI import floor, 200 DPI item save floor, 22″ item ceiling |
| 10 | Final order of operations? | Bytes → format → decode → native dims → transparency → reject → trim → normalize → upscale → print size → previews → ready |
| 11 | Rejected art attach/donate prevention? | `technicalStatus !== ready` blocked in confirm callables; Portal attach gating |
| 12 | Status/error fields? | Existing `technicalStatus`, `technicalFailureCode`, `technicalFailureMessage` — no new lifecycle |
| 13 | Batch behavior? | Per-file in ZIP (ADR-FP-123); valid siblings continue |
| 14 | Functions impact? | **Yes** — policy + message mapping; **DEV deploy required** |
| 15 | Portal impact? | Copy display, optional accept list PNG-only, no trusted validation |
| 16 | Shared types impact? | Minimal — optional failure-message util; no schema change |
| 17 | Firestore Rules? | **No** change expected |
| 18 | Storage Rules? | **Maybe** — if PNG-only approved, narrow source content-type |
| 19 | Indexes? | **No** |
| 20 | Migration? | **No** |
| 21 | AI screenshot classifier needed? | **Not for V1** — defer unless fixtures show deterministic gate insufficient |
| 22 | DEV deploy scope? | Functions + Portal (+ Storage if PNG-only) |
| 23 | Owner QA plan? | See checklist below |

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Harden policy; no second pipeline |
| Architecture alignment | pass | Shared pure policy + Functions processor |
| Security impact addressed | pass | Server authoritative; confirm ready gate |
| Data model impact addressed | pass | Reuse existing fields |
| Backend impact addressed | pass | Functions deploy documented |
| Test strategy adequate | pass | 15 fixture classes + confirm tests |
| Human checkpoints identified | pass | WebP decision; DEV deploy |
| Roadmap alignment | pass | Quality gate after stuck-processing recovery |
| No silent scope expansion | pass | AI classifier explicitly deferred |
| Duplicate-work check | pass | Fixes existing validator; no parallel system |

---

## Architecture Review

**Findings:**

- `print_request` and `catalog_donation` share `processCustomerUploadImageBytes` — single fix covers both paths.
- Transparency measurement already shared with Studio import math (`meaningfulTransparencyMeasurement.ts`) — keep one policy source.
- Confirm callables correctly trust `technicalStatus === "ready"` only.

**Required changes:**

- [ ] Implement must not create a second customer upload processor
- [ ] Constants must remain in shared pure module with fixture tests

---

## Security Review

**Findings:**

- No client-trusted validation fields.
- Failed uploads cannot attach/donate via confirm guards.
- No Firestore rule relaxation.

**Required changes:** None

---

## Data Model Review

**Findings:** No schema/index changes.

**Required changes:** None

---

## Backend Review

**Findings:**

- Policy change requires Functions redeploy for DEV/prod QA.
- Assisted-proof fast ingest path must remain unchanged (`skipCustomerQualityGates`).

**Required changes:**

- [ ] Verify assisted/staff paths still bypass gates when explicitly flagged

---

## Testing Review

**Findings:**

- Plan covers owner-listed cases including trim-only screenshot regression.
- Add fixtures mimicking **thin-margin opaque screenshot** (current false pass) as blocking tests.

**Required changes:**

- [ ] Add regression test explicitly asserting today's trim-only pass case **fails** after implement

---

## Required Changes (for implement phase)

1. **Owner decision:** WebP allowed or PNG-only for Portal customer uploads.
2. Calibrate exterior-transparency constants using fixtures (including owner screenshot shapes), document chosen values in test file comments.
3. Add shared customer failure-message mapper; wire server fail sites.

---

## Blockers

None for **plan approval**. **Implementation blocked** until:
- Owner confirms WebP decision
- Owner authorizes implement after receiving this review

---

## Verdict Rationale

Smallest reliable fix is policy hardening in existing pipeline. Plan answers all 23 audit questions against current source. WebP retirement is the only unresolved product-contract item → `approved_with_changes`.

---

## Owner DEV QA Checklist (post-implement)

| Case | Expected |
|------|----------|
| A. Genuine transparent PNG | Accepted, trimmed, upscaled if needed, attachable |
| B. White-background PNG | Rejected — no transparent background |
| C. Phone/editor screenshot PNG | Rejected |
| D. RGBA all opaque / fake alpha | Rejected |
| E. Modest-resolution valid transparent art | Processed with existing safe upscale |
| F. Tiny unusable transparent art | Quality failure |
| G. Mixed ZIP batch | Valid continue; invalid rejected individually |
| H. Owner screenshot examples from production incident | Must **not** reach attachable ready state |

Reply: `PASS` / `PASS WITH NOTES` / `FAIL: [description]`

---

## Next Step

Owner decides WebP retention vs PNG-only, then authorizes **Implement** phase.
