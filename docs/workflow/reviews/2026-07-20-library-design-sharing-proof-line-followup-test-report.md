# Test Report: Library design sharing — Design Library proof line (#12 follow-up)

| Field | Value |
|-------|-------|
| Date | 2026-07-20 |
| Plan | docs/workflow/plans/2026-07-20-library-design-sharing-proof-line-followup-plan.md |
| Review | docs/workflow/reviews/2026-07-20-library-design-sharing-proof-line-followup-review.md |
| Status | **passed_with_notes** — automated focused checks passed; owner manual UX **PASS** 2026-07-21; Functions redeploy **not claimed** this closeout (command retained below) |

---

## Automated

| Check | Command | Result |
|-------|---------|--------|
| Unit — proof kind + retention | `npx tsx --test packages/shared/src/utils/assistedCreationProofKind.test.ts packages/shared/src/utils/assistedCreationApprovedProofRetention.test.ts` | **pass** (17 tests, exit 0) |
| Functions build | `npm --prefix functions run build` | **pass** (exit 0) |
| Portal typecheck | `npm run typecheck --workspace @fresh-prints/portal` | **pass** (exit 0) |
| Studio typecheck | skipped (pre-existing tsconfig `--ignoreDeprecations` issue) | documented skip |
| Lint / E2E / rules | not required for this follow-up | skipped |

---

## Manual (owner) — re-check after Functions redeploy

| Test | Result | Notes |
|------|--------|-------|
| Design Library proof-line UX | **PASS** | Owner 2026-07-21 (believes already passed; recorded). Soft-signoff: `…-proof-line-followup-signoff.md`. |

---

## Deploy needs (human)

```bash
firebase deploy --only functions:staffSuggestAssistedCreationCatalogDesign --project fresh-prints-dev
```

Or broader Assisted Functions if preferred:

```bash
firebase deploy --only functions --project fresh-prints-dev
```

**No production deploy** in this phase. Soft-reload Studio/Portal after Functions deploy for the new proof row shape.
