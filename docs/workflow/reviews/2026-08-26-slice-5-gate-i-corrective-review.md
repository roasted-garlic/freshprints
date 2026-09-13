# Review: Slice 5 Gate I Corrective Plan

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-26-slice-5-gate-i-corrective-plan.md` |
| Gate I results | `docs/workflow/reviews/2026-08-26-smart-catalog-intelligence-slice-5-gate-i-results.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The corrective plan is narrowly scoped to Gate I’s material failures: artificial subject compounds from title-glue promotion, and the Floral & Nature false-positive auto-approve on fantasy/storybook art. Repo paths and root causes match current `catalog-enrich-v29` / `smart-profile-normalizer-v3` / `computeCatalogAutomationDecision` behavior. Implementation is **not** authorized by this review alone — owner must separately authorize implement + DEV deploy. Slice 5 signoff and Slice 6 remain blocked.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Slice 5 corrective only; explicit hard stops |
| Architecture alignment | pass | Shared decision/normalizer/prompt; no UI lifecycle bypass |
| Security impact addressed | pass | None material |
| Data model impact addressed | pass | Version string bumps only |
| Backend impact addressed | pass | DEV Functions redeploy after implement; no production |
| Test strategy adequate | pass | Required regression matrix + DEV QA mini sample |
| Human checkpoints identified | pass | Owner auth implement/deploy/QA |
| Roadmap alignment | pass | Unattended enrichment; precision > rate |
| Documentation plan | pass | Results + plan; DECISIONS/ROADMAP on implement |
| No silent scope expansion | pass | No Slice 6, Ready Catalog, Autonomous, curated vocab |

---

## Architecture Review

**Findings:**
- Correct levers identified: `aiEnrichment.constants.ts`, `catalogAutomationEvidence.ts`, `catalogAutomationDecision.ts`, version constants, Slice 5 snapshot.
- Prefer **decision-layer** category conflict hard-block over expanding `FAMILY_PRIORITY`-style boosts in `catalogThemeCategoryResolver.ts` unless fixtures show resolver change is necessary — avoids category governance creep.
- Do not introduce a curated subject allowlist; anti-glue must stay heuristic + prompt + evidence.

**Required changes:**
- [x] During implement: document the category-conflict detection algorithm in code comments + unit fixtures before merge (see Required Changes below).

---

## Security Review

**Findings:**
- No auth, rules, or secrets changes.

**Required changes:**
- [ ] None

**Human approval needed before production:**
- [x] Production deploy remains forbidden for this corrective.

---

## Data Model Review

**Findings:**
- Additive provenance version only; no category CRUD; no migration.

**Required changes:**
- [ ] None

---

## Backend Review

**Findings:**
- Prompt/normalizer version bumps require DEV `enqueueAiEnrichment` (and related) redeploy after implement.
- Catalog reprocess snapshot constants must track v30/v4 so any later owner-authorized re-calibration uses the corrective pipeline.

**Required changes:**
- [x] Implement must update `catalogReprocess` pipeline snapshot + Slice 5 contract tests in the same change set as version bumps.

---

## Testing Review

**Findings:**
- Regression table covers Gate I classes adequately.
- Must include negative tests proving `shadow_would_auto_approve` is **denied** for fantasy/storybook + Floral & Nature conflict fixture.
- Must include positive tests that highland-style promotion still works.
- Object soft-lane is correctly marked optional/risky — default deny if uncertain.

**Required changes:**
- [x] Ship object soft-lane **only** with explicit tests proving no false auto-approve; otherwise defer and keep object gaps hard.

---

## Documentation Review

**Findings:**
- Gate I results recorded.
- Plan ready for review.
- DECISIONS/ROADMAP updates deferred to implement — acceptable.

---

## Required Changes (approved_with_changes)

1. **Category conflict algorithm must be fixture-defined before merge** — implement documents deterministic inputs (which Smart Profile fields, token families, threshold) and unit fixtures for approve-deny pairs; no hard-coded Gate I design IDs.
2. **Prefer decision-layer hard blocker** for dominant-intent conflict; touch `catalogThemeCategoryResolver.ts` only if decision-layer alone cannot cover exact-match trust cases — justify in implement notes.
3. **Object soft-lane is optional** — defer if it risks precision; subject gaps remain hard.
4. **Do not bump to live Autonomous or unlock Ready Catalog** under any interpretation of “validation.”
5. **No full 204 reprocess** without separate owner authorization after corrective ships.

---

## Blockers

None for planning. Implementation blocked until **owner authorization**.

---

## Verdict Rationale

**approved_with_changes** — Root causes are correctly identified against repo source; scope matches Gate I NEEDS CORRECTIVE; priority (precision > rate) is preserved; regression matrix is sufficient. Conditional items above constrain implement without requiring plan rewrite.

---

## Next Step

1. Owner authorizes Implement for this corrective.
2. Implement approved scope (+ required changes above).
3. Test → DEV deploy (owner) → DEV QA mini sample.
4. Only then reconsider Slice 5 signoff.
5. **STOP now** — no implementation in this pass.
