# Plan: Auto Background Detector C2b — Revert to Pre-Poodle Luma Logic

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Status | **approved — implemented; awaiting owner manual QA** |
| Parent | C2 false-positive corrective; refinement `smart-profile-quality…` |
| Related | **C1** Highland — still separate/open |

---

## Owner FAIL (C2 A∧B)

C2 multi-signal A∧B calibration **FAIL**:

- **Too aggressive:** e.g. `99 problems 420 solutions` → Auto Dark (black text/outlines readable on Light)
- **Not aggressive enough:** e.g. Daddy Is My Hero white lettering on Light mat nearly invisible
- Product intent: Dark **only** when letters/design are so light they cannot be seen on the light mat

**Owner direction:** restore the detection logic from **before the poodle/visibility corrective**. That logic worked well aside from the cream poodle. Do not keep the contrast-improvement / light-ink / A∧B stack.

---

## Root cause of C2 miss

Post-poodle detector answered “would Dark improve contrast?” / “many poor-on-light pixels?” instead of “is this artwork overwhelmingly light ink that disappears on Light?”. That over-darkens mixed designs (99) and under-serves some white-dominant text depending on fill/structure gates.

---

## Decision strategy (C2b)

### Primary (exact pre-poodle)

Restore `packages/shared/src/utils/importArtworkBackgroundDetection.ts` to luma-dominant gates:

| Gate | Threshold |
|------|-----------|
| opaque ≥ | 64 |
| sparseRatio ≥ | 0.015 |
| lightOpaqueRatio ≥ | 0.90 (luma ≥ 0.85) |
| meanLuma ≥ | 0.88 |

Dark only when opaque art is **clearly light-dominant**.

### Secondary (poodle-only narrow add-on)

If primary fails, allow Dark **only** for sparse cream/near-white line art:

- Count “cream-light” with slightly lower luma floor (≈0.72–0.78 range)
- Require very high cream-light ratio + mean in cream band
- Require **low bbox occupancy** (sparse strokes inside α-bbox)
- **No** light-ink-on-black fallback
- **No** dark-mat improvement / WCAG contrast decision stack

### Explicitly remove

- `poorLightContrastRatio` / dark-improvement Dark gate
- Light-ink `minInkLuma` second pass that Darkens mixed exports
- C2 A∧B anchor + occupancy as primary Dark path (occupancy only for cream secondary)

### Unchanged

Precedence, pickers, all-halftones, Dark ≠ Halftone, C1 Highland out of scope.

---

## Tests

Restore/adapt fixtures:

- Primary: solid near-white → Dark; dark/mixed color → Light; near-empty → Light
- Daddy-like: majority white + minority blue/black structure — document expected under primary (if white-dominant enough → Dark)
- 99-like: red/black/heart mixed → Light
- Sparse cream line art → Dark via secondary
- Dense cream/white fill → Light (secondary occupancy fails; primary may Dark only if ≥0.88 mean / 0.9 light — solid pure white still Dark by primary, which is correct for “can’t see white on light”)

---

## Acceptance (owner retest)

1. Pre-poodle behavior restored for typical catalog art  
2. Cream poodle → Dark (secondary)  
3. 99 problems → Light  
4. Daddy — owner judges: white lettering should be readable (Dark if primary qualifies)  
5. Overrides unchanged  
6. No Slice 5 / signoff / production  

Stop for owner manual QA after implement + automated checks.
