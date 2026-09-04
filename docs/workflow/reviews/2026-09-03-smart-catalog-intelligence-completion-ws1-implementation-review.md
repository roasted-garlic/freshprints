# Implementation Review: Smart Catalog Intelligence Completion — WS1

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Implementation / Review Agent |
| Plan | `docs/workflow/plans/2026-09-03-smart-catalog-intelligence-completion-and-legacy-tag-retirement-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-and-legacy-tag-retirement-review.md` |
| Workstream | **WS1** — automation calibration + observability hardening |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` |
| Verdict | **approved_with_notes** |

---

## Summary

WS1 narrowly fixed title hard-blocking, truthful verifier semantics (Option B: evidence gaps are hard blockers; natural echo-confirm retired), Automation Health retries/failures/publicationFailures from durable evidence, Algolia sync failure recording + rethrow for platform retry, and Preview current-version labels for v32/v6. Dual gate and live Autonomous OFF preserved. Tag pipeline / matchedTags / prompt / normalizer / schema unchanged. Studio full-project `tsc` still reports pre-existing unrelated errors; WS1-touched files lint clean and Functions build passes.

---

## IR inventory

| ID | Answer |
|----|--------|
| IR1 | `packages/shared/src/utils/catalogAutomationDecision.ts` (`computeCatalogAutomationDecision`) |
| IR2 | Hard blockers: `title:title_missing`, `title:title_exceeds_max_characters`, `category_unresolved`, `description_missing`, `category_gap_suggested`, `category_dominant_intent_conflict`, most `validation:*` (except missing_generated_at), `structured_evidence_gap:*`, `subject_specificity_risk:*`, `verifier_unresolved` |
| IR3 | Before: `title_missing` only in validation errors, not consumed. After: errors mapped to `title:title_missing` and hard-blocked |
| IR4 | Before: verifier re-ran same gap/specificity checks → confirmed unreachable; Health showed Verifier confirmed |
| IR5 | After: gaps/specificity are hard blockers; verifier only for confirmable `automation_policy_uncertainty` (or injected result); malformed → unresolved |
| IR6 | `verifier_confirmed` **retained** only for confirmable uncertainty / injected results |
| IR7 | Legitimate trigger: `automation_policy_uncertainty` with no remaining hard evidence gaps |
| IR8 | N/A (retained narrowly); natural echo-confirm path removed from UX meaning |
| IR9 | Hard blocker bypass impossible: **YES** (B7 test) |
| IR10 | Dual gate unchanged: **YES** |
| IR11 | Missing settings fail-safe: **YES** (unchanged resolvers) |
| IR12 | Autonomous live flag changed: **NO** |
| IR13 | Trusted Auto Ready: Admin `markAiSuccess` / `system:catalog-autonomy` (unchanged path) |
| IR14 | Staff approval: client `catalogApprovalService` (unchanged) |
| IR15 | Shared lower-level primitive introduced: **NO** |
| IR16 | Audit actor: `system:catalog-autonomy` distinct from staff |
| IR17 | Ready field parity: unchanged for WS1 (lifecycle fields already set by `markAiSuccess`) |
| IR18–IR21 | Smart Profile / presets / staff / Halftone-background: **unchanged** (regressions pass) |
| IR22 | Algolia success: upsert + `portalCatalogPublicationStatus=synced` |
| IR23 | Before: log + swallow |
| IR24 | After: design publication fields + Health `publicationFailures` + **rethrow** for CF retry |
| IR25 | Publication retry: Cloud Functions platform retry on throw; reconcile remains durable recovery |
| IR26 | Idempotency: `saveObject` by objectID; meta-only writes classify operational (no loop) |
| IR27 | Unrelated-design isolation: per-design trigger — **YES** |
| IR28 | Health retries: enqueue durable re-attempt + Gemini vision `onRetry` |
| IR29 | Health failures: pipeline catch after `markAiFailure` |
| IR30 | Health verifier: invoked/unresolved/confirmed from decision outcome (confirmed rare) |
| IR31 | would-auto: `wouldAutoApprove` |
| IR32 | actual-auto: `shouldPublishReady` |
| IR33 | Unsupported historical: UI shows “not tracked yet” when field absent (not fabricated zero-as-none) |
| IR34 | Preview labels: “Already current (catalog-enrich-v32/smart-profile-normalizer-v6)” |
| IR35 | Historical provenance: distributions unchanged; no data rewrite |
| IR36–IR38 | Prompt / normalizer / schema changed: **NO** |
| IR39–IR44 | Tag gen/resolver/matchedTags/Studio/Portal/Algolia tag settings: **NO** |
| IR45–IR47 | Rules / Storage / indexes: **NO** |
| IR48 | Migration/backfill: **NO** |
| IR49 | See files list below |
| IR50 | Focused tests: **PASS** (decision + observability contract) |
| IR51 | Regressions: **PASS** (181 tests incl. subject canonicalization, enrichment response, Algolia classifier/record, decision) |
| IR52 | Functions build: **PASS** (`cd functions && npm run build`) |
| IR53 | Studio/shared typecheck: Functions `tsc` via build **PASS**; Studio full `tsc -p apps/studio` has **pre-existing unrelated errors** (none in WS1 Settings files). Shared has no package tsconfig. |
| IR54 | ESLint on touched WS1 files: **PASS** (`--max-warnings 0`) |
| IR55 | `git diff --check`: trailing whitespace only in prior handoff draft lines — **fixed** in NEXT-PLANNED-GOAL update |
| IR56 | ADR-FP-144 WS1 amendment recorded in `docs/project/DECISIONS.md` |
| IR57 | Later DEV deploy inventory: Functions (`enqueueAiEnrichment`, enrichment pipeline deps, `syncPortalCatalogDesignToAlgolia`, catalog reprocess callables if Preview labels needed), Studio runtime for Settings Health/Reprocess UI. No Rules/Algolia settings. |
| IR58 | WS2 prerequisite readiness: **YES** (automation truthful enough for inventory/Preview) |
| IR59 | Anomaly: Studio full-project typecheck pre-existing failures (documented) |
| IR60 | No new blocking [NEEDS OWNER DECISION] for WS1. Next: authorize WS2 / later DEV deploy |

---

## Exact files changed (WS1)

- `packages/shared/src/utils/catalogAutomationDecision.ts`
- `packages/shared/src/utils/catalogAutomationDecision.test.ts`
- `packages/shared/src/types/admin/catalogReprocess.types.ts`
- `functions/src/ai/catalogAutomationHealth.ts`
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/visionRequestRetry.ts`
- `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts`
- `functions/src/ai/ws1AutomationObservability.contract.test.ts` (new)
- `functions/src/enqueueAiEnrichment.ts`
- `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts`
- `functions/src/catalogReprocess/catalogReprocessEligibility.ts`
- `functions/src/catalogReprocess/catalogReprocessCallables.ts`
- `apps/studio/.../AutomationHealthSettingsSection.tsx`
- `apps/studio/.../CatalogReprocessingSettingsSection.tsx`
- `docs/project/DECISIONS.md` (ADR-FP-144 amendment)
- workflow / handoff state docs

---

## Required changes for later (notes, not WS1 blockers)

1. DEV Functions + Studio deploy before WS2 Preview against live counters/labels (owner checkpoint).
2. Pre-existing Studio `tsc` debt remains outside WS1 scope.

---

## Verdict Rationale

**approved_with_notes** — All WS1 acceptance criteria met in source with tests/build/lint green for touched surfaces. Notes: deploy not done (correctly unauthorized); Studio full typecheck baseline debt unrelated to WS1.

## Next Step

**STOP.** Await owner authorization for **WS2**. Do not deploy, reprocess, enable Autonomous, retire tags, signoff, or commit/push unless separately authorized.
