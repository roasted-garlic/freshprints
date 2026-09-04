# Formal Review: Smart Catalog Intelligence — Completion & Legacy Tag Retirement

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-03-smart-catalog-intelligence-completion-and-legacy-tag-retirement-plan.md` |
| Parent | `smart-catalog-intelligence-unattended-enrichment` |
| Goal slug | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` |
| Verdict | **approved_with_changes** |

---

## Summary

The completion plan correctly continues the existing parent program (not a competing parent), protects the accepted v32/v6/`smart-profile-v1` quality baseline, sequences reprocess before Autonomous before tag retirement, and separates operational retirement from destructive cleanup. Formal Review independently verified dual-gate safety, Autonomous Ready Admin path, category–tag coupling as a hard prerequisite, and honest decision-coverage gaps. Required changes before live Autonomous and before tag retirement are listed below; they do not block Plan acceptance for phased implementation **after separate owner authorization**.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Plan+Review only this turn; phased WS1–WS10 |
| Architecture alignment | pass | Reuse automation/reprocess/Algolia; no parallel publisher |
| Security impact addressed | pass | Dual gate; owner-only; no client write broadening |
| Data model impact addressed | pass | Prefer dormant historical tags; schema stay v1 |
| Backend impact addressed | pass | Functions/taxonomy/Algolia inventoried |
| Test strategy adequate | pass_with_changes | Must include category parity + publication observability tests |
| Human checkpoints identified | pass | Explicit per deploy/reprocess/Autonomous/retirement |
| Roadmap alignment | pass | Completes parked Smart Profiling parent end-state |
| Documentation plan | pass | ADR clarifications during implement |
| No silent scope expansion | pass | Production inventory-only; no v33/v7 unless blocker |

---

## FR inventory (independent answers)

### FR1 — Exact existing parent + continuation structure
**Parent:** `smart-catalog-intelligence-unattended-enrichment` (master plan `2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md`).  
**Continuation:** final completion goal `smart-catalog-intelligence-completion-and-legacy-tag-retirement` under that parent — **not** a new parallel parent. Correct.

### FR2 — Current source SHA
`0424653dcfa28475030da2d63d1611e1380bf48b` (`0424653d`) on branch `development`.

### FR3 — Current live DEV prompt / normalizer
Source constants: **`catalog-enrich-v32`** (`functions/src/ai/catalogTitleRules.ts`), **`smart-profile-normalizer-v6`** (`packages/shared/src/constants/smartProfile.constants.ts`). Workflow state + prior signoffs match. Deployed Function revision inventory lives in handoff; this Formal Review does not re-query Firebase console.

### FR4 — Smart Profile schema
**`smart-profile-v1`** (`smartProfile.provenance.version`). Prefer keep.

### FR5 — Current catalog workflow mode
Authoritative runtime default when missing/invalid: **`manual`**. Product posture for this program: **Shadow / human-review** until owner changes. Live Firestore value not re-queried this turn; Start gates and owner docs require Shadow + Autonomous OFF for reprocess.

### FR6 — Current live Autonomous flag
**OFF** — `catalogAutonomousLiveEnabled` resolves true only for literal `true`; fail-safe false. Owner: not authorized to enable in this Plan+Review turn.

### FR7 — Exact current automation decision engine
`computeCatalogAutomationDecision` in `packages/shared/src/utils/catalogAutomationDecision.ts`, invoked from `functions/src/ai/aiEnrichmentCandidateCore.ts` during enrichment. Dual gate via `canPublishAutonomously`. Outcomes: `needs_review` | `shadow` | `auto_approved` (+ failed via pipeline separate path).

### FR8 — Exact Acceptable class
Policy-clear when `hardBlockers.length === 0` and verifier not unresolved. Soft acceptable: `validation:smart_profile_missing_generated_at`, `category_alternatives_present`. Live: `auto_approved`; Shadow/Autonomous-live-off: `shadow` + `shadow_would_auto_approve`; Manual: `manual_review_required`.

### FR9 — Exact Verifier-worthy class
Triggers collected from: `structured_evidence_gap:subjects:*`, `structured_evidence_gap:objects:*`, `subject_specificity_risk:*`; `automation_policy_uncertainty` recognized but **not generated** by current production decision code. `category_alternatives_present` collected then **filtered out** of verifier triggers. Search-concept codes never trigger verifier.

### FR10 — Exact Hard Needs Review class
Hard set includes: `category_unresolved`, `description_missing`, `title:title_exceeds_max_characters`, `category_gap_suggested`, `category_dominant_intent_conflict`, most `validation:*` (except missing_generated_at), plus `verifier_unresolved` when verifier unresolved.

### FR11 — Current verifier behavior
`runTargetedCatalogVerifier` re-runs the same structured-gap + specificity checks. Confirmed path exists in code but is **effectively unreachable** for naturally generated triggers (same checks reproduce). Health UI still shows “Verifier confirmed.” **Required change** before trusting live Autonomous metrics.

### FR12 — Exact Autonomous Ready transition path
Import → derivatives → background enqueue → `enqueueAiEnrichment` → `runAiEnrichmentPipeline` → decision → `markAiSuccess` Admin write: `status=ready`, `readyAt`, `aiReviewStatus=approved`, `aiReviewed=true`, `aiReviewedBy=system:catalog-autonomy`. **Not** client `catalogApprovalService`.

### FR13 — Approval / audit-field parity
Required lifecycle fields present on Autonomous path. Differences: no `updatedBy` on Autonomous path; duplicated transition logic vs client approval. **ADR clarification recommended**; shared-service consolidation optional (not blocking if documented).

### FR14 — Algolia publication behavior
Ready transition classified by `classifyPortalCatalogDesignChange` → `syncPortalCatalogDesignToAlgolia` upserts record. Reuses existing publisher (ADR-FP-144).

### FR15 — Publication failure / recovery
Trigger **logs and swallows** Algolia errors → Function succeeds; Firestore stays Ready. Recovery: `reconcilePortalCatalogAlgoliaIndex` (+ scheduled). Reconcile clears index then rebuilds (temporary empty/partial risk). **Required change:** observability / Automation Health / do not claim unattended success without publication check or reconcile signal.

### FR16 — AI Review current-version inventory
**No fresh full distribution documented post-v32.** Historical Slice 5 full population: **v29/v3**. Later v30+ were targeted. **Must Preview** before Start.

### FR17 — Ready Catalog current-version inventory
**No fresh full distribution documented post-v32.** Historical Slice 6: **269× v30/v4**, 1 missing; v31/v5 and v32/v6 canaries only. **Must Preview** before Start.

### FR18 — AI Review v32/v6 reprocess required?
**YES** (population still predominantly pre-v32/v6 per docs).

### FR19 — Ready v32/v6 reprocess required?
**YES** (same).

### FR20 — Safest reprocess order
1) Preview both → 2) AI Review under Shadow/Autonomous OFF → 3) stratified sample → 4) Ready Preview → 5) Ready bounded canary → 6) full Ready → 7) reinventories → 8) Shadow decision calibration → 9) Autonomous canary → 10) broader Autonomous → **only then** tag retirement. Serial targets preferred.

### FR21 — Owner checkpoints for each Start
Required: inventory review; AI Review Start phrase; Ready canary PASS then Ready Start phrase; live Autonomous phrase; each tag-retirement deploy surface; Algolia settings change; final Signoff. Production never under this auth.

### FR22 — Human-edit preservation
Ready backfill: staff dimensions via `staffEditedDimensionKeys` wholesale replace; root metadata preserved. Queue clear deletes current Smart Profile (staff SP edit is Ready-only — expected). Inventory must confirm no anomalous queue staff edits.

### FR23 — Import-preset preservation
`smartProfileImportPresets` re-merged; staff > preset > AI. Staff edits sync preset seeds.

### FR24 — Intake Halftone / background preservation
Halftone staff decision authoritative; AI shadow assessment only. Artwork background intake/staff sources preserved; enrichment does not overwrite staff background decision fields.

### FR25 — Current legacy tag generation path
ACTIVE: Gemini lean prompt/response → candidates → `aiSuggestions.tags` / `suggestedNewTags` in `aiEnrichmentCandidateCore` + pipeline persist. Designs often start `tags: []` until staff approval applies tags.

### FR26 — Current tag-resolver path
ACTIVE unconditional: `resolveAiCatalogTags` in `catalogTagResolver.ts` from candidate core (+ Studio alias helpers).

### FR27 — Tag taxonomy Firestore-read path
ACTIVE: `loadAiCatalogReferenceSnapshot` prefers `taxonomyMaterialization`, fallback approved `tags` query; cached in `aiEnrichmentRuntimeCache`; Studio materialization + `listTags`; tag writes trigger rebuild via `onTagTaxonomySourceWritten`.

### FR28 — Category dependency on tags
**YES — HARD PREREQUISITE.** `resolveThemeCategory({ matchedTags })` tokenizes tags into fallback scoring. Exact category name bypasses fallback. Must replace with Smart Profile signals before resolver retirement.

### FR29 — Studio tag dependencies
ACTIVE: Tag Management, DesignFormFields/`TagChipInput`, AI Review suggestions + suggested-new approval, Design Library tag filters + URL `tags`/`tag`, settings exclusions/rerank/author, Playground, Details historical display, taxonomy bootstrap. Classifications in Plan WS7/H.

### FR30 — Portal tag dependencies
ACTIVE: filter UI (`CatalogTagFilterModal`, filter bar/sheet), Algolia `tagFacetKeys` filters, Firestore featured tags, details/share label display. **No tag URL-query deep-link serialization found** — lower URL-break risk; still replace filters with Smart Profile.

### FR31 — Algolia tag fields / search / facets
ACTIVE: `tagIds`, `tagFacetKeys`, `unordered(tagFacetKeys)` searchable, `filterOnly(tagIds)`, tag names/aliases in `searchText`. Smart facets coexist (`PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES`).

### FR32 — Tag rerank disposition
Default **off**; source-wired. **DISABLE → DELETE.** No Smart Profile purpose after retirement.

### FR33 — Suggested-tag author disposition
Default **off**; template suggestions may still appear via policy. **DISABLE → DELETE.**

### FR34 — Excluded-tag / settings disposition
ACTIVE for tag generation. **REMOVE** with tag pipeline; do not blindly map onto Smart Profile.

### FR35 — Tag Management disposition
**REMOVE** after operational retirement; do not leave dead controls implying tags are active.

### FR36 — Historical tag-field disposition
**PRESERVE** `design.tags` / historical suggestion fields as dormant until separate decision. Stop writing operationally.

### FR37 — Tag taxonomy collection disposition
Keep documents until no consumers (enrichment, Algolia sync, Studio, Portal, archive guards). Then optional cleanup under owner decision.

### FR38 — Destructive cleanup required?
**NO** (default). Not required for operational retirement. Mark owner decision if ever proposed.

### FR39 — Estimated Firestore usage reduction surfaces
Eliminated when A–I complete: approved-tag cold queries / tag-dominated materialization chunks; Studio tag list/CRUD; Portal featured-tag queries; suggested-tag approval reads; archive-guard queries; tag-write-triggered rebuild writes; Algolia sync per-tag taxonomy gets (**after** J). Caveat: enrichment/approval still write documents — savings are ops + payload, not “hide UI.”

### FR40 — Estimated Algolia reduction surfaces
Remove `tagIds`, `tagFacetKeys`, tag alias expansion in `searchText`; drop two facet dimensions and tag facet queries. Exact bytes **not** in repo — measure representative records in WS8.

### FR41 — Smart Profile search parity gaps
Smart searchable + facet set already covers owner-approved discovery dimensions. Residual risk: customers/staff relying on **alias-rich** legacy tag vocabulary not mirrored in Smart Profile tokens; must evaluate stratified discovery before Algolia tag removal. Objects/searchConcepts/visibleText intentionally non-facet (preserve).

### FR42 — Category accuracy risk after tag retirement
**Material** if tags removed before signal replacement. Mitigate with Smart Profile–weighted fallback + parity tests + stratified category sample.

### FR43 — Required replacement for remaining tag signal
Replace `matchedTags` in `resolveThemeCategory` with weighted Smart Profile dimensions (themes/subjects/objects primary; occasions/styles secondary as tested). Keep exact curated category-name match precedence. Keep small category taxonomy load; drop large tag taxonomy for AI.

### FR44 — Full Autonomous owner UX contract
Keep dual presentation: mode (**Manual / Shadow / Autonomous**) vs **Live Autonomous** enable/disable with `ENABLE AUTONOMOUS`. “Full Autonomous” wording is owner/docs language; Studio source uses Autonomous + Live. UI must remain unmistakable that mode≠live. Do not collapse gates in UI.

### FR45 — Dual gate remains unchanged?
**YES — keep.** Do not weaken backend dual gate.

### FR46 — Exact DEV deploy surfaces (when later authorized)
Functions: enrichment/enqueue, reprocess worker/callables, taxonomy triggers (until removed), Algolia sync/reconcile, workflow-mode updater, Smart Profile staff update. Studio Electron runtime for UI. Portal hosting for Portal UI. Firestore Rules if tag write surfaces change. Algolia index settings when retiring tag facets. **Not authorized this turn.**

### FR47 — Firestore Rules impact
Likely yes at retirement (remove/relax only after clients stop writing tags; preserve Smart Profile trusted boundaries; keep settings owner-only). Do not broaden client writes for convenience.

### FR48 — Storage Rules impact
**None expected** for this completion program (metadata/search/automation scope).

### FR49 — Indexes impact
Possible composite index cleanup if tag `array-contains` queries retired; verify before dropping. No index mutation this turn.

### FR50 — Algolia settings / index impact
Yes at WS8: update `searchableAttributes` / `attributesForFaceting`; full reconcile after record-builder change. Owner-gated.

### FR51 — Studio runtime impact
Yes: Settings, AI Review, Design Library filters, Tag Management removal, Smart Profile filters primacy, Catalog Processing / Health honesty.

### FR52 — Portal runtime impact
Yes: replace tag filters with Smart Filters; remove tag facet queries; historical label display optional then remove.

### FR53 — Schema / migration impact
No Smart Profile schema bump expected. Prefer soft field dormancy over hard migration. Destructive tag cleanup optional later.

### FR54 — Prompt version change required?
**NO** for automation activation / tag retirement alone. Only if AI-output behavior must change (not anticipated to finish this program).

### FR55 — Normalizer version change required?
**NO** for same reasons. Stay on v6 unless AI-normalization behavior must change.

### FR56 — ADR amendments / new ADR required
- **ADR-FP-144 clarifying amendment** recommended: Admin Autonomous lifecycle vs client approval; Algolia swallow+reconcile recovery; verifier confirmed reachability intent.
- **New ADR (or ADR-FP-144 follow-on)** for legacy tag operational retirement + category signal replacement + historical-data default preserve.
- No ADR needed merely to restate staff-vs-autonomous doctrine (already in ADR-FP-144).

### FR57 — Exact proposed workstreams / order
WS1 audit+automation calibration → WS2 inventory prep → WS3 AI Review v32/v6 → WS4 Ready v32/v6 → WS5 Autonomous canary → WS6 broader DEV Autonomous → WS7 tag operational retirement (after category replacement) → WS8 Algolia/search parity+usage → WS9 DEV QA+Signoff → WS10 production inventory only. Adjust only with evidence.

### FR58 — Rollback strategy
Mode Manual/Shadow; clear live flag; pause jobs; prior Functions revision; retain Algolia tag fields until window closes; never delete taxonomy while consumers exist.

### FR59 — Final DEV QA matrix
AC1–AC26 + stratified samples (subjects, OCR/visibleText, titles, presets, staff edits, category before/after, Smart Filter discovery, Autonomous Ready + Needs Review sibling isolation, Algolia presence, Health counters, security boundaries).

### FR60 — Future production inventory
Separate managed goal: Functions allowlist, Rules, Algolia settings+reconcile, Studio publish, Portal App Hosting, env-specific reprocess phrases, Autonomous enable per env, no silent promote. **Unauthorized now.**

### FR61 — Batch allocation remains deferred?
**YES.**

### FR62 — Production remains unauthorized?
**YES.**

### FR63 — All [NEEDS OWNER DECISION] items
1. `[NEEDS OWNER DECISION — DESTRUCTIVE LEGACY TAG DATA CLEANUP]` — Formal Review recommends **NO** for this program.
2. Authorize **implementation** of WS1+ (separate from this Plan+Review approval).
3. Accept WS1 required calibrations (title_missing hard block; verifier reachability or honest health UX; Algolia/publication observability; inert Health counters) before live Autonomous canary.
4. Accept Admin Autonomous approval path with ADR clarification vs require shared approval-service consolidation before canary.
5. After parity evidence: authorize each tag-retirement / Algolia settings step.
6. Smart Profile schema change — **not proposed**; if implement discovers need → STOP with `[NEEDS OWNER DECISION — SMART PROFILE SCHEMA CHANGE]`.

---

## Architecture Review

**Findings:**
- Continuation under parent is correct.
- Category–tag coupling is the primary architectural retirement blocker.
- Dual gate and fail-safe are sound.
- Verifier design is presently a deterministic echo, not an independent confirmer.
- Autonomous publication reuses Algolia sync correctly; failure handling is incomplete.

**Required changes:**
1. Replace category `matchedTags` signal before tag resolver retirement.
2. Fix title_missing enforcement before live Autonomous.
3. Resolve verifier confirmed reachability or document + adjust Health UX.
4. Add publication-failure observability before claiming unattended success.

---

## Security Review

**Findings:**
- Settings writes denied to clients; owner-only live enable + phrase.
- Smart Profile trusted write boundaries must remain.
- Tag retirement must not broaden client writes.

**Required changes:**
- [ ] None blocking Plan acceptance; Rules updates only in later implement with review.

**Human approval needed before production:**
- [x] All production activity (separate goal)

---

## Data Model Review

**Findings:**
- Prefer dormancy over deletion for `design.tags` / suggestion telemetry.
- Schema stays `smart-profile-v1`.
- Ready-preservation contract remains binding.

**Required changes:**
- [ ] Document historical disposition at implement (default preserve).

---

## Backend Review

**Findings:**
- Reprocess control plane adequate for WS2–WS4.
- Preview labels may be stale vs v32/v6 — fix in WS2.
- Taxonomy rebuild cost dominated by tags — major Firestore savings surface after retirement.

**Required changes:**
1. Inventory Preview before any Start.
2. Serial AI Review then Ready.
3. Category signal replacement before A–C tag pipeline stop.

---

## Testing Review

**Findings:**
- Existing automation/category/Algolia contract tests are the right base.
- Need new parity tests for Smart Profile category scoring and post-retirement Algolia settings.

**Required changes:**
- Add/extend tests listed in Plan Test Strategy during implement.

---

## Documentation Review

**Findings:**
- Plan references master plan without duplicating it — correct.
- ADR clarifications during implement.

---

## Required Changes (approved_with_changes)

1. **WS1 before live Autonomous:** enforce missing-title hard block; fix or honestly reclassify verifier confirmed; wire or remove inert Health `retries`/`failures`; add Algolia publication failure observability path.
2. **Before tag resolver retirement:** replace `matchedTags` category scoring with Smart Profile–weighted signals + parity tests + stratified category sample.
3. **Reprocess:** fresh Preview inventories; serial AI Review → Ready canary → Ready full; Shadow/Autonomous OFF until WS5.
4. **Tag retirement:** operational A–I first; destructive J default **NO**; Algolia G after discovery parity.
5. **ADR:** clarifying amendment(s) as in FR56 during implement.
6. **No prompt/normalizer bump** unless AI behavior must change.
7. **Production / destructive cleanup / Autonomous enable / deploys / Start** remain owner-gated and are **not** authorized by this Formal Review alone.

---

## Blockers

None for Plan acceptance. Live Autonomous enablement and tag retirement remain **blocked pending** required changes + owner checkpoints (not Formal Review rejection).

---

## Verdict Rationale

**approved_with_changes** — Plan structure, parent continuation, quality-baseline protection, phased gates, and usage-inventory honesty are sound. Source audit found material completion work (version backfill, automation calibration gaps, category–tag coupling, Algolia recovery observability, tag operational surfaces) that must be sequenced as required changes, not deferred silently.

---

## Next Step

**STOP.** Await owner authorization to begin **implementation** (WS1+).  
This Formal Review does **not** authorize implement, deploy, reprocess, Autonomous enablement, tag retirement, commit/push, or production.

## Manual Test Checkpoint (deferred to post-implement phases)

Not requested this turn — Plan+Review only.
