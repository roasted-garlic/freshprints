# Plan: AI Prompt Approved Taxonomy Context

## Goal

Make AI Processing use the full approved taxonomy before deploy:

* active category names plus descriptions
* approved tag names plus aliases and `preferredWhen`
* strict category selection from approved categories
* approved tag selection by canonical name or alias
* complete suggested-new-tag objects only when no approved tag is relevant enough

This phase must happen before `AI Processing deploy and authenticated smoke verification` so deploy smoke validates the final prompt behavior.

## Scope

In scope:

* Enrich the AI prompt replacement for `{{approved_categories}}` and `{{approved_tags}}`.
* Update the default AI Processing prompt template to explicitly instruct the model how to use category descriptions, tag aliases, and `preferredWhen`.
* Extend the simple catalog response parser to accept `suggestedNewTags` with `name`, `aliases`, `preferredWhen`, and optional `reason`.
* Preserve server-side enforcement:
  * AI may only persist a category that resolves to an active category.
  * AI may only persist approved tags after matching approved tag name or alias.
  * unmatched tags/suggestions remain suggested-new-tags only; no auto-create.
* Improve suggested-new-tag normalization so suggestions are complete and compatible with the existing AI Review approval UI.
* Add targeted tests for prompt formatting, parser behavior, category resolution, tag alias matching, and suggested-new-tag validation.
* Update durable docs to reflect the richer taxonomy context.

Out of scope:

* Firebase deploys, Functions deploys, rules deploys, index deploys, or seed writes.
* Changing OpenAI secrets, environment variables, or Secret Manager.
* Changing AI Review approval UI beyond what is required to consume existing `suggestedNewTags`.
* Creating categories or tags automatically.
* Migrating or backfilling existing design tags.
* Phase 7, Portal, checkout, shipping, payment, or ecommerce work.

## Current Finding

Current implementation fills:

* `{{approved_categories}}` with category names only
* `{{approved_tags}}` with tag names only

Current implementation does **not** pass:

* category descriptions
* tag aliases
* tag `preferredWhen`

The backend can normalize AI output against approved tag aliases, but the AI does not currently see those aliases in the prompt. Suggested-new-tags are currently produced by fallback logic with empty aliases and a generic `preferredWhen`, not by a complete AI suggestion contract.

## Proposed Implementation

### 1. Runtime Taxonomy Loading

Update Functions runtime cache for active categories to keep structured category metadata:

```ts
{
  categories: Array<{ id: string; name: string; description?: string }>;
  names: string[];
  idsByName: Record<string, string>;
}
```

Keep approved tags as existing `CatalogTag[]` records so `aliases` and `preferredWhen` are available to the prompt formatter.

### 2. Prompt Context Formatting

Create small formatter helpers in the AI functions layer, for example:

```txt
Categories:
- Occasions — Use for designs made for life events, parties, milestones...

Tags:
- airforce | aliases: air force | preferred when: Use when airforce or closely related ideas...
```

Formatting rules:

* Keep names exact so the AI can return exact category/tag strings.
* Include aliases only when present.
* Include `preferredWhen` for every tag.
* Keep output stable and deterministic for tests.
* Sort by existing loaded order/name only if needed for deterministic output.

### 3. Default Prompt Template

Update `DEFAULT_AI_ENRICHMENT_PROMPT_TEMPLATE` so it tells the model:

* choose exactly one approved category
* use category descriptions to decide between similar categories
* choose approved tags first, using tag names, aliases, and `preferredWhen`
* return approved tag names, not aliases, whenever possible
* only suggest a new tag when the approved list does not contain a relevant name or alias
* suggested-new-tags must include:
  * `name`
  * `aliases`
  * `preferredWhen`
  * `reason`

Planned JSON contract:

```json
{
  "description": "...",
  "category": "exact approved category name",
  "title": "...",
  "tags": ["approved_tag_name"],
  "suggestedNewTags": [
    {
      "name": "newtag",
      "aliases": ["alias"],
      "preferredWhen": "Use when ...",
      "reason": "Why no approved tag was enough."
    }
  ]
}
```

### 4. Parser And Normalization

Extend `simpleCatalogEnrichmentResponse.ts` to parse optional `suggestedNewTags`.

Rules:

* Reject missing required base fields (`description`, `category`, `title`, `tags`) as today.
* Normalize suggested tag names and aliases consistently with catalog tag rules where practical.
* Require non-empty `preferredWhen` for accepted suggested tags.
* Drop suggested tags that match an approved tag name or alias after resolver validation.
* Cap suggested tags to a small number, for example 5, to avoid noisy AI output.

### 5. Server-Side Enforcement

Keep the model as advisory only:

* Category: resolve to active category by exact name first; fallback remap may remain, but final stored `categoryId/categoryName` must be active and approved.
* Tags: run through `resolveAiCatalogTags` using approved names and aliases.
* Suggested tags: merge parser-provided `suggestedNewTags` with unmatched tag candidates only when no approved match exists.
* Do not auto-create approved tag documents.

### 6. Tests

Add or update targeted tests:

* prompt builder includes category descriptions
* prompt builder includes tag aliases and `preferredWhen`
* parser accepts complete `suggestedNewTags`
* parser drops invalid/incomplete suggested tags
* resolver maps aliases to approved names
* resolver does not suggest a new tag when the suggested name/alias matches an approved tag
* pipeline/provider tests still pass the enriched prompt context into OpenAI request body

Expected commands after implementation:

```powershell
npx tsx --test functions/src/ai/simpleCatalogEnrichmentResponse.test.ts functions/src/ai/catalogTagResolver.test.ts functions/src/ai/providers/openAiVisionEnrichmentProvider.test.ts
npx tsc --project functions/tsconfig.json --noEmit
cd functions; npm run build
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

## Architecture Impact

Layer ownership:

* Cloud Functions AI layer owns prompt context formatting, parser validation, and AI output normalization.
* Firestore remains the source of category/tag metadata.
* Renderer AI Review continues to display and approve suggested-new-tags through the existing UI.

No renderer Firebase access changes are planned.

## Data Model Impact

No new Firestore fields are required.

Existing models used:

* `Category.description`
* `CatalogTag.aliases`
* `CatalogTag.preferredWhen`
* `DesignAiSuggestions.suggestedNewTags`
* `SuggestedNewTag`

Documentation may need to clarify that AI suggested-new-tags should be complete objects when supplied by the model.

## Firebase Impact

No rules, indexes, deploys, seed writes, or migrations are in scope.

Functions read existing `categories` and `tags` collections through Admin SDK runtime cache as they already do.

## Security Considerations

* OpenAI key remains server-side only.
* Renderer still does not receive provider secrets.
* AI output is untrusted and validated before persistence.
* AI never creates approved tag/category records automatically.
* Owner/admin approval remains required for suggested-new-tags.

## UI Considerations

No major UI changes are planned. Existing AI Review suggested-new-tag approval UI should continue to work with richer suggested objects.

## Risks

| Risk | Mitigation |
| --- | --- |
| Prompt becomes too large with many approved tags | Use compact deterministic formatting; add tests around formatting and document prompt-size risk before deploy smoke |
| AI returns aliases instead of canonical tag names | Server resolver maps aliases to canonical approved names |
| AI suggests duplicates of approved tags | Resolver filters suggested tags against approved names and aliases |
| AI picks no category or wrong category | Parser still requires category; resolver stores only active approved category matches |
| Suggested tags are noisy | Cap suggested tag count and require complete objects |

## Human Checkpoints

Implementation requires user approval of this plan.

No deploy or external action is approved by this plan. The deploy/smoke phase remains separate.

## Success Criteria

* OpenAI prompt includes category descriptions and tag alias/preferred-when context.
* AI response contract supports complete suggested-new-tags.
* Stored design suggestions contain one active category when the model provides a valid approved category.
* Stored tags are approved canonical tag names only.
* Suggested-new-tags are complete, deduped, and not duplicates of approved names/aliases.
* Targeted tests, typecheck, lint, and build pass or failures are documented.
