# Implementation Review: WS5 Explicit Content Shadow Preview / Owner QA Observability

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Reviewer | Implementation Review Agent |
| Plan | `docs/workflow/plans/2026-09-05-ws5-explicit-content-shadow-preview-observability-plan.md` |
| Formal Review | `docs/workflow/reviews/2026-09-05-ws5-explicit-content-shadow-preview-observability-review.md` (`approved_with_changes`) |
| Verdict | **approved_with_notes** |
| Deploy this pass | **NO** |
| Fixture this pass | **NO** |

---

## ARCHITECTURE

1. **Preview metadata path:** `designs/{id}.smartProfile.provenance.explicitAutomationPreview`
2. **Preview type:** `ExplicitContentAutomationPreview` / `ExplicitContentAutomationPreviewPayload` — `{ wouldMarkExplicitContent, artworkHit, proposedCensoredTerms?, suppressedDueToHumanAuthority? }`
3. **Classifier invocation:** `aiEnrichmentCandidateCore.ts` after automation decision (and settings fail-closed), when `smartProfile && automationDecision`
4. **Matcher implementations:** **ONE** — `classifyExplicitContentAutomation`
5. **Matcher invocations per enrichment:** **ONE** (result feeds preview + optional Ready write payload)
6. **Ready path sharing:** Same `classification.censoredTerms` → `candidate.explicitContentAutomation` only when `publishReady && artworkHit && terms.length > 0`; `markAiSuccess` still gates write on `mayWriteExplicit`
7. **Artwork evidence:** Transient `result.analysis.explicitContentArtworkEvidence` (pre-sanitize `visibleText` / `readableTextLines`)
8. **Raw evidence persisted:** **NO** (deleted before candidate return)

## SHADOW

9. **Would Auto Approve source:** Derived in Studio from `automationDecision` ∈ {`shadow`,`auto_approved`} or reason `shadow_would_auto_approve` — no new boolean
10. **Would Mark Explicit:** `wouldAutoApprove && artworkHit && terms.length > 0 && !suppressedDueToHumanAuthority`
11. **Proposed terms:** Classifier `censoredTerms` (masker-effective surfaces); omitted when empty
12. **Hard-blocker presentation:** Would Auto Approve **NO**; Would Mark Explicit **NO**; reason codes remain in “Shadow reasons”
13. **Terminology-detected informational:** When `artworkHit && !wouldMark && terms.length` — secondary copy under Automation preview (not Ready-implying)
14. **Human-authority suppression:** `applyHumanAuthorityToExplicitContentAutomationPreview` in `markAiSuccess` when prior has protected Explicit authority
15. **Settings-unavailable:** `settingsReadFailed && wouldAutoApprove` → Needs Review + `explicit_automation_settings_unavailable`; strips `shadow_would_auto_approve` / `auto_approved` from reasons
16. **Root `isExplicitContent` mutated in shadow:** **NO**
17. **Root `censoredTerms` mutated in shadow:** **NO**
18. **Ready status possible in shadow:** **NO** (`shouldPublishReady` false without dual gate)
19. **Algolia Ready publication from preview:** **NO** (provenance excluded from Portal projection)

## AUTONOMOUS REGRESSION

20. **Ready+Explicit path changed:** Behavior preserved (write still `publishReady` + classification hit + human authority gate) — classify timing moved earlier only
21. **Atomic write preserved:** **YES**
22. **Hard blockers preserved:** **YES**
23. **Human authority preserved:** **YES**

## UI

24. **Components:** `AiReviewSmartProfileSection.tsx` + `explicitAutomationPreviewDisplay.ts` + `ai-review.css`
25. **Would Auto Approve:** labeled YES/NO
26. **Would Mark Explicit Content:** labeled YES/NO
27. **Proposed Censored Terms:** list when `wouldMarkExplicitContent`
28. **Human-authority note:** concise suppression paragraph
29. **Hard-blocked terminology:** secondary informational block (subordinate language)

## DATA / SECURITY

30. **Firestore Rules:** not required
31. **Indexes:** none
32. **Migration:** none (additive optional)
33. **Portal projection:** `projectSmartProfileForAlgoliaIndex` ignores provenance preview (test extended)
34. **Customer PR impact:** none
35. **Second AI call:** no
36. **Tag dependency:** no
37. **Prompt/normalizer/schema:** `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` unchanged (no version bump)

## TESTS

| # | Check | Result |
|---|---|---|
| 38–46 | Shared preview + matcher + human authority + Portal projection + automation decision + contract | **PASS** (80 focused tests) |
| 47 | Portal/projection regression | **PASS** |
| 48 | Functions `npm run build` | **PASS** |
| 49 | Studio full tsc | **Not claimed** (pre-existing debt); focused eslint on touched files **PASS** |
| 50 | Lint (touched files) | **PASS** |
| 51 | `git diff --check` | **PASS** (LF/CRLF warnings only) |

Also: `catalogTitleRules` + `smartProfileQuality.contract` **84 PASS**.

## DEPLOYMENT (not executed)

52. **DEV Functions requiring redeploy:** `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, `onCatalogReprocessJobWritten` (shared candidate/pipeline)
53. **Reason:** persist `explicitAutomationPreview` + fail-closed fidelity
54. **Studio:** local/dev Studio build required for AI Review labels (source-only until Studio package/release)
55. **Rules/Storage/index deploy:** **NO**
56. **Rollback:** redeploy prior Function revisions; Studio ignores missing preview

## OWNER QA PREPARATION (not executed)

57. **Fixture path:** Staff DEV import of simple text PNG (one configured term); no PR art; no human Explicit / SP staff edits; separate from six WS5 candidates
58. **Recommended term:** **`damn`** (mild, default-seeded, clear in artwork). Confirm still present in owner’s authoritative **43** before create. Do not restore deleted defaults or remove custom term.
59. **Expected shadow result:** Needs Review; Would Auto Approve YES (if policy clear); Would Mark Explicit YES; Proposed Censored Terms includes `damn` (or masker surface); root Explicit unchanged; not Ready
60. **Cleanup:** Archive/delete disposable design after QA; leave vocabulary as-is
61. **Manual QA checklist:** Mode shadow/live false → enqueue fixture → AI Review shows three labels correctly → root Explicit/censoredTerms untouched → control clean design Would Mark NO → optional hard-blocker case shows informational detection only

## WORKFLOW

62. **IR verdict:** **approved_with_notes**
63. **Ready for DEV deploy authorization:** **YES**
64. **WS5 status:** STRUCTURALLY READY · **BLOCKED ON EXPLICIT CONTENT SHADOW QA PASS**
65. **Autonomous enabled:** **NO**
66. **Canary run:** **NO**
67. **Fixture created:** **NO**
68. **Production touched:** **NO**
69. **Commit/push:** **NO**
70. **[NEEDS OWNER DECISION]** — authorize DEV Function + Studio deploy; authorize fixture creation/enqueue; then report `EXPLICIT CONTENT SHADOW QA: PASS|FAIL`

### Notes

- Vocabulary **43** is owner-authoritative (deleted 3 defaults + added 1 custom) — not drift.
- Formal Review required changes implemented (labels, fail-closed on `wouldAutoApprove`, informational detection when blocked, current configured term preference).

---

## Next step

Await owner authorization for **DEV deploy + fixture + Shadow QA**. Do not enable Autonomous.
