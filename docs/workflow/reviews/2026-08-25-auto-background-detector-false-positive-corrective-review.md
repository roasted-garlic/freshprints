# Formal Review: Auto Background Detector False-Positive Corrective (C2)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-25-auto-background-detector-false-positive-corrective-plan.md` |
| Verdict | **approved_with_changes** |

---

## Verdict: approved_with_changes

Root cause is sound. Material detector decision change requires this review — **not** a silent threshold hotfix. Implementation may proceed under the binding changes below.

---

## Root-cause confirmation

| Question | Finding |
|----------|---------|
| Metrics driving Dark? | `poorLightContrastRatio`, mean contrasts, dark improvement; `sparseRatio` only as **min floor** |
| Why false positives? | Dense light fills look “poor on light” + dark “improves” them; **no** sparsity/anchor second gate |
| Transparent canvas primary cause? | **No** — α ignored for contrast; bug is fill dominance + missing structure/density gate |
| Light-ink fallback? | Can amplify Dark on light-heavy art if not under same A∧B gates |

Plan’s A∧B strategy is correct and aligned with owner product rule.

---

## Binding implementation requirements

| ID | Requirement |
|----|-------------|
| B1 | Add **bbox occupancy** (opaque / α-bounding-box area); do not use full-canvas transparent ratio as primary density |
| B2 | Add **high-contrast-on-light anchor ratio**; enough anchors → Light |
| B3 | Dark requires **A** (poor light + dark improvement) **AND** **B** (low anchors + sparse-enough bbox occupancy) |
| B4 | Ambiguous / incomplete → **Light** |
| B5 | Light-ink fallback remains but must pass **same** A∧B gates |
| B6 | No filename/category hard-codes; no one-off image exceptions |
| B7 | Do not change picker / session / all-halftones precedence or Dark≠Halftone |
| B8 | Record chosen thresholds in test report with cream-poodle vs dense-white separation rationale |
| B9 | If no safe deterministic threshold separates families → **STOP** (do not pile special cases) |
| B10 | C1 Highland remains **out of scope** for this implement |

---

## Scope / safety

| Check | Result |
|-------|--------|
| Separate from C1 Highland | ✅ |
| No Slice 5/6 / production / Autonomous | ✅ |
| Owner real PNGs | [NEEDS OWNER FIXTURE] — synthetic unit fixtures + manual QA |
| Precedence preserved | ✅ |

---

## Next

Implement C2 under B1–B10 → focused tests + Studio checks → **STOP for owner manual QA**.

Do **not** sign off refinement.
