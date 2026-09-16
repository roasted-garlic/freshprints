# DEV Canary Stop — Current-stack Autonomous prerequisite mismatch

| Field | Value |
|---|---|
| Date | 2026-09-13 |
| Goal | `smart-catalog-autonomous-current-stack-dev-canary` |
| Plan | `docs/workflow/plans/2026-09-13-smart-catalog-autonomous-current-stack-dev-canary-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-13-smart-catalog-autonomous-current-stack-dev-canary-formal-review.md` |
| Result | **STOP — DEV current-stack canary not run** |
| External mutation | **None** — no DEV settings, fixture, provider, Algolia, deploy, or production action |

## Read-only DEV preflight

- Project: `fresh-prints-dev`.
- `settings/aiEnrichment`: `catalogWorkflowMode=shadow`,
  `catalogAutonomousLiveEnabled=false`, `semanticReviewPlaygroundEnabled=false`.
- Explicit vocabulary: 43 terms; `damn` present.
- Active catalog reprocess jobs: none.
- Existing DEV data is mixed/old: the inspected 500-row Ready sample contained 340
  `catalog-enrich-v33/smart-profile-normalizer-v6`, 6 `v39/v6`, 10 `v39/v7`, and 1 `v34/v6`.
  Historical WS5 rows remain v34/v6 or v36/v6.
- Current source constants are `catalog-enrich-v39`, `smart-profile-normalizer-v7`, and
  `smart-profile-v1`.

## Deployment/source-parity blocker

`firebase functions:list --project fresh-prints-dev --json` reported the active DEV
`enqueueAiEnrichment` hash as `17d8aec199a16e83fe73c9eb3e452db9f3b8ce77` and
`reprocessReadyDesignWithAi` as `47f118…`; `onCatalogReprocessJobWritten` is
`157d0398af52d92709775c9b824a8d33f0f37e2c`. The last reviewed v39/v7 DEV deployment record
identifies `157d0398af52d92709775c9b824a8d33f0f37e2c` for the queue/reprocess source bundle
(`docs/workflow/reviews/2026-09-08-atomic-reprocess-automation-state-reconciliation-implementation-review.md`).
The later `17d8…` revision may contain current changes, but there is no checked-in source-to-live
manifest proving that it contains the exact current v39/v7 Autonomous contract. Treating it as
current without reconciliation would make the canary evidence ambiguous.

The historical WS5 scripts are v34/v6-era, do not enforce v39/v7 in their evaluator, hard-code
historical expected blockers, and begin with a row that is now already `ready` (so
`rerunFromReview` is rejected). They cannot prove the requested current-stack contract.

Therefore a DEV Autonomous canary is stopped before settings or design writes. The required next
action is either (a) owner acceptance of a source-reconciled current DEV bundle, or (b) a separately
reviewed/owner-authorized promotion of the current v39/v7 Function source, followed by a fresh
bounded canary with explicit version assertions.

## Prepared post-reconciliation sample

Read-only inventory identified a no-new-fixture four-row sample, all imported + Needs Review and
eligible for `rerunFromReview:true` after the parity gate is cleared:

| Design | Intended proof |
|---|---|
| `coiXzQDhJBKBVB1dFVZT` | current v39/v7 policy-clear/semantic-only row; expected Ready under dual gate |
| `74BdnNQuNWz0N0GaL4CO` | import-preset authority preservation; expected current v39/v7 output |
| `nff6PpkZF9TNitnpX2Mm` | genuine structured blocker; must remain Needs Review |
| `1Ws0T9fivryest6IUSbt` | existing automation-owned Explicit state; verify safeguard/authority behavior (legacy v34/v6 input) |

No temporary fixture is needed for this proposed sample, but it must not be executed until the
source-parity/owner checkpoint above is cleared.

## Local source checks

- Current Autonomous/authority/Explicit/Pass-2/mode contracts: **79/79 PASS** across the targeted
  suites run in this phase.
- `functions/src/ai/smartProfileQuality.contract.test.ts`: **8/9 PASS, 1 stale assertion**; the
  failing assertion still expects `smart-profile-normalizer-v6` while the source returns v7. No
  source or test change was made.

## Production read-only readiness (not a canary-gated enablement)

Current read-only production inventory says `fresh-prints-prod` is `shadow`/Autonomous OFF/Pass 2
OFF; 2,733 live Ready+approved designs have current v39/v7 Smart Profiles, publication synced,
and no missing/malformed/unsafe/failed/active-processing rows. The older 2,734 count in prior
reviews is historical; one design is now archived. Required production Functions are ACTIVE on
the current production source. No code/function promotion is indicated merely to switch the
production dual gate. This is not a production GO because the DEV current-stack canary did not
pass and the current workflow state forbids activation.

## Exact next checkpoint

`OWNER AUTHORIZE CURRENT V39/V7 DEV FUNCTION PROMOTION / AUTONOMOUS CANARY`

After that promotion and a fresh approved canary, the production stop phrase remains:

`OWNER AUTHORIZE PRODUCTION AUTONOMOUS ENABLEMENT`
