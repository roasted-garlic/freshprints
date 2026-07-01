# Signoff — Lean Vision Prompt + Server-Side Taxonomy Resolution

- **Date:** 2026-07-01
- **Goal slug:** `ai-lean-vision-prompt-server-taxonomy-resolution`
- **Status:** PASS
- **Plan:** `docs/workflow/plans/2026-07-01-ai-lean-vision-prompt-server-taxonomy-resolution-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-01-ai-lean-vision-prompt-server-taxonomy-resolution-test-report.md`
- **ADR:** ADR-FP-039 in `docs/project/DECISIONS.md`

## What changed

- Replaced the taxonomy-aware AI Processing prompt with a small, fixed-size, vision-only prompt
  (`catalog-enrich-openai-v18` / `catalog-enrich-dev-v18`). The model no longer receives the full
  approved category list or full approved tag list; it returns only `title`, `description`, a
  freeform `category` theme candidate, and up to 12 tag candidates (phrases allowed).
- `AI_ENRICHMENT_REQUIRED_PROMPT_PLACEHOLDERS` shrank to `{{excluded_tags}}` only.
  `formatCategoryContext`/`formatTagContext` were kept (not removed) so an owner-edited legacy
  template still containing `{{approved_categories}}`/`{{approved_tags}}` keeps working.
- Added `functions/src/ai/catalogThemeCategoryResolver.ts`: a new deterministic server-side
  category resolver that scores every approved category using token overlap against its
  name+description versus the raw model category candidate, title, description, visible text, and
  matched approved tags — with priority boosts for family/parenting, faith, and teacher/school
  buyer-intent themes that can outweigh a raw candidate naming an unrelated category. Generic
  art-style tokens (skeleton, cartoon, mascot) do not by themselves count toward a pop-culture
  category, and a bare "quote" token does not by itself count toward a humor category.
- Removed `resolveLeanCatalogCategory` (exact-match-only). The raw model category now flows only as
  a transient `DesignAiAnalysis.rawCategory` scoring signal, never persisted directly; it is deleted
  before the Firestore write, matching the existing `rawTags` pattern.
- Re-sequenced `aiEnrichmentPipeline.ts` so category resolution runs after tag resolution, using
  the resolved approved tags as an additional category-scoring signal.
- `catalogTagResolver.ts` now safely reduces unmatched multi-word candidates (e.g. "messy bun") to
  a clean single-word suggested tag name with the original phrase retained as an alias, or drops
  the candidate entirely when no safe single-word reduction exists — never persists a suggested
  tag `name` containing a space.
- Fixed a renderer Settings prompt-template validation message (`SettingsPage.tsx`) that still
  hardcoded the retired placeholders, and one provider test that still asserted the old taxonomy
  injection behavior.
- Updated `docs/project/DECISIONS.md` (ADR-FP-039), `project-chatgpt-handoff/07-backend-and-ai-pipeline.md`,
  and `project-chatgpt-handoff/CURRENT-STATE.md` for the v18 architecture.

## Review round 1 notes — verification

1. Golden regression test: raw category `"Humorous Quotes"` with matched tags
   `motherhood`/`skeleton`/`quote` resolves to `Family`. **Covered and passing.**
2. Raw model category is transient input only; `categoryName`/`categoryId` are left undefined
   (never the raw string) when no approved category clears the confidence threshold. **Covered and
   passing** at both the `buildSimpleCatalogEnrichmentResult` and `resolveThemeCategory` layers.
3. Family/faith/teacher priority boosts compete against every approved category, including
   whatever the raw candidate names, so they can override a raw `"Humorous Quotes"`/
   `"Pop Culture & Characters"` candidate without a hardcoded string override. **Covered and
   passing.**
4. Server-generated `suggestedNewTags` names are always safe single-word reusable tags; phrase
   candidates are reduced, matched, or dropped — never persisted with a spaced name. **Covered and
   passing.**
5. Owner-edited legacy prompt templates containing the retired placeholders still build and
   substitute correctly. **Covered and passing.**

## Verification

- 159/159 `functions/src/ai` + provider unit tests passed.
- `npx tsc --noEmit` (root) passed.
- `npm run lint` (root) passed.
- `npm run build` (functions) passed.
- `npm run build` (root, incl. Vite + Electron packaging) passed.
- `git diff --check` passed (only benign LF/CRLF warnings).

## Scope boundaries

No Firebase Functions deploy, secrets, environment variables, or Firestore rules changes. No data
migration or backfill. No design lifecycle status changes. No new dependencies. No changes to
Imports, Design Library, Print Requests, or Print Runs. No additional model call for taxonomy
matching. No embeddings. No automatic category creation from AI output.

## Outstanding human checkpoint

Firebase Functions deploy and authenticated AI Processing / AI Review / Settings smoke
verification remain a human checkpoint and were not performed in this phase.

## Next recommended phase

Request Firebase Functions deploy + smoke verification when ready, or return to
`print-request-query-index-hardening` for the next Phase 6 code priority.
