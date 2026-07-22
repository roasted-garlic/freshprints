# Plan: AI text title completeness regression (description leakage)

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/plans/2026-07-21-ai-text-title-completeness-plan.md; multi-segment / intermittency follow-ups; this addendum |
| Goal id | `ai-text-title-completeness-regression` |
| Parent goal | `ai-text-title-completeness` (signed off 2026-07-21) |

---

## Goal

Harden the same centralized lean title-finalization path so text-based designs never get titles copied from descriptive prose (e.g. “The design features…”), while preserving prior completeness / apostrophe / intermittency fixes and leaving category, tags, and description behavior intact.

## Background

`ai-text-title-completeness` closed with prompt `catalog-enrich-v25`, description-wording extraction, and incompleteness safeguards. A new live regression shows description **leakage** into the title:

| Visible text | Meaningful subject | Actual title | Preferred |
|---|---|---|---|
| `BEST CHRISTMAS EVER` | Mouse ears (+ bow / décor) | `The Design Features The Outline Of Mouse Ears With A Red And White Polka Dot Bow` | `Best Christmas Ever Mouse Ears` (or confidently `… Minnie Mouse Ears`) |

Unacceptable because the title ignores readable wording, copies description prose, starts with boilerplate, reads as a sentence, and describes styling details instead of the catalog message.

This is **maintenance of the same title-finalization system** — not a parallel title feature and not a special case for “Best Christmas Ever”.

Parked concurrent work: `brand-logo-uploads` (manual UI checkpoint) remains parked until this goal closes or owner redirects.

### Root-cause investigation (repo check, 2026-07-22)

Traced the lean path used by initial processing, Reprocess, playground, retries, and customer-upload promotion:

`raw Gemini JSON` → `extractJsonObject` → `normalizeSimpleCatalogEnrichment` → `resolveLeanCatalogTitle` → `aiSuggestions.title` → Studio display.

| Stage | Finding for this failure shape |
|-------|--------------------------------|
| 1. Raw Gemini response | Lean contract returns only `title`, `description`, `category`, `tags`. No persisted structured readable-text array on lean responses today. |
| 2. Structured readable-text fields | **Absent on lean path.** Legacy OCR path has `visibleText[]`, but `buildSimpleCatalogEnrichmentResult` does **not** pass visible text into `resolveLeanCatalogTitle`. |
| 3–4. Raw / parsed model title | When the model emits a description-like sentence as `title`, lean normalization title-cases it and may trust it. |
| 5. Title completeness validation | `isIncompleteTitleVsDescription` compares candidate vs `resolveReadableWordingForTitle`. If wording extraction itself returns the **first description sentence**, candidate ≈ wording → **not** flagged incomplete. |
| 6. Generic-title rejection | `isGenericCatalogTitle` / `isStyleWordHeavyTitle` do **not** reject “The design features…” prose openings. |
| 7. Description-based fallback | `extractPrimaryWordingFromDescription`: prefers double-quoted / prose-continuation / slash segments; **if none match**, falls back to **`description.split(/[.!?]/)[0]`** (first sentence). |
| 8. Final normalized title | `normalizeCatalogTitle(firstSentence)` → Title Case prose sentence. |
| 9–10. Persist / Studio | Stores and displays that string as `aiSuggestions.title` with no further truncation. |

**Exact stage where the bad title materializes for the Christmas example:**

Given a description like:

> The design features the outline of mouse ears with a red and white polka dot bow. … Text reads 'BEST CHRISTMAS EVER'…

1. Single-quoted `Text reads '…'` is **not** captured by `extractQuotedReadablePhrases` (double quotes / curly doubles only).
2. Existing prose-continuation regexes do not reliably treat bare `Text reads '…'` as a slogan extract.
3. Therefore `extractPrimaryWordingFromDescription` hits the **first-sentence fallback** and returns the design-features clause.
4. Either (A) the model title is already that clause and is trusted because it “matches” wording, or (B) a rejected model title is replaced by that same first-sentence wording.

**Primary code causes (same root system as prior completeness work):**

1. **First-sentence description fallback** used as title source of truth.
2. **No description-boilerplate / prose-sentence rejection** on candidate or extracted titles.
3. **Lean path lacks structured readable-text evidence**, so recovery depends on fragile description parsing.
4. **Guarded quote / “text reads” extraction incomplete** for single quotes and common narration shapes.

Model under-specification can still emit prose titles; code must reject and rebuild regardless.

---

## Required title priority (product rule)

When meaningful readable text exists:

1. All meaningful readable wording in natural reading order  
2. One concise central non-text subject phrase when useful  
3. Nothing else  

Do not allow style, color, layout, or descriptive prose to replace the readable message.

### Description leakage rule

Never copy a descriptive sentence as the title. Reject (case-insensitive, tolerate leading whitespace/punctuation) openings such as:

- The design features / shows  
- The image features / shows  
- The artwork features / shows  
- The graphic features / shows  
- This design features / depicts  
- This image contains  
- An illustration of / An image of / A design with  

Also reject titles that clearly read as description prose even without an exact listed opening.

### Searchable title requirements

- Begin with visible wording when present  
- Title case without paraphrasing words; preserve contractions/apostrophes  
- Include all meaningful phrase lines; optional one short literal subject  
- Catalog title, not a full sentence; avoid periods and explanatory wording  
- Exclude color/outline/placement/font/styling unless printed  
- Avoid generic words (design, artwork, image, graphic, typography, quote, statement) unless printed  
- No word-limit truncation of required visible wording (shortness = exclude prose, not drop text)

### Meaningful subject rules

Multi-word subjects OK when one recognizable subject (`Mouse Ears`, `Minnie Mouse Ears`, `Highland Cow`). Do **not** append decorative details (polka-dot bow, starbursts, sparkles, red outline, etc.).

---

## Scope

### In Scope

- Centralized Functions / shared lean title-finalization (`resolveLeanCatalogTitle` and helpers used by that path)
- Reject description-boilerplate / prose-sentence titles (candidate + fallback)
- **Remove first-sentence-as-title fallback**; description parsing only as guarded extraction of explicitly identified readable wording (`text reads`, quotes, slash joins, existing continuation patterns)
- Prefer structured readable-text evidence from the same Gemini response when available:
  - Add transient lean response field (e.g. `readableTextLines: string[]`) **unless** that would require changing the persisted `aiSuggestions` contract
  - Persisting the transient field is **not** required
- Prompt smallest effective bump (prior default auto-upgrade + prompt version) so model titles prefer readable wording + optional subject and avoid description openings
- Append concise central subject when useful; exclude decorative detail phrases
- Regression tests listed below + keep prior Sarcasm / apostrophe / one-word / no-text fixtures green
- Docs: ADR amendment, BACKEND prompt version if needed, workflow artifacts, CURRENT-STATE
- Manual QA on `fresh-prints-dev` after soft-deploy (human)

### Out of Scope

- Separate / parallel title system
- Hardcoded special case for “Best Christmas Ever”
- Provider/model swap, OCR service, category/tag architecture redesign
- Description quality rewrite beyond extraction compatibility
- Changing persisted `aiSuggestions` field contract (stop and re-plan if required)
- Production deploy
- Unrelated Portal/Studio UI
- Resuming `brand-logo-uploads` implementation in this goal

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/ai/catalogTitleRules.ts` — boilerplate detection; kill first-sentence title fallback; guarded readable extraction; lean resolve priority (readable lines → subject); completeness / overlap helpers
- `functions/src/ai/catalogTitleRules.test.ts` — new fixtures
- `functions/src/ai/simpleCatalogEnrichmentResponse.ts` (+ tests) — parse optional transient `readableTextLines` / equivalent; pass into lean title resolve
- `packages/shared/src/constants/aiEnrichment.constants.ts` — lean prompt + previous-default registration
- Prompt version constants in `catalogTitleRules.ts` (e.g. `catalog-enrich-v26`)
- `docs/project/DECISIONS.md` — ADR amendment to FP-113 (or short new ADR)
- `docs/architecture/BACKEND.md` — prompt version note if stale
- Workflow + `references/project-chatgpt-handoff/CURRENT-STATE.md`

### Architecture Impact

- [x] Details: Same lean enrichment service path; optional transient parse field only; no UI Firebase access; authoritative finalization stays in Functions shared helpers used by all enrichment entry points.

### Security Impact

- [x] None (no auth/rules/secrets; no permanent logging of customer artwork text)

### Data Model Impact

- [x] None for persisted `aiSuggestions`. Transient model-response field only if added; do not persist unless review revises this plan.

### Backend Impact

- [x] Details: Cloud Functions AI enrichment path; prompt version bump; Settings previous-default auto-upgrade

### UI / UX Impact

- [x] Details: Studio AI Review titles improve after reprocess; no UI code expected. Manual reprocess checkpoint after `fresh-prints-dev` soft-deploy.

### Migration Impact

- [x] None. Existing titles update only on reprocess. Prior shipped default prompts auto-upgrade; custom prompts left alone.

---

## Approach

1. **Documented rejection helpers**
   - `isDescriptionLikeCatalogTitle` (boilerplate openings + sentence/prose heuristics).
   - Treat description-like titles as unusable in `resolveLeanCatalogTitle` (same class as generic / style-heavy).

2. **Readable-text source of truth**
   - Prefer transient `readableTextLines` (or equivalent) from the lean JSON when present: normalize without paraphrasing, join meaningful lines in reading order, optionally append one concise subject from model subject / trusted non-decorative cue, validate final title contains the readable phrase.
   - If structured lines absent: guarded description extraction only (quoted — including single quotes when introduced by `text reads` / `says`; existing continuation / slash paths). **Never** use first sentence as title.

3. **Subject append**
   - Allow multi-word literal subjects; strip decorative detail phrases from subject candidates.

4. **Prompt (smallest effective edit)**
   - Reinforce: title must start with readable wording; never open with description boilerplate; never copy description sentences; optional one subject; style/color/outline out unless printed.
   - Register previous default; bump prompt version.

5. **Preserve good model titles**
   - If model already returns `Best Christmas Ever Mouse Ears` (or equivalent valid form), finalizer must not rewrite.

6. **Keep prior regressions green**
   - Sarcasm completeness, apostrophe/contraction cases, intermittency merge behavior, genuine one-word and no-text designs, Motherhood-style mixed titles.

7. **Tests + docs + soft-deploy manual QA**

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| AI unit tests | `npx tsx --test functions/src/ai/*.test.ts` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Lint (touched paths / repo) | `npm run lint` | yes (document pre-existing if unrelated) |
| Diff check | `git diff --check` | yes |
| Shared prompt tests | affected shared/settings prompt tests | yes if touched |

### Required new regression fixtures

1. **Description leakage** — model title `The Design Features The Outline Of Mouse Ears With A Red And White Polka Dot Bow` + readable `BEST CHRISTMAS EVER` + subject `Mouse Ears` → `Best Christmas Ever Mouse Ears`
2. **First-sentence fallback rejection** — description starts with design-features sentence; `Text reads "BEST CHRISTMAS EVER"` (and single-quote variant) → must not use first sentence; expect `Best Christmas Ever Mouse Ears` when subject available
3. **Boilerplate variants** — reject openings: `The design features`, `The image shows`, `The artwork depicts`, `This graphic contains`, `An illustration of`
4. **Style-detail exclusion** — must not become `Best Christmas Ever Red And White Polka Dot Bow`
5. **Correct model title preservation** — `Best Christmas Ever Mouse Ears` preserved
6. **No-text protection** — mouse ears, no readable wording → concise visual title (not empty, not forced text title)
7. **Prior fixtures remain fixed** — Sarcasm multi-line; `I'm Fine…`; `I'm Not Arguing…`; one-word; no-text; Motherhood mixed

### Manual (after soft-deploy to `fresh-prints-dev`)

Reprocess Christmas mouse-ear design **≥ 5 times**:

- [ ] 5/5 titles begin with `Best Christmas Ever`
- [ ] Preferred: `Best Christmas Ever Mouse Ears` (Minnie variant OK if confident)
- [ ] Zero `The Design Features…` / copied description sentences / omitted readable phrase
- [ ] Description accurate; category `Holiday & Seasonal` or correct approved equivalent; tags reasonable

Also continue prior repeated QA:

- [ ] Both Sarcasm images
- [ ] `I'm Fine The Rest of You Need Therapy`
- [ ] `I'm Not Arguing, I'm Just Explaining Right`
- [ ] One genuine single-word design
- [ ] One design without readable text

Expected reply: `PASS` / `FAIL: …` / `PASS WITH NOTES: …`  
Production deploy forbidden without explicit approval.

---

## Human Checkpoints Anticipated

- [ ] Manual AI Review reprocess after optional `fresh-prints-dev` Functions soft-deploy
- [ ] Production deploy — not in this phase
- [ ] Resume parked `brand-logo-uploads` manual checkpoint after this goal closes (or when owner redirects)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-rejecting legitimate titles that mention “design” because it is printed | Medium | Only reject boilerplate openings / prose shape; allow printed words present in readable lines |
| Subject append invents franchise names | Medium | Prefer model/subject when confident; allow Minnie only when evidence supports; fixtures prefer `Mouse Ears` |
| Removing first-sentence fallback leaves empty titles | High | Require structured lines or guarded quote/`text reads` extraction; fall back to usable non-prose candidate or prior no-text visual path — never prose sentence |
| Lean JSON field ignored by older prompts | Low | Guarded description extraction still required; prompt bump + auto-upgrade previous defaults |
| Regress Sarcasm / apostrophe fixes | High | Keep prior fixtures mandatory in test run |

---

## Rollback Plan

Revert prompt template + version + title-rule / lean parse changes; redeploy Functions. No data migration.

---

## Documentation Updates Required

- [ ] DECISIONS.md (ADR-FP-113 amendment or short ADR)
- [ ] BACKEND.md (prompt version if stale)
- [ ] CURRENT-STATE.md + workflow state
- [ ] Other: plan / review / test report / signoff; manual checkpoint doc

---

## Open Questions

- [x] None blocking — prefer `Mouse Ears`; allow `Minnie Mouse Ears` only when property is identified confidently (acceptance criteria).
- [x] Do not persist `readableTextLines` on `aiSuggestions` unless a later plan revises the contract.

---

## Acceptance Criteria

- [ ] `BEST CHRISTMAS EVER` + mouse ears → `Best Christmas Ever Mouse Ears` (Minnie variant OK if confident)
- [ ] Title never begins with `The Design Features` / listed boilerplate
- [ ] Title never copies the first sentence of the description
- [ ] Meaningful visible wording included when description or structured response identifies it
- [ ] Color/font/outline/position/styling language excluded unless printed
- [ ] Description boilerplate rejected case-insensitively
- [ ] Existing Sarcasm completeness + apostrophe/contraction cases remain fixed
- [ ] Genuine no-text designs still get concise visual titles; genuine one-word may remain one word
- [ ] Category, tags, description behavior do not regress
- [ ] Finalization centralized; used by initial processing, Reprocess, playground, retries, customer-upload promotion

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-22-ai-text-title-completeness-regression-review.md
- Verdict: **approved**
