# Formal Review: Humor Dominant-Intent Override Reliability

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-03-humor-dominant-intent-override-reliability-plan.md` |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Trigger | `OWNER CATEGORY CANARY: FAIL` — #1 Animals ~9/10 |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly identifies repo-grounded failure modes: Animals-gated humor override, resolver signal bag omitting themes/searchConcepts, and threshold dependence on stochastic title/desc/tag lexical humor. Proposed dual-gate joke-primary rule plus expanded signals is the right shape for model-variance robustness. Formal Review **approves with required changes** before implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Corrective only; WS4/Autonomous/tags out |
| Architecture alignment | pass | Lean prompt + server resolver retained |
| Security impact | pass | No auth/rules |
| Data model | pass | Schema v1 unchanged |
| Backend impact | pass | Enrichment resolver + optional prompt |
| Test strategy | pass | Animals + Food & Drink + CASE B + goldens + 10× live |
| Human checkpoints | pass | Review → implement auth → 10× canary |
| Robustness vs model variance | pass with changes | See required changes |
| No silent scope expansion | pass | |

---

## Architecture Review

**Findings:**

- Confirmed: `resolveThemeCategory` always enters override on exact match; intermittency is predicate/signal failure, not a skipped call.
- Confirmed: `aiEnrichmentCandidateCore` has `smartProfileEnrichmentParse` available before final resolve but does not pass themes/searchConcepts today.
- Confirmed: `F-CAW-F` tokenization cannot satisfy `HUMOR_PRIORITY` alone.
- Animals-only gate is incompatible with owner requirement that wrong exact categories (e.g. Food & Drink) still be correctable.

**Required changes:**

1. **Implement must prove Food & Drink exact → Funny** with the **same lean signal bag** used for Animals exact (no fixture that smuggles “humorous joke” only into one case).
2. **CASE B fixture must be strict:** incidental humor = at most one weak humor lexical hit and **no** pun/joke structure tokens — document the fixture’s signal bag in the test name/comments so future edits do not accidentally strengthen it.
3. **Do not** treat short `visibleText` alone as sufficient jokeStructureEvidence without a non-visibleText humor lexical hit (prevents slogan-only false Funny).
4. If prompt text changes, bump **catalog-enrich-v34** via existing previous-default mechanism; prefer resolver-first — prompt is assistive only.
5. Record final threshold constants (`humorLexicalHits`, jokeStructure definition) in Implementation Review; if implement discovers the dual gate still flaky under realistic fixtures, **STOP** for owner threshold decision rather than silently adding design-specific tokens (e.g. hardcoding `caw` / `f-caw-f`).

**Human approval needed before production:** yes (entire parent goal).

---

## Security Review

- No issues. No Rules/secrets/production.

---

## Data Model Review

- Schema stays `smart-profile-v1`. No migration.

---

## Backend Review

- Same DEV Functions allowlist expected post-implement: `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`.
- No new per-design Firestore taxonomy reads.

---

## Test Review

**Required:**

- Matrix rows 1–10 from plan
- Explicit themes-fed / searchConcepts-fed unit coverage
- Explicit “visibleText slogan alone does not override” negative test
- Live: **10/10 #1** Funny; any Animals/Food/unrelated = FAIL
- Retain #9/#12/#13

---

## Documentation Review

- ADR required; TESTING.md live canary note for 10× #1; cross-link FAIL checkpoint.

---

## Required Changes Before Implement (summary)

| # | Change |
|---|--------|
| 1 | Food & Drink exact fixture parity with Animals exact |
| 2 | Strict CASE B incidental-humor fixture documentation |
| 3 | visibleText-alone must not override |
| 4 | Prompt bump only if text changes → v34; resolver-first |
| 5 | No design-ID/title/`caw` hardcodes; STOP if only path is one-off tokens |

---

## Verdict

**approved_with_changes**

Implementation may proceed only after owner authorize implement, incorporating the required changes above. **WS4 remains blocked** until post-fix **10/10 #1** owner canary PASS.
