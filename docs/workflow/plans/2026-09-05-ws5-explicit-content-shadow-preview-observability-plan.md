# Plan: WS5 Explicit Content Shadow Preview / Owner QA Observability

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Author | Planning Agent |
| Status | approved_with_changes (Formal Review 2026-09-05) |
| Workflow | managed-phase |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | WS5 Autonomous DEV Canary — Explicit shadow QA gate |
| Related corrective | `pre-ws5-catalog-profanity-autonomous-safety-gate` (ADR-FP-169) — **not amended**; this is a narrow observability corrective |
| Related | Checkpoint refresh `docs/workflow/reviews/2026-09-05-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-enablement-checkpoint-refresh.md` |
| Environment | `fresh-prints-dev` only |
| Constraint | Keep `catalogWorkflowMode=shadow` and `catalogAutonomousLiveEnabled=false` unchanged during QA |

---

## Goal

Let the owner run a controlled DEV design through enrichment in **shadow**, open it in AI Review, and clearly see whether automation **would** auto-approve, **would** mark Explicit Content, and **which** masker-effective `censoredTerms` it would write — **without** mutating real Explicit fields, Ready status, or Algolia publication — before any WS5 Autonomous enablement.

---

## Background

ADR-FP-169 signed Explicit automation that writes `isExplicitContent` + `censoredTerms` only on the Autonomous Ready path (`shouldPublishReady === true` → `markAiSuccess`). In shadow, policy-clear designs get `decision: "shadow"`, `wouldAutoApprove: true`, `shouldPublishReady: false`.

**Diagnostic (2026-09-05):**

| Question | Answer today |
|---|---|
| A. Would Auto Approve? | **Partial** — `smartProfile.provenance.automationDecision === "shadow"` + reason `shadow_would_auto_approve`; badge + “Shadow reasons”; no explicit “Would Auto Approve: YES” label |
| B. Would Mark Explicit? | **NO** — `classifyExplicitContentAutomation` is gated on `publishReady` in `aiEnrichmentCandidateCore.ts` |
| C. Proposed censoredTerms? | **NO** — not computed/persisted/exposed in shadow |

Matcher result is held only as transient `explicitContentAutomation` on the candidate when `publishReady`, then applied only in Ready write. `explicitContentArtworkEvidence` is deleted before persist. AI Review does **not** expose Explicit preview.

Owner vocabulary **43** is authoritative (deleted 3 defaults, added 1 custom). Not a discrepancy.

Owner gate: **EXPLICIT CONTENT SHADOW QA PASS** required before Autonomous.

---

## Scope

### In Scope

- Always run the **same** `classifyExplicitContentAutomation` (one implementation) whenever automation decision is computed — not only when `publishReady`
- Persist a **preview-only** Explicit proposal under existing Smart Profile provenance (no new root design field)
- Studio AI Review UI: clear Would Auto Approve / Would Mark Explicit / Proposed Censored Terms
- Reflect human Explicit authority and hard blockers accurately (preview mirrors future Autonomous rules)
- Align settings fail-closed preview with Autonomous: when `settingsReadFailed` and policy would otherwise auto-approve, force Needs Review + `explicit_automation_settings_unavailable` even in shadow (today keyed only on `publishReady`, so shadow never shows the fail-closed)
- Plan DEV-only Explicit shadow fixture (creation deferred to post-implement owner auth)
- Docs: DATA_MODEL / BACKEND / DECISIONS note; update WS5 readiness wording
- DEV Function + Studio deploy of this observability slice only (after implement/test; separate owner auth)

### Out of Scope

- Enabling Autonomous or running Autonomous canary
- Changing ADR-FP-169 Ready+Explicit write semantics
- Second matcher / second AI call / tag or reranker involvement
- Mutating six WS5 canary candidates
- Creating fixture in plan/review pass
- Portal product changes
- Production
- Prompt / normalizer / schema version bumps
- Restoring deleted vocabulary terms or removing owner custom term

---

## Diagnostic answers (plan record)

1. Does current shadow processing run the Explicit matcher? **NO** (only when `publishReady`)
2. If yes, where is result held? N/A (when Autonomous: transient `candidate.explicitContentAutomation`)
3. Is the result persisted (shadow)? **NO**
4. Does AI Review expose it? **NO**
5. Can owner see “would mark Explicit”? **NO**
6. Can owner see proposed censoredTerms? **NO**
7. Can current shadow UI satisfy requirement without source changes? **NO**
8. Smallest source change? Always classify → write preview on `smartProfile.provenance` → AI Review display; keep Ready Explicit write gated
9. Existing structure for preview? **`designs.smartProfile.provenance`** (already holds `automationDecision` / `automationReasonCodes`)
10. Data-model typing change? **YES** — additive optional provenance fields (shared types + DATA_MODEL)
11. Firestore Rules change? **NO** expected (CF Admin write; clients already cannot invent AI fields)
12. Functions deploy required? **YES** (DEV) for pipeline persistence
13. Studio source change? **YES** (AI Review presentation)
14. Portal change? **NO**
15. Prompt/normalizer/schema version change? **NO**
16. Second AI call? **NO**
17. Tags/reranker? **NO**
18. Human authority in preview? If protected → `wouldMarkExplicitContent=false` (or equivalent) + note suppressed; show detected surfaces as informational if useful; never imply overwrite
19. Other hard blockers? `Would Auto Approve: NO` + existing reason codes; optional “terminology detected” must not imply Ready
20. Same matcher? Call `classifyExplicitContentAutomation` once; shadow = preview persist; Autonomous = existing Ready write path
21. Current configured term for fixture? **YES** — prefer one of the owner’s current 43 terms (not a fake temp vocab term)
22. Safest fixture path? Staff DEV import/upload of simple text PNG with one configured term; no PR art; no SP/human Explicit authority; separate from six
23. Cleanup? Archive/delete disposable design after QA; leave vocabulary as owner-authored
24. Manual QA steps? See Manual Test section
25. Amend Explicit corrective or new? **Narrow WS5 observability corrective** (new plan); do not reopen ADR-FP-169 product decision
26. **[NEEDS OWNER DECISION]** — approve plan/review; authorize implement+DEV deploy; authorize fixture creation; later report `EXPLICIT CONTENT SHADOW QA: PASS`

---

## Affected Areas

### Files / Modules (expected)

- `functions/src/ai/aiEnrichmentCandidateCore.ts` — ungate classify; attach preview; fix fail-closed on `wouldAutoApprove`
- `functions/src/ai/aiEnrichmentPipeline.ts` — apply human-authority adjustment to preview at persist; keep real Explicit write Ready-only
- `packages/shared/src/types/catalog/smartProfile.types.ts` — additive provenance preview type
- `packages/shared/src/utils/explicitContentAutomation.ts` — reuse only (no second matcher)
- Studio: `AiReviewSmartProfileSection.tsx` (and/or small presentational helper) + CSS if needed
- Tests: candidate/pipeline/contract + Studio unit if present
- Docs: `DATA_MODEL.md`, `BACKEND.md` or AI notes, short ADR addendum or ADR-FP-170, WS5 checkpoint status

### Architecture Impact

- [x] Details: Same classifier; dual effect (preview vs Ready write). Preview lives in SP provenance already used for shadow automation observability. No layer violation.

### Security Impact

- [x] Details: Preview is staff-visible Studio metadata only. Must not write authoritative Explicit fields in shadow. Algolia already excludes provenance-only churn from Portal records — confirm preview fields stay provenance-only and do not project to search.

### Data Model Impact

- [x] Details: Additive optional fields on `smartProfile.provenance`, e.g.:

```ts
explicitAutomationPreview?: {
  wouldMarkExplicitContent: boolean;
  proposedCensoredTerms?: string[]; // omit when empty
  artworkHit: boolean;
  suppressedDueToHumanAuthority?: boolean;
  // optional: settingsUnavailable reflected via automationReasonCodes already
};
```

Naming finalized in implement to match repo style. No migration; old designs omit field until re-enriched.

### Backend Impact

- [x] Details: DEV redeploy of enrichment pipeline Functions that write designs (`enqueueAiEnrichment`, and any shared path used by reprocess / catalog reprocess job worker if they share candidate core). No mode/settings mutation callables required for this feature itself.

### UI / UX Impact

- [x] Details: AI Review Smart Profile (or adjacent automation) section shows:
  - Would Auto Approve: YES/NO (derive from `automationDecision === "shadow"` / reason `shadow_would_auto_approve` **or** persist explicit boolean if Formal Review prefers — prefer deriving from existing provenance for auto-approve to avoid duplication; Explicit preview needs new fields)
  - Would Mark Explicit Content: YES/NO
  - Proposed Censored Terms: list
  - Authority suppressed note when applicable
  - When hard blockers: Would Auto Approve NO + reasons; optional detected-terms note without implying Ready

### Migration Impact

- [x] None (additive optional fields)
- Forward: re-enrich fixture after DEV deploy
- Rollback: redeploy prior Function revisions; Studio UI ignores missing preview

---

## Approach

1. **Classify always** after automation decision (when SP built), using same `classifyExplicitContentAutomation` + settings vocabulary + transient artwork evidence; then delete evidence as today.
2. **Build preview payload** from classification + decision:
   - `artworkHit` / `proposedCensoredTerms` from classifier
   - `wouldMarkExplicitContent` = `wouldAutoApprove && artworkHit && terms.length > 0` (provisional); adjust in `markAiSuccess` when prior human authority protected → false + `suppressedDueToHumanAuthority`
3. **Fail-closed fidelity:** if `settingsReadFailed && wouldAutoApprove` (not only `publishReady`), set decision to needs_review, clear wouldAutoApprove, add `explicit_automation_settings_unavailable`, and set preview wouldMark false.
4. **Persist** preview on `smartProfile.provenance.explicitAutomationPreview` with the rest of SP write. **Never** set root `isExplicitContent` / `censoredTerms` unless existing Ready + `mayWriteExplicit` path.
5. **Studio:** present the three owner questions clearly; keep manual Explicit controls independent.
6. **Fixture (post-implement, owner-authorized):** DEV text artwork using one **current** configured term; enqueue under shadow; owner visual QA checklist; cleanup disposable design.
7. **Gate:** WS5 Autonomous remains blocked until owner reports `EXPLICIT CONTENT SHADOW QA: PASS`.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Shared unit | existing explicitContentAutomation + new preview assembly tests | yes |
| Functions contract | extend `explicitContentAutomation.contract.test.ts` | yes |
| Candidate/pipeline unit | shadow wouldApprove + hit → preview; Ready path still writes; shadow does not write root Explicit | yes |
| Studio unit | presentational mapping if extracted | yes if cheap |
| Typecheck / lint | package scripts for touched packages | yes |
| Build | studio + functions as usual for touched surface | yes |

### Manual

After DEV deploy + fixture:

1. Mode remains shadow / live false.
2. Process fixture → Needs Review / AI Review (not Ready).
3. UI: Would Auto Approve YES (if eligible); Would Mark Explicit YES; proposed terms match artwork / masker surfaces.
4. Root Explicit toggle and `censoredTerms` unchanged by automation.
5. No Algolia Ready publication for fixture.
6. Control: non-profane would-auto design → Would Mark Explicit NO.
7. Optional: design with hard blocker + term → Would Auto Approve NO; no Ready implication.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review — **EXPLICIT CONTENT SHADOW QA**
- [x] Business logic — owner confirms preview wording adequate
- [x] Fixture creation authorization (DEV-only)
- [ ] Production deploy — N/A this corrective
- [x] Other: Formal Review of this plan; implement only after approval; Autonomous still separately gated

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Preview drifts from Ready write | High | Single classifier; shared wouldMark formula; tests both paths |
| Shadow accidentally writes Explicit | Critical | Keep write behind `publishReady` + `mayWriteExplicit`; contract tests |
| UI implies Ready when blocked | Medium | Formal Review: blockers authoritative; detection secondary |
| Prior human authority mis-previewed | Medium | Adjust preview in `markAiSuccess` where prior is loaded |
| Algolia leakage | Low | Keep fields under provenance; confirm Portal projection excludes them |

---

## Rollback Plan

- Redeploy previous DEV Function revisions for enrichment write path
- Studio: omit UI if field absent (safe)
- No Firestore migration to reverse

---

## Documentation Updates Required

- [x] DATA_MODEL.md — provenance preview fields
- [x] BACKEND.md or AI enrichment notes — shadow Explicit preview
- [x] DECISIONS.md — short ADR (e.g. ADR-FP-170) for shadow preview observability
- [x] WS5 checkpoint / workflow state — blocked on Explicit Shadow QA
- [ ] STYLE_GUIDE.md — only if new UI pattern needs note

---

## Open Questions

- [x] **[NEEDS OWNER DECISION — IMPLEMENT + DEV DEPLOY]** after Formal Review approval
- [x] **[NEEDS OWNER DECISION — EXPLICIT SHADOW FIXTURE]** create disposable DEV design using a current configured term
- Formal Review: whether to show “terminology detected” when Would Auto Approve is NO (recommended: yes, secondary, non-Ready)

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-05-ws5-explicit-content-shadow-preview-observability-review.md`
- Verdict: **approved_with_changes**
