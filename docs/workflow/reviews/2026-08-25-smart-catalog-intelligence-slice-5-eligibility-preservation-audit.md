# Audit: Slice 5 Eligibility + Staff-Edit Preservation

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Author | Planning Agent |
| Workflow | managed-phase — Slice 5 Plan support (read-only) |
| Plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-5-plan.md` |
| Scope | Repo evidence only — **no mutations** |

---

## 1. Eligibility audit (`targetType = ai_review_queue`)

### Closest existing product contract — Needs Review inbox

| Source | Filter |
|--------|--------|
| `apps/studio/.../ai-review/constants/aiReviewInboxConstants.ts` → `buildAiReviewInboxListQuery` | `status: "imported"`, `aiReviewStatus: "needs_review"` |
| `apps/studio/.../ai-review/utils/aiReviewInboxEligibility.ts` → `designMatchesInboxTab("needs_review")` | Same |
| `functions/src/ai/enqueueAiEnrichmentValidation.ts` → `isRerunFromReviewEligible` | `status === "imported" && aiReviewStatus === "needs_review"` |

### Catalog Reprocess today

| Source | Behavior |
|--------|----------|
| `functions/src/catalogReprocess/catalogReprocessCallables.ts` → `estimateEligibleCount` | **Stub:** returns `0`; comment says Slice 5/6 |
| `packages/shared/.../catalogReprocess.constants.ts` | `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED = false` |
| `functions/src/catalogReprocess/onCatalogReprocessJobWritten.ts` | Non-dry-run → `lastError: "slice_execution_not_enabled"` |

**Verdict:** Eligibility **contract** exists in inbox + enqueue validation. Reprocess **query/execution does not exist yet** — Slice 5 must implement (feature-gated Start).

### Recommended eligible / excluded matrix

| Case | Include? | Rationale |
|------|----------|-----------|
| `imported` + `needs_review` | **Yes** | Parent §12 + inbox + rerun |
| `rejected` | No | Separate lifecycle; parent excludes |
| `archived` | No | Not AI Review mutable |
| `ready` / `aiReviewStatus: approved` | No | Slice 6 |
| `imported`/`processing` + `aiReviewStatus: pending` | No | Processing tab |
| `aiProcessingStage: failed` while pending | No | Retry via Processing |
| Already `catalog-enrich-v29` / normalizer-v3 | **Yes** (plan default) | Calibration consistency |
| Missing Smart Profile / v27 / v28 | **Yes** | Migration targets |

---

## 2. Preservation audit (field classifications)

Evidence paths:

- Approve/save: `aiReviewInboxService.approveFromInbox`, `updateArtworkBackgroundFromInbox`
- Reset: `functions/src/resetAiEnrichmentForProcessing.ts`
- Success write: `functions/src/ai/aiEnrichmentPipeline.ts` → `markAiSuccess`
- Types: `design.types.ts`, DATA_MODEL.md (halftone ADR-FP-080, artwork background)

| Field | Staff can change in AI Review? | Reset deletes? | Pipeline overwrites root? | **Class** |
|-------|--------------------------------|----------------|---------------------------|-----------|
| `aiSuggestions` | Seed/display only (Functions-owned) | Yes | Yes (replace) | **A REGENERATE** |
| `aiAnalysis` | No (Functions-owned) | Yes | Yes | **A** |
| `smartProfile` | No (Functions-owned) | Yes (reset); enqueue asymmetry noted | Yes | **A** |
| `aiProcessingStage` / request overrides | Operational | Cleared | Rewritten | **A** |
| `aiReviewNotes` | Reject optional; UI often empty | Yes | No | **A** (align with existing re-run; escalate if inventory shows critical notes) |
| `title`, `description`, `categoryId` | Only persisted on **Approve** (draft until then) | **No** | **No** | **B PRESERVE** (do not write AI title onto root during reprocess) |
| `tags` (design root) | On Approve (+ halftone sync) | **No** | **No** (suggestions carry AI tags) | **B** |
| `artworkBackgroundHex` | Yes (immediate + approve) | **No** | **No** (read for canvas only) | **B** |
| `artworkBackgroundSource` | Set to `staff_manual` on hex update | **No** | **No** | **B** |
| `halftoneStaffDecision` | Yes on Approve | **No** | **No** | **B** |
| `halftoneDecisionSource` | Via `updateDesign`; approve path may omit | **No** | **No** | **B** |
| `halftoneSubmitterResponse` | Customer evidence | **No** | **No** | **B** |
| `isExplicitContent`, `censoredTerms` | Yes on Approve | **No** | **No** | **B** |
| `companionDesignIds`, `companionSetIncomplete` | Companion service / approve flag | **No** | **No** | **B** / companions **D** for graph mutation |
| Asset paths, sizing, metrics, audit | Outside AI Review draft | **No** | **No** | **D / B** |
| Category docs / tag retirement / Algolia ready publish | N/A | N/A | Must not | **D NEVER TOUCH** |

### C MERGE / RECONCILE

**None for Needs Review backlog persistence today.** Mid-session draft edits are **not** written to Firestore until Approve. After reprocess, UI re-seeds from new `aiSuggestions` (existing `createAiReviewDraftFromDesign` preference) — document as known UX, not a silent overwrite of persisted staff catalog fields.

Do **not** invent a generic `preserveStaffEdits` flag.

### Hard-rule conflicts

No repo conflict with parent hard rules: pipeline does not write hex/halftone; Algolia skips non-ready. **No Formal Review blocker** from preservation vs ADR-FP-080.

### Asymmetry to fix or document in implement

`resetAiEnrichmentForProcessing` deletes `smartProfile`; plain `enqueueAiEnrichment` clear path historically may not. Slice 5 work unit should use **reset-equivalent** clears so stale profiles cannot survive.

---

## 3. Shadow / automation evidence already emitted (Slice 4)

| Artifact | Location |
|----------|----------|
| `automationDecision`, `automationReasonCodes`, `automationDecisionAt`, `verifierInvoked` | `designs/{id}.smartProfile.provenance` |
| `wouldAutoApprove`, verifier outcome, hardBlockers | Computed + **logs** + Health increments; not all mirrored on design |
| Counters | `settings/catalogAutomationHealth` |
| Job counters (schema) | `catalogReprocessJobs` — need execution to populate |

---

## 4. Algolia

Non-ready → no publish / delete if present (`syncPortalCatalogDesignToAlgolia`, `buildPortalCatalogAlgoliaRecord`). Needs Review reprocess must not create ready-index upserts.

---

## 5. Start unlock

Flip only `CATALOG_REPROCESS_AI_REVIEW_QUEUE_ENABLED` → `true`. Keep `CATALOG_REPROCESS_READY_CATALOG_ENABLED = false`. Wire Studio Start UI for enabled target.
