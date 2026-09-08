# Review: AI Processing live Needs Review return, Auto process gate, Trace removal, category reasons

| Field | Value |
|-------|-------|
| Date | 2026-09-08 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-08-ai-processing-live-review-auto-process-and-ui-polish-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The plan correctly parks atomic-reprocess QA and scopes four related Studio UX fixes with a clear separation between **Auto process** (master auto-start), **Auto advance** (queue vs one-by-one), and catalog Autonomous. Backend impact for Design Library Ready reprocess is appropriately narrow. Implementation may proceed if the required changes below are followed without expanding scope.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Four items; Autonomous / production / mass reprocess out |
| Architecture alignment | pass | Preference + subscription + thin callable flag; layers respected |
| Security impact addressed | pass | Owner-only Ready path retained; boolean `autoStart` only |
| Data model impact addressed | pass | No new Firestore preference fields; reason length + demotion-only stage called out |
| Backend impact addressed | pass | Ready callable only; import/review client-gated |
| Test strategy adequate | pass | Focused automated + manual UI matrix; DEV Function gate for Library OFF |
| Human checkpoints identified | pass | Manual UI QA after implement; no production |
| Roadmap alignment | pass | Owner-requested polish while prior QA parked |
| Documentation plan | pass | DECISIONS + BACKEND/DATA_MODEL as needed |
| No silent scope expansion | pass | Atomic reprocess explicitly parked |

---

## Architecture Review

**Findings:**
- Live Needs Review return via tracked-ID doc subscriptions matches existing `designDocumentSubscriptionService` / patch-primary patterns and correctly avoids expanding the Processing-only import-pump observer.
- Shell header `toggle` is the right placement for Auto process; keeps Auto advance on the actions row.
- Removing Needs Review AI Trace without touching Settings Inspector is correct product boundary.

**Required changes:**
- [x] When implementing live return, only track IDs from successful reset/reprocess in this session; do not subscribe the entire Needs Review query.
- [x] Do not wire Auto process to Firestore `catalogAutonomousLiveEnabled` / `catalogWorkflowMode`.

---

## Security Review

**Findings:**
- Ready `autoStart` must default **true** server-side when omitted (backward compatible).
- Validate `autoStart` as boolean only; ignore non-booleans / coerce safely to default true.
- No Rules, secrets, or public endpoint changes.

**Required changes:**
- [x] Server: treat missing/`undefined` `autoStart` as `true`; reject only malformed requests if the project already invalidates unknown shapes (prefer fail-open to current always-run behavior).

**Human approval needed before production:**
- [x] None for this DEV/Studio goal (production still forbidden)

---

## Data Model Review

**Findings:**
- Category reason cap raise is justified by owner request; keep raise **scoped to category alternative reasons** (and gap evidence already at 240), not global `SMART_PROFILE_MAX_STRING_LENGTH`.
- Ready demotion currently sets `aiProcessingStage: "queued"` then runs the pipeline. Auto process OFF must not leave designs stuck in a non-awaiting “queued” stage.

**Required changes:**
- [x] For Ready `autoStart: false`, demotion must leave the design **Start-AI-eligible** (`isDesignAwaitingAiStart` / `not_generated`): mirror reset semantics by **deleting** `aiProcessingStage` (do not set `"queued"`), keep `status: "imported"` + `aiReviewStatus: "pending"`, and skip `runAiEnrichmentPipeline`.
- [x] Bump `SMART_PROFILE_NORMALIZER_VERSION` when reason max changes.

---

## Backend Review

**Findings:**
- Callable change is minimal and correctly limited to `reprocessReadyDesignWithAi`.
- Import pump and Needs Review enqueue gating are Studio-only and sufficient for those entry points.

**Required changes:**
- [x] Document in implementation that Library Auto process OFF QA requires DEV deploy of the updated Function; Studio-only paths can be QA’d without that deploy.
- [x] Add focused Functions contract/unit coverage for demote-only vs demote+pipeline.

---

## Testing Review

**Findings:**
- Preference default ON, explicit OFF, and gate call-sites need contract or unit coverage.
- Live-return needs a focused test (helper or hook contract) proving reinsert on terminal needs_review without full remount.
- Manual matrix in the plan is required before signoff.

**Required changes:**
- [x] Include at least one automated assertion that category alternative reasons are allowed above 64 chars after the normalizer change.
- [x] Include Ready demotion-only stage assertion (`aiProcessingStage` absent / deleted, not `"queued"`).

---

## Documentation Review

**Findings:**
- DECISIONS note distinguishing Auto process vs Auto advance vs Autonomous is required to prevent future conflation.
- BACKEND/DATA_MODEL updates only if Ready demotion-only stage is documented there today.

---

## Required Changes (if approved_with_changes)

1. Ready `autoStart: false` must demote to **awaiting Start AI** (delete stage; do not set `queued`) and skip the pipeline.
2. Raise **only** category-alternative reason max (or shared gap-evidence length for that field); do not silently raise all Smart Profile string caps.
3. Auto process preference stays **localStorage**, default **ON**, label distinct from Auto advance; never reuse Autonomous settings.
4. Live return: session-tracked reprocess IDs + per-doc subscribe/patch only.
5. Remove Needs Review AI Trace tab; leave Settings Inspector alone.
6. DEV Function deploy for Ready OFF-path is a post-implement gate, not production.

---

## Blockers (if blocked)

None.

---

## Verdict Rationale

**approved_with_changes** — scope, security, and separation of concerns are sound. The Ready OFF-path stage semantics are the main correctness risk and must follow reset-style awaiting-start demotion. With that and the preference/normalizer constraints above, implementation is authorized.

---

## Next Step

Implement approved scope with the required changes listed above. Do not resume atomic-reprocess owner QA unless the owner explicitly asks.
