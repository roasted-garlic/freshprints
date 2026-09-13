# Implementation Review: Visual / no-text catalog title specificity

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Implementation / Test Agent |
| Plan | `docs/workflow/plans/2026-09-04-visual-catalog-title-specificity-plan.md` |
| Formal Review | `approved_with_notes` |
| Owner auth | **AUTHORIZE IMPLEMENT — VISUAL CATALOG TITLE SPECIFICITY** |
| Verdict | **approved_with_notes** |
| DEV deploy | **NOT DONE** (this pass — STOP) |

---

## Summary

Option D shipped in lean title finalization: after existing `resolveLeanCatalogTitle` logic, **no-text** titles with ≤2 words may be deterministically enriched from Smart Profile **subjects** / **objects** (prefer more specific subject; natural `With` / `And` object phrasing; weak subject/object filters). Visible-text path unchanged. Highland-class long titles preserved (word count gate). Prompt **v34** / normalizer **v6** / schema **v1**. No second AI call; no tag dependency; no new Autonomous hard blocker (repair-before-decision). Focused tests + Functions build PASS. **No DEV deploy.**

---

## IR checklist (owner-requested)

| # | Item | Result |
|---|------|--------|
| 1 | Verdict | **approved_with_notes** |
| 2 | Exact files changed | See below |
| 3 | Root cause confirmed | Short non-generic model titles trusted; SP subjects/objects unused for specificity |
| 4 | Title-finalization stage | `resolveLeanCatalogTitle` (+ `enrichUnderSpecificNoTextCatalogTitle`); wired from `buildSimpleCatalogEnrichmentResult` |
| 5 | Under-specific detection | No meaningful readable text; title ≤2 comparable words; richer subject and/or distinguishing object available |
| 6 | Evidence dimensions used | **subjects**, **objects** only |
| 7 | subjects used | **YES** |
| 8 | objects used | **YES** |
| 9 | styles/themes/searchConcepts | **NO** — keyword-stuffing risk; Formal Review preferred subjects/objects |
| 10 | legacy tags required | **NO** |
| 11 | visibleText path changed | **NO** (enrichment skipped when readable lines present) |
| 12 | human/preset authority changed | **NO** |
| 13 | Sloth before | `Sloth` |
| 14 | Sloth after | `Sloth Clinging To Tree Trunk` (incomplete/description recovery + enrichment-safe; still materially > bare Sloth) |
| 15 | Poodle before | `Dog` |
| 16 | Poodle after | `Poodle With Glasses And Heart` |
| 17 | Highland before | Owner-accepted long descriptive title |
| 18 | Highland after | **Unchanged** (fixture) |
| 19 | Highland preserved | **YES** |
| 20 | generic-title control | `Cat` alone → `Cat` |
| 21 | hallucination control | `Dog` + only `dog` → `Dog` |
| 22 | decorative-object restraint | stars/sparkles/border skipped; tree kept |
| 23 | text-led regressions | Existing lean suite + slogan not replaced by subjects/objects **PASS** |
| 24 | OCR/visibleText regressions | Existing dump/sanitization tests **PASS** |
| 25 | category regressions | Resolver suite **41 PASS** (unchanged logic) |
| 26 | under-specific automation before | FR: bare `Dog` could `wouldAutoApprove` in shadow |
| 27 | under-specific automation after | Enrichment repairs title **before** automation decision on enrichment path |
| 28 | new automation blocker added | **NO** (not authorized; repair-first) |
| 29 | prompt changed | **NO** |
| 30 | prompt version | **catalog-enrich-v34** |
| 31 | normalizer changed | **NO** |
| 32 | normalizer version | **smart-profile-normalizer-v6** |
| 33 | schema changed | **NO** |
| 34 | schema version | **smart-profile-v1** |
| 35 | second AI call added | **NO** |
| 36 | tag dependency added | **NO** |
| 37 | tag-retirement compatible | **YES** |
| 38 | focused tests | **PASS** (`catalogTitleRules` 75; enrichment response; category resolver) |
| 39 | Functions build | **PASS** |
| 40 | lint | **PASS** (eslint touched files) |
| 41 | diff-check | **PASS** (CRLF warnings only) |
| 42 | Exact expected DEV deploy inventory | `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten`, `testAiEnrichmentPlayground` (confirm graph at deploy) |
| 43 | Rollback | Revert title-rules + enrichment wiring; redeploy prior Functions |
| 44 | WS4 status | **PASS WITH NOTES** (not closed — await deploy/QA/signoff) |
| 45 | WS5 status | **BLOCKED** |
| 46 | [NEEDS OWNER DECISION] | Authorize **DEV deploy** + owner QA; later: under-specific title Autonomous hard-blocker policy before WS5 |

---

## Files changed

| File | Change |
|------|--------|
| `functions/src/ai/catalogTitleRules.ts` | `enrichUnderSpecificNoTextCatalogTitle`, subject/object helpers; lean resolver wiring |
| `functions/src/ai/catalogTitleRules.test.ts` | Sloth/Poodle/Highland/generic/hallucination/text-led fixtures |
| `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | Pass `subjects`/`objects` into `resolveLeanCatalogTitle` |
| `docs/project/DECISIONS.md` | ADR-FP-168 |
| `docs/standards/TESTING.md` | Title specificity commands |
| `.cursor/workflow/state.md` | IR complete; await deploy auth |

---

## Notes

1. Sloth live path often improves via existing incomplete/description recovery **and** remains compatible with object enrichment when that path does not fire.
2. Poodle natural shape uses SP objects as stored (`glasses`, `heart`) — not hardcoded “heart-shaped glasses.”
3. No new Autonomous hard blocker for unrepaired under-specific titles (Formal Review: do not invent without owner auth). Primary mitigation is repair-before-decision.
4. Category resolver untouched.

---

## STOP

**NO DEV DEPLOY. NO OWNER QA. NO WS4 CLOSEOUT. NO WS5. NO AUTONOMOUS. NO TAG RETIREMENT. NO COMMIT/PUSH. NO PRODUCTION.**

Next: owner authorizes DEV deploy, then QA Sloth / Poodle / Highland titles.
