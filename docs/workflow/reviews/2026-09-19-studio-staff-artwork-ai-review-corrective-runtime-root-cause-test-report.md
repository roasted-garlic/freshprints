# Test Report: Staff Artwork AI Review — runtime root-cause amendment

| Field | Value |
|-------|-------|
| Date | 2026-09-19 |
| Plan | `docs/workflow/plans/2026-09-19-studio-staff-artwork-ai-review-corrective-plan.md` |
| Review | `docs/workflow/reviews/2026-09-19-studio-staff-artwork-ai-review-corrective-runtime-root-cause-review.md` |
| Result | **PASS — focused automated amendment suite; DEV runtime still blocked on Functions deploy** |

## Proven root cause (reconfirmed)

1. Correct AI title field: `designs.aiSuggestions.title`
2. Wrong title field: canonical `designs.title`
3. Should change at AI success (`markAiSuccess`) under DEV autonomy via `finalCatalogFields` / Staff helper
4. Does **not** change on live DEV today — Functions serve pre-corrective code; autonomy trusts mis-stamped `staff` hex roots
5. Prior helper write order allowed `finalCatalogFields` to overwrite Staff-origin AI titles
6. Prior tests never deployed Functions or modeled autonomy overwrite

## Automated verification (this amendment)

```text
npx tsx --test \
  functions/src/ai/finalCatalogCopy.test.ts \
  functions/src/ai/staffArtworkCanonicalTitleLifecycle.test.ts \
  functions/src/ai/catalogTitleAuthority.contract.test.ts \
  functions/src/ai/canonicalCatalogCopyPersistence.contract.test.ts \
  functions/src/staffArtworkPromotion.test.ts \
  functions/src/ai/reprocessReadyDesignWithAiCore.test.ts \
  apps/studio/src/renderer/src/features/ai-review/pages/staffArtworkCanonicalTitlePersistence.contract.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/staffArtworkAiReviewTitle.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/aiProcessingAutoAdvancePreference.test.ts \
  apps/studio/src/renderer/src/features/ai-review/utils/aiReviewInboxSortPreference.test.ts \
  apps/studio/src/renderer/src/features/staff-artwork/pages/staffArtworkAiReview.contract.test.ts
```

**55/55 passed.**

```text
npm run build --prefix functions
```

**passed.**

Local simulation of DEV Design `5vdXERTMMudoOzQvySfy` (`title: f70a4b2f0a`, `catalogTitleSource: staff`, AI candidate present) now resolves to the AI title through both `resolveFinalCatalogCopy` and `resolveStaffArtworkAiGeneratedTitle`, with Staff helper spread winning after final catalog fields.

## Owner DEV QA (recorded)

**Owner DEV QA: PASS** (2026-09-19)

Confirmed on live DEV after Functions deploy:

- Staff-Library-originated artwork receives its AI-generated title
- Accepted AI title becomes canonical `designs.title`
- Catalog autonomy no longer restores the Staff short ID
- Title survives AI Review / approval
- Design Library displays the proper title

## Reconciliation

Read-only inventory only. **Zero writes.** Legacy repair apply remains unauthorized.

## Gates

- Signoff: **approved_with_notes** for the DEV corrective
- Production promotion / Studio release: authorized by owner for closeout
- Next: isolated commit → protected merge → production deploy → machine verify → owner production smoke
