# Remediation Amendment: Image Quality Sizing and Halftone Safeguards

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Status | implemented — awaiting owner manual retest |
| Parent plan | docs/workflow/plans/2026-07-13-image-quality-sizing-and-halftone-safeguards-plan.md |
| Trigger | Manual checkpoint **FAIL** |
| Checkpoint | docs/workflow/reviews/2026-07-13-image-quality-sizing-and-halftone-safeguards-manual-checkpoint.md |

---

## Manual checkpoint result

**FAIL** — Owner findings (2026-07-13):

1. Halftone false positives on ordinary transparent / multi-element / text artwork
2. Portal vs Studio detection inconsistency
3. Portal Yes/No/Unsure UI unclear and laggy
4. Studio upload/donation review cluttered
5. AI Review Halftone checked despite intake staff decision
6. Studio create-request should navigate to new request
7. Upscale target too conservative: need **12″ production** target; keep **10″ request default**

---

## Goal

Remediate the FAIL: refine the advisory detector (keep it), unify Studio/Functions normalization, modernize Portal/Studio UX, preserve explicit staff Halftone (including `false`), navigate on create-request, and set automated upscale target to 12″ while keeping request default at 10″.

---

## Scope additions (approved)

### In scope
- Detector refinement + exterior transparency ignore + pattern-over-quantity
- Canonical pre-upscale trimmed analysis contract + parity tests
- Detector timing instrumentation (dev/diagnostics)
- Customer prompt only for `likely`
- Portal optimistic compact response UI
- Studio Customer Uploads + Donated Designs compact layout + details modal + green switch
- Intake init: staff → customer yes/no → else off (detector/AI evidence only)
- Persist explicit staff decision on promote; AI Review honors explicit false
- AI Review panel restyle
- Studio create-request → navigate to new request (incl. Working → Empty)
- 12″ automated upscale target; 10″ request default; ADR-FP-080 amendment
- Tests + revised manual checkpoint

### Out of scope
- Removing detector without measured cost decision
- Auto-tag / auto-approve / blocking uploads
- New routes; multi-pass / >2× upscale; change 10″ request default; change 200 DPI / 15×16.5; production deploy; bulk migration

---

## Approach

### 1. Sizing (ADR-FP-080 amendment)
- `AUTOMATED_UPSCALE_TARGET_WIDTH_INCHES = 12`
- `DEFAULT_PRINT_REQUEST_WIDTH_INCHES = 10` (unchanged product default)
- `resolveAspectLockedTargetInches` / `resolveControlledUpscale` use **12″** for processing
- Request initial size remains **10″** via `STANDARD_PRINT_REQUEST_INITIAL_WIDTH_INCHES`
- Bump `IMAGE_QUALITY_SIZING_POLICY_VERSION` to `image-quality-v2`
- Update Best Christmas / tall / 6″ / 3″ / 13″ / 32″ examples in tests

### 2. Detector
- Analyze **trimmed, pre-upscale** production base in Functions and Studio (same contract)
- Mask exterior-connected transparency (flood from borders) before interior component analysis
- Raise thresholds; transparency % alone never → `likely`
- Bump `HALFTONE_ANALYSIS_VERSION` to `halftone-alpha-v2`
- Portal customer prompt only when `classification === "likely"`
- Shared timing helper returning durationMs for test report

### 3. Staff toggle precedence
- **Intake init:** explicit staff → customer yes → on; customer no/unsure/unanswered → off; detector/AI never auto-on
- **AI Review init:** explicit design staff decision → intake-copied staff → customer yes only if no staff decision ever → else off
- Fix truthiness bugs; treat `value === false` as present
- On promote: always copy current staff decision object (including false); if toggle used, persist before promote

### 4. UI
- Portal: compact callout + optimistic segmented Yes/No/Not sure
- Studio intake: denser list, primary actions, technical details modal, green Toggle
- AI Review: polished panel + green switch

### 5. Create-request navigation
- After successful create, navigate to request detail / selected state with returned id

---

## Binding review constraints (remediation)

1. Do not remove detector in this remediation.
2. Customer prompt = `likely` only.
3. Explicit `false` must survive promote + AI Review seed.
4. 12″ is upscale target only; request default stays 10″.
5. No production deploy.

---

## Approval

- Review: pending remediation review
- Verdict: pending
