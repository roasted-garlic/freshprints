# Signoff — AI Processing / Playground Enrichment Parity

- **Date:** 2026-07-01
- **Goal slug:** `ai-processing-playground-parity`
- **Status:** PASS (local) — Firebase Functions deploy remains a human checkpoint
- **Plan:** `docs/workflow/plans/2026-07-01-ai-processing-playground-parity-plan.md`
- **Test report:** `docs/workflow/reviews/2026-07-01-ai-processing-playground-parity-test-report.md`

## What changed and why

The Settings AI Playground and AI Processing already shared the same prompt builders, image prep,
model/reasoning, and request shape. The Playground looked better only because it returns raw model
output unparsed, whereas AI Processing ran **legacy v16 rich-schema resolvers** on the v17 lean
5-field response. Starved of `visibleText`/`theme`/etc., those resolvers degraded good output:
they rewrote a clean title into an OCR fragment derived from the transcribed-quote description, and
could remap `Family` toward `Pop Culture & Characters`.

Fix (narrow, as approved):
- `simpleCatalogEnrichmentResponse.ts` — lean path now trusts the model: `resolveLeanCatalogTitle`
  (non-destructive, tags-only fallback, never description-derived), `resolveLeanCatalogCategory`
  (exact-match ID resolution only, no keyword remap), and description pass-through
  (`sanitizeCatalogDescription` + cap, no synthesis).
- `catalogTitleRules.ts` — added `resolveLeanCatalogTitle`; existing rich-schema
  `resolveCatalogTitle`/`resolveCatalogCategory`/`resolveCatalogDescription` left intact for the dev
  provider and their tests.
- The tag path (`resolveAiCatalogTags`) is unchanged — it is the one legitimately Processing-specific
  transform (mapping to the approved library).
- No prompt-text change, no schema change, no lifecycle/status change.

## Acceptance criteria

- [x] Root cause identifies the exact divergence (legacy resolvers on lean schema).
- [x] Prompt parity proven by test.
- [x] AI Processing no longer rewrites good titles into OCR fragments.
- [x] Motherhood sample: title preserved (`Motherhood Skeleton Rock On`) — test.
- [x] Motherhood sample: description retains all readable text — test.
- [x] Motherhood sample: category resolves to `Family` — test.
- [x] Motherhood sample: no new `rock` tag when an approved tag/alias covers it — test.
- [x] Tests added for title preservation, category no-flip, visible-text preservation, tag reuse,
      prompt parity, and `suggestedNewTags` retention.
- [x] Existing AI tests still pass (except 2 pre-existing, unrelated provider-default failures —
      documented in the test report).
- [x] `npm run lint`, `npx tsc --noEmit` (root + functions), functions build, `npm run build` pass.
- [x] Manual QA steps documented.

## Deploy / human checkpoint

- No Firebase deploy, Functions deploy, Firestore rules change, secret change, seed write, or
  environment change was performed.
- **Firebase Functions deploy + authenticated Playground/AI-Review smoke remain pending human
  approval.** The parity fix takes effect in production only after that deploy.

## Follow-up noted (not in this scope)

- `resolveAiEnrichmentProvider.test.ts` has 2 pre-existing failures (`'google' !== 'openai'` default
  provider) from earlier uncommitted config changes. Recommend a separate small phase to reconcile
  the provider-default expectation with the current config.
