# Implementation Review: TD-034 Post-v35 Option B — Deterministic AI-only Structured Evidence Prune

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Implementation Review Agent |
| Amendment Plan | `docs/workflow/plans/2026-09-05-td034-post-v35-deterministic-structured-evidence-corrective-amendment-plan.md` |
| Amendment Formal Review | `docs/workflow/reviews/2026-09-05-td034-post-v35-deterministic-structured-evidence-corrective-amendment-review.md` |
| Owner decision | **OPTION B** |
| ADR | **ADR-FP-176** |
| Verdict | **approved_with_notes** |
| DEV deploy authorized | **NO** — STOP before deploy |
| Later status | **WITHDRAWN BEFORE DEV DEPLOY** (2026-09-05) — Option B source reverted; owner pivoted to visual-first prompt corrective |

---

## Answers (required)

| # | Question | Answer |
|---|----------|--------|
| 1 | Option B implemented | **YES** |
| 2 | Exact correction point | `functions/src/ai/aiEnrichmentCandidateCore.ts` — after `buildDesignSmartProfile`, before `computeCatalogAutomationDecision` |
| 3 | Exact helper | `pruneUnsupportedAiStructuredEvidenceTokens` in `packages/shared/src/utils/catalogAutomationEvidence.ts` |
| 4 | Subjects in scope | **YES** |
| 5 | Objects in scope | **YES** |
| 6 | Other dimensions changed | **NO** |
| 7 | Same evidence matcher reused | **YES** — via `findStructuredEvidenceGaps` |
| 8 | Evidence corpus changed | **NO** (title + description + centralSubject + visibleText) |
| 9 | searchConcepts admitted | **NO** |
| 10 | Title/description modified to create evidence | **NO** |
| 11 | Staff authority preserved | **YES** — prune pre-merge only; staff dimension replace at `mergeReadyBackfillSmartProfile` |
| 12 | Import preset authority preserved | **YES** — preset union after AI profile; pruned AI tokens not reintroduced unless preset-owned |
| 13 | Post-merge reintroduction risk checked | **YES** — merge unions remaining AI tokens + preset/staff; tests cover staff restore + preset restore + no phantom reintroduce |
| 14 | Normalizer changed | **NO** (`smart-profile-normalizer-v6`) |
| 15 | Prompt changed | **NO** (`catalog-enrich-v35`) |
| 16 | Schema changed | **NO** (`smart-profile-v1`); transient `centralSubject` on enrichment parse only |
| 17 | Matcher changed | **NO** |
| 18 | Blocker hardness changed | **NO** |
| 19 | Model 2 changed | **NO** |
| 20 | Explicit changed | **NO** |
| 21 | Category resolver changed | **NO** |
| 22 | Model/provider system changed | **NO** |
| 23 | Diagnostic mechanism | `logPipelineEvent("smart_profile.ai_structured_token_pruned", { pruned: [...] })` |
| 24 | Soft reason code added | **NO** — logs sufficient; avoided hard/soft reason-code contract churn |
| 25 | Migration | **NO** |
| 26 | Rules change | **NO** |
| 27 | Indexes change | **NO** |
| 28 | Exact tests/results | Focused **195 pass / 0 fail** across prune/decision/authority/v35/title/Explicit/quality/constants suites (see commands below) |
| 29 | Functions build | **PASS** (`cd functions && npm run build`) |
| 30 | Lint/typecheck | Touched-file eslint **PASS**; Functions `tsc` via build **PASS** |
| 31 | Diff-check | `git diff --check` — no errors (CRLF warnings only) |
| 32 | Source ready for DEV deploy | **YES** |
| 33 | Exact DEV deploy allowlist | see below |
| 34 | Cucumber expected result | AI may still emit `woman` raw; pruned AI profile omits unsupported `woman`; keep `cucumber`; no `structured_evidence_gap:subjects:woman`; Would Auto Approve may be YES in shadow; lifecycle stays Needs Review while shadow/false |
| 35 | Secondary QA plan | After cucumber PASS / PASS WITH NOTES: 5–10 historical TD-034 samples; no backlog/Ready backfill |
| 36 | TD-034 expected disposition | After deploy+QA: likely **PARTIALLY RESOLVED** or **RESOLVED** if sample clean; residual lexical friction may remain as narrower debt |
| 37 | WS6 remains blocked | **YES** |
| 38 | Verdict | **approved_with_notes** |

---

## Notes

1. **centralSubject plumbing:** enrichment parse now carries transient `centralSubject` so normalize/prune/decision use the documented evidence corpus field. This is **not** a new evidence source and is **not** persisted as a Smart Profile list dimension.
2. **Soft reason codes:** intentionally omitted; pipeline log event is the diagnostic.
3. **No deploy** in this pass.

---

## DEV deploy allowlist (owner-gated; do not run now)

Project: `fresh-prints-dev` only.

```
functions:enqueueAiEnrichment
functions:reprocessReadyDesignWithAi
functions:onCatalogReprocessJobWritten
functions:startCatalogReprocessJob
functions:previewCatalogReprocessJob
functions:testAiEnrichmentPlayground
```

Optional: `FUNCTIONS_DISCOVERY_TIMEOUT=60`

Do **not** deploy: Firestore Rules, Storage Rules, indexes, Portal, App Hosting, Studio release, unrelated Functions, production.

---

## Test commands recorded

```text
npx tsx --test packages/shared/src/utils/catalogAutomationDecision.test.ts packages/shared/src/utils/smartProfileStaffEdit.test.ts packages/shared/src/utils/smartProfileImportPresets.test.ts functions/src/ai/smartProfileEnrichmentWrite.test.ts functions/src/ai/td034OptionBPrune.contract.test.ts functions/src/ai/catalogEnrichV35EvidenceSelfConsistency.contract.test.ts functions/src/ai/smartProfileQuality.contract.test.ts functions/src/ai/explicitContentAutomation.contract.test.ts functions/src/ai/catalogTitleRules.test.ts
→ 176 pass / 0 fail

npx tsx --test functions/src/ai/categoryDescriptionsPromptParity.contract.test.ts packages/shared/src/constants/aiEnrichment.constants.test.ts packages/shared/src/constants/catalogReprocess.constants.test.ts
→ 19 pass / 0 fail

cd functions && npm run build
→ exit 0

npx eslint <touched files> --max-warnings 0
→ exit 0

git diff --check
→ exit 0 (CRLF warnings only)
```

---

## Files changed (implementation)

- `packages/shared/src/utils/catalogAutomationEvidence.ts` — prune helper
- `packages/shared/src/utils/catalogAutomationDecision.ts` — pass `centralSubject` into evidence/verifier
- `packages/shared/src/types/catalog/smartProfile.types.ts` — transient `centralSubject` on enrichment parse
- `packages/shared/src/utils/catalogAutomationDecision.test.ts` — prune + defense tests
- `functions/src/ai/aiEnrichmentCandidateCore.ts` — wire prune + log
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts` — plumb `centralSubject`
- `functions/src/ai/smartProfileEnrichmentWrite.test.ts` — staff/preset authority tests
- `functions/src/ai/td034OptionBPrune.contract.test.ts` — wiring contract
- Docs: ADR-FP-176, TECH_DEBT, amendment artifacts, this IR

---

## Next Step

**STOP.** Await owner DEV deploy authorization. Then cucumber re-QA → secondary sample → Signoff.
