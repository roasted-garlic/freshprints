# Test Report: Custom Request AI Context + Final Source Workflow

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Goal | `custom-request-ai-context-and-final-source-workflow` |
| Plan | docs/workflow/plans/2026-07-21-custom-request-ai-context-and-final-source-workflow-plan.md |
| Review | docs/workflow/reviews/2026-07-21-custom-request-ai-context-and-final-source-workflow-review.md |
| Status | **passed_with_notes** (automated); owner **PASS ALL** 2026-07-21 — phase signed off |

---

## Commands run

| Command | Exit | Notes |
|---------|------|-------|
| `npx tsx --test` (assistedCreation AI / stage / transitions / proofFileName / constants tests) | **0** | 38 tests, 8 suites, all pass |
| `npm --prefix functions run build` | **0** | After TS fix for callback status narrowing |
| `npm run typecheck --workspace @fresh-prints/portal` | **0** | After optional-chaining fix on download label |
| `npm --prefix apps/studio exec tsc --noEmit -p tsconfig.json` (from `apps/studio`) | **2** | Pre-existing: `tsconfig.json` `ignoreDeprecations` invalid value (TS5103) — not introduced by this phase |
| Lint / Portal+Studio full build / E2E | **not run** | Not required for this soft gate; manual QA covers UI flows |

---

## Shared unit coverage (plan matrix)

- AI context profile: populated v1, sparse legacy, exact text, omit empties, REFERENCE_IMAGE_N order, no paths/URLs
- Prompt with/without reference sentence + full AI input
- Transitions: approve → `final_source_needed`; catalog → `approved`; final required for staff complete; cancel from final; force-complete forbidden
- Stage tab mapping includes `final_source_needed`
- Opaque proof object id + friendly final download name helpers
- Open/terminal constants include new open status (messaging helpers)

---

## Soft-deploy required before live manual QA on fresh-prints-dev

Functions + Storage rules must be live for end-to-end approve → final upload:

```bash
firebase deploy --only functions:customerRespondToAssistedCreationProof,functions:staffAddAssistedCreationFinalSource,functions:customerGetAssistedCreationApprovedProofFile,functions:customerAddAssistedApprovedProofToPrintRequest,storage --project fresh-prints-dev
```

Or split:

```bash
firebase deploy --only storage --project fresh-prints-dev
firebase deploy --only functions:customerRespondToAssistedCreationProof,functions:staffAddAssistedCreationFinalSource,functions:customerGetAssistedCreationApprovedProofFile,functions:customerAddAssistedApprovedProofToPrintRequest --project fresh-prints-dev
```

**Do not run without owner approval** (per phase brief).

---

## Manual QA

See: `docs/workflow/reviews/2026-07-21-custom-request-ai-context-and-final-source-workflow-manual-checkpoint.md`
