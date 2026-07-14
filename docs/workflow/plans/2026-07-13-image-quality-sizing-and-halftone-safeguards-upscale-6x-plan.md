# Remediation Plan — Raise automated upscale ceiling to 6×

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | implementing |
| Goal | `image-quality-sizing-and-halftone-safeguards` |
| Trigger | Owner FAIL — 2× ceiling too restrictive (Achy Breaky ~5.62×) |
| ADR | ADR-FP-080 (amended) |

## Product decision

Amend `image-quality-v2` / ADR-FP-080:

- Keep one-pass, 12″ production target, 10″ request default, 15″ approved max envelope, 16.5″ height ceiling, 200 DPI request floor
- Raise `MAX_UPSCALE_FACTOR` from **2** to **6**
- Never upscale past the aspect-locked 12″ target
- If target unreachable within 6×: one pass at ≤6× + smaller approved max
- Never downsample
- Record applied `upscaleFactor`
- Mark factors **above 2×** as extended (`EXTENDED_UPSCALE` / soft-quality warning) for staff visibility only — no customer/print blocking
- No automatic image-type classifier; human-only halftone unchanged
- No historical migration

## Regression fixture

Trimmed **641 × 597** → one ~**5.62×** upscale → **~3600 × 3353** → approved **~12 × 11.18** → request default **~10 × 9.31**.

## Out of scope

Production deploy; Firestore migration; detector work.
