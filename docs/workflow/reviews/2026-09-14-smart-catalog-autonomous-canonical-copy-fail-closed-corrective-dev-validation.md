# DEV Validation — Autonomous canonical-copy fail-closed corrective

Date: 2026-09-14
Environment: `fresh-prints-dev`
Plan: `2026-09-14-smart-catalog-autonomous-canonical-copy-fail-closed-corrective-plan.md`
Root-cause trace: `2026-09-14-smart-catalog-autonomous-canonical-copy-fail-closed-corrective-root-cause-trace.md`
Deployment record: `2026-09-14-smart-catalog-autonomous-canonical-copy-fail-closed-corrective-dev-deployment.md`

## Readback and evidence

DEV remains safely contained: `settings/aiEnrichment` reads
`catalogWorkflowMode=shadow`, `catalogAutonomousLiveEnabled=false`, and
`semanticReviewPlaygroundEnabled=false` (Pass 2 OFF). No production resource was mutated.

The initial read-only DEV inventory found 24 current system-reviewed evidence rows, of which 23
carried the current `catalog-enrich-v39` provenance used for the deterministic resolver run. A
later read-only inventory using the exact v39/v7 predicates found 37 rows (17 imported/pending and
20 Ready/approved); this broader count does not change the three malformed Ready examples:
`coiXzQDhJBKBVB1dFVZT`, `nff6PpkZF9TNitnpX2Mm`, and `1Ws0T9fivryest6IUSbt`. Each retains valid
v39 AI suggestions, active category IDs, and healthy Smart Profile data while the root
title/description/category is malformed. Algolia records mirror the malformed root values. The
resolver simulation maps each reviewed malformed row to the exact valid candidate title,
non-empty description, and active category that the corrected queue transaction will persist.

Same-design comparison is preserved by the Shadow artifacts and current DEV rows. For example,
`03cbj1cIFH7Bavt38XBX` had Shadow AI title `Michael Jackson Dancing Silhouette`, valid description,
and `Pop Culture & Characters` while root title was `(4)` and description length was zero; its
current v39 Autonomous candidate is `Dancing Icon Watercolor Splash` with a 305-character
description and the same active category. The root remains `(4)` because no live canary or
reprocess has been run after deployment. `nff6PpkZF9TNitnpX2Mm` and `1Ws0T9fivryest6IUSbt` show
the same candidate-good/root-bad transition with matching provider/model metadata.

## Automated validation

- Final catalog resolver tests: **6/6 pass**.
- Persistence/health source contract plus explicit-content regression: **16/16 pass**.
- Targeted decision, reprocess, Algolia, and shared catalog suites: **64/64 pass**.
- Functions TypeScript build: **pass**.
- Studio TypeScript check: **pass**.
- Targeted ESLint: **pass**.
- `git diff --check`: **pass**.
- Full Functions AI suite: **429/429 pass**. The stale
  `categoryDescriptionsPromptParity.contract.test.ts` normalizer-v6 expectation was updated to
  the current v39/v7 stack before this run.

## DEV Function promotion

The owner confirmed the Compute Engine API prerequisite was enabled. The reviewed narrow deployment
then succeeded for exactly three Functions: `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, and
`onCatalogReprocessJobWritten`. All three are ACTIVE on 100% latest traffic with common deployed
source label `516c7e41dcfefcffe978abc00a41dbd363b0e743`; exact before/after revisions and build IDs
are recorded in the deployment artifact. An independent read-only extraction of each current source
archive matched the reviewed local corrective files byte-for-byte.

## Deterministic bounded soak (pre-deploy)

Using the current DEV rows and active category snapshot, the pure final resolver was exercised for
1,000 sequential iterations across 23 rows (23,000 evaluations). Results: **0 invalid final
records, 0 placeholder titles, 0 missing descriptions, 0 unresolved categories**. This remains a
deterministic pre-live gate simulation, not a claim of live provider/Function soak. A follow-up
read-only run over the broader 37-row v39/v7 inventory covered 37,000 evaluations with the same
zero-invalid result and no reason codes. The deployed live canary and unattended soak still require
the owner-authenticated DEV control path.

## Owner-authenticated canary preflight (read-only)

The latest DEV read-only preflight found no active AI stages (`queued`, `preparing_image`,
`sending_to_ai`, `receiving_response`, or `validating_response`) and five completed
`catalogReprocessJobs`. The active category snapshot contains 28 categories and no
`Uncategorized` entry. This is a clean starting state for the owner-authenticated canary; it is
not a live Autonomous result. All 37 exact v39/v7 rows currently have valid candidate
title/description/category fields, so deployed malformed-candidate cases require an
owner-authorized disposable fixture or equivalent controlled input; the existing malformed Ready
rows exercise root fallback only.

## Status

Implementation and the reviewed DEV Function deployment are complete. Live same-design
Shadow→Autonomous reproduction, fail-closed deployed cases, queue/reprocess parity, unattended
queue soak, live adversarial review, and OWNER QA are still open because this shell has no
owner-authenticated `updateCatalogWorkflowMode` session and will not bypass it. Production
promotion, settings, data repair, reprocessing, Algolia mutation, and Function deploy remain
unauthorized and were not attempted. Production containment/readback is not verified here; this is
not a claim that production is safe or unaffected.
