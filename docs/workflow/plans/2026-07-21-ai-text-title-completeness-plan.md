# Plan: AI text title completeness

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-ai-text-title-completeness-review.md |
| Goal id | `ai-text-title-completeness` |

---

## Goal

Fix AI-generated catalog titles so text-dominant designs use the complete readable phrase (including contractions/apostrophes), while leaving accurate descriptions, categories, and tags unchanged.

## Background

Phase 5 lean Gemini enrichment already asks for full readable text in titles (`DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, prompt version **`catalog-enrich-v24`** — not v21 as named in the intake note). Observed Studio AI Review failures still occur:

| Visible text | Actual title | Expected |
|---|---|---|
| `Sarcasm` / `Just one of my many talents` | `Sarcasm` | `Sarcasm Just One of My Many Talents` |
| `I'M NOT ARGUING,` / `I'M JUST EXPLAINING` / `RIGHT!` | `I` | `I'm Not Arguing, I'm Just Explaining Right` |
| `I'M FINE` / `THE REST OF YOU` / `NEED THERAPY` | `I` | `I'm Fine The Rest of You Need Therapy` |

This is maintenance of existing AI enrichment / AI Review — not a new roadmap feature. Do not reopen provider selection, tag reranking, or category architecture.

### Investigation findings (repo check, 2026-07-21)

Traced title through: raw JSON → `extractJsonObject` → `normalizeSimpleCatalogEnrichment` → `resolveLeanCatalogTitle` → `aiSuggestions.title`.

| Stage | Finding |
|-------|---------|
| `extractJsonObject` | Straight and curly apostrophes inside double-quoted JSON strings survive. Not the cause of `I`. |
| `normalizeCatalogTitle` | Preserves mid-token apostrophes (`I'm` → `I'm`). Not the cause of `I`. |
| Studio display | Renders `aiSuggestions.title` as stored — no truncation found on the display path for this bug. |
| Prompt | Already says text-dominant titles must be the **full readable text**. Does **not** mention contractions, description/title agreement, or “larger first line ≠ full title.” |
| `resolveLeanCatalogTitle` | **Trusts** non-generic model titles. `"I"` and `"Sarcasm"` are considered usable → **no description fallback**. Primary code cause for incomplete titles when the model under-titles. |
| `extractPrimaryWordingFromDescription` | Regex `'([^']+)'` treats contraction apostrophes as quote delimiters. Unquoted `"I'm not arguing, I'm just explaining right."` extracts **`M Not Arguing I`**. Must fix before relying on description fallback. |

**Root-cause split (required by acceptance):**

1. **Model-output failures:** Incomplete titles (`Sarcasm`, likely `I`) while description already has the full phrase — prompt under-specification + model preference for the visually dominant first line / truncation at `I'M`.
2. **Post-model code failures:** (a) no completeness safeguard when a short title disagrees with multiword readable wording in the description; (b) description-wording extractor corrupted by contraction apostrophes (latent until fallback runs).

Do not assume all three observed failures share one cause; both prompt and code paths are in scope.

---

## Scope

### In Scope

- Smallest effective change to `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` (+ previous-default auto-upgrade + prompt version bump per repo convention)
- `extractPrimaryWordingFromDescription` apostrophe/quote handling
- Narrow `resolveLeanCatalogTitle` completeness validation / description fallback
- Focused regression tests (required fixtures listed below)
- Plan / review / test / signoff / ADR / CURRENT-STATE updates
- Manual AI Review reprocess checklist (dev Functions deploy remains human)

### Out of Scope

- Provider/model changes, OCR services
- Category resolution, tag matching/reranking redesign
- Description quality changes beyond compatibility with extraction
- Design Library approval lifecycle, Portal print requests, Phase 9
- New packages, production deploy
- Broad AI enrichment redesign
- Changing the persisted `aiSuggestions` field contract (stop if that becomes required)

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/constants/aiEnrichment.constants.ts` — default prompt + previous-default recognition
- `functions/src/ai/catalogTitleRules.ts` — extraction + lean title resolution; `CATALOG_ENRICHMENT_PROMPT_VERSION` bump
- `functions/src/ai/catalogTitleRules.test.ts` — regression fixtures
- `functions/src/ai/simpleCatalogEnrichmentResponse.test.ts` — end-to-end lean result cases as needed
- `docs/project/DECISIONS.md` — short ADR
- `docs/architecture/BACKEND.md` — prompt version note if it still cites an older version
- Workflow artifacts + `references/project-chatgpt-handoff/CURRENT-STATE.md`

### Architecture Impact

- [x] None (same lean pipeline layers; service-side title resolution only)

### Security Impact

- [x] None (no auth/rules/secrets; no permanent logging of customer artwork text)

### Data Model Impact

- [x] None (same `aiSuggestions.title` string; no schema/migration)

### Backend Impact

- [x] Details: Cloud Functions AI enrichment path only; prompt version bump; Settings saved default auto-upgrade via existing `isPreviousDefaultAiEnrichmentPromptTemplate`

### UI / UX Impact

- [x] Details: Studio AI Review shows better titles after reprocess; no UI code changes expected. Manual reprocess checkpoint after optional `fresh-prints-dev` Functions deploy.

### Migration Impact

- [x] None for persisted docs. Existing designs keep old titles until reprocessed. Saved Studio prompt templates that match the prior shipped default auto-upgrade; custom prompts are left alone.

---

## Approach

1. **Prompt (smallest effective edit)** on `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`:
   - Description and title must agree on readable wording.
   - Text-dominant: title = complete readable phrase from the description (not only the largest/first line).
   - Contractionsions (`I'm`, `Don't`, etc.) stay intact.
   - Decorative visuals do not get an appended title word (already partially covered — keep/clarify without bloating).
   - Move current default into `PREVIOUS_DEFAULT_…` and register in `isPreviousDefaultAiEnrichmentPromptTemplate`.
   - Bump `CATALOG_ENRICHMENT_PROMPT_VERSION` / `DEVELOPMENT_…` (e.g. `catalog-enrich-v25`).

2. **Fix `extractPrimaryWordingFromDescription`:**
   - Prefer double-quoted phrases only for quote extraction **or** otherwise avoid matching apostrophes inside contractions (straight + curly).
   - First-sentence / slash-joined readable wording path must preserve contractions.
   - Confirm description formats used by lean prompt (quoted phrase vs leading transcription) before fallback logic.

3. **Completeness safeguard in `resolveLeanCatalogTitle` (narrow):**
   - After normalizing the candidate, detect **suspicious** incompleteness vs description wording, then prefer description-derived title when that wording is usable.
   - Suspicious examples (implement conservatively):
     - Title is one character / one short token while description identifies a multiword text phrase.
     - Title ends immediately before an apostrophe/contraction boundary present in description wording.
     - Title matches only the first line/token of a longer readable phrase in the description.
   - **Do not** expand a genuinely complete one-word title when description has no longer matching phrase.
   - **Do not** blindly replace every title from the description (preserve mixed-content titles like `Motherhood Skeleton Rock On`).

4. **Tests** for all required fixtures + existing lean regressions (Motherhood / style-word replacement).

5. **Docs:** ADR + BACKEND prompt-version touch if needed; manual checklist in test report / signoff.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| AI unit tests | `npx tsx --test functions/src/ai/*.test.ts` | yes |
| Functions build | `npm --prefix functions run build` | yes |
| Lint | `npm run lint` | yes |
| Diff check | `git diff --check` | yes |
| Shared prompt tests (if present) | `npx tsx --test` on affected shared/settings prompt tests | yes if touched |

### Required regression fixtures

1. Straight apostrophe: `I'm Fine The Rest of You Need Therapy`
2. Curly apostrophe: `I’m Fine The Rest of You Need Therapy`
3. Repeated contractions: `I'm Not Arguing, I'm Just Explaining Right`
4. Headline + continuation: `Sarcasm Just One of My Many Talents`
5. Text-dominant + decorative icons: `Kinda Give A Damn Kinda Don't Care`
6. Text + meaningful subject: `Just A Little Moody Cow`
7. No-text: literal 5–7 word visual title trusted
8. Valid short one-word title: not auto-expanded when complete

### Manual

- [ ] Owner checklist: reprocess supplied designs in Studio AI Review after optional `fresh-prints-dev` Functions deploy
- Expected reply: `PASS` / `FAIL: …` / `PASS WITH NOTES: …`
- Production deploy forbidden without explicit approval

---

## Human Checkpoints Anticipated

- [ ] Manual AI Review reprocess (after optional dev Functions deploy)
- [ ] Production deploy — not in this phase
- [ ] Business logic — only if completeness heuristics would change intentional short titles; otherwise follow fixtures above

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Over-eager description fallback rewrites good short titles | Medium | Gate on suspicious incompleteness + multiword description phrase; fixture #8 |
| Apostrophe quote regex breaks fallback | High | Fix extractor first; test unquoted multi-contraction descriptions |
| Custom Studio prompts skip new title rules | Low | Auto-upgrade only previous shipped defaults; note in signoff |
| Prompt bloat | Low | Smallest additive bullets; avoid rewriting description/tag sections |

---

## Rollback Plan

Revert prompt template + version constant + `resolveLeanCatalogTitle` / extractor changes; redeploy Functions. No data migration.

---

## Documentation Updates Required

- [ ] DECISIONS.md (ADR)
- [ ] BACKEND.md (prompt version if stale)
- [ ] CURRENT-STATE.md + workflow state
- [ ] Other: workflow plan/review/test/signoff

---

## Open Questions

- [x] None blocking — short one-word titles stay when description does not show a longer matching phrase (fixture #8).
- Note: intake said “if #12 still active, stop before switching goals.” **Workflow is idle** (`DONE: yes`); safe to run this managed goal without parking interruption.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-ai-text-title-completeness-review.md
- Verdict: pending
