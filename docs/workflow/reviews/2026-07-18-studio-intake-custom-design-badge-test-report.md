# Test Report: Studio intake — Custom design badge

| Field | Value |
|-------|-------|
| Date | 2026-07-18 |
| Plan | docs/workflow/plans/2026-07-18-studio-intake-custom-design-badge-plan.md |
| Status | partial (automated notes; awaiting manual QA) |

---

## Commands Run

| Check | Command | Exit | Result |
|-------|---------|------|--------|
| Studio typecheck | `cd apps/studio; npx tsc --noEmit` | 2 | **Pre-existing** `tsconfig.json` `ignoreDeprecations: "6.0"` → TS5103 (invalid on installed TS 5.9). Not introduced by this change; no file-level errors reported beyond that. |
| ESLint (touched files) | `npx eslint …CustomerUploadIntakeSection.tsx …customerUploadIntakeService.ts --max-warnings 0` | 0 | Pass |
| Functions build | — | — | Skipped (no Functions changes) |
| Unit tests | — | — | N/A (presentational) |

---

## Notes

- Soft-reload Studio is sufficient; **no Functions deploy** for this badge.
- Library listing consent residual still pending `APPROVE DEV DEPLOY` for `customerAddAssistedApprovedProofToPrintRequest` — separate parked workflow. Manual QA for this badge needs an intake row with `assistedCreationRequestId` (may require that deploy + Add to Request first, or an existing assisted upload).

---

## Manual QA

See `docs/workflow/reviews/2026-07-18-studio-intake-custom-design-badge-manual-qa.md`.
