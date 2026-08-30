# Plan: Auto Artwork-Background Detector False-Positive Corrective (C2)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Status | **approved_with_changes — implemented; awaiting owner manual QA** |
| Workflow goal | `smart-catalog-intelligence-unattended-enrichment` (same refinement) |
| Parent | `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` |
| Related open | **C1** Highland subject specificity — separate; not implemented in this plan |
| Environment | local Studio / shared package tests → owner QA on **fresh-prints-dev** |

---

## Goal

Fix Auto dark-mat **false positives** after the light-ink / visibility corrective: Dark must be a **conservative exception** when artwork would actually disappear or become hard to read on the normal light mat — not when the image merely contains many white/cream pixels.

---

## Owner QA (FAIL)

Auto selected Dark for nearly every imported sample except pink Good Vibes and Grinch + Max. Owner labels other Darks as **false positives**. Cream/light poodle remains **true positive** (must stay Dark).

**Product question Auto must answer:**  
Would this artwork become difficult to understand or visually disappear on the normal light display mat?

**Not:** Does this image contain a lot of white/light pixels?

Prefer Light when uncertain (per-image override exists).

---

## Root-cause audit (repo)

**Source:** `packages/shared/src/utils/importArtworkBackgroundDetection.ts`

### Current metrics

| Metric | Meaning |
|--------|---------|
| `opaquePixelCount` | α ≥ 250 pixels |
| `sparseRatio` | opaque / **full canvas** (name misleading — used as a **minimum floor** ≥ 1.2%, not a sparsity ceiling) |
| `meanLuma` | mean opaque luminance |
| `meanContrastVsLight` / `meanContrastVsDark` | mean WCAG contrast vs mats `#e5e7eb` / `#2c2d2d` |
| `poorLightContrastRatio` | fraction of opaque pixels with contrast vs light ≤ **2.0** |
| `meanDarkImprovementAmongPoor` | mean (cDark/cLight) among poor-light pixels |

### Current Dark gate (`shouldPreferDarkArtworkMatFromVisibilityStats`)

1. `opaquePixelCount ≥ 64`
2. `sparseRatio ≥ 0.012` (**floor**, not “must be sparse”)
3. Abort to Light if `meanContrastVsLight ≥ 3.0`
4. `poorLightContrastRatio ≥ 0.4`
5. Dark improves by ≥ **1.35×** (among poor or overall) and `meanContrastVsDark > meanContrastVsLight`

Plus **light-ink fallback** (`minInkLuma ≥ 0.45`) when full-canvas stats fail — intended for white stipple on opaque black fields.

### Why owner false positives Dark

1. **Dense white/cream fills** dominate opaque pixels → high `poorLightContrastRatio` and large dark-mat “improvement” even when dark outlines / color structure remain readable on Light.
2. **No sparsity / fragility gate** — `sparseRatio` does not require sparse art; dense illustrations still qualify.
3. **No structural-anchor gate** — presence of enough high-contrast-on-light pixels (outlines, blue/black, color) does not suppress Dark.
4. **Mean contrast** is diluted by large light fills → fails the ≥ 3.0 “adequate” escape even when silhouettes are fine.
5. Transparent margins are **ignored** for contrast (correct) but **do not** drive Dark; the bug is light-fill dominance + missing density/structure second gate — not transparent-canvas inflation as primary cause.
6. Light-ink fallback can reinforce Dark when many light fill pixels exist, ignoring darker structural pixels outside the luma cut.

**Cream poodle (true positive):** genuinely sparse, low-contrast light line art → poor on light, little structure → correctly Dark under current gates.

---

## Corrective C2 — revised decision strategy

**Dark only when BOTH:**

**A.** Artwork is predominantly low-contrast against the Light mat (existing poor-light + dark-improvement signals, possibly tightened), **and**

**B.** Artwork lacks enough structural / dense / high-contrast content to remain readily visible on Light.

### New / adjusted signals (deterministic, no category hard-codes)

| Signal | Role |
|--------|------|
| **BBox occupancy** | Opaque count / visible-artwork bounding-box area (α ≥ threshold). Large transparent canvas margins must not distort density. |
| **High-contrast anchor ratio** | Fraction of opaque pixels with contrast vs light ≥ anchor threshold (e.g. ~2.5–3.0). Sufficient anchors → **Light**. |
| **Existing poor-light + dark improvement** | Keep as gate A; calibrate thresholds against fixture families. |
| **Prefer Light on ambiguity** | Any incomplete / edge case → Light. |

### Conceptual Dark rule

```
Dark ⇔
  enough opaque ink
  AND predominantly poor contrast on Light
  AND Dark mat materially improves that poor ink
  AND high-contrast-on-light anchor ratio is LOW
  AND bbox occupancy is LOW enough (sparse/fragile)
```

Otherwise → **Light**.

### Unchanged (out of scope)

- Per-image Auto | Light | Dark picker
- Session All light / All dark
- All-halftones → Dark precedence
- Background provenance / AI Review / catalog filters
- Halftone never implied by Dark alone
- Precedence order in `resolveImportArtworkBackgroundDecision`

### Light-ink fallback

Retain for true light-stipple-on-dark-field exports, but subject to the **same** A∧B gates (anchors + bbox occupancy) so dense white illustration does not Dark via fallback alone.

---

## Fixtures ([NEEDS OWNER FIXTURE] for real PNGs)

Owner chat PNGs are **not** assumed in-repo. Implementation uses **synthetic RGBA unit fixtures** mirroring measurable families:

**TRUE DARK:** sparse cream line art; sparse white line art with little structure.

**EXPECTED LIGHT:** white typography + strong black outline; white+blue+black structure; cream type + dark goose; dark/colorful illustrations; dense white stipple/character; cannabis mixed structure; cream heart with color detail; red/white hearts; dark controller; dense white raccoon line art; colored raccoon; bright pink type; near-empty → Light.

Owner retests real PNGs in Studio manual QA.

---

## C1 Highland (status — not this plan’s implement scope)

| Item | Status |
|------|--------|
| C1 Highland `subjects: [cow]` vs `highland cow` | **Open** — separate root cause (prompt/normalizer); separate tests/acceptance |
| This plan | **C2 detector only** — do not mix Smart Profile logic |

---

## Scope IN / OUT

**IN:** `importArtworkBackgroundDetection.ts` (+ tests); docs/workflow artifacts; optional tiny shared helpers for bbox/anchors.

**OUT:** Slice 5/6; production; Autonomous; Smart Profile C1; UI precedence changes; image-specific exceptions; blind threshold tweaks without fixture family evidence.

---

## Test strategy

1. Unit fixtures for families above + metric tests (bbox occupancy, transparent margins, dense vs sparse, anchors suppress Dark, mixed color not dominated by white fills, ambiguous → Light).
2. Existing precedence / import background tests still PASS.
3. Studio typecheck + build; full lint; `git diff --check`.
4. **STOP for owner manual QA** on real PNG set (acceptance list in review).

---

## Human checkpoints

1. Formal Review of this plan before implement.
2. Owner manual QA after implement (real fixtures).
3. No refinement signoff in this step.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Break cream poodle true positive | Dedicated synthetic cream-sparse fixture; keep Dark |
| Break light-ink-on-black stipple | Keep fallback under A∧B; add stipple-on-black fixture |
| Over-tighten → too many Light false negatives | Prefer Light by product rule; owner override exists |
| Brittle special cases | No filename/category exceptions |

---

## Rollback

Revert detector constants/gates to prior commit; UI unchanged.

---

## Deliverables

- [x] Root-cause write-up (this plan)
- [ ] Formal Review
- [ ] Implementation + tests
- [ ] Owner manual QA checklist
- [ ] STOP (no signoff)
