# Test Report: Auto Background Detector C2b — Revert Pre-Poodle

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Plan | `docs/workflow/plans/2026-08-25-auto-background-detector-revert-pre-poodle-plan.md` |
| Review | `docs/workflow/reviews/2026-08-25-auto-background-detector-revert-pre-poodle-review.md` |
| Verdict | **passed** (automated) — **owner manual QA required** |

---

## Owner FAIL that triggered C2b

C2 A∧B was too aggressive (`99 problems` → Dark) and not enough on white-letter cases (Daddy on Light). Owner directed: restore **pre-poodle luma logic**.

---

## Restored thresholds

### Primary (exact pre-poodle)

| Constant | Value |
|----------|-------|
| opaque | ≥ 64 |
| sparseRatio | ≥ 0.015 |
| lightOpaqueRatio | ≥ 0.90 (luma ≥ 0.85) |
| meanLuma | ≥ 0.88 |

### Secondary (poodle only)

| Constant | Value |
|----------|-------|
| creamOpaqueRatio | ≥ 0.92 (luma ≥ 0.72) |
| meanLuma | 0.78–0.95 |
| bboxOccupancy | ≤ 0.28 |

Removed: contrast-improvement Dark gate, light-ink second pass, C2 A∧B anchor stack.

---

## Commands

| Check | Exit |
|-------|------|
| `npx tsx --test` detector + contract | 0 |
| `cd apps/studio && npx tsc --noEmit` | 0 |
| `cd apps/studio && npx vite build` | 0 |
| `npm run lint` | 0 |
| `git diff --check` | 0 |

---

## Manual QA

`docs/workflow/reviews/2026-08-25-auto-background-detector-revert-pre-poodle-manual-qa.md`

Restart Studio so Electron reloads shared detector.
