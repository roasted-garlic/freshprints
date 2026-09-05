# Review: WS5 Explicit Content Shadow Preview / Owner QA Observability

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-ws5-explicit-content-shadow-preview-observability-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Plan correctly diagnoses that Explicit classification today runs only on `publishReady`, so shadow cannot show Would Mark Explicit / proposed `censoredTerms`. The proposed fix — reuse one classifier, persist preview under `smartProfile.provenance`, never mutate root Explicit fields in shadow — matches ADR-FP-169 and existing shadow automation observability. Approved with a short list of implement-time constraints below. **No implementation in this pass.**

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Observability only; Autonomous write path unchanged |
| Architecture alignment | pass | Shared util + SP provenance; Studio reads CF-written fields |
| Security impact addressed | pass | No client-authored Explicit authority; preview staff-only |
| Data model impact addressed | pass | Additive optional provenance; no migration |
| Backend impact addressed | pass | DEV Functions redeploy required after implement |
| Test strategy adequate | pass | Must include “shadow does not write root Explicit” |
| Human checkpoints identified | pass | Shadow QA PASS gate; fixture auth; no Autonomous |
| Roadmap alignment | pass | WS5 gated on Explicit shadow QA before canary |
| Documentation plan | pass | DATA_MODEL + ADR + WS5 state |
| No silent scope expansion | pass | Does not reopen ADR-FP-169 product decision |

---

## Architecture Review

**Findings:**

- Confirmed gap in `aiEnrichmentCandidateCore.ts`: `classifyExplicitContentAutomation` only inside `if (publishReady)`.
- Shadow already persists `automationDecision` / `automationReasonCodes` on provenance — correct home for Explicit preview.
- Dual-effect design (preview vs Ready write) avoids matcher drift.
- Settings fail-closed currently keyed on `publishReady` only → shadow never surfaces `explicit_automation_settings_unavailable`; aligning on `wouldAutoApprove` is required for preview fidelity.

**Required changes:**

- [x] Implement must keep **one** call to `classifyExplicitContentAutomation` (or single helper wrapping it) feeding both preview and Ready write payload — no parallel fuzzy/heuristic path.
- [x] Confirm Algolia / Portal projection still drops provenance-only fields (including new preview).

---

## Security Review

**Findings:**

- Shadow must not set `isExplicitContent` / overwrite `censoredTerms`.
- Preview must not claim Autonomous would override protected human Explicit authority.
- Fixture must avoid customer Print Request artwork.

**Required changes:**

- [x] Contract/unit tests: shadow path with artwork hit → preview present, root Explicit fields unchanged.
- [ ] None beyond plan for production (DEV only).

**Human approval needed before production:**

- [x] Not applicable this corrective (production not authorized).

---

## Data Model Review

**Findings:**

- Additive `smartProfile.provenance.explicitAutomationPreview` (or equivalent repo-consistent name) is acceptable.
- Do not invent a new root design field.
- `wouldAutoApprove` need not be duplicated if UI derives from `automationDecision === "shadow"` + `shadow_would_auto_approve`; Explicit preview fields are required.

**Required changes:**

- [x] Omit empty `proposedCensoredTerms` on Firestore persist (match SP empty-array omit convention).
- [x] Update DATA_MODEL in same implement workflow.

---

## Backend Review

**Findings:**

- Functions sharing candidate core / `markAiSuccess` need DEV redeploy.
- `updateCatalogWorkflowMode` / settings callables unchanged for this feature.
- Mode stays shadow / live false during owner QA.

**Required changes:**

- [x] Fail-closed: trigger on `settingsReadFailed && wouldAutoApprove` (not only `publishReady`).
- [x] Human-authority suppression applied where prior design is available (`markAiSuccess`).

---

## Testing Review

**Findings:**

- Automated coverage for classify-always + preview persist + Ready write regression is mandatory.
- Manual owner Shadow QA is the release gate for WS5 Autonomous — not optional.

**Required changes:**

- [x] Include negative cases: hard blocker + term; human authority + term; no artwork hit.

---

## Documentation Review

**Findings:**

- Plan docs list is sufficient.
- Checkpoint vocabulary note corrected: 43 is owner-authoritative (not a missing-defaults error).

---

## Owner product requirements vs plan (Formal Review)

| Requirement | Verdict |
|---|---|
| Same classifier reused | pass (required) |
| Shadow does not mutate real Explicit fields | pass (required + tests) |
| No Ready publication in shadow | pass (unchanged dual gate) |
| Preview mirrors future Autonomous behavior | pass (incl. fail-closed + human authority) |
| UI sufficient for owner visual QA | pass with changes (clear YES/NO labels, not badge-only) |
| Human authority reflected | pass |
| Other blockers authoritative | pass — Formal Review **recommends** optional secondary “terminology detected” when Would Auto Approve is NO, clearly non-Ready |
| No second AI call / no tag dependency | pass |
| No customer PR / production impact | pass |

---

## Required Changes (approved_with_changes)

1. UI must use explicit owner-facing labels (Would Auto Approve / Would Mark Explicit Content / Proposed Censored Terms), not rely solely on the existing `shadow` badge.
2. Implement fail-closed fidelity for shadow (`wouldAutoApprove` path), not only live `publishReady`.
3. When hard blockers exist, Never present Explicit preview as if the design would Ready; secondary detection OK if labeled informational.
4. Prefer a **current owner-configured** vocabulary term for the shadow fixture (not a temporary fake term unless owner later directs otherwise).
5. Do not treat vocabulary count 43 as drift; do not restore/remove owner terms.

---

## Blockers (if blocked)

None for planning. Implementation blocked until owner authorizes implement + DEV deploy. Autonomous remains blocked on Shadow QA PASS.

---

## Verdict Rationale

`approved_with_changes` — architecture and scope are sound; listed changes are implement constraints, not plan rewrites. This is a **narrow WS5 observability corrective**, not an amendment of ADR-FP-169’s Autonomous Ready+Explicit write contract.

---

## Next Step

**STOP for owner.** After owner authorizes implementation:

1. Implement approved scope (+ required changes)
2. Test
3. Owner-authorized DEV Function + Studio deploy
4. Owner-authorized fixture creation + enqueue under shadow
5. Owner reports `EXPLICIT CONTENT SHADOW QA: PASS|FAIL`
6. Only then reconsider WS5 Autonomous canary authorization

**Do not** implement, deploy, create fixture, enable Autonomous, or run canary in this pass.
