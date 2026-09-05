# Formal Review: Smart Catalog Intelligence — WS5 Autonomous DEV Canary

> **Amendment (2026-09-05):** Going-forward canary expectation is **MODEL 2 — SAFETY-INVARIANT** — Formal Review `docs/workflow/reviews/2026-09-05-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-model-2-amendment-review.md` (**approved**). This 2026-09-04 review remains the baseline architecture/safety approval; Model 1 exact-class operational stop history is preserved.

| Field | Value |
|---|---|
| Date | 2026-09-04 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-09-04-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-plan.md` |
| Verdict | **approved_with_changes** |
| WS5 execution | **Not authorized; owner checkpoint required** |
| Autonomous / canary | **OFF / not run** |

## Review conclusion

The bounded six-design, individual-rerun design is safe to present for owner enablement after its mandatory current-state preflight. It avoids the bulk AI Review job and the already-approved Ready catalog. Publication failure is observable and retryable, but Ready commits before asynchronous Algolia publication; consequently each approval passes only after publication metadata is `synced` and the Algolia object is verified.

Required changes before execution are operational evidence, not source edits: revalidate every candidate under live v34 shadow, exclude authority-bearing candidates, capture exact current settings/revisions, and present the enablement checkpoint. The decision-before-authority-merge ordering blocks authority-bearing reruns and broader WS6 scope, but not this explicitly excluded canary.

## Mechanical findings (questions 1–40)

1. **Current workflow mode:** `shadow` (last mechanically recorded live DEV state, 2026-09-04).
2. **Live gate:** `catalogAutonomousLiveEnabled=false`.
3. **Dual gate:** `canPublishAutonomously` requires mode `autonomous` AND live flag exactly `true`; invalid/missing values fail closed (`packages/shared/src/constants/catalogWorkflowMode.constants.ts:25-48`; `functions/src/ai/loadAiEnrichmentSettings.ts:70-128`).
4. **Decision path:** `functions/src/ai/aiEnrichmentCandidateCore.ts:579-623` calls `computeCatalogAutomationDecision` at `packages/shared/src/utils/catalogAutomationDecision.ts:182-350`.
5. **Approval transition:** `functions/src/ai/aiEnrichmentPipeline.ts:92-185`; policy-clear + dual gate uses the Admin SDK update.
6. **System actor:** `system:catalog-autonomy`.
7. **Hard blockers:** `category_unresolved`, `description_missing`, `title:title_missing`, `title:title_exceeds_max_characters`, `category_gap_suggested`, `category_dominant_intent_conflict`, all `validation:*` except missing-generated-at warnings, `structured_evidence_gap:*`, `subject_specificity_risk:*`, and `verifier_unresolved` (`catalogAutomationDecision.ts:52-69,247-279`). Unsafe/NSFW, profanity/restricted content, DPI/artwork quality, and publication/runtime failures are **not separate decision-code blockers in this function**; enrichment/runtime failures fail outside decisioning.
8. **Verifier:** only `automation_policy_uncertainty` is confirmable; ordinary inspected production evidence generated no such case. Unresolved/malformed verifier input fails hard; confirmed verifier cannot clear another blocker.
9. **Can hard blockers bypass approval?** **NO** by decision composition and tests.
10. **Human/preset authority:** persisted staff values and preset seeds are preserved by `smartProfileEnrichmentWrite.ts`, `smartProfileStaffEdit.ts`, and `smartProfileImportPresets.ts`. Caveat: decisioning precedes those merges, so authority-bearing reruns are excluded.
11. **Title repair before decision:** **YES** (`simpleCatalogEnrichmentResponse.ts:388-413` before `aiEnrichmentCandidateCore.ts:579-608`). No title-specificity blocker was added.
12. **Category contract:** current live `catalog-enrich-v34`, normalizer v6, schema v1; signed-off curated resolver behavior and ADR-FP-163 remain. Do not reopen calibration without material canary evidence.
13. **Is `matchedTags` required for Autonomous decision?** **NO**; it is not an input to `computeCatalogAutomationDecision`.
14. **Additional AI call for Autonomous?** **NO**; decision/verifier are deterministic in-process logic. A rerun still performs the normal single enrichment request.
15. **Recommended population:** six existing DEV `imported` + `needs_review` designs, individually rerun; never the full backlog or Ready catalog.
16. **Recommended size:** **6**, grounded in WS3 50/115 policy-clear/Needs Review distribution, required class coverage, sequential observability, and full manual auditability.
17. **Proposed IDs:** `At5hu7vLjWgduiyzZCfR`, `03cbj1cIFH7Bavt38XBX`, `Dr8lcyPE8imTQlNESP8X`, `nff6PpkZF9TNitnpX2Mm`, `1Ws0T9fivryest6IUSbt`, `LYJcsxnfUyacRWtntEkd`.
18. **Expected results:** first two auto Ready; next three hard Needs Review; sixth specificity Needs Review unless current v34 legitimately resolves the risk, in which case return to owner before execution.
19. **Existing lifecycle:** all six were last captured as `imported` + `needs_review` in the WS3 DEV evidence. Current state must be re-read at the owner checkpoint.
20. **Destructive risk:** bounded lifecycle/publication writes only; no deletion/migration. Auto-approval is not reversed by flag rollback and requires separate manual correction if wrong.
21. **Publication path:** Ready Firestore update triggers `functions/src/algolia/syncPortalCatalogDesignToAlgolia.ts:112-191`; index builder includes only Ready records.
22. **Algolia behavior:** Ready upsert; non-Ready/unindexable delete; publication metadata records sync/delete/failure state.
23. **Publication failure:** lifecycle commit and publication are separate. Failure records status/error/attempt, increments publication failure health, rethrows for Cloud Functions retry; design remains Ready. A canary row is not successful until Algolia is verified.
24. **Retry/recovery:** platform trigger retry plus reconcile function; AI rerun increments automation retry evidence. Owner detects failures in per-design publication metadata, Automation Health, logs, and reconcile results.
25. **Auditability:** Smart Profile decision/reasons/time/verifier, lifecycle fields, approval actor/audit, `readyAt`, AI stage/errors, publication status/attempt/error, Automation Health, and Algolia object. `wouldAutoApprove`, `shouldPublishReady`, and hard-blocker arrays are not separately persisted per design; derive them from decision/reasons and capture execution logs.
26. **Required settings mutations:** future checkpoint only: `catalogWorkflowMode: shadow → autonomous`, then `catalogAutonomousLiveEnabled: false → true` using owner-only callable and phrase `ENABLE AUTONOMOUS`.
27. **Owner enablement checkpoint:** must present current candidate snapshots/classes, exact settings/revisions, mutations, expected writes, functions, rollback/stop, and QA; then stop for explicit authorization.
28. **Rollback:** set Shadow and verify live false. This stops future autonomous approvals and does not demote prior Ready items.
29. **Stop:** stop enqueuing immediately; restore Shadow/live false; let any already-started invocation terminate and audit it; reconcile publication if needed.
30. **Owner QA:** inspect artwork vs final title/description/category/Profile and authority fields; confirm blockers stayed Needs Review; confirm Ready audit actor/`readyAt`; verify publication metadata and Algolia records.
31. **Production touched:** **NO**.
32. **Rules change needed:** **NO**.
33. **Indexes needed:** **NO**.
34. **Migration/backfill needed:** **NO**.
35. **Source implementation needed before this canary:** **NO**, only with the strict no-authority-candidate exclusion. Source review is required before authority-bearing/broader WS6 scope.
36. **Files if later source change is approved:** expected `functions/src/ai/aiEnrichmentCandidateCore.ts`, `functions/src/ai/aiEnrichmentPipeline.ts`, `functions/src/ai/smartProfileEnrichmentWrite.ts`, and corresponding tests; not authorized now.
37. **Tests:** dual-gate/decision/hard-block tests, enrichment authority merges, publication failure/retry, typecheck/build or matching deployed-test evidence, current shadow preflight, and full six-item owner QA.
38. **WS5 blocker status:** execution is blocked only on the mandatory owner enablement checkpoint/current preflight. Authority-bearing candidates and natural verifier coverage remain fixture gaps.
39. **WS6:** **NOT STARTED** and additionally gated by the decision-before-authority-merge limitation.
40. **`[NEEDS OWNER DECISION]`:** after receiving the completed preflight/checkpoint, authorize or decline the exact six-design live DEV canary. No authorization is requested yet for broader Autonomous behavior or source correction.

## Required changes before execution

1. Re-read DEV settings and each candidate immediately before the owner checkpoint.
2. Run current v34 shadow preflight and preserve/replace candidates only with documented owner review.
3. Confirm no candidate carries staff-edited keys/import presets; otherwise exclude it.
4. Capture exact deployed revisions and publication/reconcile health.
5. Present the owner enablement checkpoint and stop.

## Verdict

**approved_with_changes** — the plan is approved for preflight/checkpoint preparation only. Autonomous enablement and canary execution remain forbidden pending a separate owner decision.

