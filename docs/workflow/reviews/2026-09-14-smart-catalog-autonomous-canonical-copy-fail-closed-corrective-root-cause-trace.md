# Root-cause trace — DEV Autonomous catalog-copy loss

Date: 2026-09-14
Environment: `fresh-prints-dev` (read-only evidence)
Corrective: `2026-09-14-smart-catalog-autonomous-canonical-copy-fail-closed-corrective`

## Affected-record comparison

| Design | Autonomous persisted candidate / Smart Profile | Autonomous root at Ready | Publication |
|---|---|---|---|
| `coiXzQDhJBKBVB1dFVZT` | v39 title `Wildflowers Don't Care Where They Grow Floral`; non-empty description; active `Floral & Nature`; Smart Profile present/searchable | title `b41e81c7d8`; description/category missing | Algolia mirrored malformed root |
| `nff6PpkZF9TNitnpX2Mm` | v39 title `Boston Terrier Floral Bow Tie Portrait`; non-empty description; active `Animals`; Smart Profile present/searchable | title `343 Boston Terrier`; description/category missing | Algolia mirrored malformed root |
| `1Ws0T9fivryest6IUSbt` | v39 title `Just Hit It Weed Logo`; non-empty description; active `Cannabis & 420`; Smart Profile present/searchable | title `just_hit_it`; description/category missing | Algolia mirrored malformed root |

The root values are import placeholders or missing values, while the candidate and Smart Profile
values are complete. Reprocessing preserves the roots and invokes the same queue pipeline, so the
same mismatch is reproducible from the current DEV data.

## Transition proof

1. **Provider result → normalized candidate.** `aiEnrichmentCandidateCore.ts` calls the configured
   provider, parses/normalizes v39 output, validates title/description, resolves the category from
   the active taxonomy, and builds the Smart Profile. Historical Shadow raw artifacts record valid
   AI copy/category and `wouldAutoApprove=true` for the same import-root pattern.
2. **Candidate → authority merge.** `markAiSuccess` merges Smart Profile/import presets and then
   re-evaluates the automation decision from the candidate fields. The import contract documents
   the source filename as an upload placeholder, not catalog authority.
3. **Authority/decision → persistence (the loss).** Before this corrective, the queue transaction
   wrote lifecycle fields, `aiSuggestions`, `aiAnalysis`, and `smartProfile`, but omitted root
   `title`, `description`, and `categoryId`. Imported roots therefore survived while the decision
   still marked the design Ready/system-approved.
4. **Persistence → publication.** The Algolia record builder/sync reads root catalog fields, so
   publication faithfully indexed the malformed title/blank description/unknown category.

The source-level transition is mechanically fixed: the corrected `markAiSuccess` resolves final
copy after authority merge, independently validates the candidate, retains candidate hard blockers,
and writes the resolved root fields atomically with Queue Ready/system approval. If final copy is
invalid, it writes no system approval and routes Needs Review. Health telemetry observes the guarded
post-persistence result and is fail-soft.

## Shadow-vs-Autonomous evidence boundary

Historical Shadow artifacts contain the valid provider-derived title, description, category, Smart
Profile, and approval decision alongside the stale root fields. A current same-design DEV example
(`03cbj1cIFH7Bavt38XBX`) retains Shadow title `Michael Jackson Dancing Silhouette`, valid description,
and `Pop Culture & Characters`; its current v39 Autonomous candidate is `Dancing Icon Watercolor
Splash` with a 305-character description and the same active category, while root title `(4)`
remains only because the corrected Function has not yet been promoted.

The deployed diagnostic mode intentionally uses `captureFullTrace=false`, so no full provider
payload or image bytes were persisted for the affected IDs. Provider→candidate validity is therefore
grounded in the bounded persisted candidate/provenance fields, historical Shadow raw artifact, and
the source call graph—not an invented raw-provider payload. Live post-fix same-design replay awaits
DEV Function promotion.
