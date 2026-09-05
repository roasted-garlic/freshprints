# Plan: Explicit Content — Standard Enrichment Classification (Post-WS5 Corrective)

| Field | Value |
|---|---|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | **approved** — Formal Review `approved_with_changes` 2026-09-05; implement not authorized |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Corrective | Explicit Content Standard Enrichment Classification |
| Phase alignment | **Post-WS5 corrective prerequisite before WS6** |
| Environment | `fresh-prints-dev` (plan/review only this pass) |
| Authorization this turn | **Plan + Formal Review ONLY** — no implement / deploy / Autonomous / WS6 / commit / production |
| Runtime baseline | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` (**unchanged**) |
| Related ADRs | ADR-FP-169 (write-on-Ready); ADR-FP-170 (shadow preview); proposed **ADR-FP-172** supersedes write-semantics |

---

## Goal

Make deterministic Explicit Content classification **standard catalog enrichment metadata**: when enrichment detects owner-configured artwork terms, persist real root `isExplicitContent=true` and masker-effective `censoredTerms` **independently** of Autonomous dual-gate Ready approval, shadow vs autonomous mode, and unrelated hard blockers — while preserving human authority, fail-closed settings behavior, Portal masking consumers, and no customer Print Request impact.

---

## Background / owner product decision

After WS5 Signoff (**PASS UNDER MODEL 2**), the owner changed product rules:

| Concern | Rule |
|---|---|
| Explicit classification | Metadata enrichment (like title / description / category / Smart Profile) |
| Autonomous approval | Lifecycle automation (Ready vs Needs Review) only |

**Prior WS5-era contract (correct then; not erased):** ADR-FP-169/170 — classify always for preview; root Explicit writes only on Autonomous Ready (`publishReady`). Shadow persisted `explicitAutomationPreview` only.

**This corrective supersedes write-semantics only.** Historical WS5 docs remain valid for the contract that existed at canary time.

---

## Current behavior (source-locked)

### Classifier execution point

`functions/src/ai/aiEnrichmentCandidateCore.ts` — after `computeCatalogAutomationDecision`, when `smartProfile && automationDecision`:

1. Build artwork evidence via `simpleCatalogEnrichmentResponse` → `explicitContentArtworkEvidence`
2. `classifyExplicitContentAutomation({ artworkEvidenceLines, title, description, vocabularyTerms })`
3. Always set `smartProfile.provenance.explicitAutomationPreview`
4. Build `explicitContentAutomation` write payload **only if** `publishReady && artworkHit && censoredTerms.length > 0`

### Real Explicit persistence point

`functions/src/ai/aiEnrichmentPipeline.ts` → `markAiSuccess`:

```text
mayWriteExplicit = publishReady && options.explicitContentAutomation && !protectedHumanExplicitAuthority
```

Root fields written **inside** the `publishReady` Ready branch only (`status=ready`, `aiReviewedBy=system:catalog-autonomy`, …).

### Why shadow does not write root fields

Dual gate off → `shouldPublishReady=false` → `publishReady=false` → candidate never builds write payload / pipeline never writes root Explicit.

### Behavior when other hard blockers exist

`publishReady=false` → preview only; root Explicit **not** written (even if artwork match exists).

### Current human authority mechanism

`hasProtectedHumanExplicitAuthority` (`packages/shared/src/utils/explicitContentAutomation.ts`):

- any **boolean** `isExplicitContent` (true **or** false) → protected
- any **non-empty** `censoredTerms` → protected

**Gap:** root-field presence alone cannot distinguish **automation-produced** vs **staff** authority. After this corrective’s first auto-write, reprocess would treat automation fields as “human” under the current helper — blocking term updates and conflating sources.

**Plan requirement:** introduce the **smallest** durable distinction (see Authority below). Do not invent fields without Formal Review acknowledgment.

### Settings failure today

`settingsReadFailed && wouldAutoApprove` → force Needs Review + `explicit_automation_settings_unavailable`. Defaults may still load seed vocabulary on catch path — Explicit root write currently gated by Ready anyway.

---

## New contract

### Persistence point (proposed)

Keep classification in `aiEnrichmentCandidateCore` (after decision is fine for logging; classification itself remains independent of Ready).

Change write gate in candidate + `markAiSuccess`:

| Condition | Persist root Explicit |
|---|---|
| artworkHit + non-empty masker-effective terms | YES (set true + terms) |
| protected **staff** Explicit authority | NO (preserve staff) |
| `settingsReadFailed` | NO Explicit auto-write (fail closed on classification write) |
| `publishReady` | **irrelevant** to Explicit write |
| other hard blockers | **irrelevant** to Explicit write |
| shadow / autonomous mode | **irrelevant** to Explicit write |

Write Explicit fields on the **same** Firestore `designs/{id}` update that already persists Smart Profile / suggestions / lifecycle — extend the non-Ready branch to include Explicit when authorized, rather than nesting only under Ready. Avoid a second Firestore round-trip.

`ready_backfill` mode: apply the same standard Explicit write rules when classification hits and staff authority does not protect (backfill is enrichment).

### Case matrix

| Case | Expected |
|---|---|
| A Shadow + match + policy-clear | Explicit ON + terms; remains Needs Review; no system approval; no Ready publication |
| B Shadow + match + other hard blocker | Explicit ON + terms; Needs Review for blocker |
| C Autonomous + match + policy-clear | Explicit ON + terms; may Ready + publish (existing proved path; no regression) |
| D Autonomous + match + hard blocker | Explicit ON + terms; Needs Review; no Ready publish |

### Explicit-only behavior

- Detection alone is **not** a hard blocker
- Detection alone does **not** Ready a design
- Configured profanity remains non-blocking for lifecycle (ADR-FP-169 intent preserved)

### Automatic clearing — owner default (conservative)

| Automation may | Automation must not |
|---|---|
| SET Explicit true when match | Automatically clear Explicit to false because a later run misses the term |
| SET/refresh masker-effective terms when **automation-authored** and match persists/changes | Erase staff terms or flip staff Explicit=false/true |
| | “Heal” by removing automation terms solely due to non-detection |

Staff may clear/edit via existing Studio UI; staff action becomes authoritative.

**[NEEDS OWNER DECISION — AUTOMATED EXPLICIT CLEARING]** — Plan default is **NO automatic clearing**. Confirm at implement authorization if owner wants any exception (none recommended).

### Human authority (required implement detail)

Preserve:

- Staff Explicit=true not overwritten incorrectly
- Staff Explicit=false not silently flipped
- Staff-edited / staff-owned `censoredTerms` not replaced
- Staff clear/override survives reprocess

**Smallest proposed distinction (Formal Review to confirm exact shape):**

Add durable provenance, e.g. root or nested:

- `explicitContentSource: "staff" | "automation"` (or equivalent existing staff-edit pattern if found)

Rules:

1. Staff UI save sets source=`staff` (and/or staff-edited marker)
2. Automation writes only when source is absent/`automation` (or no staff marker) **and** not staff-protected false/true per staff marker
3. Once source=`staff`, automation never mutates Explicit fields
4. Automation-sourced fields: may SET/update terms on match; must **not** auto-clear on non-match

Until source distinction ships, do **not** rely on current `hasProtectedHumanExplicitAuthority` alone for post-auto-write reprocess correctness.

Coordinate with known **WS6 decision-before-authority-merge** investigation: Explicit authority must not be decided from AI profile alone after staff merge; Explicit root fields are design-level, not Smart Profile dimensions — keep Explicit classification after prior-read of root fields inside `markAiSuccess` (already loads `priorData`).

### Settings failure

| Mode | Behavior |
|---|---|
| Shadow | No Explicit auto-write when `settingsReadFailed`; preview may note unavailable; design Needs Review as today |
| Autonomous otherwise Ready | Keep fail-closed Needs Review + `explicit_automation_settings_unavailable` |
| Explicit metadata | Do **not** write using silent default vocabulary when settings read failed |
| Automation Health | Existing settings-unavailable logging/reason code remains; extend only if needed for Explicit-skip visibility |

### Vocabulary / matcher

Unchanged:

- `settings/aiEnrichment.explicitContentAutomationTerms` (DEV authoritative **43**)
- intentional `[]` = no matching
- B-light deterministic matcher; unique masker-effective surfaces; no fuzzy; no second AI; no tags/reranker
- Title/description contribute only under existing artwork-hit rules
- Customer Print Requests / Portal PR uploads **out of scope**

---

## UI / provenance

### Current preview implications

Studio AI Review (`AiReviewSmartProfileSection.tsx`) shows **Would Mark Explicit Content** / **Proposed Censored Terms** from `explicitAutomationPreview`. After real shadow writes, “Would Mark” becomes **misleading**.

### Required UI adjustment (smallest truthful)

Replace hypothetical wording with detection/applied wording aligned to existing Studio patterns, e.g.:

- Explicit Content Detected / Auto-classified: YES/NO
- Detected Censored Terms: …
- Real Explicit toggle on the form reflects ON when root field written
- Suppression still shown when staff authority blocks automation

Exact copy finalized at implement against `STYLE_GUIDE` / existing AI Review labels.

### Provenance adjustment

Keep `smartProfile.provenance.explicitAutomationPreview` for diagnostics (`artworkHit`, terms, suppression).

Adjust semantics:

| Field | New meaning |
|---|---|
| `wouldMarkExplicitContent` | Prefer rename or redefine to “would/did apply automation write under authority rules” — Formal Review: prefer additive `applied` / `detected` flags over contradictory `wouldMark` if cheap; avoid `smart-profile-v1` bump for cosmetic rename alone |
| `proposedCensoredTerms` | May remain as detected terms (even when applied) |

No schema version bump solely for cosmetic rename.

---

## Atomicity

One `markAiSuccess` update should leave coherent:

- Smart Profile (+ provenance)
- title/description/category suggestions
- Explicit root fields (when applicable)
- lifecycle (`needs_review` or Ready)
- no orphan Explicit without enrichment success write

Do not attach Explicit to a separate fire-and-forget write.

---

## Affected files / modules (expected)

| Area | Paths |
|---|---|
| Shared classifier / authority / preview | `packages/shared/src/utils/explicitContentAutomation.ts` (+ tests); `packages/shared/src/types/catalog/smartProfile.types.ts`; constants unchanged unless ADR notes |
| Candidate | `functions/src/ai/aiEnrichmentCandidateCore.ts` |
| Persistence | `functions/src/ai/aiEnrichmentPipeline.ts` |
| Contract tests | `functions/src/ai/explicitContentAutomation.contract.test.ts` |
| Studio UI | `apps/studio/.../AiReviewSmartProfileSection.tsx`; `explicitAutomationPreviewDisplay.ts` (+ tests); possibly AI Review form seed if needed |
| Docs | `docs/project/DECISIONS.md` (**ADR-FP-172**); `DATA_MODEL.md` if new authority field; ROADMAP/status |
| Portal | **None expected** (consumes existing fields) |
| Customer PR | **None** |

Exact touch list refined at implement via repo search — `[NEEDS REPO CHECK]` for any staff-edit write path that must set `explicitContentSource=staff`.

---

## Out of scope

- Implement/deploy this pass
- Autonomous enablement / WS6 live validation
- Prompt/normalizer/schema/model changes
- Tag/reranker retirement
- Customer Print Request scanning
- Portal masking redesign
- Full WS5 canary rerun (unless Formal Review finds regression necessity — prefer focused regression)
- Automatic Explicit clearing (unless owner later decides otherwise)
- Production / commit / push

---

## Test strategy

### Automated (minimum)

1. Shadow + one configured artwork term → root Explicit true + terms; lifecycle Needs Review; no system actor
2. Shadow + term + unrelated hard blocker → Explicit written + Needs Review
3. Shadow + no term → no new automatic Explicit classification
4. Autonomous + policy-clear + term → Ready + Explicit + publish path fields (unit/contract)
5. Autonomous + term + hard blocker → Explicit written + Needs Review; no Ready
6. Multiple terms → unique masker-effective forms
7. Obfuscated supported term → correct surface
8. False-positive boundary (`ass` ∉ `class` / `assassin`)
9. Owner `[]` vocabulary → no hidden fallback matching
10. Settings read failure → no Explicit auto-write + Autonomous fail-closed preserved
11. Human Explicit=true preserved
12. Human Explicit=false preserved
13. Staff custom censoredTerms preserved
14. Staff clears/overrides then reprocess → staff authority survives
15. Automation-sourced reprocess with new match → terms update allowed; non-match does **not** auto-clear
16. No second AI call / no tag dependency (contract assertions)
17. Preview/provenance truthful after applied write
18. Portal masking unit tests still pass (existing)

### Manual / owner QA (DEV)

- Shadow fixture with known term: Explicit ON in AI Review / Design form while Needs Review
- Hard-blocker + term: both visible
- Staff override round-trip
- Confirm no Ready/Algolia publication from Explicit alone
- Confirm customer PR artwork untouched

### WS5 full rerun

**Not required** for Signoff of this corrective if focused matrix passes. Optional smoke only if implement regresses Ready+Explicit path.

---

## Deploy / release (after future implement approval)

| Item | Expected |
|---|---|
| Functions DEV deploy | **YES** (enrichment pipeline) |
| Studio DEV | **YES** if UI label changes ship |
| Portal deploy | **NO** unless unexpected |
| Rules / indexes / migrations | **NO** (optional additive field; no collection reshape) |
| Owner QA | **YES** before treating WS6 unblocked |
| Production | **NOT AUTHORIZED** |

Gate during plan/implement: keep `catalogWorkflowMode=shadow`, `catalogAutonomousLiveEnabled=false` unless separate owner auth.

---

## Rollback

1. Redeploy prior Functions revision restoring Ready-only Explicit write gate
2. Revert Studio preview labels if shipped
3. Designs already auto-marked Explicit in DEV remain until staff clear (acceptable; document)
4. Restore ADR note if needed

---

## WS5 historical treatment

- WS5 Signoff remains **valid** for the then-current contract
- Do not rewrite WS5 execution as if root shadow writes already existed
- This corrective is a **new** post-WS5 product decision

## WS6 relationship

**WS6 Plan/implement/live Autonomous broader validation remains blocked** until this corrective is implemented, reviewed, DEV-deployed, and owner-QA’d (or owner explicitly waives — not recommended).

Broader unattended processing should use final enrichment semantics (Explicit as standard metadata).

---

## ADR recommendation

Create **ADR-FP-172: Explicit Content as standard enrichment metadata**.

- Supersedes **write-semantics** of ADR-FP-169 item “Ready-only root write”
- Supersedes ADR-FP-170 item “Shadow must not mutate root Explicit”
- Retains: vocabulary model, matcher, non-blocker rule, human-over-automation intent, no second AI, Portal consumer fields
- Mark ADR-FP-169/170 with “partially superseded by ADR-FP-172 (write timing)” — do not delete

---

## Human checkpoints

1. Formal Review of this Plan
2. **[NEEDS OWNER DECISION — AUTOMATED EXPLICIT CLEARING]** confirm NO (recommended)
3. Separate owner authorization to **implement** (not granted by this Plan alone)
4. After implement: DEV deploy + owner QA before WS6 Plan proceeds

---

## Risks

| Risk | Mitigation |
|---|---|
| Authority conflation after auto-write | Mandatory source/staff marker in implement |
| Misleading “Would Mark” UI | Truthful labels in same implement |
| Settings failure using seed vocab | Skip Explicit write when `settingsReadFailed` |
| Accidental Ready/publication | Explicit write never sets lifecycle; dual gate unchanged |
| Scope creep into WS6 | Explicit WS6 blocked until corrective complete |

---

## Acceptance criteria

- Explicit classification is standard enrichment metadata
- Autonomous OFF does not suppress real Explicit writes
- Needs Review / other blockers do not suppress real Explicit writes
- Explicit detection alone is not a blocker and does not approve
- Human authority remains higher than automation (with distinguishable staff source)
- Portal masking fields remain correct; Needs Review still not published
- Customer Print Requests unaffected
- No second AI call; no Gemini semantic Explicit judgment; no tag/reranker dependency
- v34 / v6 / v1 unchanged
- Gate remains shadow / false during this planning pass
