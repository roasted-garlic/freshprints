# Test Report: Library design sharing on custom requests (#12)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Plan | docs/workflow/plans/2026-07-20-library-design-sharing-custom-requests-plan.md |
| Review | docs/workflow/reviews/2026-07-20-library-design-sharing-custom-requests-review.md |
| Status | **partial** — automated focused checks passed; manual UI + Functions deploy pending |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit — transitions + notifications + email | `npx tsx --test packages/shared/src/utils/assistedCreationTransitions.test.ts packages/shared/src/utils/customerNotifications.test.ts functions/src/lib/email/email.test.ts` | **pass** (25 tests, exit 0) |
| Functions build | `npm --prefix functions run build` | **pass** (exit 0) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pass** (exit 0) |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | **blocked / documented** — `tsconfig.json` error TS5103 invalid `--ignoreDeprecations` (pre-existing; not introduced by #12) |
| Lint | not run (narrow implement pass) | skipped |
| Firestore rules tests | no client-write rule changes | skipped (confirmed callables-only) |
| E2E | none planned | skipped |

### Transition coverage notes

- `proof_ready` requires proof **or** catalog suggestion
- Catalog `proof_ready` allowed without `hasProofAsset`
- Customer approve from `proof_ready` does not require `hasProofAsset` (catalog path)

---

## Manual (owner)

See human checkpoint in workflow state. Studio share picker + Portal review / Add to Request / classic proof regression.

---

## Deploy needs (human)

```bash
firebase deploy --only functions --project fresh-prints-dev
```

Include at least: `staffSuggestAssistedCreationCatalogDesign`, `customerRespondToAssistedCreationProof`, `staffAddAssistedCreationProof`, `staffUpdateAssistedCreationStatus`, `onEmailDeliveryJobCreated`, proof download / proof Add-to-Request callables (gated). **No production deploy** in this phase.
