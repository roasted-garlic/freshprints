# Signoff: Studio Print Request item Download dirty-preset fix

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-09-16-studio-print-request-item-download-dirty-preset-fix-plan.md |
| Review | docs/workflow/reviews/2026-09-16-studio-print-request-item-download-dirty-preset-fix-review.md |
| Test report | docs/workflow/reviews/2026-09-16-studio-print-request-item-download-dirty-preset-fix-test-report.md |
| Final status | **approved** |

---

## Summary

Studio Print Request item cards no longer treat items with a `standardSizePresetKey` as permanently unsaved. Per-item Download re-enables for clean, otherwise-eligible items (including read-only / queued detail).

---

## Changes Delivered

### Behavior
- `isDirty` and `hasUnsavedDraft` include `standardSizePresetKey` in the draft signature (aligned with save path and Portal).
- Contract test guards against regressing the omission.

### Files Created
- `docs/workflow/plans/2026-09-16-studio-print-request-item-download-dirty-preset-fix-plan.md`
- `docs/workflow/reviews/2026-09-16-studio-print-request-item-download-dirty-preset-fix-review.md`
- `docs/workflow/reviews/2026-09-16-studio-print-request-item-download-dirty-preset-fix-test-report.md`
- `docs/workflow/reviews/2026-09-16-studio-print-request-item-download-dirty-preset-fix-signoff.md`

### Files Modified
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts`
- `.cursor/workflow/state.md`

### Documentation Updated
- Workflow artifacts only; no product doc behavior change beyond restoring intended Download.

---

## Tests

### Automated
- Export contract: 8/8 pass
- Studio `tsc --noEmit`: pass

### Manual
- Not required for signoff
- Optional owner smoke: preset-sized item Download on queued request

### Human approvals
- Owner requested immediate fix (2026-09-16)

---

## Risks and Follow-ups

- Other Download disable reasons remain (missing size/source, invalid DPI/`canSave`, in-flight save/remove) — intentional.
- Optional follow-up: disabled Download tooltip explaining the active reason.

---

## FreshForge Impact

Starter surface: none. Studio client only.

---

## Final Status

**approved** — DONE.
