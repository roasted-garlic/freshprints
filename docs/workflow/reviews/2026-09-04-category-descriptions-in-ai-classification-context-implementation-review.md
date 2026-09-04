# Implementation Review: Category descriptions in AI classification context

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Implementation / Test Agent |
| Plan | `docs/workflow/plans/2026-09-04-category-descriptions-in-ai-classification-context-plan.md` |
| Formal Review | `approved_with_changes` |
| Owner decisions | Cost ACCEPT; AUTHORIZE IMPLEMENT; v34 requires `{{approved_categories}}` |
| Verdict | **approved_with_notes** |
| DEV deploy | **NOT DONE** (this pass) |

---

## Summary

Shipped **catalog-enrich-v34**: default prompt injects live active category **name + owner description** via `{{approved_categories}}` / existing `formatCategoryContext`, with buyer-intent instruction. Required-placeholder contract updated; v33 previous-default auto-upgrades; genuine custom prompts with required placeholders preserved; incompatible names-only customs fall back to shipped default (no string injection). Resolver unchanged; normalizer **v6**; schema provenance remains **smart-profile-v1**; no tag injection. Focused tests + Functions build PASS. Live API token A/B **deferred to DEV deploy QA**.

---

## IR checklist (owner-requested)

| # | Item | Result |
|---|------|--------|
| 1 | Verdict | **approved_with_notes** |
| 2 | Exact files changed | See below |
| 3 | Default prompt placeholder | **`{{approved_categories}}`** (required) |
| 4 | Category format | `- {name} — {description}` (whitespace-collapsed); name-only line if description absent |
| 5 | Description authoritative source | Taxonomy materialization / FS active categories (`id`,`name`,`description`) |
| 6 | Custom prompt behavior | Preserve if has `{{approved_categories}}`+`{{excluded_tags}}`; missing categories → resolve to DEFAULT (no inject into custom); Settings save rejects |
| 7 | Previous-default v33→v34 | **YES** (`PREVIOUS_DEFAULT_…_V33` + `isPreviousDefault` chain) |
| 8 | Prompt version | **catalog-enrich-v34** |
| 9 | Normalizer version | **smart-profile-normalizer-v6** |
| 10 | Schema version | **smart-profile-v1** (unchanged) |
| 11 | Resolver changed | **NO** |
| 12 | Tags injected | **NO** |
| 13 | Playground parity | **YES** (`buildSimpleCatalogEnrichmentUserPrompt`) |
| 14 | Processing parity | **YES** (candidate core → Gemini provider) |
| 15 | enqueue/retry parity | **YES** (`runAiEnrichmentPipeline`) |
| 16 | Ready reprocess parity | **YES** (worker + snapshot target v34) |
| 17 | Design Library Reprocess parity | **YES** (`reprocessReadyDesignWithAi` → pipeline) |
| 18 | Taxonomy revision freshness | Unchanged revision-peek cache contract |
| 19 | Names-only tokens | Est. **~108** (432 chars÷4); live baseline promptTokens **3385** |
| 20 | Names+descriptions tokens | Est. **~4,348** (17,390 chars÷4) |
| 21 | Token delta | Est. **~+4,240**; API A/B **DEFERRED TO DEV DEPLOY QA** |
| 22 | Cost delta | Est. **~$0.000424/design** (@ repo $0.10/1M input); API confirm deferred |
| 23 | Cost envelope within acceptance | **YES** (owner ACCEPT; no live exceedance measured) |
| 24 | Focused tests | **PASS** (158 tests in focused suite) |
| 25 | Resolver regressions | **PASS** (`catalogThemeCategoryResolver.test.ts`) |
| 26 | Functions build | **PASS** |
| 27 | Shared build/typecheck | Covered via Functions `tsc` build (shared imported); no separate `packages/shared` tsconfig |
| 28 | Lint | **PASS** on touched AI/constants files; `SettingsPage.tsx` has pre-existing conditional-hooks lint (unchanged pattern; only error-string edit) |
| 29 | diff-check | **PASS** (LF warnings only) |
| 30 | Exact DEV deploy inventory (next pass) | See below |
| 31–35 | Taxonomy canary candidates | See below |
| 36 | Rules impact | **None** |
| 37 | Indexes impact | **None** |
| 38 | Migration impact | **None** |
| 39 | WS4 status | **PASS WITH NOTES** (not closed) |
| 40 | WS5 status | **BLOCKED** |
| 41 | [NEEDS OWNER DECISION] | **None blocking** — next: AUTHORIZE DEV DEPLOY |

---

## Files changed

**Modified**

- `packages/shared/src/constants/aiEnrichment.constants.ts` — v34 DEFAULT, PREVIOUS_V33, required placeholders, previous-default list
- `packages/shared/src/constants/aiEnrichment.constants.test.ts`
- `packages/shared/src/constants/smartProfile.constants.ts` — `CURRENT_CATALOG_ENRICH_PROMPT_VERSION=v34`
- `packages/shared/src/constants/catalogReprocess.constants.ts` (+ test) — snapshot v34
- `functions/src/ai/catalogTitleRules.ts` (+ test) — `CATALOG_ENRICHMENT_PROMPT_VERSION=v34`
- `functions/src/ai/simpleCatalogEnrichmentPrompt.ts` (+ test)
- `functions/src/ai/promptParity.test.ts`
- `functions/src/ai/smartProfileQuality.contract.test.ts`
- `functions/src/catalogReprocess/catalogReprocess.slice5.contract.test.ts`
- `functions/src/updateAiEnrichmentSettings.ts` — save error lists both required placeholders
- `apps/studio/.../SettingsPage.tsx` — UI validation copy
- `apps/studio/.../aiEnrichmentSettingsConstants.test.ts`
- `docs/project/DECISIONS.md` — **ADR-FP-165**

**Created**

- `functions/src/ai/categoryDescriptionsPromptParity.contract.test.ts`

---

## DEV prompt provenance (checked, no mutation)

Live `settings/aiEnrichment.promptTemplate` on DEV:

- Has `{{approved_category_names}}`, not `{{approved_categories}}`
- Matches older “main message, subject…” previous-default family (not current v33 text)

After Functions deploy with this code: resolve will upgrade via previous-default **or** required-placeholder fallback to shipped **v34** default. Not a silent in-string rewrite of a custom categories-aware prompt.

---

## Exact DEV deploy inventory (for later — not deployed now)

Functions that must ship the new shared prompt/version + pipeline/provider bundle:

1. **`enqueueAiEnrichment`** — normal Processing / retry  
2. **`reprocessReadyDesignWithAi`** — Design Library Reprocess with AI  
3. **`onCatalogReprocessJobWritten`** (catalog reprocess worker) — Ready / AI Review bulk jobs targeting v34 snapshot  
4. **`testAiEnrichmentPlayground`** (and tag-rerank playground if separate export) — Settings Playground parity  

Also if settings save validation must match client: **`updateAiEnrichmentSettings`**.

Do **not** deploy Rules/Storage/indexes/Hosting/Portal/production in that pass.

---

## Taxonomy canary candidates (identify only — not mutated)

| Case | Design ID | Title | Notes |
|------|-----------|-------|-------|
| 1 Dolly inspirational | `74BdnNQuNWz0N0GaL4CO` | If You See Someone Without A Smile… Dolly | Expect Inspirational Quotes & Affirmations |
| 2 Hawking | `FRP1L0K6AKq2hrgGnOxX` | …Stephen Hawking… | Expect Inspirational Quotes & Affirmations |
| 2b Dolly butterfly | `8QpQFWwwfM21WEimy6Vm` | …Dolly Butterfly | Same inspirational expectation |
| 3 Faith | `8pSowFU1o1H1EjXBaXaA` | I Can Do All Things Through Christ… Cross | Faith & Worship |
| 4/5 Music | `Ai4Wmfp4Vd6Ady2WCsKC` | Dolly Parton … Sheet Music Portrait | Music vs Pop competitive / music-centered (celebrity) |
| 6 Pop | `0UsPRAh0tggzuX8xwWqq` | Scooby-doo Bursting Through | Pop Culture & Characters |
| 7 Humor animal | `3QNubh7l7WahljYYfgYe` | Hotter Than A Hoochie Coochie Alligator | Funny & Sarcastic (ADR-FP-163) |
| 8 Family | `EBK8d0skHLCXtHssIr9C` | Only Dads Man Pole | Family |
| 9 Occupation | `mZWO3Lsra91EhNRNEkhR` | Nurse Brain Please Don't Interrupt | Occupations (no clean “teacher” title found) |
| 10 Cannabis | `w4w0E66YWioBYTkR0aIH` | 420 Weed | Currently Hobbies & Lifestyle — expect Cannabis & 420 after v34 |

**Clean non-celebrity Music Ready candidate:** **NO** (`readyInMusicCat=0`; no Ready title matched guitar/drums/concert/band without celebrity/Dolly).

Faith IDs: `8pSowFU1o1H1EjXBaXaA`, `20fv9qb9gRLSB66nS3xp`, `KYgldo204fNLSjXlmakr`  
Music IDs: `Ai4Wmfp4Vd6Ady2WCsKC`, `g7aK32L5KFQ6Y0OXHSU0` (celebrity sheet music)  
Pop ID: `0UsPRAh0tggzuX8xwWqq`

---

## Cost measurement note

Playground/API token A/B requires live Functions with v34 — **DEFERRED TO DEV DEPLOY QA**. No `[NEEDS OWNER DECISION — COST ENVELOPE EXCEEDED]` (no live exceedance observed).

---

## Notes

- Owner cost ACCEPT recorded in ADR-FP-165.
- Do not summarize category descriptions.
- WS4 remains PASS WITH NOTES; WS5 blocked.
