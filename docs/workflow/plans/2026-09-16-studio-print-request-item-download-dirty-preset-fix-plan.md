# Plan: Studio Print Request item Download dirty-preset fix

| Field | Value |
|-------|-------|
| Date | 2026-09-16 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase / hotfix |
| Related | docs/workflow/reviews/2026-09-16-studio-print-request-item-download-dirty-preset-fix-review.md |

---

## Goal

Restore per-item **Download** on Studio Print Request detail for items that have a saved `standardSizePresetKey`, so every attached design with a saved size and source identity can be downloaded when otherwise eligible.

## Background

Owner observed two LIBRARY items on a queued request: left Download enabled, right Download disabled with no hover reason. Root cause: Studio `PrintRequestItemCard` marks items **dirty** when comparing draft vs saved signatures, but `isDirty` / `hasUnsavedDraft` omit `standardSizePresetKey` while saved signatures include it. Items with a preset therefore look permanently unsaved and Download stays disabled. Portal already includes the preset in its dirty check.

## Scope

### In Scope
- Fix Studio `PrintRequestItemCard` `isDirty` and `hasUnsavedDraft` to include `standardSizePresetKey` (match Portal / save path).
- Strengthen existing export contract test so the omission cannot regress silently.
- Workflow artifacts (plan, review, test report, signoff) + state update.

### Out of Scope
- Adding Download disabled-reason tooltips (nice-to-have; separate if desired).
- Portal changes (already correct).
- Changing download eligibility rules beyond the false-dirty bug (`canSave`, missing size, missing source id, in-flight save/remove remain).
- Production deploy.

---

## Affected Areas

### Files / Modules (expected)
- `apps/studio/src/renderer/src/features/print-requests/components/PrintRequestItemCard.tsx`
- `apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts`
- Workflow docs under `docs/workflow/plans/` and `docs/workflow/reviews/`
- `.cursor/workflow/state.md`

### Architecture Impact
- [x] None

### Security Impact
- [x] None — Download still gated by existing manage-print-requests permission and export asset resolution.

### Data Model Impact
- [x] None

### Backend Impact
- [x] None

### UI / UX Impact
- [x] Details: Studio item Download re-enables for clean items that have a standard size preset; no new UI chrome.

### Migration Impact
- [x] None

---

## Approach

1. Pass `standardSizePresetKey` into `buildItemSignature` in both `isDirty` and `hasUnsavedDraft`.
2. Add contract assertions that both call sites include `standardSizePresetKey`.
3. Run focused Studio contract test (+ Studio typecheck if cheap).

---

## Test Strategy

### Automated
| Check | Command | Required |
|-------|---------|----------|
| Contract | `npx tsx --test apps/studio/src/renderer/src/features/print-requests/hooks/printRequestExport.contract.test.ts` | yes |
| Studio typecheck | `npx tsc --noEmit` from `apps/studio/` | yes (touched TSX) |

### Manual
- Optional owner smoke: open queued request with a preset-sized LIBRARY item → Download enabled; download succeeds.
- Not a hard gate if contract + typecheck pass (bug is deterministic signature mismatch).

---

## Human Checkpoints Anticipated

- None required for implement/test/signoff.
- Optional post-signoff DEV smoke by owner.

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Real dirty edits with only preset change miss detection | Including preset in signature is the correct behavior (already used on save). |
| Over-enable Download when other gates fail | Leave `canSave` / size / source / save-state gates unchanged. |

Rollback: revert the two signature call sites and contract assertions.

---

## FreshForge Impact Classification

| Area | Impact? |
|------|---------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Workflow artifacts only |
| Development History | No |

---

## Open Questions

None — owner approved immediate fix.
