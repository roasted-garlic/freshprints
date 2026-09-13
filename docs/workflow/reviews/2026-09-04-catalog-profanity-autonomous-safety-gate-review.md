# Formal Review: Catalog Profanity Autonomous Safety Gate (Pre-WS5 Corrective)

| Field | Value |
|-------|-------|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-catalog-profanity-autonomous-safety-gate-plan.md` |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` |
| Verdict | **approved_with_changes** |

---

## Summary

Repo inspection confirms **no dedicated automated profanity / curse-word Autonomous gate** today. Related Explicit Content tooling is staff-driven display policy, not automation safety. The smallest reliable fix is a **deterministic shared matcher** over **pre-sanitize artwork text evidence** plus final title/description, emitting hard `validation:*` blockers into `computeCatalogAutomationDecision` so Autonomous cannot auto-approve. Staff manual approval already bypasses automation hard blockers and should remain unchanged. **Owner must approve the initial vocabulary before implementation.** WS5 stays blocked on this corrective; the existing enablement checkpoint remains parked and reusable.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Pre-WS5 automation safety only; no WS5 canary; no customer-upload censorship |
| Architecture alignment | pass | Shared deterministic helper → existing decision hard-block path |
| Security impact addressed | pass | Fail-closed for Autonomous; no secrets; no artwork mutation |
| Data model impact addressed | pass | No new collections; reuse reason codes |
| Backend impact addressed | pass | Functions redeploy of enrichment path only; no Rules/index |
| Test strategy adequate | pass | Full matrix in plan; bypass + false-positive cases required |
| Human checkpoints identified | pass | Vocabulary owner decision before implement |
| Roadmap alignment | pass | Temporarily blocks WS5; preserves WS4/WS5 artifacts |
| Documentation plan | pass | ADR at implement; workflow artifacts now |
| No silent scope expansion | pass | Explicit out-of-scope list honored |

---

## Answers (Formal Review required set)

| # | Question | Answer |
|---|----------|--------|
| 1 | Profanity capability already exists? | **NO** (no automated Autonomous profanity gate). Related: staff `isExplicitContent` + Portal `censoredTerms` display masking only. |
| 2 | Exact current source paths | See **Source paths** below. |
| 3 | Exact current behavior | Enrichment → `computeCatalogAutomationDecision` hard-blocks known codes only; profanity not among them; staff can still manually Ready. |
| 4 | Current profanity auto-approval risk | **YES if Autonomous were live** and other hard blockers clear. **Currently mitigated** because Autonomous is OFF. |
| 5 | visibleText available before automation? | **YES** on Smart Profile / enrichment parse (sanitized). **`analysis.visibleText` is currently unset** on the v34 simple path when decision is invoked. |
| 6 | Pre-sanitized/raw text evidence available? | **YES transiently** as `parsed.visibleText` / `parsed.readableTextLines` inside `buildSimpleCatalogEnrichmentResult` **before** sanitize. **Not persisted** raw after that function returns. |
| 7 | title available before automation? | **YES** — lean-resolved `suggestions.title` before decision. |
| 8 | description available before automation? | **YES** — scrubbed/synthesized `suggestions.description` before decision (placeholder repair may run after decision in candidate core — prefer scanning the description value passed into decision, and document any post-decision repair interaction in implement). |
| 9 | Recommended evidence stage | **Pre-sanitize parse fields + final title/description**, then feed hard codes into decision. Do not rely solely on post-sanitize / `analysis.visibleText`. |
| 10 | Recommended fields to inspect | `parsed.visibleText`, `parsed.readableTextLines`, final `title`, final `description`. Optionally also `smartProfile.visibleText` as secondary consistency check only. |
| 11 | Smart Profile fields intentionally excluded | `themes`, `interests`, `searchConcepts`, `subjects`, `objects`, `styles`, `occasions`, `places`, `colors`, category alternatives/gap notes, category descriptions. |
| 12 | Normalization strategy | Lowercase; Unicode-safe trim; collapse whitespace; remove/collapse separators (` `, `_`, `-`, punctuation runs); map a **small documented** substitution table (e.g. `@→a`, `$→s`, `0→o`, `1→i`, `!→i`, `*→` empty for vowel holes) before token/compact matching. |
| 13 | Obfuscation strategy | Dual path: (1) boundary match on lightly normalized tokens/phrases; (2) compacted string match after separator stripping + bounded substitutions. Cap substitution aggressiveness to avoid overmatching. |
| 14 | Matching strategy | Whole-token / whole-phrase boundaries for listed terms; compacted equality/contains **only** against normalized compacted forms of denylist entries — **not** raw substring on original English words. |
| 15 | False-positive protections | No naive substring on raw text; boundary-aware matching; exclude or allowlist short ambiguous tokens; regression tests (`class`/`assassin`/etc.). Reuse design lessons from `maskCensoredDesignText` word boundaries — do not reuse that function for automation decisions. |
| 16 | Denylist ownership/location | **Code-owned** curated constant module next to matcher (e.g. `catalogProfanityGate.ts` or adjacent `catalogProfanityVocabulary.ts`). No Firestore. |
| 17 | Allowlist needed? | **CONDITIONAL YES** if v1 denylist includes short ambiguous terms; otherwise **NO** for an initial long-phrase / strong-term-only list. |
| 18 | Owner vocabulary checkpoint needed? | **YES** — `[NEEDS OWNER DECISION — INITIAL PROFANITY VOCABULARY]` |
| 19 | Proposed blocker code/reason | `validation:profanity_artwork` (CASE A); `validation:profanity_catalog_copy` (CASE B). Both hard via `isHardValidationCode`. |
| 20 | Exact validation integration point | New `detectCatalogProfanityEvidence(...)` → errors consumed in `computeCatalogAutomationDecision` (mirror title/profile validation pattern). |
| 21 | Exact automation integration point | `packages/shared/src/utils/catalogAutomationDecision.ts` hardBlockers filter; wired from `functions/src/ai/aiEnrichmentCandidateCore.ts` / evidence produced in `simpleCatalogEnrichmentResponse.ts`. |
| 22 | Confidence bypass possible? | **NO** once coded as hard blocker — `aiReviewConfidence` / model confidence are not decision authorities (`computeCatalogAutomationDecision` comment + composition). |
| 23 | Verifier bypass possible? | **NO** — existing invariant: verifier confirmed never clears hard blockers (tests B7). Extend tests for new codes. |
| 24 | Needs Review routing behavior | Hard blocker ⇒ `decision: needs_review`, `wouldAutoApprove: false`, `shouldPublishReady: false` → `markAiSuccess` writes `aiReviewStatus: needs_review` (non-publish path). |
| 25 | AI Review reason visible? | **YES** — `AiReviewSmartProfileSection` renders `provenance.automationReasonCodes` (“Shadow reasons”). Prefer keeping machine codes; optional humanized label later, not required. |
| 26 | Current manual approval behavior | Staff `catalogApprovalService.approveDesignForCatalog` does **not** check automation hard blockers; intentional Ready remains possible. |
| 27 | Manual approval policy change required? | **NO** — preferred product behavior already matches architecture. **Not** `[NEEDS OWNER DECISION — PROFANITY HUMAN OVERRIDE POLICY]` unless owner later wants to forbid staff override. |
| 28 | Artwork vs AI-copy distinction | CASE A: hit on pre-sanitize artwork text → `validation:profanity_artwork`. CASE B: hit on title/description only → `validation:profanity_catalog_copy`. Both hard-block Autonomous. |
| 29 | Customer Print Request flow changed? | **NO** (expected / required). |
| 30 | Customer upload finalize changed? | **NO** (expected / required). |
| 31 | Promotion-to-catalog path covered? | **YES** — `promoteCustomerUploadToAiReview` creates design + enqueue enrichment; gate applies on enrichment decision, not on promote/finalize. |
| 32 | Legacy tag dependency? | **NO**. |
| 33 | Second AI call required? | **NO**. |
| 34 | Prompt change required? | **NO** (expected). If implement proves otherwise → stop. |
| 35 | Normalizer change required? | **NO** (expected; keep `smart-profile-normalizer-v6`). |
| 36 | Schema change required? | **NO** (expected; keep `smart-profile-v1`). |
| 37 | Exact source files expected | See plan + Source paths / Expected implement files. |
| 38 | Expected DEV Functions deploy inventory | Functions that ship enrichment/decision: at minimum `enqueueAiEnrichment`; catalog reprocess worker path (`onCatalogReprocessJobWritten` / related start/preview as previously used for AI correctives). Exact allowlist verified at implement via import graph. Shared package changes ride those deploys. |
| 39 | Rules change required? | **NO**. |
| 40 | Storage Rules change required? | **NO**. |
| 41 | Indexes required? | **NO**. |
| 42 | Migration required? | **NO**. |
| 43 | Ready-catalog reprocess required? | **NO** — do not demote/reprocess Ready for this gate. |
| 44 | AI Review backlog reprocess required? | **NO** for corrective close — blockers appear on future reprocess only. |
| 45 | Future targeted backfill recommended? | **YES** — separate reviewed execution checkpoint after safety is live (optional; not this goal). |
| 46 | Test matrix | As in plan (direct, case, punct, spaced, symbol, FP, clean, no-text, AI-copy, UX reason, bypass, tag-free, visibleText/category/title regressions). |
| 47 | Rollback | Revert code + redeploy prior Function revisions; Autonomous remains OFF until re-auth. |
| 48 | Impact on current WS5 preflight | **Blocks enablement** until corrective signed off. Preflight artifacts retained. Canary IDs unchanged/parked. |
| 49 | WS5 preflight must be fully repeated? | **NO** — not full redo expected. After corrective deploy, **narrow revalidate** decision surface / replay expectations for the six IDs if reason codes or deploy revisions change outcomes. |
| 50 | WS5 blocker status | **BLOCKED ON PROFANITY SAFETY CORRECTIVE**. |
| 51 | WS6 status | **NOT STARTED** (unchanged; authority-order still out of scope). |
| 52 | Production touched? | **NO**. |
| 53 | Commit/push? | **NO**. |
| 54 | [NEEDS OWNER DECISION] | **YES — INITIAL PROFANITY VOCABULARY** (before implement). Human-override policy: **not required**. Version change: **not required** unless implement discovers otherwise. |

---

## Source paths (mechanical)

### Automation / validation

| Path | Role |
|------|------|
| `packages/shared/src/utils/catalogAutomationDecision.ts` | `computeCatalogAutomationDecision`, hard blockers, verifier non-override |
| `packages/shared/src/utils/catalogAutomationDecision.test.ts` | Bypass / hard-block tests |
| `packages/shared/src/utils/smartProfileValidation.ts` | Profile/title validation only — **no profanity** |
| `packages/shared/src/utils/catalogAutomationEvidence.ts` | Evidence gaps / specificity — **no profanity** |
| `functions/src/ai/automationDecisionShadow.ts` | Functions re-export wrapper |
| `functions/src/ai/aiEnrichmentCandidateCore.ts` | Calls decision with title/desc/`analysis.visibleText` |
| `functions/src/ai/aiEnrichmentPipeline.ts` | `markAiSuccess` Ready vs Needs Review from `shouldPublishReady` |

### Enrichment / visibleText

| Path | Role |
|------|------|
| `functions/src/ai/simpleCatalogEnrichmentResponse.ts` | v34 parse → sanitize → suggestions/analysis parse payload |
| `packages/shared/src/utils/visibleTextQuality.ts` | Semantic sanitizer (can drop `f*ck`/`f_ck`) |
| `functions/src/ai/providers/geminiVisionEnrichmentProvider.ts` | Single vision call → simple response builder |
| `functions/src/ai/smartProfileBuilder.ts` | Persisted `smartProfile.visibleText` from sanitized parse |
| `functions/src/ai/catalogTitleRules.ts` | `CATALOG_ENRICHMENT_PROMPT_VERSION = catalog-enrich-v34` |

### AI Review / manual approve

| Path | Role |
|------|------|
| `apps/studio/.../AiReviewSmartProfileSection.tsx` | Shows `automationReasonCodes` |
| `apps/studio/.../catalogApprovalService.ts` | Manual Ready — **no hard-blocker gate** |
| `apps/studio/.../aiReviewInboxService.ts` | Approve via catalogApprovalService |

### Explicit content (not this gate)

| Path | Role |
|------|------|
| Studio/Portal `isExplicitContent` + `censoredTerms` | Staff classification + display masking |
| `packages/shared/src/utils/maskCensoredDesignText.ts` | Portal display mask only |
| ADR-FP-129 in `docs/project/DECISIONS.md` | Explicit = human classification only |

### Customer upload → catalog

| Path | Role |
|------|------|
| `functions/src/finalizeCustomerUpload.ts` | Upload technical finalize — **no profanity gate** |
| `functions/src/promoteCustomerUploadToAiReview.ts` | Promote → design → later enrichment enqueue |

### Prior honesty docs

| Path | Note |
|------|------|
| Parent plan § honest coverage gaps | Profanity **Not present** |
| WS5 Formal Review item 7 | Profanity **not** a decision-code blocker |

---

## Architecture Review

**Findings:**

- Correct layering: shared deterministic gate → existing automation decision → pipeline publish flag. Matches architecture rules (services/shared utils own policy; UI only displays reasons).
- Must fix evidence wiring: scan **before** sanitize; do not trust `analysis.visibleText` alone on v34 path.
- Preserve customer-upload lifecycle distinction.

**Required changes:**

1. Pre-sanitize evidence scan is mandatory in implement scope.
2. Pass/detect evidence into decision without depending on unset `analysis.visibleText`.
3. Owner vocabulary approval before coding the denylist contents.

---

## Security Review

**Findings:**

- Automation fail-closed for profanity is appropriate.
- Do not mutate artwork or stored wording.
- Do not apply gate to customer request artwork finalize/attach.
- Staff override remains intentional and permission-gated.

**Required changes:**

- [ ] None beyond plan’s customer-path exclusion and hard-block invariant tests.

**Human approval needed before production:**

- [x] Entire production path out of scope; DEV vocabulary + later WS5 remain owner-gated.

---

## Data Model Review

**Findings:** No new entities. Reason codes already persist on Smart Profile provenance.

**Required changes:**

- [ ] None.

---

## Backend Review

**Findings:** No Rules/index/migration. Expected Functions redeploy of enrichment entrypoints after implement. Dual gate unchanged. Publication contract unchanged.

**Required changes:**

- [ ] Verify exact Functions allowlist from import graph at implement time.

---

## Testing Review

**Findings:** Matrix is sufficient. Must include sanitizer interaction (`f*ck` pre-sanitize hit) and false positives.

**Required changes:**

- [ ] Include explicit test that Autonomous + verifier confirmed + high confidence still cannot publish when profanity hard blocker present.

---

## Documentation Review

**Findings:** Plan documents sequencing and owner checkpoint. Implement should add ADR for the Autonomous hard-block policy.

---

## Required Changes (approved_with_changes)

1. **Block implementation until owner approves initial vocabulary** (`[NEEDS OWNER DECISION — INITIAL PROFANITY VOCABULARY]`).
2. **Mandatory evidence stage:** pre-sanitize `parsed.visibleText` + `parsed.readableTextLines`; plus final title/description; never post-sanitize-only.
3. **Hard codes:** `validation:profanity_artwork` and `validation:profanity_catalog_copy` (or equivalent reviewed names) must enter `hardBlockers` via existing hard-validation path.
4. **Do not change** staff manual approval semantics.
5. **Do not** run WS5 canary, mutate Autonomous flags, or mass-reprocess as part of this corrective.
6. After implement/deploy/signoff: resume parked WS5 checkpoint with **narrow** replay revalidation only.

---

## Blockers (if blocked)

None for plan acceptance. Implementation is gated on owner vocabulary decision (human checkpoint), not on plan rejection.

---

## Verdict Rationale

**approved_with_changes** — diagnostic is solid, architecture is narrow and reversible, hard-block contract fits existing decision engine, customer-print-request blast radius is avoidable by construction, and WS5 sequencing is correctly blocked without discarding preflight. Changes required are evidence-stage discipline, owner vocabulary approval, and explicit non-goals around staff override / WS5 execution.

---

## Next Step

1. Owner supplies / approves initial denylist (and allowlist if needed).
2. Then start **Implement** phase for this corrective only.
3. Keep Autonomous OFF; keep WS5 canary parked.
4. After corrective signoff → return to WS5 enablement checkpoint.

---

## STOP conditions honored this pass

- NO implementation
- NO DEV deploy
- NO Autonomous enablement
- NO WS5 canary
- NO WS6
- NO production
- NO commit/push
