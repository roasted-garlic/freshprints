# Formal Review: Visual / no-text catalog title specificity

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-visual-catalog-title-specificity-plan.md` |
| Related | Cute & Whimsical signoff **approved_with_notes**; WS4 open note |
| Verdict | **approved_with_notes** |
| Implementation | **NOT authorized this pass** |

---

## Verdict

**approved_with_notes**

Plan D (detect under-specific + enrich from structured subjects/objects on no-text path) is the right smallest scalable corrective. Do **not** add blanket prose/length rejection. Prefer deterministic logic on the already-paid vision call; prompt bump optional later only; **no second AI call**; **no schema change**.

---

## Checklist answers (owner-requested)

| # | Item | Answer |
|---|------|--------|
| 1 | Sloth raw title | **Not persisted** (raw Gemini title not stored) |
| 2 | Sloth final title | **`Sloth`** (`aiSuggestions.title`; `titleOutcome: first_pass`) |
| 3 | Why bare Sloth survives | Model under-title + `isGenericCatalogTitle` does not treat animal nouns as generic + lean resolver trusts non-generic candidate when no readable lines; SP subjects/objects **not** used for specificity. Incomplete/description recovery can rebuild on **replay** with current desc but is not a complete architecture for all cases |
| 4 | Poodle ID | **`rhfZm1hB37krd8QBtfm9`** (Cute & Whimsical / Dog / v34). Twin `ikBaXL2KEhWvuBAI3bv7` is older Animals/v33 |
| 5 | Poodle raw title | **Not persisted** |
| 6 | Poodle final title | **`Dog`** |
| 7 | Why bare Dog survives | Same trust path; incomplete check **does not** fire (desc centers on **poodle**, not title token `Dog`); subjects include poodle + objects glasses/heart **unused** by title resolver |
| 8 | Highland raw/final title | Raw not persisted. Live final sug title: long whimsical Highland sentence. Owner QA observed: *A Charming Illustrated Highland Cow With Large Expressive Eyes Is Depicted Resting Its Chin On Its Hand* |
| 9 | Highland ACCEPTABLE | **YES** (owner TITLE ACCEPTED) |
| 10 | Would current safeguards reject Highland for length? | **NO** — not generic; within 200 chars / 24-word lean cap; description-like detector does not flag solely for sentence length |
| 11 | Max characters | **200** |
| 12 | Max words | Lean normalize **24**; legacy default **6** (lean path used for enrichment) |
| 13 | Generic-title detector | Meta/product tokens only (`design`, `artwork`, `typography`, …) — **not** `Dog`/`Sloth` |
| 14 | Title-specificity detector exists | **NO** (for visual under-specificity) |
| 15 | SP subjects available | **YES** |
| 16 | SP objects available | **YES** |
| 17 | Currently consumed for title specificity | **NO** (only optional `centralSubject` on readable/subject fallback paths) |
| 18 | visibleText protected | **YES** — readable-line path remains authoritative when present |
| 19 | Tag dependency needed | **NO** |
| 20 | Sloth automation blocker today (for title)? | **NO** for under-specific title; live `needs_review` from `structured_evidence_gap:subjects:person` (unrelated) |
| 21 | Dog automation blocker today | **NO** — shadow `wouldAutoApprove: true`; **no** title hard blocker |
| 22 | Recommended corrective | **D** — deterministic under-specific detection + enrich/rebuild from subjects/objects on no-text path; preserve good long titles; no parallel pipeline |
| 23 | Blanket prose/length rejection introduced | **NO** (must not) |
| 24 | Prompt change required | **Prefer NO** for first implement |
| 25 | Proposed prompt if needed later | **catalog-enrich-v35** (nudge only; not authorized now) |
| 26 | Normalizer change | **Prefer NO** |
| 27 | Schema change | **NO** |
| 28 | Second AI call required | **NO** |
| 29 | Future test matrix | Sloth+, Poodle+, Highland keep, one-word OK when no richer evidence, no-hallucination, text-led goldens (slogan/apostrophe/band/scripture/Christmas/no OCR dump) |
| 30 | Exact files expected | `catalogTitleRules.ts` (+tests); likely `simpleCatalogEnrichmentResponse.ts`; optional automation helpers; DECISIONS/TESTING |
| 31 | DEV deploy inventory (future) | Same enrichment quartet as Cute deploy when title code ships |
| 32 | Rollback | Revert title-rules/assembly; redeploy prior Functions |
| 33 | WS4 status | **PASS WITH NOTES** (Cute category signed off; title finding open) |
| 34 | WS5 status | **BLOCKED** |
| 35 | [NEEDS OWNER DECISION] | (1) Authorize Implement for title specificity when ready. (2) Should under-specific titles become Autonomous **hard blockers** before WS5? (3) Confirm Poodle ID `rhfZm1hB37krd8QBtfm9`. |

---

## Root cause (confirmed)

| Layer | Finding |
|-------|---------|
| Prompt | Already requests 5–7 word no-text titles — stochastic under-titling still happens |
| Generic detector | Does not treat bare subject nouns as under-specific |
| Lean resolver | Trusts short non-generic titles; does not use SP subjects/objects for no-text specificity |
| Incomplete-vs-description | Slogan-oriented; inconsistent for visual under-titles (helps some Sloth replays; fails Dog) |
| Automation | Under-specific titles **not** hard-blocked — **Dog would auto-approve** in shadow |

This is **not** “titles too long.” Highland proves long descriptive titles can be excellent.

---

## Plan quality review

| Check | Result |
|-------|--------|
| Scope clear and bounded | YES |
| Architecture alignment (extend existing title path) | YES |
| Security | None material |
| Data / schema | No change |
| Test strategy | Adequate for future implement |
| Human checkpoints | Identified |
| No silent scope expansion | YES — diagnostic only this pass |
| Visible-text / OCR / preset protections | Called out to preserve |
| Tag-retirement compatible | YES |

---

## Required notes before / during implement

1. **Highland is an ACCEPTABLE control** — never fail solely for length or sentence-like form.
2. **Do not** enforce prompt’s “5 to 7 words” as a hard ceiling.
3. Enrich from **subjects/objects** (high confidence); be cautious with themes/styles/searchConcepts.
4. No-text path only when meaningful readable text is absent.
5. Optional Autonomous hard-blocker for under-specific titles = **owner decision** (recommended to add before WS5, but not in this diagnostic pass).
6. Sloth is **not** a literal Animals category negative (Cute accepted).

---

## WS4 / WS5

| Item | Status |
|------|--------|
| Cute & Whimsical category corrective | **Signed off** `approved_with_notes` |
| Title specificity | Plan + FR complete; **implement not started** |
| WS4 | **PASS WITH NOTES** — keep open |
| WS5 | **BLOCKED** — no Autonomous |

---

## STOP

**NO IMPLEMENTATION. NO DEV DEPLOY. NO WS4 CLOSEOUT. NO WS5. NO AUTONOMOUS. NO TAG RETIREMENT. NO COMMIT/PUSH. NO PRODUCTION.**

Next: owner authorizes title-specificity Implement when ready.
