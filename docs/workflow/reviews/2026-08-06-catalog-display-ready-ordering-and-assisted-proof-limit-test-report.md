# Test Report: Catalog mats / ready order / Assisted proof 80 MB

| Field | Value |
|---|---|
| Date | 2026-08-06 |
| Scope | A+B already shipped; C = proof 80 MB |

## Commands

| Command | Result |
|---|---|
| Focused proof + Rules + mats/ordering tests (49) | **pass** |
| ESLint touched shared files | **exit 0** |
| Studio `tsc --noEmit` | **exit 0** |
| `git diff --check` | **exit 0** |
| Functions source untouched (constant import only) | no Functions rebuild required this pass |
| Portal runtime untouched this pass | N/A |

## Proof boundary

| Case | Result |
|---|---|
| Exactly 80 MiB accepted | pass |
| +1 byte rejected | pass |
| Error copy uses shared constant (80 MB) | pass |
| Rules `<= 80 * 1024 * 1024` aligns with constant | pass |
| Reference-image 40 MB unchanged | pass |

## A/B regression

Details mat wiring + Portal/Studio readyAt tests still pass (no rewrite).
