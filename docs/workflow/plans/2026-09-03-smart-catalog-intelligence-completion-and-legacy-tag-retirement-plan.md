# Plan: Smart Catalog Intelligence — Completion & Legacy Tag Retirement

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review) |
| Workflow | managed-phase |
| Goal slug | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Parent goal | `smart-catalog-intelligence-unattended-enrichment` |
| Related | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-and-legacy-tag-retirement-review.md` |
| Baseline SHA | `0424653dcfa28475030da2d63d1611e1380bf48b` |
| FreshForge impact | Fresh Prints application only — **not** starter-surface distribution |
| Authorization this turn | **Plan + Formal Review ONLY** — no implement / deploy / reprocess / Autonomous / tag retirement / production |

### Continuation structure

This document is the **final completion / amendment plan** under the existing parent program `smart-catalog-intelligence-unattended-enrichment`. It does **not** create a competing parallel parent goal. It does **not** replace the master Plan (`docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md`); it completes remaining end-state work after Slices 1–6 and subsequent AI-quality correctives.

---

## Goal

Complete Smart Catalog Intelligence on **DEV** so that:

1. Smart Profiles (`smart-profile-v1`) are the primary discovery metadata system.
2. New imported/promoted designs process through the accepted **catalog-enrich-v32** / **smart-profile-normalizer-v6** pipeline.
3. Qualifying designs can reach Ready unattended when Full Autonomous (dual gate) is **explicitly** owner-enabled.
4. Uncertain / blocked designs reliably route to Needs Review without stalling unrelated work.
5. Curated categories remain; AI chooses existing categories under current resolver governance (with tag-signal replacement before tag retirement).
6. Legacy tag **operational dependency** is retired (generation, resolution, taxonomy hydration for AI, Studio/Portal discovery, Algolia searchable/facet config, triggered rebuild work) — **not** equated with immediate historical tag-document deletion.
7. Firestore and Algolia stop paying for unnecessary tag infrastructure once parity is proven.
8. Human Smart Profile edits, import presets, Halftone, and Artwork Background remain authoritative.
9. Production promotion remains a **separate later** managed goal.

**Protect quality baseline:** Do not redesign v32/v6 accepted behaviors (canonical subjects, derivative suppression, compound preservation, species specificity, clean visibleText, clean titles/descriptions, staff/import preset precedence) unless Formal Review finds a genuine blocker.

---

## Background

| Item | Repo truth |
|------|------------|
| Parent | Slices 1–6 signed off (`approved_with_notes` for 2–6); master plan amended for Catalog Processing Mode + Reprocessing |
| Live DEV AI | `catalog-enrich-v32` / `smart-profile-normalizer-v6` |
| Schema | `smart-profile-v1` |
| Owner QA | Subject canonicalization + visible-text/catalog-copy **PASS** |
| Autonomous | **OFF** (`catalogAutonomousLiveEnabled` must remain false until owner gate) |
| Mode | Shadow / human-review lifecycle (fail-safe Manual if settings missing) |
| AI Review bulk history | Slice 5 full run at **v29/v3** (204/204); later correctives were targeted, not full population |
| Ready Catalog bulk history | Slice 6 full run at **v30/v4** (269/270); v31/v5 and v32/v6 were canaries only — **no mass backfill** |
| Production | **NOT AUTHORIZED** |

---

## Scope

### In Scope (phased; each live action owner-gated)

- Final current-state audit lock (this Plan + Formal Review)
- Automation decision contract calibration (Acceptable / Verifier-worthy / Hard Needs Review) against v32/v6
- Current-version inventory + staged DEV reprocess (AI Review → Ready preservation)
- Autonomous DEV canary → broader DEV Autonomous validation
- Legacy tag **operational** retirement after Smart Profile search/category parity
- Algolia tag searchable/facet retirement after parity
- Studio/Portal tag UI retirement classifications
- Tag rerank / suggestion-author / exclusions disposition
- Firestore + Algolia usage-surface inventory (honest; not fabricated billing)
- Final DEV QA + Signoff of this completion program
- Future production-promotion **inventory only**

### Out of Scope

- Implementation / deploy / reprocess / Autonomous enable / tag retirement **in this Plan+Review turn**
- Prompt bump to v33 or normalizer bump to v7 unless a genuine AI-behavior blocker appears
- Smart Profile schema expansion beyond `smart-profile-v1` unless owner-approved
- Uncontrolled category auto-creation
- Destructive historical tag field / taxonomy deletion (unless separately owner-authorized)
- Production Functions/Rules/Algolia/Studio/Portal promotion
- Batch allocation performance goal
- Redesign of accepted v32/v6 enrichment quality

---

## Affected Areas (expected — [NEEDS REPO CHECK] resolved from source)

### Files / Modules (expected)

| Area | Paths |
|------|-------|
| Automation decision | `packages/shared/src/utils/catalogAutomationDecision.ts`, `catalogAutomationEvidence.ts`, `catalogCategoryDominantIntent.ts`, `smartProfileValidation.ts` |
| Dual gate | `packages/shared/src/constants/catalogWorkflowMode.constants.ts`, `functions/src/updateCatalogWorkflowMode.ts`, `functions/src/ai/loadAiEnrichmentSettings.ts` |
| Enrichment + tags | `functions/src/ai/aiEnrichmentCandidateCore.ts`, `aiEnrichmentPipeline.ts`, `catalogTagResolver.ts`, `catalogThemeCategoryResolver.ts`, `catalogTagRerankProvider.ts`, `catalogSuggestedTagAuthorProvider.ts`, `loadAiCatalogReferenceSnapshot.ts`, `simpleCatalogEnrichmentPrompt.ts` |
| Taxonomy | `functions/src/taxonomy/*`, Studio `taxonomyMaterializationService.ts`, `catalogTagService.ts` |
| Reprocess | `functions/src/catalogReprocess/*`, Studio `CatalogReprocessingSettingsSection.tsx` |
| Algolia | `packages/shared/src/catalog-search/portalCatalogAlgoliaRecord.ts`, `functions/src/algolia/*` |
| Studio | AI Review, Design Library filters, Settings Catalog Processing / Automation Health, Tag Management |
| Portal | `apps/portal/features/catalog/*` tag filters + Algolia search |
| Rules | `firestore.rules` (trusted Smart Profile / settings / tags write boundaries) |
| ADRs | `docs/project/DECISIONS.md` (ADR-FP-144 clarifications; possible new ADR for tag retirement) |

### Architecture Impact

- [x] Details: Preserve layered services; retire tag pipeline consumers; replace category fallback signal; dual path approval (staff client vs Admin `markAiSuccess`) remains unless consolidated later.

### Security Impact

- [x] Details: Preserve owner-only reprocess/live Autonomous; no client write broadening; default deny; customers cannot write Smart Profile/trusted AI metadata.

### Data Model Impact

- [x] Details: Prefer keep `design.tags` / historical suggestion fields dormant; stop writes; no forced schema migration for Smart Profile. Destructive cleanup = separate owner decision.

### Backend Impact

- [x] Details: Functions enrichment path, taxonomy triggers, Algolia sync/reconcile, Automation Health increments, reprocess workers.

### UI / UX Impact

- [x] Details: Catalog Processing Mode clarity (mode vs live), Automation Health honesty, Studio/Portal tag surface retirement, Smart Filter parity.

### Migration Impact

- [x] Forward: staged DEV reprocess to v32/v6; Algolia settings change only after parity; optional later historical cleanup.
- [x] Rollback: dual gate OFF; Shadow mode; keep tag fields in Algolia until proven; do not delete taxonomy until consumers gone.

---

## Approach — Phased workstreams

Formal Review may adjust order; source evidence currently supports:

### WS1 — Final current-state audit + automation contract lock

- Lock baseline SHA, live prompt/normalizer/schema, dual gate, decision inventory.
- Document honest coverage gaps (see Formal Review FR8–FR11, decision gaps).
- Required calibration before live Autonomous:
  - Enforce missing-title hard block (`title_missing` currently not consumed from title validation errors).
  - Make verifier path reach `verifier_confirmed` meaningfully **or** document verifier as deterministic second-pass and adjust health UX.
  - Wire or remove inert Automation Health counters (`retries`, `failures`); plan Algolia publication failure observability.
- **Owner checkpoint:** authorize implementation of WS1 calibration only (still no Autonomous enable).

### WS2 — Current-version reprocess / backfill preparation

- Read-only Preview both targets; inventory prompt/normalizer distributions, missing profiles, staff edits, import presets.
- Fix stale Preview UI labels (“Already v29/v30”) to current v32/v6 constants if still present.
- Confirm AI Review eligible set has zero unexpected `staffEditedDimensionKeys` (staff SP editing is Ready-only today).
- **Owner checkpoint:** approve inventory results before any Start.

### WS3 — DEV AI Review Queue v32/v6 reconciliation

- Shadow + Autonomous OFF; Start AI Review reprocess after phrase gate.
- Stratified owner sample: subjects, visibleText, titles/descriptions, presets, decision distribution.
- **Owner checkpoint:** PASS sample before Ready workstream.

### WS4 — DEV Ready Catalog v32/v6 reconciliation

- Ready-preservation semantics (Slice 6): never demote Ready; preserve approval lifecycle; staff > preset > AI.
- Bounded canary (missing/old, staff-edited, preset, OCR-heavy, canonical subjects) → full Ready reprocess.
- Verify Algolia still populated (status never leaves Ready).
- **Owner checkpoint:** canary PASS, then Start full Ready.

### WS5 — Autonomous DEV canary + calibration

- Decision engine against current profiles; Shadow would-auto-approve distribution review.
- Targeted live Autonomous canary on **known-good** designs only after owner phrase enable.
- Fail-safe: one Needs Review must not halt siblings.
- **Owner checkpoint:** enable live Autonomous for canary only; disable after; review outcomes.

### WS6 — Broader DEV Autonomous / unattended validation

- Owner authorization for broader DEV live Autonomous.
- Observe Automation Health + publication/recovery.
- Prove import → enrichment → auto Ready path without staff Approve click (Admin `markAiSuccess`, not client approval reuse).
- **Owner checkpoint:** stable unattended window before tag retirement.

### WS7 — Legacy tag operational retirement (A–I)

Hard prerequisite: **category tag-signal replacement** (FR28/FR42).

Retirement ladder (not “delete tags”):

| Step | Action |
|------|--------|
| A | Stop generating legacy tags in Gemini lean path / suggestions |
| B | Stop resolving legacy tags during AI processing |
| C | Stop loading large tag taxonomy for AI where unused |
| D | Stop writing/updating operational tag suggestion fields (keep historical readable) |
| E | Stop Studio discovery on tags → Smart Filters |
| F | Stop Portal discovery on tags → Smart Filters |
| G | Remove Algolia tag searchable/facet config (**after** parity; may be WS8) |
| H | Remove Tag Management / dead tag UI |
| I | Stop tag-triggered taxonomy rebuild / archive-guard ops where unused |
| J | Historical deletion — **separate**; default **NO** |

Rerank / suggestion-author / exclusions: **DISABLE → DELETE** (no Smart Profile purpose).

**Owner checkpoint** before each of: category-signal replacement deploy; stop generation/resolution; Studio/Portal UI removal; Algolia tag field removal.

### WS8 — Smart Profile / search / Algolia parity + usage validation

- Preserve owner-approved Smart Filter facets (`PORTAL_CATALOG_ALGOLIA_SMART_FACET_ATTRIBUTES`); do not facet every dimension.
- Remove `tagIds` / `tagFacetKeys` / tag alias expansion in `searchText` after parity demo.
- Inventory Firestore read surfaces eliminated vs UI-only hide.
- Inventory Algolia payload/facet reduction (measure representative records; do not invent billing).

### WS9 — Final DEV QA + Signoff

- Acceptance matrix AC1–AC26 (see below).
- Manual DEV QA checklist.
- Signoff only when criteria met or failures documented.

### WS10 — Future production-promotion inventory only

- Document deploy surfaces, Rules, Algolia, reprocess, Autonomous gates for a **later** managed goal.
- **No production action** under this program’s DEV authorization.

---

## Autonomous decision contract (source-locked)

Policy groupings around `hardBlockers` / `softConcerns` / `verifierWorthy` in `computeCatalogAutomationDecision` (not literal enum names in code):

### ACCEPTABLE (may auto-approve when dual gate live and no hard blockers)

- Clean profile/title/description/category
- Soft: `validation:smart_profile_missing_generated_at`, `category_alternatives_present`

### VERIFIER-WORTHY

- `structured_evidence_gap:subjects:*`, `structured_evidence_gap:objects:*`
- `subject_specificity_risk:*`
- `automation_policy_uncertainty` recognized but **not currently generated** by production decision path

### HARD NEEDS REVIEW (never auto-approve)

- `category_unresolved`, `description_missing`, `title:title_exceeds_max_characters`
- `category_gap_suggested`, `category_dominant_intent_conflict`
- Most `validation:*` except missing_generated_at
- `verifier_unresolved`

### Honest coverage gaps (do not pretend)

| Concern | Current decision engine |
|---------|-------------------------|
| Missing title | **Gap** — `title_missing` errors not consumed |
| NSFW / unsafe | **Not present** as automation reason |
| Profanity | **Not present** |
| DPI / image quality | **Not present** |
| Halftone human authority | Preserved as field; not a decision code |
| Processing failure | `markAiFailure` path (not decision class) |
| Publication/Algolia failure | Sync swallows; reconcile recovers — **not** decision class |
| Unsupported subject | Partial via evidence gaps / specificity — not a dedicated code |

### Autonomous Ready transition (trusted server path)

`import → derivatives → enqueueAiEnrichment → runAiEnrichmentPipeline → computeCatalogAutomationDecision → markAiSuccess` sets `status=ready`, `readyAt`, `aiReviewStatus=approved`, `aiReviewedBy=system:catalog-autonomy` via **Admin SDK**. Does **not** reuse client `catalogApprovalService`. Algolia via existing ready sync; failures logged; daily/manual reconcile recovers (immediate retry/health gap noted).

### Dual gate (unchanged)

Live publish requires `catalogWorkflowMode === "autonomous"` **and** `catalogAutonomousLiveEnabled === true`. Missing/malformed → Manual + live false. Selecting Manual/Shadow clears live. Phrase `ENABLE AUTONOMOUS` owner-only. **Do not weaken.**

UX: Studio uses “Autonomous” / “Live Autonomous” (not “Full Autonomous” string). Plan: keep dual-gate wording unmistakable (mode selected ≠ live enabled).

---

## Category dependency (HARD retirement prerequisite)

`resolveThemeCategory` **requires** `matchedTags` and tokenizes them into fallback scoring (`TOKEN_OVERLAP_WEIGHT=1`, family priority `+4`). Tags matter most when Gemini does not return an exact valid category name.

**Before** retiring tag resolution: replace `matchedTags` with weighted Smart Profile signals (themes/subjects/objects ± occasions/audiences/styles), keep exact-category precedence, add parity tests. Categories remain the small curated taxonomy — do **not** load the large tag taxonomy solely for categories after replacement.

---

## Search parity (preserve Slice 3 Smart Filter design)

| Signal | Role today |
|--------|------------|
| title | Primary searchable |
| searchText | Flattened corpus (includes tag names/aliases today) |
| Smart facets | subjects, styles, themes, interests, professionsGroups, occasions, places, colors |
| searchable non-facet | searchConcepts, visibleText, objects |
| categoryId / categoryName | Facet + searchable name |
| tagIds / tagFacetKeys | Legacy — retire after parity |

Do not add facets merely because dimensions exist.

---

## Legacy data disposition (safety default)

1. Stop using → 2. Stop writing → 3. Stop indexing → 4. Remove UI → 5. Preserve historical fields → 6/7. Delete fields/taxonomy **only if** owner authorizes with benefit + auditability.

**Default:** `[NEEDS OWNER DECISION — DESTRUCTIVE LEGACY TAG DATA CLEANUP]` = **NO** for this program unless owner explicitly overrides.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit/contracts | `packages/shared` automation/decision/category/Algolia tests | yes |
| Functions unit | AI enrichment, category resolver, reprocess eligibility, Algolia record builder | yes |
| Typecheck / lint / build | per `docs/standards/TESTING.md` for touched packages | yes |
| Rules tests | if Rules change | yes if Rules touched |

### Manual (DEV)

- Stratified AI Review + Ready samples after reprocess
- Autonomous canary: auto Ready + Needs Review routing + sibling isolation
- Smart Filter discovery vs former tag discovery
- Mode vs live Autonomous UX clarity
- Automation Health counters honesty
- Category accuracy before/after tag-signal replacement

---

## Human Checkpoints Anticipated

- [x] Authorize implementation (post Formal Review)
- [x] Functions / Rules / Algolia settings deploy (each)
- [x] AI Review reprocess Start
- [x] Ready Catalog reprocess Start (after canary)
- [x] Enable live Autonomous (canary + broader)
- [x] Legacy tag operational retirement steps
- [x] Destructive tag data cleanup (if ever)
- [x] Final Signoff
- [x] Any production activity (separate goal)

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Category accuracy drop after tag retirement | High | Replace signal + parity tests before resolver removal |
| Missing-title auto-approve | High | WS1 enforce title_missing |
| Verifier confirmed unreachable | Medium | Calibrate verifier or document + adjust health |
| Algolia Ready without index | Medium | Health/alert + reconcile; do not claim success without publication check |
| Discovery regression removing tags | High | WS8 parity gate before Algolia/UI retirement |
| Accidental production | Critical | Forbidden; WS10 inventory only |
| Destructive tag deletion | High | Default preserve historical; separate owner decision |

---

## Rollback Plan

- Set mode Manual or Shadow; clear live Autonomous
- Pause/stop reprocess jobs
- Redeploy prior Functions revision if enrichment regression
- Keep Algolia tag fields until rollback window closes
- Do not delete taxonomy until confirmed unused

---

## Documentation Updates Required

- [x] DECISIONS.md — ADR clarifying notes / possible tag-retirement ADR during implement
- [ ] DATA_MODEL.md / BACKEND.md / WORKFLOWS.md — when behavior changes land
- [ ] ROADMAP.md — completion status at signoff
- [ ] TESTING.md — only if commands change

---

## Acceptance criteria (entire completion program — DEV Signoff)

AC1–AC26 as specified by owner prompt (quality baseline; Smart Profile discovery; curated categories; fail-safe Autonomous; Ready without click when live; Needs Review exceptions; sibling isolation; human/preset/intake authority; Ready preservation; version dispositions; Algolia recovery; Automation Health; tag generation/resolver/Studio/Portal/Algolia retirement; category decoupling; rerank/author disposition; historical disposition documented; Firestore/Algolia usage inventoried; security boundaries; schema compatibility; no production under DEV auth).

---

## Open Questions / Owner decisions

- [ ] `[NEEDS OWNER DECISION — DESTRUCTIVE LEGACY TAG DATA CLEANUP]` — default **NO**
- [ ] Accept WS1 calibration (title_missing + verifier/health/Algolia observability) before Autonomous canary?
- [ ] Accept dual approval path (Admin `markAiSuccess` vs client approve) with ADR clarification vs consolidate shared service?
- [ ] Authorize implementation after Formal Review (separate message)

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-and-legacy-tag-retirement-review.md`
- Verdict: **approved_with_changes** (2026-09-03)
- Implementation: **NOT AUTHORIZED** until separate owner message
