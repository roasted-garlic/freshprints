# Signoff — Business-Context Prompt Line (DTF Apparel Framing, v21)

- **Date:** 2026-07-02
- **Goal slug:** `ai-business-context-prompt`
- **Status:** PASS (implementation + local verification; deploy and live model smoke remain separate human checkpoints)
- **Plan:** `docs/workflow/plans/2026-07-02-ai-business-context-prompt-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-02-ai-business-context-prompt-test-report.md`
- **ADR:** ADR-FP-044 in `docs/project/DECISIONS.md`

## What changed

- Added the approved business-context paragraph to the start of
  `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE`, before the field instructions, framing the model as
  cataloging DTF transfer designs for an apparel print shop.
- The paragraph instructs the model to judge category, title, and tags by the design's subject,
  message, joke, buyer intent, occasion, role, or theme rather than by visual style, font choice,
  color palette, or decorative imagery.
- Bumped `CATALOG_ENRICHMENT_PROMPT_VERSION` to `catalog-enrich-v21` and
  `DEVELOPMENT_CATALOG_ENRICHMENT_PROMPT_VERSION` to `catalog-enrich-dev-v21`.
- Added prompt-content regression coverage asserting the DTF/apparel framing is present and appears
  before the `Return:` field block.
- Updated ADR/handoff docs for the v21 prompt state.

## Verification

- 50/50 focused prompt/version/settings tests passed.
- 413/413 full repo tests passed.
- `npx tsc --noEmit` at the repo root passed.
- `npx tsc --noEmit` in `functions/` passed.
- `npm run lint` passed.
- `npm run build` in `functions/` passed.
- `npx vite build` passed for renderer plus Electron main/preload bundles.
- `git diff --check` passed with only standard Windows LF/CRLF warnings.

## Scope boundaries

- No Firebase Functions deploy was performed.
- No Firestore rules, seed data, migration, category data, tag data, secrets, or external service
  setup were changed.
- No changes were made to `catalogThemeCategoryResolver.ts`, `catalogTagResolver.ts`, the tag
  reranker, or suggestion authoring.
- Owner-edited custom prompt templates remain unaffected; this changes only the shipped default
  prompt template.

## Outstanding human checkpoints

1. **Firebase Functions deploy** is required before `catalog-enrich-v21` is live in any environment.
   Do not deploy without explicit human approval.
2. **Post-deploy live model smoke:** after deploy, re-run AI on the reported "Lashes longer than my
   Patience" design and confirm it lands in a humor/quote-appropriate category rather than
   `Luxury & Fashion Inspired`, and that title/tags no longer invent beauty/makeup/fashion framing.

## Result

Signed off locally. The phase is complete from plan through implementation, test, and signoff; live
production behavior still depends on the separate deploy checkpoint.
