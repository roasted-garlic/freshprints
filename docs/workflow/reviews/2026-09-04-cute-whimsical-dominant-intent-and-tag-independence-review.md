# Formal Review: Cute & Whimsical dominant-intent + legacy tag independence gate

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-cute-whimsical-dominant-intent-and-tag-independence-plan.md` |
| Parent | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Prior | Music-vs-Pop Signoff **approved_with_notes**; owner QA **PASS** |
| Verdict | **approved_with_changes** |
| Runtime | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` · shadow · Autonomous OFF |

---

## Summary

Highland cow case (`swcJl3RvjTFsf5hp04Ze`) finalizes as **Animals** via exact-match trust. Unlike Music-vs-Pop, fallback would **not** select the owner-desired category because **Cute & Whimsical is not in the live active taxonomy** (25 categories; absent from materialization and categories collection). Animals’ live description also explicitly claims highland cows and cute animal art. Legacy `matchedTags` are consumed by the resolver but are **NON-MATERIAL** on the audited golden set (0 category flips with tags emptied). Formal Review therefore **does not** require tag-removal as a prerequisite, but **blocks any Cute-vs-Animals resolver implement until the category exists**. Prefer taxonomy (owner) → optional description reciprocity → then smallest bounded exact-match challenge (generalized preferred over endless pair tables). No second AI call.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Diagnostic + plan only |
| Architecture alignment | pass | SP = evidence; resolver = trust; no second classifier |
| Security | pass | Read-only audit |
| Data model | pass | No schema change proposed |
| Tag-retirement gate | pass | NON-MATERIAL; not a blocker |
| Test strategy (future) | pass | Contingent on taxonomy |
| Human checkpoints | pass | Taxonomy owner decision required |
| No silent scope expansion | pass | No implement/deploy/tag removal |
| WS4/WS5 discipline | pass | WS4 open; WS5 blocked |

---

## Architecture Review

**Findings:**

1. Exact-match short-circuit is real but insufficient alone to explain “should have been Cute” — **target category missing**.  
2. Resolver does **not** consume `styles` today; Highland’s strongest whimsical signals sit in `styles` (+ themes).  
3. Generalized exact-match structured-evidence second pass (Option D) is the right long-term shape **after** Cute exists; pair-only Animals→Cute (Option C) is premature and non-scalable as a first move.  
4. Music-vs-Pop remains a valid special case (fallback already preferred Music while target existed).

**Required changes before any Cute resolver implement:**

- [x] Owner adds/activates **Cute & Whimsical** (or explicitly renames/repurposes an existing category — owner decision).  
- [x] Reciprocal Animals ↔ Cute wording (Animals must not auto-claim all cute highland cows).  
- [x] Any override/challenge must work with `matchedTags: []` and must not depend on tags.  
- [x] Wire `styles` into durable signals if aesthetic dominance is required evidence.  
- [x] Domain protection list (Faith, Music, Occupations, Holiday, etc.).  
- [x] No second AI call.

---

## Legacy tag influence verdict

| Metric | Result |
|--------|--------|
| matchedTags consumed | **YES** (generic bag) |
| Highland with/without tags | Animals / Animals |
| Golden exact flips | **0** |
| Golden fallback flips | **0** |
| **LEGACY TAG INFLUENCE** | **NON-MATERIAL** |
| Tag-independence prerequisite before Cute work | **NO** |
| `[LEGACY TAG DEPENDENCY BLOCKER]` | **Not triggered** |

Later cleanup of matchedTags from category scoring remains desirable but is a **separate** workstream—not a gate for taxonomy+Cute calibration planning.

---

## Options verdict

| Option | Review |
|--------|--------|
| A Taxonomy-only | Necessary **first** (category missing + Animals wording) |
| B Prompt-only | Insufficient alone |
| C Pair-specific Animals→Cute | **Reject as first implement** until category exists; avoid giant pair table growth |
| D Generalized exact-match challenge | **Recommended next engineering shape** after taxonomy |
| E Accept Animals | Rejects stated product intent |

**Recommended sequence:** Taxonomy (owner) → re-measure Gemini → then D (or A+B only if already fixed) → never tag-dependent.

---

## Decision rule application

Owner rule: if tags MATERIAL → stop Cute and make tag-independence prerequisite.  

**Tags are NON-MATERIAL** → continue Cute planning, but Formal Review still requires taxonomy prerequisite (different blocker).

---

## Human checkpoints

1. **[NEEDS OWNER DECISION — CUTE & WHIMSICAL TAXONOMY]**  
2. After taxonomy live: authorize Implement for descriptions-only vs resolver challenge.  
3. No WS5 / Autonomous / production.

---

## WS4 / WS5

| Item | Status |
|------|--------|
| Music-vs-Pop | Signed off **approved_with_notes** |
| WS4 | **PASS WITH NOTES** — keep open (Cute/taxonomy diagnostic) |
| WS5 | **BLOCKED** |

---

## Verdict

**approved_with_changes**

Required before implement:

1. Cute & Whimsical present in active taxonomy (owner).  
2. Animals reciprocal wording reviewed.  
3. Implement plan limited to tag-independent, no-second-AI, protected-domain design.  
4. Prefer generalized bounded exact-match challenge over one-off pair tables once evidence exists.

Diagnostic pass: **no implementation**.
