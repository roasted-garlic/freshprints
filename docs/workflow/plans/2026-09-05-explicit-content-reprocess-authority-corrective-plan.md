# Plan: Explicit Content Reprocess Authority Corrective (+ Cucumber Diagnostic)

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | **ready_for_review** |
| Workflow | managed-phase (corrective under parent goal) |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Related review | `docs/workflow/reviews/2026-09-05-explicit-content-reprocess-authority-corrective-review.md` |
| Parent corrective | ADR-FP-172 Explicit as standard enrichment (`2026-09-05-explicit-content-standard-enrichment-classification-plan.md`) |
| Impact classification | Documentation + Application (Functions/shared/Studio); **not** Starter Surface |

---

## Goal

Correct Explicit Content **reprocess authority** so that ordinary staff edits to Explicit / `censoredTerms` are **provenance of the current value**, not a permanent lock against future deterministic classification. On staff-requested AI reprocess, a positive configured-term match may re-apply Explicit metadata unless a **separate, deliberate** staff override/lock exists.

Preserve: **NO AUTOMATED CLEARING** on non-match; Explicit remains non-blocking; shadow/Autonomous lifecycle separation; gate stays shadow / live false until separately authorized.

Also record the cucumber / “Go Fuck Yourself” Needs Review diagnostic: **contract-correct hard blocker** (not profanity); no cucumber source change in this corrective.

---

## Background

### QA C product correction

| Item | Detail |
|---|---|
| Fixture | `CqkwDf1BOll43yojGd5Y` |
| Old QA C expectation | Staff clear survives reprocess permanently |
| Observed | Explicit OFF, `damn` gone, `explicitContentSource=staff` suppressed re-apply — **matched ADR-FP-172 implement** |
| Owner judgment | **FAIL** against newly clarified desired product behavior |
| Classification | **PRODUCT REQUIREMENT FAIL / CONTRACT CORRECTIVE REQUIRED** (not a silent bug against old Plan) |

Owner clarification: staff toggling Explicit / editing terms ≠ permanent “do not auto-classify.” Reprocess is an explicit request to recompute enrichment metadata, including Explicit classification.

### ADR-FP-172 status

- QA A: **PASS WITH NOTES** (helper copy)
- QA B: **PASS BY AUTOMATED / CONTRACT PROOF**
- QA C: **PRODUCT REQUIREMENT FAIL / CONTRACT CORRECTIVE REQUIRED**
- Signoff of ADR-FP-172: **blocked** until this corrective is implemented, tested, reviewed, and QA’d

---

## Repo inspection — authority precedents

| Pattern | Location | Behavior | Fit for Explicit? |
|---|---|---|---|
| `staffEditedDimensionKeys` | Smart Profile provenance | Protects **named dimensions** across enrichment merge; does **not** lock entire design forever | Closest conceptual precedent: **field-level preserve**, not inferred permanent ban from any edit |
| `halftoneStaffDecision` | Design root | Explicit staff decision object for Halftone | Precedent for **separate staff decision payload** |
| `explicitContentSource` (current) | Design root | `"staff" \| "automation"`; **any staff stamp blocks all future auto writes** | Too coarse — conflates last-writer provenance with permanent override |

**Conclusion:** Prefer keeping `explicitContentSource` as **last-writer provenance only**. Add a **separate** deliberate override/lock if permanent suppression is required. Exact lock field/UI: **[NEEDS OWNER DECISION]** after Formal Review recommendation.

---

## Desired contract (cases)

### CASE 1 — Positive match, no override lock

Reprocess/enrichment detects configured term; no deliberate override lock.

→ Write Explicit ON + masker terms + `explicitContentSource=automation`  
→ **Even if** prior staff edited toggle/terms.

### CASE 2 — No match (no auto-clear)

Prior automation or staff Explicit state; current enrichment has no match.

→ **Do not** set false / erase terms / clear provenance solely due to non-match.  
→ Owner decision **NO AUTOMATED CLEARING** unchanged.

### CASE 3 — Staff field edit + later positive reprocess

Staff edited Explicit/terms (stamps provenance `staff`). No override lock. Later reprocess detects term.

→ Automation **may apply again** (this is the missing behavior).

### CASE 4 — Explicit override / lock

Staff deliberately locks “do not auto-classify Explicit on this design.”

→ Reprocess must respect lock.  
→ Schema/UX **[NEEDS OWNER DECISION]** — Plan recommends smallest additive boolean or enum; do not ship without owner choice.

---

## Recommended approach (for Review confirmation)

1. **`explicitContentSource`** = provenance of latest Explicit root write only (`staff` | `automation`). Does **not** grant permanent protection.
2. **`hasProtectedStaffExplicitAuthority`** (or successor) stops treating `source===staff` / legacy fields as permanent write-block. Replace with check of **override/lock only** (plus settings-fail skip).
3. **Override/lock** (recommended name pending owner): e.g. `explicitContentAutomationLocked: true` or `explicitContentAutomationMode: "automatic" | "staff_locked"` — set only via explicit Studio control, never inferred from toggle/terms edit alone.
4. **Legacy / existing DEV `"staff"` stamps:** reinterpret as provenance; **no migration** preferred. After deploy, reprocess may re-apply on match (desired). Optional: treat missing source + Explicit fields as provenance-only as well.
5. **AI Review + Design Library:** continue stamping `explicitContentSource=staff` on field edits; **do not** set lock unless staff uses lock control.
6. **Reprocess:** always run classifier; apply write when match && !locked && !settingsReadFailed.
7. **Settings failure:** unchanged — skip Explicit auto-write; Autonomous fail-closed `explicit_automation_settings_unavailable`.
8. **ADR:** add ADR-FP-173 (or amend ADR-FP-172 authority section) for reprocess semantics; do not delete ADR-FP-172 enrichment timing decisions.
9. **UI:** update helper copy to state reprocess may re-apply unless locked; add lock control if Case 4 ships.
10. **Rules:** if new lock field is client-writable → additive allowlist (same class as ADR-FP-172 Rules note).
11. **Cucumber:** diagnostic only — **no** calibration change in this Plan.

---

## Cucumber diagnostic (not in implement scope unless Review finds defect)

| Field | Value |
|---|---|
| Design ID | **`Y2IQuCgAPgnqrBIeJuap`** (single match) |
| Catalog title | `1 (31)` |
| AI title | `When Life Gives You Cucumbers Go Fuck Yourself` |
| Category | Funny & Sarcastic |
| Lifecycle | `imported` / `needs_review` |
| `automationDecision` | `needs_review` |
| Reason codes | `category_alternatives_present` (**soft**); `structured_evidence_gap:subjects:woman` (**hard**) |
| `wouldAutoApprove` | **NO** (hard blocker present) |
| Explicit | ON · source `automation` · terms `["fuck"]` · preview applied/detected |
| Prompt/model | v34 / gemini-2.5-flash-lite / normalizer v6 / smart-profile-v1 |

**Profanity as blocker?** **NO** — `fuck` correctly Explicit-only.

**Exact auto-approve barrier:** lexical evidence gap for Smart Profile subject `woman` (structured evidence contract). Soft category alternatives alone would not block.

**Source defect?** **NO** — contract-valid conservative Needs Review (same family as TD-034 visual-object lexical friction). Do **not** loosen evidence rules in this corrective.

**Shadow note:** Autonomous OFF correctly prevents Ready; here `wouldAutoApprove` is also false due to hard blocker — not merely “shadow held back.”

---

## Scope

### In Scope

- Explicit reprocess authority semantics (shared helpers, pipeline protection, Studio stamp vs lock)
- Tests for Cases 1–4 and no-auto-clear
- Docs: ADR, DATA_MODEL, helper copy
- Optional lock UI/field if owner approves Case 4 shape
- Replacement owner QA for old QA C

### Out of Scope

- Changing cucumber / structured_evidence_gap validators
- Enabling Autonomous / WS6
- Automated clearing on non-match
- Tag/reranker / prompt / normalizer / schema version bumps (unless additive lock field docs only)
- Customer Print Requests / Portal consumer redesign
- Production

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/utils/explicitContentAutomation.ts` (+ tests)
- `functions/src/ai/aiEnrichmentPipeline.ts`
- `functions/src/ai/aiEnrichmentCandidateCore.ts` (if protection consulted earlier)
- `functions/src/ai/explicitContentAutomation.contract.test.ts`
- Studio: `designService.ts`, AI Review / Design form (stamp + optional lock UI), helper copy
- `firestore.rules` if new client-writable lock field
- `docs/project/DECISIONS.md`, `docs/architecture/DATA_MODEL.md`

### Architecture / Security / Backend

- Catalog enrichment metadata only; no new customer callables; secrets unchanged

### Data Model

- Reinterpret `explicitContentSource`; optional additive lock field — prefer **no migration**

### UI

- Helper truthfulness; optional “lock auto Explicit” control **[NEEDS OWNER DECISION]**

### Migration

- Prefer **none** — behavior reinterpretation of existing `staff` stamps

---

## Test Strategy

| Check | Required |
|---|---|
| Case 1 positive match no lock → write | YES |
| Case 2 no-match → no clear | YES |
| Case 3 prior staff provenance + positive reprocess → write | YES |
| Case 4 lock present → no write | YES (if lock ships) |
| Explicit non-blocking / no profanity hard-blocker codes | YES |
| Settings-fail skip write | YES |
| Contract: pipeline still not Ready-gated | YES |
| Studio display / helper regression | YES |
| Cucumber evidence rules | **NO change** |

### Replacement QA C (after implement + DEV deploy)

1. Fixture with configured term → Explicit ON (automation)  
2. Staff OFF + clear terms + save (provenance staff, **no lock**)  
3. Reprocess → Explicit ON again + terms restored  
4. If lock UI exists: lock → reprocess → stays staff decision  

Keep fixtures `Cqkw…` / `UB7…` until disposition complete; do not touch `03cbj1cIFH7Bavt38XBX`.

---

## Human Checkpoints

1. **[NEEDS OWNER DECISION]** Ship Case 4 lock in this corrective vs defer lock to later (default automatic-only until lock exists)?  
2. Exact lock field name / Studio placement  
3. Authorize implement separately after Review  
4. DEV deploy + replacement QA C before ADR-FP-172 / this corrective Signoff  

---

## Risks

| Risk | Mitigation |
|---|---|
| Existing staff-stamped Explicit re-applied on bulk reprocess | Documented desired; optional lock before bulk ops |
| Conflating with Smart Profile staff keys | Explicit-only change; do not weaken SP staffEditedDimensionKeys |
| Rules allowlist miss for new field | Stop / additive Rules if field client-written |

---

## Rollback

Redeploy prior Functions/Studio that treated `staff` source as permanent suppress; retain no-auto-clear.

---

## Stop Conditions (this pass)

Plan + Formal Review only. **No implementation. No deploy. No Autonomous. No WS6. No commit/push. No production.**
