# Plan: Visual / no-text catalog title specificity

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase (diagnostic → Plan + Formal Review only) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related Formal Review | `docs/workflow/reviews/2026-09-04-visual-catalog-title-specificity-review.md` |
| Related signoff | Cute & Whimsical **approved_with_notes** (category closed; titles open) |
| Live runtime | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` · shadow · Autonomous OFF |

---

## Goal

Improve catalog titles for **visual / no-text** artwork so the system does not collapse to a bare generic subject (`Sloth`, `Dog`) when the single vision call already produced reliable distinguishing subject/object (and composition) evidence — **without** rejecting good long descriptive titles (Highland), keyword-stuffing, hallucinating detail, or regressing visible-text titles.

---

## Background

Owner Cute & Whimsical QA **PASS WITH NOTES**. Category corrective signed off. Open WS4 note: under-specific titles.

| Design | ID | Final title | Issue |
|--------|-----|-------------|-------|
| Highland | `swcJl3RvjTFsf5hp04Ze` | Long descriptive (owner-accepted) | **NON-FAILURE** — must remain acceptable |
| Sloth | `7ZZIvBXvrnS2AcTVdjzl` | `Sloth` | Under-specific vs clinging/tree evidence |
| Poodle | `rhfZm1hB37krd8QBtfm9` | `Dog` | Materially under-specific vs poodle + heart glasses |

Product rule: quality = **specificity + accuracy + usefulness**, not length. Short, medium, and long titles are all valid when appropriate.

---

## Diagnostic answers (repo + live DEV)

### Poodle ID

**`rhfZm1hB37krd8QBtfm9`** — Black poodle / heart glasses; category **Cute & Whimsical**; title **Dog**; subjects `dog`, `poodle`; objects `glasses`, `heart`; v34.

(Older Ready twin `ikBaXL2KEhWvuBAI3bv7` still Animals / Dog / v33 — not the owner Cute QA case.)

### Trace summary

| # | Sloth | Poodle | Highland |
|---|-------|--------|----------|
| Raw Gemini title | Not persisted | Not persisted | Not persisted |
| Final persisted title | **Sloth** | **Dog** | Live sug: long whimsical Highland sentence; owner QA observed alternate long charming sentence — both long descriptive |
| visibleText | `[]` | `[]` | `[]` |
| subjects | sloth, person | dog, poodle | cow, Highland cow |
| objects | trees | glasses, heart | flowers, bow |
| searchConcepts | hanging sloth, sloth on tree, … | black poodle, heart-shaped glasses, … | cow with bow, … |
| titleOutcome | first_pass | first_pass | first_pass |
| Richer evidence before persist? | **YES** (SP + description) | **YES** | **YES** (and title already rich) |

### Why bare titles survive

1. **Prompt already asks** for a literal 5–7 word no-text title (`DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` / v34) — model still sometimes emits one-word subject labels (stochastic under-titling).
2. **`isGenericCatalogTitle`** only flags meta tokens (`design`, `artwork`, `typography`, …) — **not** animal nouns like `Dog` / `Sloth`.
3. **`resolveLeanCatalogTitle`** trusts a non-generic model title when readable lines are empty (`!candidateUnusable` → return candidate). It does **not** consult Smart Profile `subjects` / `objects` arrays (only optional `centralSubject`).
4. **`isIncompleteTitleVsDescription`** is slogan/readable-phrase oriented. It can rebuild Sloth→`Sloth Clinging To Tree Trunk` **when** trailing recovery finds “sloth …” in the description — **not reliable** for Dog (description says **poodle**, title token **Dog** does not prefix-match). Replay against current Sloth description rebuilds; live title remains `Sloth` (write-time variance or incomplete path not sufficient as sole architecture).
5. **No title-specificity detector** for “bare subject while richer SP evidence exists.”
6. **Automation:** `detectSubjectSpecificityRisk` concerns **subject list vs title-grounded phrases**, not thin titles. **Dog** → `wouldAutoApprove: true` in shadow (no title hard blocker). Sloth `needs_review` from unrelated `structured_evidence_gap:subjects:person`, not title thinness.

### Current title contract (mechanical)

| Control | Value |
|---------|-------|
| Max characters | **200** (`CATALOG_TITLE_MAX_CHARACTERS`) — overage is **warning**, not hard error in validation helper |
| Max words (lean normalize) | **24** (`LEAN_CATALOG_TITLE_MAX_WORDS`); legacy default path **6** |
| Generic detector | Meta/product tokens only — not breed/subject thinness |
| Title-specificity detector | **NO** (for under-specific visual titles) |
| Description-like rejection | Boilerplate openings / “features|shows|depicts” + visual-scene pattern |
| VisibleText priority | **YES** — readable lines win when present |
| Description fallback | Guarded readable/slogan extraction; visual-scene first sentences avoided for slogan path |
| SP subjects/objects at finalization | **Available** on enrichment parse / Smart Profile |
| Consumed for title specificity | **NO** (only `centralSubject` optional append on readable path) |
| Automation title gate | Missing title = hard; length overage = warning; **no under-specific title hard blocker** |

### Highland ACCEPTABLE control

- Owner: long descriptive title **TITLE ACCEPTED** — not a failure for length or sentence form.
- Must **not** introduce max-word / anti-prose / noun-phrase-only rules that reject it.
- Lean cap 24 words / 200 chars already allow owner-observed ~17-word / ~103-char title.

---

## Options compared

| Option | Verdict |
|--------|---------|
| A. Prompt-only | Insufficient alone — v34 already asks 5–7 word no-text titles; Dog/Sloth still occur |
| B. Deterministic under-specific detection | Necessary — detect bare/thin title when richer structured visual evidence exists |
| C. Deterministic enrich/rebuild from subjects/objects | Necessary for correction — high-confidence structured evidence; not keyword soup from themes/interests |
| D. **B + C** | **Recommended** — detect then enrich; preserve good titles |
| E. Second AI title call | **Not authorized** |

---

## Recommended approach (D) — design only

```
AI-proposed title
  → if visibleText / readableTextLines meaningful → existing visible-text path (unchanged)
  → else if title already sufficiently specific → keep (incl. long descriptive Highland)
  → else if materially under-specific AND reliable subjects/objects (optional careful description cues) exist
       → enrich/rebuild from structured evidence
  → else keep original (simple one-word subject OK when no richer evidence)
```

### Detection (illustrative)

Under-specific when **no meaningful visible text** and e.g.:

- title is 1–2 tokens, and
- Smart Profile has a more specific subject compound than the title (poodle vs dog), and/or
- durable objects clearly central (glasses, tree) not reflected in title, and/or
- title equals only the generic base noun while a more specific subject exists

**Do not** flag Highland-length descriptive titles.

### Enrichment safety

- Prefer subjects (specific over base) + 1–2 central objects
- Do **not** dump themes/styles/interests/searchConcepts into titles
- No hallucination if evidence absent
- No matchedTags / tag resolver / reranker
- Preserve apostrophes, slogans, scripture, band names on text-led path

### Versioning preference

| Layer | Preference |
|-------|------------|
| Schema | **No change** |
| Normalizer | **No change** unless title rebuild must live there (prefer `catalogTitleRules` / enrichment response assembly) |
| Prompt | Prefer **no bump**; optional later **catalog-enrich-v35** nudge only if still needed after deterministic path — **do not implement in this pass** |
| Second AI call | **NO** |

---

## Scope

### In Scope (future implement — not this pass)

- Deterministic under-specific detection + bounded rebuild for no-text titles
- Tests: Sloth, Poodle, Highland keep, one-word OK control, no-hallucination, text-led regressions
- Optional automation warning/blocker for under-specific titles (owner decision)
- Docs / ADR

### Out of Scope

- Implementation / DEV deploy this pass
- Blanket short-title or anti-sentence rules
- Tag retirement
- WS5 / Autonomous enablement
- Second AI call
- Rewriting accepted Highland title for brevity

---

## Affected Areas (expected future)

| Area | Paths |
|------|-------|
| Title rules | `functions/src/ai/catalogTitleRules.ts` (+ tests) |
| Enrichment assembly | `functions/src/ai/simpleCatalogEnrichmentResponse.ts` (pass subjects/objects into resolve if needed) |
| Automation (optional) | `packages/shared/src/utils/catalogAutomationDecision.ts` / evidence helpers |
| Docs | `DECISIONS.md`, `TESTING.md` |

### Architecture / Security / Data / Backend / UI

- Architecture: extend existing lean title resolver — **no parallel pipeline**
- Security: none material
- Data model: no schema change
- Backend: enrichment Functions redeploy when implemented
- UI: none required (catalog titles improve on reprocess)

---

## Test Strategy (future)

### Automated

| Check | Required |
|-------|----------|
| `catalogTitleRules` unit tests (Sloth/Poodle/Highland/text goldens) | yes |
| Quality contract if wiring changes | yes |
| Functions build | yes |
| Automation decision tests if gate added | if in scope |

### Manual (after future DEV deploy)

- Reprocess Sloth / Poodle → more specific titles
- Highland remains acceptable (not shortened solely for length)
- Text-led goldens unchanged

---

## Human Checkpoints Anticipated

- [ ] Owner approve Formal Review before implement
- [ ] Optional: whether under-specific titles become Autonomous **hard blockers** vs warnings
- [ ] Owner QA after future DEV deploy

---

## Risks and Rollback

| Risk | Mitigation |
|------|------------|
| Over-enrichment / keyword soup | Subjects/objects only; capped elements; no themes/styles dump |
| Regress Highland / prose titles | Explicit ACCEPTABLE control tests; no max-5-words rule |
| Regress visible-text titles | Gate: no-text path only when readable lines empty |
| Hallucination | Only use existing structured fields |
| Rollback | Revert title-rules change; redeploy prior Functions |

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No (app Functions / shared utils) |
| Development Tooling | Docs / tests only this pass |
| Distribution | No |
| Documentation | Plan / review / later ADR |
| Development History | Workflow artifacts |

---

## Open Questions → Formal Review / Owner

1. Should under-specific titles become Autonomous hard blockers before WS5?
2. Confirm Poodle ID `rhfZm1hB37krd8QBtfm9` as canonical owner case (vs older `ikBaXL2KEhWvuBAI3bv7`).
3. Prompt v35: defer unless deterministic path insufficient after implement.

---

## Next Step

Formal Review → owner authorize Implement (separate pass). **No implementation now.**
