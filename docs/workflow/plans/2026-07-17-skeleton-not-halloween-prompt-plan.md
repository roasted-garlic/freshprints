# Plan: Skeletons alone must not tag Halloween

| Field | Value |
|-------|-------|
| Date | 2026-07-17 |
| Author | Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-17-skeleton-not-halloween-prompt-review.md |

---

## Goal

When catalog AI enrichment analyzes images with **skeletons / skulls / bones alone**, it must **not** assign a **Halloween** tag (or prefer Halloween as a seasonal theme tag) unless the image also has **clear additional Halloween cues**. Legitimate Halloween art that includes skeletons plus other holiday signals must still be allowed.

## Background

Owner report: skeleton artwork is being tagged Halloween too aggressively. Repo inspection found explicit bad guidance in the legacy tag-exclusion prompt section:

`functions/src/ai/aiTagExclusions.ts` → `buildTagExclusionPromptSection`:

> For skeleton or skull artwork, prefer tags like skeleton, bones, spooky, **halloween**, …

The active lean Gemini path (`DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` in `packages/shared/src/constants/aiEnrichment.constants.ts`) does **not** include that sentence, but also has **no** Halloween guard — models still often infer Halloween from skeletons. There is currently **no** post-process strip for Halloween.

Pipeline path today: `enqueueAiEnrichment` → `runAiEnrichmentPipeline` → Gemini lean prompt (`buildSimpleCatalogEnrichmentUserPrompt`). Playground shares the same builders.

## Scope

### In Scope

- Rewrite skeleton guidance in `buildTagExclusionPromptSection` so Halloween is **not** preferred for skeleton/skull alone; require additional Halloween cues.
- Add the same rule to `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` (Rules section).
- Add a small deterministic post-filter that removes `halloween` from model tag candidates when the design text/tags only show skeleton/skull/bones-style signals and lack supporting Halloween cues (covers stubborn models + custom Firestore prompt templates that omit the new default wording).
- Unit tests for prompt section wording + post-filter keep/strip cases.
- Document redeploy command for `fresh-prints-dev` (no production deploy).

### Out of Scope

- Production deploy
- Changing base tag exclusions list (do **not** exclude `halloween` globally — it remains valid when warranted)
- Changing approved tag library seed / Studio tag `preferredWhen` copy unless already in Functions path
- Category taxonomy redesign (optional light note only if Halloween is an approved **category** name and exact-match trusts it — prefer prompt + tag strip first; do not expand into category resolver unless trivial)
- Re-enrichment of all existing designs (owner re-runs AI on samples)
- Commits unless asked

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/ai/aiTagExclusions.ts` — prompt section rewrite
- `functions/src/ai/aiTagExclusions.test.ts` — assert new wording; no “prefer … halloween”
- `packages/shared/src/constants/aiEnrichment.constants.ts` — default lean prompt Rules line
- `functions/src/ai/halloweenTagGuard.ts` (new) — pure helper: should strip / filter halloween
- `functions/src/ai/halloweenTagGuard.test.ts` (new)
- Wire filter into lean normalize path (`simpleCatalogEnrichmentResponse.ts` / `normalizeSimpleCatalogEnrichment`) and legacy `normalizeAiTags` call sites **or** call from `normalizeAiTags` with optional context (title/description) — prefer dedicated helper applied where title+description+tags are available so strip is context-aware
- `functions/src/ai/catalogTitleRules.test.ts` / prompt tests if they assert old skeleton sentence
- Workflow plan/review/test/signoff docs; brief Decision Log note; optional one-line ADR in `DECISIONS.md` if behavior is product-facing enough

### Architecture Impact

- [x] Details: Prompt + small pure post-process in AI enrichment layer only. No UI. No new dependencies.

### Security Impact

- [x] None (tag labeling only; no auth/rules/secrets)

### Data Model Impact

- [x] None (no schema change; future enrichment output differs)

### Backend Impact

- [x] Details: Cloud Functions AI enrichment / playground code paths. Redeploy to `fresh-prints-dev` required for live effect. Saved custom `settings/aiEnrichment.promptTemplate` may omit new default wording — post-filter covers that.

### UI / UX Impact

- [x] Details: AI Review tags only; manual sample re-run recommended.

### Migration Impact

- [x] None
- [x] Forward: Redeploy Functions; re-run AI on sample designs.
- [x] Rollback: Revert prompt/filter commit and redeploy same Functions.

---

## Approach

1. **Prompt (legacy section)** — Replace the skeleton preference sentence with guidance like:
   - Prefer `skeleton`, `bones`, `spooky`, `dance`, `retro`, … for skeleton/skull art — **never** `death` / `skull` (skull remains excluded).
   - Do **not** use `halloween` for skeleton, skull, or bones alone.
   - Use `halloween` only when additional Halloween cues are present (examples: jack-o’-lantern, witches, haunted house, visible “Halloween” text, candy corn, clear Halloween bat/cobweb holiday motif with other holiday cues). Do not over-block designs that are clearly Halloween.

2. **Prompt (lean default template)** — Add one Rules bullet mirroring the above so new/default settings get the guidance.

3. **Post-filter** — Pure function `filterUnsupportedHalloweenTags(tags, context)`:
   - Halloween cue tokens (examples): `halloween`, `jackolantern`, `jack-o-lantern`, `jack o lantern`, `witch`, `witches`, `haunted`, `candycorn`, `candy corn`, `trickortreat`, `trick or treat`, `cobweb`, `spiderweb`, `boo` (careful — optional), `pumpkin` **only with** carved/jack language or alongside other cues — prefer jack-o’-lantern / witch / haunted / halloween text over bare pumpkin to avoid harvest false positives.
   - Skeleton-only signals: `skeleton`, `skeletons`, `skull`, `skulls`, `bone`, `bones`, `skeletal`.
   - If tag list contains `halloween` (normalized) **and** context (joined title + description + tags + visibleText if present) has skeleton-only signals **and** lacks Halloween cues → remove `halloween` from tags/rawTags.
   - If Halloween cues present → keep.
   - If no skeleton signals → leave halloween alone (e.g. pumpkin+witch without skeleton).

4. **Apply filter** in `normalizeSimpleCatalogEnrichment` (and legacy parse path if it still produces tags used in prod) after exclusion filtering.

5. **Tests** — unit cases for strip vs keep; prompt section asserts.

6. **Deploy docs** — Prefer give owner the command; deploy to `fresh-prints-dev` only if Functions-only and standing AI-dev approval applies — plan default: **implement + provide command**; Decision Log records whether deploy was run.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit tests | `cd functions && npx tsx --test src/ai/aiTagExclusions.test.ts src/ai/halloweenTagGuard.test.ts src/ai/simpleCatalogEnrichmentResponse.test.ts src/ai/catalogTitleRules.test.ts src/ai/promptParity.test.ts` | yes |
| Typecheck/build | `cd functions && npm run build` | yes |
| Lint | project-level if quick | no |
| Integration / E2E | n/a | no |
| Backend/rules | n/a | no |

### Manual

- [x] Details: After `fresh-prints-dev` redeploy, re-run AI on (1) skeleton-only design → expect no Halloween tag; (2) skeleton + jack-o’-lantern / “Halloween” text → Halloween allowed. Playground or AI Processing both OK.

---

## Human Checkpoints Anticipated

- [ ] Manual UI/UX review (optional sample QA after deploy)
- [ ] Production deploy — **forbidden** this phase
- [x] Other: Prefer owner runs or agent runs **dev** Functions redeploy; no secrets in chat

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Custom Firestore prompt ignores default template change | Medium | Post-filter always runs |
| Over-strip real Halloween (skeleton + subtle holiday art) | Medium | Cue list + “clear Halloween” judgment in prompt; keep when any strong cue present |
| Bare “pumpkin” harvest designs | Low | Do not treat bare pumpkin as Halloween cue alone |
| Existing designs keep old tags | Low | Document re-run AI; no mass backfill |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the prompt/filter changes and redeploy `enqueueAiEnrichment` (+ `testAiEnrichmentPlayground` if used) to `fresh-prints-dev`.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md
- [ ] BACKEND.md — optional one-line under AI enrichment tagging notes if already documenting prompt rules
- [ ] TESTING.md
- [ ] DEPLOYMENT.md — optional note of Functions to redeploy for prompt changes
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — short ADR: skeleton alone ≠ Halloween
- [x] Other: plan / review / test report / signoff; workflow state

---

## Open Questions

- [x] None — product rule is clear from owner request

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-17-skeleton-not-halloween-prompt-review.md
- Verdict: pending

## Deploy note (for implement/signoff)

```bash
firebase deploy --only functions:enqueueAiEnrichment,functions:testAiEnrichmentPlayground --project fresh-prints-dev
```

(`updateAiEnrichmentSettings` not required unless owner resets prompt template via Settings.)
