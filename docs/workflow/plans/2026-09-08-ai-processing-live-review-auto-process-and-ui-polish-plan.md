# Plan: AI Processing live Needs Review return, Auto process gate, Trace removal, category reasons

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Author | Agent |
| Status | approved_with_changes |
| Workflow | managed-phase |
| Related | `docs/workflow/reviews/2026-09-08-ai-processing-live-review-auto-process-and-ui-polish-review.md` |
| Parent park | Atomic reprocess owner QA remains parked; this is a **separate** Studio UX goal |

---

## Goal

Improve AI Processing / Needs Review staff UX so that (1) designs sent back for reprocessing reappear in Needs Review live when done, (2) a distinct top-level **Auto process** preference gates whether designs auto-start AI when they land in Processing, (3) the thin **AI Trace** tab is removed from AI Processing / Needs Review (Inspector remains the home for traces), and (4) Smart Profile category-alternative explanations are no longer truncated mid-sentence.

## Background

Owner is stopped at atomic-reprocess DEV QA and requested these small, high-friction Studio fixes next. Investigation found:

- Needs Review lists are patch/paginated, not live collection queries. Reprocess removes the design locally and fire-and-forget enqueues; completion is not observed while staff stay on Needs Review, so the design does not reappear until refresh/tab change.
- **Auto advance** (`sessionStorage`) only controls Start AI queue vs one-at-a-time on the Processing actions row. Import background pump and review reprocess enqueue are **not** gated by it (ADR-FP-014 amendment). Staff need a separate master auto-start preference.
- **AI Trace** is an owner-only Needs Review info tab embedding `AiEnrichmentTraceInspector`; full traces live under Settings → AI Enrichment → Inspector.
- Category alternative `reason` strings are capped at **`SMART_PROFILE_MAX_STRING_LENGTH` (64)** in the Smart Profile normalizer. CSS already wraps; the screenshot cut-off (“…due to its carto”) is persisted truncation, not a CSS ellipsis.

## Scope

### In Scope

1. **Live Needs Review return after reprocess**
   - While staff remain on Needs Review (or Rejected), track design IDs sent back to Processing.
   - Subscribe those docs (existing `designDocumentSubscriptionService` pattern) until terminal `needs_review` / rejected (or failure), then locally re-insert / patch into the active inbox list and bump tab counts.
   - Do **not** rely on the Processing-tab-only import-pump observer for this path.

2. **Top-level Auto process preference (new)**
   - Add a clear control at the **top** of the AI Processing page (prefer shell header `toggle` labeled **Auto process**, consistent with Design Library’s Archived toggle; if a gear/settings accessory is preferred for visual grouping, same preference wiring applies).
   - Persist as a Studio workstation preference in **`localStorage`** (readable from Imports, AI Review, and Design Library without Firestore settings mutation). Default **ON** to preserve today’s behavior.
   - **ON:** designs that land in Processing from import pump, Needs Review/Rejected reprocess enqueue, and Design Library Ready reprocess **auto-start** AI (current behavior).
   - **OFF:** those paths **demote / land** the design in Processing but **do not** start the pipeline; staff use Start AI / Process image with AI. Existing **Auto advance** remains separate and still controls batch vs one-by-one after a manual start.
   - Gate client enqueue paths: `importAiBackgroundQueue`, Needs Review `executeRerunToProcessing` background enqueue, and any other Studio “land then enqueue” helpers.
   - Gate Design Library Ready reprocess via a small callable contract extension (see Backend Impact): demote-only when Auto process is OFF; demote + run pipeline when ON (default).

3. **Remove AI Trace from AI Processing / Needs Review workspace**
   - Remove the Needs Review info tab and `AiEnrichmentTraceInspector` embed from `AiReviewWorkspace`.
   - Drop `canViewAiTrace` wiring from `AiReviewPage` for this surface.
   - Leave Settings → AI Enrichment → **Inspector** unchanged.

4. **Full category alternative explanations**
   - Raise the normalizer cap for `categoryAlternatives[].reason` to a dedicated longer ceiling (reuse **`SMART_PROFILE_MAX_GAP_EVIDENCE_LENGTH` (240)** or introduce `SMART_PROFILE_MAX_CATEGORY_REASON_LENGTH = 240`).
   - Bump `SMART_PROFILE_NORMALIZER_VERSION` accordingly.
   - Update shared normalizer unit tests.
   - Confirm UI layout still wraps full text (CSS already allows wrap; adjust grid stacking only if needed for readability).
   - Existing designs keep short reasons until reprocessed; no mass backfill.

### Out of Scope

- Catalog Autonomous live / `catalogWorkflowMode` / semantic reviewer settings
- Changing Auto advance semantics beyond remaining independent
- Production deploy, commit/push, mass reprocess
- Expanding AI Trace Inspector feature parity on Needs Review
- Raising other Smart Profile string caps (subjects, styles, etc.)
- Completing parked atomic-reprocess owner QA (remains parked)

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../ai-review/pages/AiReviewPage.tsx` — shell header Auto process toggle; remove Trace prop
- `apps/studio/.../ai-review/components/AiReviewWorkspace.tsx` — remove AI Trace tab/panel
- `apps/studio/.../ai-review/hooks/useAiReviewInbox.ts` — tracked reprocess subscriptions + list reinsert; gate reprocess enqueue
- `apps/studio/.../ai-review/utils/` — new preference module; possible live-return helpers + tests
- `apps/studio/.../ai-review/hooks/useAiProcessingQueue.ts` — unchanged Auto advance; may read Auto process for messaging only
- `apps/studio/.../imports/services/importAiBackgroundQueue.ts` — respect Auto process OFF (queue landing without enqueue, or skip pump)
- `apps/studio/.../designs/services/designReprocessWithAiService.ts` + Design Details modal caller — pass `autoStart`
- `functions/src/reprocessReadyDesignWithAi.ts` + core/tests — optional `autoStart` (default true)
- `packages/shared/src/constants/smartProfile.constants.ts`
- `packages/shared/src/utils/smartProfileNormalization.ts` (+ tests)
- `docs/architecture/DATA_MODEL.md` / `DECISIONS.md` / `WORKFLOWS.md` as needed for preference + Ready callable note
- `apps/studio/.../styles/components/ai-review.css` — only if layout tweak required

### Architecture Impact

- [x] Details: Studio preference module + inbox live-return subscription for in-flight reprocess IDs; Ready reprocess callable gains optional client-controlled auto-start without changing Autonomous catalog gates.

### Security Impact

- [x] Details: Ready reprocess remains owner-only. `autoStart` is a client preference flag validated as boolean server-side; default true preserves current security/behavior. No secrets, no Rules relaxation, no Autonomous enablement.

### Data Model Impact

- [x] Details: No new Firestore fields for the preference (localStorage). Smart Profile alternative `reason` may persist longer strings after normalizer bump. Ready demotion-only path may leave designs in Processing with awaiting-start stage (align with existing `not_generated` / pending semantics) when `autoStart: false`.

### Backend Impact

- [x] Details: `reprocessReadyDesignWithAi` accepts optional `autoStart?: boolean` (default `true`). When `false`, apply demotion into Processing **without** calling `runAiEnrichmentPipeline`, leaving the design Start-AI-eligible. Import / Needs Review paths remain client-gated (no Functions change required for those).

### UI / UX Impact

- [x] Details: Shell header Auto process toggle; Processing Auto advance unchanged; Needs Review loses AI Trace tab; category reasons show full text after fresh enrichment. Manual UI QA required.

### Migration Impact

- [x] Forward steps: Deploy updated Ready reprocess Function to DEV before relying on Design Library Auto process OFF. Studio-only pieces work without deploy for import/review paths.
- [x] Rollback / compatibility: Omit or ignore `autoStart` → previous always-run behavior. Revert normalizer version / reason cap. Remove header toggle / restore Trace tab via revert.

---

## Approach

1. **Preference module** — `read/writeAiProcessingAutoProcessPreference()` in localStorage (`fresh-prints.ai-processing.auto-process`), default ON; unit tests for default + explicit false/true.
2. **Shell header wiring** — `AiReviewPage` exposes Auto process toggle via `useShellHeaderConfig`.
3. **Gate auto-start paths**
   - Import pump: if OFF, do not enqueue (design remains awaiting Start AI after import success).
   - Needs Review/Rejected reprocess: still reset/demote + remove from current list; enqueue only if Auto process ON.
   - Ready Library: pass `autoStart` from preference into callable; server skips pipeline when false.
4. **Live Needs Review return** — maintain a Set/ref of in-flight reprocess IDs from successful reset; subscribe each design; on terminal needs_review/rejected, `applyDesignPatch` / prepend into list, clear tracking, delta tab counts; avoid reintroducing Processing observer thrash.
5. **Remove Trace tab** from `AiReviewWorkspace` + page prop cleanup.
6. **Category reason cap** — dedicated longer max for alternative reasons; bump normalizer version; tests; UI smoke that reasons wrap.
7. **Docs** — short ADR or DECISIONS note distinguishing Auto process vs Auto advance vs Autonomous; DATA_MODEL/BACKEND note for Ready `autoStart` if documented there.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Typecheck / focused unit | Shared normalizer tests; new preference tests; inbox/reprocess contract tests; Ready callable contract tests | yes |
| Lint | Project lint on touched packages if routinely used | yes if available |
| Studio/functions focused tests | Existing AI review + reprocess suites plus new cases | yes |
| Full monorepo build | Optional for this UX slice | no |
| E2E | None automated | no |
| Backend/rules | Rules unchanged | no |

### Manual

- [ ] Needs Review → Send back / Rerun → stay on tab → design returns live when complete (Auto process ON)
- [ ] Auto process OFF → import lands in Processing awaiting Start AI; Start AI / Auto advance still work
- [ ] Auto process OFF → Needs Review reprocess lands in Processing without auto pipeline; Start AI works
- [ ] Auto process OFF → Ready Library reprocess demotes without running pipeline (after DEV Function deploy)
- [ ] AI Trace tab absent on AI Processing; Settings Inspector still works
- [ ] Fresh enrichment shows full category alternative reasons (not mid-word cut at ~64 chars)

---

## Human Checkpoints Anticipated

- [x] Manual UI/UX review (after implement/test)
- [ ] Design approval — not required beyond functional QA
- [ ] Business logic decision — Auto process default ON assumed; confirm if owner wants default OFF
- [ ] Production deploy — not authorized
- [ ] Database migration — none
- [ ] Auth / external service setup — none
- [ ] Secrets / env vars — none
- [x] Other: DEV Function deploy for Ready `autoStart` before Library OFF-path QA; atomic-reprocess QA remains parked

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Live-return subscriptions thrash or reinsert stale page-cache designs | High | Track only explicit reprocess IDs; reuse proven patch helpers; contract tests around ledger/reconcile |
| Confusing Auto process vs Auto advance vs Autonomous | Medium | Distinct label “Auto process”; docs/ADR; keep Auto advance copy unchanged |
| Ready OFF path leaves wrong stage so Start AI never enables | High | Align demotion-only stage with `isDesignAwaitingAiStart` / existing reset semantics; unit test |
| Raising reason cap without normalizer bump leaves mixed lengths | Low | Bump normalizer version; document reprocess needed for old docs |
| Owner lock on Smart Profile caps (2026-08-25) | Medium | Owner explicitly requested full explanations; scope raise to category reasons only |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert Studio preference/UI/subscription changes; redeploy prior `reprocessReadyDesignWithAi` revision if DEV Function shipped; restore previous reason cap + normalizer version. No production changes in this goal.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [ ] DATA_MODEL.md — Ready reprocess demotion-only / awaiting-start note if stage semantics change
- [ ] BACKEND.md — optional `autoStart` on Ready callable
- [ ] TESTING.md — only if new commands
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [ ] DECISIONS.md — Auto process vs Auto advance
- [x] Other: plan/review/signoff artifacts; WORKFLOWS.md brief note if staff workflow docs mention import auto-enqueue

---

## Open Questions

- [x] Auto process default: **ON** (preserve current behavior) unless owner says otherwise at review
- [x] Top control: shell header toggle **Auto process** (not Firestore Autonomous)
- [x] AI Trace: remove from Needs Review / AI Processing workspace; keep Settings Inspector only
- [ ] Confirm Ready Library OFF path requires DEV Function deploy before that specific manual QA (yes)

---

## FreshForge Impact Classification

| Area | Impact |
|------|--------|
| Starter Surface | No (project app/docs only) |
| Development Tooling | No |
| Distribution/Installer | No |
| Documentation | Yes — project docs / workflow artifacts |
| Development History | No |

---

## Approval

- Review doc: `docs/workflow/reviews/2026-09-08-ai-processing-live-review-auto-process-and-ui-polish-review.md`
- Verdict: **approved_with_changes** (2026-09-08)
- Required changes incorporated by implementer:
  1. Ready `autoStart: false` → awaiting Start AI demotion (delete `aiProcessingStage`; no `queued`; skip pipeline)
  2. Raise category-alternative reason max only; bump normalizer version
  3. Auto process = localStorage default ON; never Autonomous
  4. Live return via session-tracked reprocess IDs only
  5. Remove Needs Review AI Trace; keep Settings Inspector
  6. Ready OFF-path QA gated on DEV Function deploy
