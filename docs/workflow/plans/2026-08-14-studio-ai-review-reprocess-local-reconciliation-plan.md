# Plan: Studio AI Review reprocess local reconciliation

| Field | Value |
|-------|-------|
| Date | 2026-08-14 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Goal id | `studio-ai-review-reprocess-local-reconciliation` |
| Related | docs/workflow/reviews/2026-08-14-studio-ai-review-reprocess-local-reconciliation-review.md |
| Prior evidence | docs/workflow/plans/2026-08-05-ai-processing-monotonic-reconciliation-repair-plan.md (P6) |
| Prior closed goal | `studio-design-library-archive-restore-reconciliation` (DONE — not mixed) |

---

## Goal

After a successful AI Review **Reprocess / Re-run AI** from Needs Review or Rejected, immediately reconcile the design out of the current tab into Processing membership locally, update tab counts, advance selection on the **same** tab, and **never** auto-navigate to Processing.

---

## Background

Owner reports fluid-batch failures on current HEAD (`development` @ `0e3b9ae8…`):

1. Reprocessed designs stay visible on Needs Review / Rejected instead of disappearing immediately.
2. After several reprocesses, multiple designs disappear together (delayed/stale convergence).
3. Every successful reprocess forces a switch to the Processing tab, interrupting multi-design send-back work.

August 5 monotonic repair inventory labeled this path **P6** (`executeRerunToProcessing`): intentional return to Processing, historically relying on `reloadDesigns()` + tab navigation. That diagnosis was re-verified against current source (not August 5 line numbers).

`DATA_MODEL.md` already states staff starts the next AI run from the Processing tab after reset — auto-follow is UX debt, not a data-model requirement.

---

## FreshForge impact classification

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Yes — workflow/product docs + ADR-FP-027 navigation amendment |
| Development History | Workflow artifacts only |

---

## Scope

### In Scope

- AI Review `/ai-review` Reprocess from Needs Review and Rejected
- Immediate local reconciliation after successful `resetAiEnrichmentForProcessing`
- Source-tab selection advancement
- Processing / Needs Review / Rejected count reconciliation
- Removal of automatic Processing-tab navigation on this path only
- Preventing stale/full-list reload from delaying or reversing the UI transition
- Focused regression tests + doc/ADR updates for the approved UX
- Studio typecheck / build / lint / `git diff --check`

### Out of Scope

- AI prompts, Gemini/provider, enrichment parsing, taxonomy
- Import auto-processing, ADR-FP-014 sequential Processing semantics changes
- Design Library, Portal, customer uploads
- Firestore Rules, indexes, Storage Rules, Algolia
- Production deployment / Functions changes (not required — see Backend Impact)
- Broad `useDesigns` rewrite, new dependencies
- Rejected **Reopen for Review** navigation (unchanged)

---

## Root-cause investigation (current HEAD)

### Exact reprocess call path

1. `AiReviewPage` → `onRerun={() => void inbox.rerunSelected()}`
2. `useAiReviewInbox.rerunSelected` → `requestRerunAiSuggestions` (dirty-draft confirm optional) → `executeRerunToProcessing`
3. `aiReviewInboxService.rerunAiFromInbox` → permission + eligibility → `aiEnrichmentEnqueueService.resetForProcessing`
4. Callable `resetAiEnrichmentForProcessing` writes `status: "imported"`, `aiReviewStatus: "pending"`, clears suggestions/analysis/stage, returns `{ reset: true, aiReviewStatus: "pending", status: "imported" }`
5. **Today after success:** discard result (`Promise<void>`), `clearTerminalAiProcessingLedgerEntry`, set `pendingCrossTabSelectionRef` to Processing, clear draft/live, **`await reloadDesigns()`**, `onQueueChanged()`, **`onNavigateToTab("processing", designId)`**
6. Page `handleNavigateToTab` → `setSearchParams({ tab: processing })`

### Answers to required questions

| # | Question | Answer (current HEAD) |
|---|----------|------------------------|
| 1 | What causes navigation to Processing? | Explicit `options?.onNavigateToTab?.(resolveRejectedRerunTargetTab(), designId)` in `executeRerunToProcessing` (ADR-FP-027 navigation). |
| 2 | What removes the design from the source tab? | Indirectly: `reloadDesigns()` replaces the current-tab list from `listDesignsPage` / `designPageCache`. There is **no** success-path `applyDesignPatch` / local reconcile helper. |
| 3 | Why delayed multi-design disappearance? | Success path depends on list reload + cache/Firestore convergence while the user is also forced off-tab. Stale 15s page-cache hits can keep source-tab membership until later remounts/expiry → several IDs drop together. |
| 4 | Is P6 still using full `reloadDesigns()` after success? | **Yes.** |
| 5 | Can patch-primary remove immediately without list reload? | **Yes.** Server already returns authoritative `{ aiReviewStatus: "pending", status: "imported" }`. Patching those fields makes `designMatchesInboxTab` exclude the design from Needs Review / Rejected (same filter used by approve/reject Amendment 9). |
| 6 | How are counts updated today? | Full `onQueueChanged` → `tabCounts.reloadCounts()` after reload+navigate. Approve/reject already use `onInboxCountsDelta` locally. |
| 7 | Can stale/cached reload reinsert onto source tab? | **Yes**, if a post-success `reloadDesigns()` accepts a cached needs_review/rejected page still containing the design. |
| 8 | Current rerun/reprocess test coverage? | Source-wiring tests in `aiProcessingReconciliation.test.ts` (asserts reload **then** navigate), `aiProcessingMonotonicReconciliation.wiring.test.ts` (ledger clear before reload). Behavioral local-reconcile suites exist for approve/reject/hard-delete, **not** for stay-on-tab reprocess. |

### August 5 P6 diagnosis

**Still applies**, with one refinement: P6 remains reload-primary and navigation-coupled; unlike Processing enqueue / retry paths, it never adopted `buildDesignPatchFromEnqueueResult`-style local authority. Reset already has an even simpler typed result (`ResetAiEnrichmentResult`) that the service currently throws away.

**No Functions/API change required** — `[NEEDS REPO CHECK]` cleared: response already carries authoritative membership fields.

---

## Affected Areas

### Files / Modules (expected)

| File | Change |
|------|--------|
| `apps/studio/.../hooks/useAiReviewInbox.ts` | Rewrite `executeRerunToProcessing` success path: patch + advance + count deltas; no navigate; no happy-path `reloadDesigns` |
| `apps/studio/.../services/aiReviewInboxService.ts` | Return `ResetAiEnrichmentResult` instead of `void` |
| `apps/studio/.../utils/aiReviewLocalReconciliation.ts` (+ tests) | Add reprocess count deltas + `reconcileSuccessfulReprocess` helper (mirror Amendment 9 / hard-delete) |
| `apps/studio/.../hooks/aiProcessingReconciliation.test.ts` | Replace navigate/reload-order assertions with stay-on-tab / patch-primary contracts |
| `apps/studio/.../hooks/aiProcessingMonotonicReconciliation.wiring.test.ts` | Ledger clear still required; reload no longer required on success |
| `docs/project/DECISIONS.md` | Amend ADR-FP-027 navigation for Reprocess only |
| `docs/architecture/DATA_MODEL.md` (narrow wording if needed) | Clarify staff remain on source tab; open Processing manually |
| Handoff / workflow docs as needed | Match approved UX sentence |

Possibly **not** touched (prefer leave alone unless wiring forces it):

- `AiReviewPage.tsx` (keep `onNavigateToTab` for Reopen)
- `useAiProcessingQueue.ts`, `useDesigns.ts`, Functions

### Architecture Impact

- [x] Details: Renderer hooks/services only. Components still trigger actions; services own callables; reuse Amendment 9 local-reconcile pattern. No new Firebase access in components.

### Security Impact

- [x] None — existing permission + callable eligibility unchanged.

### Data Model Impact

- [x] None persisted — server reset semantics unchanged. Client applies already-returned fields.

### Backend Impact

- [x] None — no Functions/API change. Service return type plumbing only.

### UI / UX Impact

- [x] Details: Reprocess stays on Needs Review / Rejected; design disappears immediately; selection advances; counts update; Processing opened manually later. Owner manual QA required.

### Migration Impact

- [x] None

---

## Approach

1. **Return authoritative reset result** from `rerunAiFromInbox` (`ResetAiEnrichmentResult`).
2. **On failure:** keep current behavior (design stays, selection stays, user-safe error, no membership/count change, no navigation).
3. **On success:**
   - `clearTerminalAiProcessingLedgerEntry(designId)` so Processing may accept the design later (legitimate reprocess).
   - `designService.invalidateReadCaches(designId)` (or existing invalidate path) so source-tab confirmation reads cannot serve pre-reset pages.
   - Build patch from server result only: `{ status: result.status, aiReviewStatus: result.aiReviewStatus }` (do not invent fields).
   - `pendingAdvanceIndexRef.current = selectedIndex`; clear live/draft; `applyDesignPatch(designId, patch)`.
   - `onInboxCountsDelta` with source −1 / processing +1.
   - **Do not** call `onNavigateToTab`, **do not** set `pendingCrossTabSelectionRef` for Processing, **do not** `reloadDesigns` / `onQueueChanged` on the happy path.
4. **ADR:** Amend ADR-FP-027 so Reprocess no longer navigates; Reopen navigation unchanged. Note ADR-FP-021 already preferred in-place Needs Review re-run without Processing navigation for an older in-place path — this plan aligns Reprocess reset UX with stay-on-tab staff workflow.
5. **Tests:** Update wiring tests that currently require reload→navigate; add pure helper + simulation tests proving A→B→C individual disappearance without reload/navigation; keep existing reconciliation suites green.
6. **Docs:** Update the product sentence to: *Reprocess / Re-run AI returns the design to Processing but keeps the staff member on their current Needs Review or Rejected tab. The source list reconciles immediately so staff can continue sending additional designs back for processing.*

### Important reconciliation rules

- Genuine reprocess **may** return a terminal design to Processing (ledger clear required).
- Clearing the ledger must **not** allow a stale source-tab reload to reinsert the design as needs_review/rejected — achieved by skipping happy-path list replace + cache invalidation after authoritative patch.
- No timers, forced remounts, or poll loops.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Focused unit/wiring | `npx tsx --test` on AI Review reconciliation / local-reconcile / updated wiring tests | yes |
| Studio typecheck | `npm --prefix apps/studio exec tsc -- --noEmit` | yes |
| Studio build | `npm run build:studio` | yes |
| Lint | `npm run lint` | yes |
| Whitespace | `git diff --check` | yes |
| Portal / Functions / Rules | n/a (untouched) | no |

### Manual

- [x] Owner QA: Needs Review sequential reprocess; Rejected sequential reprocess; failed reprocess leaves design; manual Processing visit shows A/B/C; no auto-tab switch.

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (owner QA after Test phase)
- [ ] Production deploy — **not** in this phase
- [ ] Database migration — none
- [ ] Secrets / env — none

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Stale source-tab reload reinserts design | Medium | No happy-path `reloadDesigns`; invalidate read caches; patch from server result |
| Processing count wrong if only delta applied | Low | Use same `applyCountsDelta` path as Amendment 9; processing +1 / source −1 |
| Existing wiring tests encode old navigate contract | Low | Update those tests deliberately; keep Reopen navigation tests |
| Ledger clear allows Processing reappearance incorrectly blocked | Low | Keep clear-before-pending-patch order from monotonic repair |
| Unrelated dirty tree (1.0.5 release bump files) contaminates commit | Medium | Branch from clean HEAD for this goal only; do not stage unrelated paths |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert the Studio renderer/docs commit(s) for this goal. No Firebase deploy, schema, or Functions rollback required.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — narrow UX wording if it still implies auto-follow
- [ ] BACKEND.md
- [ ] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — amend ADR-FP-027 Reprocess navigation
- [x] Other: workflow plan/review/test/signoff; handoff CURRENT-STATE when phase closes

---

## Open Questions

- [x] None blocking — Functions change not required; ADR amendment in-plan.

---

## Approval

- Review doc: docs/workflow/reviews/2026-08-14-studio-ai-review-reprocess-local-reconciliation-review.md
- Verdict: pending
