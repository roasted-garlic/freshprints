# Remediation Amendment 2: Halftone false-negative retune

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | implementing |
| Parent | docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-remediation-plan.md |
| Trigger | Manual checkpoint **FAIL** (detector too strict) |

## FAIL summary

- Genuine halftone not detected / not prompted in Portal
- Studio Technical Details showed no classification, confidence, or reasons
- Prior false-positive (non-halftone) correctly no longer prompted

## Scope

### In scope
- Retune `halftone-alpha-v2` (bump display version to `halftone-alpha-v2.1`) for genuine repeated patterns
- Keep exterior-transparency ignore and collage/text/glow false-positive protections
- Technical Details always shows classification, confidence, analysis version, reasons
- Tests + revised manual checkpoint including real halftone + prior false-positive set

### Out of scope
- Restoring transparency-% as sufficient evidence
- Sizing / upscale / create-request / Portal button redesign changes
- Production deploy

## Approach

1. Lower interior component thresholds; widen small hole/dot size band
2. Do not require perfect size-similarity to emit structural reason codes
3. Soften likely/possible gates: require pattern evidence, not transparency %
4. Persist reason codes even when classification is `not_detected`
5. Technical Details always lists detector fields (missing → explicit Not available)

## Acceptance

- [ ] Dense regular interior holes/dots → possible or likely
- [ ] Collage / text / glow / large transparent bg → still not_detected (not likely)
- [ ] Technical Details always shows classification, confidence %, version, reasons
- [ ] Manual checkpoint includes real halftone + prior false-positive images
