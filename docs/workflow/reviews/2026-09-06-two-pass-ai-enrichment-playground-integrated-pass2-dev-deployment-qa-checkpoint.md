# DEV Deployment + Owner QA Checkpoint — Integrated Playground Pass 2

**Date:** 2026-09-06
**Environment:** `fresh-prints-dev` / `us-central1`
**Plan:** `docs/workflow/plans/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-ux-corrective-plan.md`
**Implementation Review:** `docs/workflow/reviews/2026-09-06-two-pass-ai-enrichment-playground-integrated-pass2-ux-corrective-implementation-review.md`
**Production:** untouched
**Autonomous:** OFF
**Automatic Semantic Reviewer:** unchanged/OFF

## Authorization and inventory

Owner authorization was recorded for DEV deployment and preparation for integrated Playground Pass 2 QA. The deployment was limited to exactly:

- `testAiEnrichmentPlayground`
- `testAiEnrichmentSemanticReviewPlayground`

No other Function was included in the deploy command. The pre-existing remote `testAiEnrichmentTagRerank` listing was not touched and was not deployed.

## Deployment command

The authorized command was run from `C:\coding\fresh-prints`:

```powershell
firebase deploy --project fresh-prints-dev --only functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground
```

Firebase discovery required the authorized `FUNCTIONS_DISCOVERY_TIMEOUT=60` workaround. The first attempt completed the local build but timed out while reading an unrelated existing `RESEND_API_KEY` Secret Manager entry; it performed no Function update. The same exact inventory was then deployed with the shell-local IPv4-first CLI setting:

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
firebase deploy --project fresh-prints-dev --only functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground
```

Deployment completed with **2 Functions Deployed, 0 Functions Errored, 0 Function Deployments Aborted**.

## Deployed runtime verification

Verified after deployment with `gcloud functions describe --gen2`:

| Function                                   | State    | Revision                                             | Firebase source hash                       | Project            | Region        | Runtime    | Entry point                                | Traffic     |
| ------------------------------------------ | -------- | ---------------------------------------------------- | ------------------------------------------ | ------------------ | ------------- | ---------- | ------------------------------------------ | ----------- |
| `testAiEnrichmentPlayground`               | `ACTIVE` | `testaienrichmentplayground-00070-mil`               | `303f6cd59782680602bcb04b81c683b199caba73` | `fresh-prints-dev` | `us-central1` | `nodejs20` | `testAiEnrichmentPlayground`               | 100% latest |
| `testAiEnrichmentSemanticReviewPlayground` | `ACTIVE` | `testaienrichmentsemanticreviewplayground-00011-xap` | `303f6cd59782680602bcb04b81c683b199caba73` | `fresh-prints-dev` | `us-central1` | `nodejs20` | `testAiEnrichmentSemanticReviewPlayground` | 100% latest |

Both Functions retain the reviewed `512MiB` memory configuration and the reviewed `GEMINI_API_KEY`/`OPENAI_API_KEY` secret bindings. No secret values were read or recorded.

## Scope protections verified

| Item                                  | Result |
| ------------------------------------- | ------ |
| Unauthorized Function deployments     | **NO** |
| `enqueueAiEnrichment` deployed        | **NO** |
| `reprocessReadyDesignWithAi` deployed | **NO** |
| Other AI Function deployed            | **NO** |
| Firestore Rules deployed              | **NO** |
| Storage Rules deployed                | **NO** |
| Indexes deployed                      | **NO** |
| Migration run                         | **NO** |
| Settings mutation                     | **NO** |
| Production touched                    | **NO** |
| Commit                                | **NO** |
| Push                                  | **NO** |
| Provider call by Codex                | **NO** |

## Local DEV Studio preparation

The local DEV Studio was already running from the reviewed checkout using:

```powershell
cd C:\coding\fresh-prints\apps\studio
npm run dev
```

Observed process state:

- Vite listening on `localhost:5173`.
- Local Studio Electron process uses `C:\coding\fresh-prints\apps\studio`.
- Electron user data directory is `Fresh Prints Studio Dev`.
- `http://localhost:5173` returned HTTP 200.
- No restart was required; no Studio publish, installer release, version bump, or GitHub release was performed.

## Owner manual QA — bounded procedure

Open **Settings → AI Enrichment → Playground** in local DEV Studio.

### Initial state

Confirm:

- normal Pass 1 setup is present;
- there is no standalone `Manual Pass 2 Semantic Review` section;
- there is no raw JSON Pass 2 textarea or paste workflow;
- Pass 2 controls are hidden before successful Pass 1.

### Pass 1

Attach one safe local real artwork image and run Pass 1. Use no more than **3 total Pass 1 Playground runs** for this corrective QA. After success, verify title, description, category, visible text, Smart Profile, Visual Context Profile, blockers, WAA/automation preview, provider/model, input/output tokens, Pass 1 cost, and one explicit eligibility state:

- Semantic Review eligible;
- Semantic Review not needed;
- Semantic Review blocked by objective issue; or
- Semantic Review unavailable.

If the first result is `not_needed`, the UI should explain why and must not offer a force-run action. If needed to obtain the approved success-path QA, use additional safe local artwork within the three-run limit.

### Integrated Pass 2

When an eligible result is obtained, click **Run Semantic Review** exactly once. This is the only authorized Pass 2 invocation. Verify no copy/paste is required, no image is resent, the configured Semantic Reviewer model is used, and the Pass 1 result remains visible above the Pass 2 result.

Verify Pass 2 displays decision, reason, resolved/unresolved blockers, validated patches, original/effective Smart Profiles, final blockers, final WAA/automation preview, provider/model, semantic prompt version, input/output tokens, Pass 2 cost, and combined cost. Verify the action cannot be clicked again for the same Pass 1 result.

If any image content appears in Pass 2 trace/request evidence (`imageCount` other than zero, image part, image bytes, or image URL), mark **FAIL and stop**.

### State and authority

After the one Pass 2 test, without another provider call where possible, change a material Pass 1 input such as prompt, image, or Pass 1 model. Confirm the old Pass 2 result is cleared/detached. Confirm original Smart Profile remains unchanged, effective Smart Profile is separate, protected fields are not presented as patchable, and objective blockers are not cleared.

Do not intentionally manufacture malicious live-provider patches; automated tests cover protected-field rejection.

### Cost and trace evidence

Record the exact Inspector values for Pass 1 and Pass 2 provider/model, prompt versions, tokens, costs, image counts, decision, patches, resolved/unresolved blockers, and displayed combined cost. Verify:

```text
combined cost = Pass 1 estimated cost + Pass 2 estimated cost
```

## Owner QA result

Pending owner manual execution. Codex has not invoked Pass 1 or Pass 2.

| QA item                               | Result                                      |
| ------------------------------------- | ------------------------------------------- |
| Initial Playground state              | **PENDING OWNER QA**                        |
| Real-image Pass 1                     | **PENDING OWNER QA**                        |
| Eligible result obtained within limit | **PENDING OWNER QA**                        |
| Integrated Pass 2 success             | **PENDING OWNER QA**                        |
| Zero-image Pass 2 evidence            | **PENDING OWNER QA**                        |
| One-attempt behavior                  | **PENDING OWNER QA**                        |
| State invalidation                    | **PENDING OWNER QA**                        |
| Authority protection                  | **PENDING OWNER QA**                        |
| Cost arithmetic                       | **PENDING OWNER QA**                        |
| Owner verdict                         | **PENDING — PASS / PASS WITH NOTES / FAIL** |

## Checkpoint

Deployment is complete and local DEV Studio is ready. Provider activity is stopped pending owner QA. No production action occurred.

`[NEEDS OWNER QA: INTEGRATED PLAYGROUND PASS 1 → PASS 2 FLOW]`

## Owner QA amendment — integrated Pass 2 runtime corrective investigation

**Amendment date:** 2026-09-06
**Disposition:** **FAIL WITH STRONG POSITIVE RESULTS**
**Corrective Plan:** `docs/workflow/plans/2026-09-06-integrated-playground-pass2-qa-runtime-corrective-plan.md`
**Formal Review:** `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-qa-runtime-corrective-review.md`

This amendment preserves the successful deployment and UX evidence above. It supersedes only the pending owner-result table for the integrated Pass 2 flow; it does not erase the deployment inventory, revision evidence, safety protections, or successful behaviors already recorded.

### Successful evidence retained

- Integrated Playground UX is present and well structured.
- The old standalone manual Pass 2 and copy/paste workflow are retired.
- Most Pass 1 runs succeed, including strong structured output and VCP results.
- Eligible Semantic Review can be launched from the displayed Pass 1 result without manual payload copy/paste.
- Successful Pass 2 calls return decision, patches, effective Smart Profile, final WAA, and cost.
- Final deterministic WAA remains authoritative.

### Blocking defects recorded separately

| Defect | Exact observed evidence | Disposition |
| --- | --- | --- |
| A — stale-looking semantic blocker and literal no-op patch | Displayed `objects` are `["Suede jacket", "Cowboy hat"]`; blocker is `structured_evidence_gap:objects:cowboy hat`; returned patch changes the field from the same array to the same array; blocker and WAA remain unresolved. | Case sensitivity is disproven. Current evidence helper excludes VCP even though the displayed VCP contains `Cowboy hat`; patch validation does not reject canonical no-ops. |
| B — malformed Pass 2 | At least two Pass 2 attempts show `Malformed semantic review response.` while other attempts succeed. | Underlying provider shape is not classified because the current Pass 2 path emits no trace/parser/provider diagnostic and DEV logs contain no matching failure record. Remains fail-closed pending an authorized corrective. |
| C — misleading unavailable message | UI showed `AI Playground is unavailable right now...` while `testAiEnrichmentPlayground` and `testAiEnrichmentSemanticReviewPlayground` were ACTIVE at the reviewed revisions. | Broad client/backend error mapping is proven; exact triggering error is not recoverable from current read-only logs. |

### Evidence and safety status

- No provider request was made by Codex during the investigation.
- No Firebase callable was invoked by Codex during the investigation.
- No settings, code, deployment, production, Semantic Reviewer, Autonomous, Y2, Gate C, or WS6 action was performed.
- No new validation pass is claimed by this amendment; the corrective Plan/Formal Review define the required future validation.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 2 QA CORRECTIVES]`

## Corrective implementation completion amendment

**Date:** 2026-09-06
**Disposition:** implementation complete; owner QA remains pending
**Plan:** `docs/workflow/plans/2026-09-06-integrated-playground-pass2-qa-runtime-corrective-plan.md`
**Implementation Review:** `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-qa-runtime-corrective-review.md`

The owner-authorized corrective is implemented and locally validated. It adds optional bounded VCP evidence parity, rejects stale and canonical no-op semantic patches, correlates Pass 2 traces to Pass 1, records sanitized provider/parser failure categories and costs, and separates provider/parser/precondition errors from true callable-unavailable errors in Studio.

The original owner QA disposition remains **FAIL WITH STRONG POSITIVE RESULTS** until a new evidence-bearing DEV retest. The malformed live provider response remains explicitly unclassified because no exact failing response body or correlating trace was available before this corrective. No speculative response variant was accepted.

Final local validation: Functions AI **400 passed / 0 failed**, shared AI/decision/profile/trace **126 passed / 0 failed**, Studio Settings **27 passed / 0 failed**, Functions build **PASS**, targeted ESLint **PASS**, and `git diff --check` **PASS**. Studio-wide typecheck/build retain the documented **ACCEPTED PRE-EXISTING VALIDATION EXCEPTION** of 33 unrelated diagnostics; they were not repaired.

No provider or Firebase callable was invoked, and no deployment was performed for this corrective.

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 2 QA CORRECTIVES + EVIDENCE-BEARING QA]`

## Corrective DEV deployment amendment

**Date:** 2026-09-06
**Authorization:** `OWNER AUTHORIZATION: DEPLOY PASS 2 QA CORRECTIVES + EVIDENCE-BEARING QA`
**Command:** `firebase deploy --only functions:testAiEnrichmentPlayground,functions:testAiEnrichmentSemanticReviewPlayground --project fresh-prints-dev`
**Result:** The command exceeded the local shell timeout, but read-only post-deployment metadata confirmed the exact authorized targets are ACTIVE on their new revisions with all traffic on the latest revision.

| Function | State | Revision | Firebase source hash | Project | Region | Runtime | Latest traffic |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `testAiEnrichmentPlayground` | ACTIVE | `testaienrichmentplayground-00071-xey` | `ce2ff1e1a61dcdab282b67fd0f460e1c4c3def8b` | `fresh-prints-dev` | `us-central1` | `GEN_2 / nodejs20` | 100% latest |
| `testAiEnrichmentSemanticReviewPlayground` | ACTIVE | `testaienrichmentsemanticreviewplayground-00012-tiy` | `ce2ff1e1a61dcdab282b67fd0f460e1c4c3def8b` | `fresh-prints-dev` | `us-central1` | `GEN_2 / nodejs20` | 100% latest |

Excluded Functions `enqueueAiEnrichment`, `reprocessReadyDesignWithAi`, and `testAiEnrichmentTagRerank` remained at their pre-deployment revisions. No other Functions, Firestore/Storage Rules, indexes, migrations, settings, production surfaces, or data were touched. Local DEV Studio was already running at `localhost:5173`; no restart was necessary. Codex invoked no live provider or Firebase callable.

Owner evidence-bearing QA is now the only pending checkpoint. Preserve the historical disposition above, including **FAIL WITH STRONG POSITIVE RESULTS**, until the bounded retest is complete.

`[NEEDS OWNER QA: PASS 2 CORRECTIVES + EVIDENCE-BEARING RETEST]`

## Owner evidence-bearing retest amendment — post-diagnostics deployment

**Amendment date:** 2026-09-06
**Disposition:** **OWNER QA: FAIL**
**Note:** Strong repeated Pass 1 quality; actionable runtime and Pass 2 effectiveness defects remain.
**Corrective Plan:** `docs/workflow/plans/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-plan.md`
**Formal Review:** `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-corrective-review.md`

This amendment **preserves** the historical disposition **FAIL WITH STRONG POSITIVE RESULTS** above. It records the new owner evidence-bearing QA after the diagnostics corrective was deployed to revisions `testaienrichmentplayground-00071-xey` and `testaienrichmentsemanticreviewplayground-00012-tiy`.

### Pass 1 quality evidence retained

Repeated owner testing of normal-sized real artwork showed strong Pass 1 stability and accuracy:

| Design | Observed Pass 1 result | Owner judgment |
| --- | --- | --- |
| Design 1 | Shadow Approve ×5 | Accurate |
| Design 2 | Shadow Approve ×5 | Accurate |
| Design 5 | Shadow Approve ×5 | Accurate |

Primary Pass 1 instability in this retest was the unusually large ~26 MB artwork (Design 4), not ordinary artwork.

### Blocking defects observed in this retest

| Defect | Exact observed evidence | Investigation disposition |
| --- | --- | --- |
| A — ~26 MB Pass 1 failure | Design 4 (~26 MB) consistently failed Pass 1. UI: `The Playground request failed unexpectedly. No changes were applied.` | Proven: client encodes raw base64 into callable JSON; ~26 MB → ~34.7 MB base64 alone, exceeding Gen2 32 MB HTTP request limit before Function code. Client preflight still allows 50 MB and does not resize. |
| B — intermittent unsupported Semantic Review response | Design 3 and at least one Design 6 attempt: `Semantic Review failed: The AI provider returned an unsupported Semantic Review response. No changes were applied.` Intermittent; other attempts on similar artwork returned results. | Proven stage: post-deploy diagnostics classified failure `b5189149-ef31-4912-b806-cd996a32b5a3` as `semantic_result_validation_failure` after HTTP 200 / `finishReason: stop` / string content. Exact response body still absent (`captureFullTrace: false`). |
| C — Pass 2 does not clear required semantic blockers to Ready | No observed Pass 2 attempt produced final Ready/approved WAA. Frankenstein subjects patch removed bare `monster` yet unresolved `subject_specificity_risk:monster` remained. Dandelion-clock objects patch applied while blockers stayed unresolved and themes were also edited. | Proven: final WAA merges reviewer `blockersUnresolved` over post-patch deterministic recompute. Frankenstein trace `2e7e8047-…` shows hardBlockers `[]` after patch while reasonCodes still contain reviewer-injected `subject_specificity_risk:monster`. |
| D — Decision / Validated Patches layout | Side-by-side cards stretch unequally; long Validated patches leave Decision with excess empty vertical space. | Proven: `.settings-playground-context-grid` equal-height stretch + Validated `<pre>` lacks `.settings-playground-profile-card` scroll bound. |

### Evidence and safety status

- No provider request was made by Codex during the corrective investigation.
- No Firebase callable was invoked by Codex during the corrective investigation.
- Read-only DEV Cloud logs and Firestore `aiEnrichmentTraces` were inspected.
- No settings, code, deployment, production, Semantic Reviewer, Autonomous, Y2, Gate C, or WS6 action was performed for this amendment.
- VCP `detailedDescription` study remains **OUT OF SCOPE** and queued after a stable owner QA checkpoint.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT POST-QA PASS 2 + LARGE-IMAGE CORRECTIVES]`

## Post-QA corrective DEV deployment amendment — Semantic Review Playground only

**Amendment date:** 2026-09-06
**Authorization:** `OWNER AUTHORIZATION: DEPLOY POST-QA PLAYGROUND CORRECTIVES + OWNER RETEST`
**Implementation Review:** `docs/workflow/reviews/2026-09-06-integrated-playground-pass2-large-image-and-effectiveness-implementation-review.md`
**Command:**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
firebase deploy --project fresh-prints-dev --only functions:testAiEnrichmentSemanticReviewPlayground
```

**Result:** Deploy complete. **1 Function updated, 0 errored.**

### Deployed runtime

| Function | State | Revision | Firebase source hash | Project | Region | Runtime | Memory | Latest traffic |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `testAiEnrichmentSemanticReviewPlayground` | ACTIVE | `testaienrichmentsemanticreviewplayground-00013-wag` | `41072e3820d5c485849efeceae849e036639413d` | `fresh-prints-dev` | `us-central1` | `GEN_2 / nodejs20` | `512Mi` | 100% latest |

### Unchanged (explicitly not deployed)

| Function | Pre/post revision (unchanged) |
| --- | --- |
| `testAiEnrichmentPlayground` | `testaienrichmentplayground-00071-xey` |
| `enqueueAiEnrichment` | `enqueueaienrichment-00114-xab` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00020-cax` |
| `testAiEnrichmentTagRerank` | `testaienrichmenttagrerank-00021-tox` |

### Scope protections verified

| Item | Result |
| --- | --- |
| Unauthorized Function deployments | **NO** |
| `testAiEnrichmentPlayground` deployed | **NO** |
| Processing Functions / `aiEnrichmentCandidateCore` deployed | **NO** |
| Firestore/Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |
| Settings mutation | **NO** |
| Semantic Reviewer enabled | **NO** (`semanticReviewerEnabled` unset/null; mode `shadow`) |
| Autonomous enabled | **NO** (`catalogAutonomousLiveEnabled: false`) |
| Production touched | **NO** |
| Commit / push | **NO** |
| Provider call by Codex | **NO** (0) |

### Local DEV Studio

- `npm run dev:studio` already running; Vite at `http://localhost:5173` returned HTTP 200.
- Reviewed corrective Studio source is present in the working tree (large-image client prep, deterministic blocker UI, layout CSS).
- Owner should **hard-reload the Studio window** (renderer HMR/Vite watch is active) before QA so Pass 1 large-image prep and Pass 2 UI are current.
- No Studio publish, version bump, installer, or release.

### Owner retest — superseded by skew blocker below

Historical dispositions preserved:

- **FAIL WITH STRONG POSITIVE RESULTS**
- **OWNER QA: FAIL** (post-diagnostics retest)

Post-`00013-wag` owner retest: large-image **PASS**; Pass 2 **BLOCKED** (see next amendment). Dormant Processing parity remains queued separately.

`[NEEDS OWNER AUTHORIZATION: DEPLOY DORMANT CANDIDATE-CORE PASS 2 AUTHORITY PARITY]`

## Owner retest amendment — Pass 2 blocked by Pass 1/Pass 2 deployment skew

**Amendment date:** 2026-09-06
**Phase:** Read-only corrective investigation (no implement / no deploy / no provider calls by Codex)

### Owner QA partial results (this retest)

| Slice | Result | Notes |
| --- | --- | --- |
| Large-image ~26 MB regression | **PASS** | Client derivative/preflight path works; original file not blindly sent as base64. |
| Pass 2 behavioral QA (C–I) | **BLOCKED** | Every Studio-eligible Pass 1 result fails immediately on Run Semantic Review. |
| Owner-visible error | `Semantic Review failed: Semantic Review cannot run for this result.` | Client collapses all `business_precondition` / `failed-precondition` Semantic Review failures to this safe string. |

Historical dispositions remain preserved:

- **FAIL WITH STRONG POSITIVE RESULTS**
- **OWNER QA: FAIL** (post-diagnostics retest)
- Prior post-QA deploy amendment above remains historical record

### Exact failing precondition (mechanically proven)

| Item | Value |
| --- | --- |
| User-visible message source | `safeSemanticReviewErrorMessage("business_precondition")` → `Semantic Review cannot run for this result.` via `mapSemanticReviewError` → Studio `resolveAiEnrichmentCallableErrorMessage(..., "semanticReview")` |
| Server throw site | `functions/src/ai/semanticReviewPlayground.ts` — `eligibility.semanticBlockers.length === 0` |
| Exact boolean | `resolvePlaygroundEligibility(...).semanticBlockers.length === 0` is **true** |
| `rejectionReason` | `no_eligible_semantic_blocker` |
| Provider invoked | **NO** (`request_sent` never reached; `parser: NOT REACHED`; HTTP ~247 ms; Cloud log on revision `00013-wag`) |

#### Correlated owner failure evidence

| Field | Value |
| --- | --- |
| Pass 1 trace ID | `c571db16-bb35-41e7-9840-2f718264500c` |
| Pass 2 attempted trace ID | `bfdbd59f-e515-47b8-91f9-a35d6d459165` |
| Pass 2 revision / source hash | `testaienrichmentsemanticreviewplayground-00013-wag` / `41072e3820d5c485849efeceae849e036639413d` |
| Artwork (from Pass 1 normalized) | Frankenstein Blowing Dandelions — subjects `["Frankenstein's monster"]`, objects `["Dandelion","Dandelion seeds"]` |
| Automatic `semanticReviewerEnabled` | **OFF** (not consulted by Playground Pass 2) |

#### Root-cause recompute (same normalized Pass 1 lists)

| Decision input | `structured_evidence_gap:objects:dandelion seeds` | Pass 2 eligible? |
| --- | --- | --- |
| **Without** `visualContextProfile` (deployed Pass 1 `00071-xey` pattern: `buildPass1Context` omits VCP from `computeCatalogAutomationDecision`) | **Present** → semantic blocker → Studio shows **eligible** | n/a (Pass 1 UI) |
| **With** `visualContextProfile` (deployed Pass 2 `00013-wag`: `resolvePlaygroundEligibility` passes VCP; shared evidence uses VCP.objects) | **Cleared** (`gapsVcp: []`) → `semanticBlockers.length === 0` | **NO** → `no_eligible_semantic_blocker` |

### Investigation answers

| Question | Answer |
| --- | --- |
| A — exact failed precondition | `semanticBlockers.length === 0` after server-side recompute (`rejectionReason: no_eligible_semantic_blocker`) |
| B — `canRunSemanticReview()` / `semanticReviewerEnabled` required on manual Playground? | **NO** — Playground path does not call `canRunSemanticReview`; does not gate on `semanticReviewerEnabled` |
| C — Pass 1/Pass 2 deployment version skew? | **YES** |
| C — should `testAiEnrichmentPlayground` have been redeployed with the post-QA corrective? | **YES** — deployment-inventory omission in the Implementation Review (shared evidence/decision + Pass 1 `visualContextProfile` wiring affect eligibility; not client-image-only) |
| D — request DTO field mismatch? | **NO** — Studio maps Pass 1 context fields correctly; Pass 2 **intentionally recomputes** eligibility and does not trust client `pass2Eligibility` / blocker arrays for the gate |

### Corrected next deploy inventory (no source change required)

Current reviewed working-tree source already wires Pass 1 `buildPass1Context` to pass `visualContextProfile` into `computeCatalogAutomationDecision` (parity with Pass 2). **Do not implement new code for this failure.**

Deploy only:

1. `testAiEnrichmentPlayground` — **required** to end eligibility skew
2. Optionally keep `testAiEnrichmentSemanticReviewPlayground` as-is (`00013-wag`) unless a combined redeploy is preferred for same source hash

Do **not** deploy Processing Functions, Rules, indexes, migrations, or production.

### Next owner authorization phrase

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 1 PLAYGROUND ELIGIBILITY PARITY + OWNER RETEST]`

Pass 2 owner behavioral QA remains blocked until that deploy completes.

## Pass 1 eligibility-parity DEV deployment amendment

**Amendment date:** 2026-09-06
**Authorization:** `OWNER AUTHORIZATION: DEPLOY PASS 1 PLAYGROUND ELIGIBILITY PARITY + OWNER RETEST`
**Branch:** deployment skew only — **no source change**
**Command:**

```powershell
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '60'
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'
firebase deploy --project fresh-prints-dev --only functions:testAiEnrichmentPlayground
```

**Result:** Deploy complete. **1 Function updated, 0 errored.**

### Deployed runtime

| Function | State | Revision | Firebase source hash | Project | Region | Runtime | Memory | Latest traffic |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `testAiEnrichmentPlayground` | ACTIVE | `testaienrichmentplayground-00072-wim` | `41072e3820d5c485849efeceae849e036639413d` | `fresh-prints-dev` | `us-central1` | `GEN_2 / nodejs20` | `512Mi` | 100% latest |

Previous Pass 1 revision (superseded): `testaienrichmentplayground-00071-xey` / hash `ce2ff1e1a61dcdab282b67fd0f460e1c4c3def8b`.

### Explicitly unchanged

| Function | Revision (unchanged) |
| --- | --- |
| `testAiEnrichmentSemanticReviewPlayground` | `testaienrichmentsemanticreviewplayground-00013-wag` (hash `41072e3820d5c485849efeceae849e036639413d`) |
| `enqueueAiEnrichment` | `enqueueaienrichment-00114-xab` |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00020-cax` |
| `testAiEnrichmentTagRerank` | `testaienrichmenttagrerank-00021-tox` |

Note: Pass 1 and Pass 2 now share the same Firebase source hash `41072e38…` after this Pass 1 redeploy.

### Scope protections verified

| Item | Result |
| --- | --- |
| Unauthorized Function deployments | **NO** |
| Pass 2 redeployed | **NO** |
| Processing Functions / `aiEnrichmentCandidateCore` deployed | **NO** |
| Firestore/Storage Rules | **NO** |
| Indexes | **NO** |
| Migration | **NO** |
| Settings mutation | **NO** |
| Semantic Reviewer enabled | **NO** (`semanticReviewerEnabled` unset/null; mode `shadow`) |
| Autonomous enabled | **NO** (`catalogAutonomousLiveEnabled: false`) |
| Production touched | **NO** |
| Commit / push | **NO** |
| Provider call by Codex | **NO** (0) |

### Local DEV Studio

- `npm run dev:studio` running; Vite `http://localhost:5173` HTTP 200.
- Owner must **hard-reload the Studio window** before QA so Pass 1 results come from revision `00072-wim`.
- No Studio publish / version bump / installer.

### Preserved owner QA dispositions

- Historical: **FAIL WITH STRONG POSITIVE RESULTS**; post-diagnostics **OWNER QA: FAIL**
- Large-image ~26 MB regression: **PASS** (no new large-image provider run required for this parity deploy)
- Prior Pass 2 blocked by skew: historical record only

### Owner retest — pending (eligibility parity)

Codex must not invoke Pass 1/Pass 2. Owner performs all provider calls.

`[NEEDS OWNER QA: PASS 1/PASS 2 ELIGIBILITY PARITY RETEST]`

Dormant Processing parity remains queued separately:

`[NEEDS OWNER AUTHORIZATION: DEPLOY DORMANT CANDIDATE-CORE PASS 2 AUTHORITY PARITY]`

## Owner retest amendment — unsupported Semantic Review response reproduced

**Amendment date:** 2026-09-07
**Phase:** read-only evidence investigation → corrective Plan → Formal Review
**No implementation / deployment / provider or callable invocation by Codex**

This amendment preserves every historical deployment and QA disposition above, including **FAIL WITH STRONG POSITIVE RESULTS**, **OWNER QA: FAIL**, the large-image pass, and the already deployed eligibility-parity result.

### Owner QA evidence

| QA item | Result | Evidence |
| --- | --- | --- |
| Large-image ~26 MB regression | **PASS** | Do not reopen in this corrective. |
| Pass 1 / Pass 2 eligibility parity | **PASS** | Frankenstein/dandelion produced no false Pass 2 eligibility. |
| Frankenstein/dandelion Pass 1 | **PASS — Shadow Approve ×5** | Title, description, Smart Profile, VCP, and enrichment output were owner-judged good. |
| Category stability / ambiguity | **NON-BLOCKING FOLLOW-UP** | Approved categories varied: `Spiritual & Mystical`, `Cute & Whimsical`, and `Pop Culture & Characters`. This is separately recorded as `CATEGORY STABILITY / AMBIGUITY FOLLOW-UP`; no category logic is changed here. |
| First genuinely Pass 2-eligible result | **FAIL** | Owner clicked Run Semantic Review once and received the unsupported-response error below. |
| Pass 2 end-to-end QA | **BLOCKED** | Stop after the evidence-bearing failure; no further provider testing. |
| Unsupported response investigation | **OPEN → root cause and reviewed corrective complete; implementation pending authorization** | Exact trace and provider shape now recovered from bounded diagnostics. |

**Exact owner-visible error:**

`The AI provider returned an unsupported Semantic Review response. No changes were applied.`

### Recovered live evidence

| Field | Value |
| --- | --- |
| Pass 1 trace ID | `4d41b3d9-59f4-4f1b-9911-59f49ee67bb6` |
| Failed Pass 2 trace ID | `6b4db3ca-1cd8-4b50-aefc-2749d928e874` |
| Correlation | `parentTraceId` / `pass1TraceId` equal the Pass 1 trace ID |
| Function revision / hash | `testaienrichmentsemanticreviewplayground-00013-wag` / `41072e3820d5c485849efeceae849e036639413d` |
| Provider / model / prompt | Google / `gemini-2.5-flash-lite` / `catalog-semantic-review-v3` |
| Lifecycle | `created → prompt_ready → request_sent → provider_response → failed` |
| Text/image input | text-only; `imageCount: 0` |
| HTTP / finish reason | `200` / `stop` |
| Tokens / estimated cost | `1338` input / `150` output / `$0.0001938` |
| Failure category / stage / fault | `patch_validation_failure` / `patch_validation` / `patch_validation_failed` |
| Exact validator rejection | `Unsupported semantic review patch field: subjects` |

The sanitized returned JSON was valid and extractable. It contained `decision`, `reason`, `blockersResolved`, `blockersUnresolved`, and `patches`; its patch used the unsupported array item `{ "field": "subjects", "value": ["Flowers", "Nature", "Wildflowers"] }` rather than the accepted canonical array `{ field, from, to }` or existing patch map. No raw full trace exists because `captureFullTrace` was false.

### Corrective disposition

The reviewed corrective is **Option A — provider prompt/schema correction**. It will reuse the repository's existing strict `json_schema` response-format mechanism on the same Gemini endpoint, require the canonical patch-map form, preserve fail-closed parser behavior, add no automatic retry, and deploy only the Semantic Review Playground Function after separate authorization.

- Corrective Plan: `docs/workflow/plans/2026-09-07-semantic-review-unsupported-provider-response-corrective-plan.md`
- Formal Review: `docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-review.md`
- Formal Review verdict: **approved**

No category correction, Pass 1 change, VCP study, automatic Semantic Reviewer enablement, Autonomous enablement, Processing deployment, Y2, Gate C, WS6, commit, push, or production action is included.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT SEMANTIC REVIEW PROVIDER-RESPONSE RELIABILITY CORRECTIVE]`

## Owner-authorized implementation amendment — Semantic Review v4

**Amendment date:** 2026-09-07
**Authorization:** `OWNER IMPLEMENTATION AUTHORIZATION: IMPLEMENT SEMANTIC REVIEW PROVIDER-RESPONSE RELIABILITY CORRECTIVE`
**Disposition:** implementation and scoped validation complete; deployment remains a separate owner checkpoint.

The approved Option A corrective is implemented. `callSemanticReviewer` now
sends the strict provider-neutral `catalog-semantic-review-v4` JSON Schema to
both supported provider targets. The prompt requires the existing patch-map
form. The exact captured `{ field, value }` response remains a fail-closed
`patch_validation_failure`; no parser broadening or structural retry was added.
The effective response contract is included in the canonical Pass 2 trace.

### Validation evidence

| Check | Result |
| --- | --- |
| Semantic Review schema/core/provider/Playground tests | **PASS — 31/31** |
| Functions AI suite | **PASS — 410/410** |
| Relevant shared Semantic Review/policy/trace tests | **PASS — 58/58** |
| Studio Settings scoped tests | **PASS — 29/29** |
| Functions build/typecheck | **PASS** |
| Studio Vite build | **PASS** |
| Targeted corrective ESLint | **PASS — 14 files** |
| Broad-suite exceptions | **ACCEPTED PRE-EXISTING VALIDATION EXCEPTION** — exact files/errors recorded in the Implementation Review |

Implementation Review:

`docs/workflow/reviews/2026-09-07-semantic-review-unsupported-provider-response-corrective-implementation-review.md`

No provider/callable invocation, deployment, Settings mutation, Processing
deployment, Semantic Reviewer enablement, Autonomous enablement, Y2, Gate C,
WS6, commit, push, or production action was performed.

Expected later DEV inventory: `testAiEnrichmentSemanticReviewPlayground` only.

`[NEEDS OWNER AUTHORIZATION: DEPLOY SEMANTIC REVIEW V4 RESPONSE CONTRACT + OWNER RETEST]`

## DEV deployment amendment — Semantic Review v4

**Deployment date:** 2026-09-07
**Authorization:** `OWNER AUTHORIZATION: DEPLOY SEMANTIC REVIEW V4 RESPONSE CONTRACT + OWNER RETEST`
**Command:** `firebase deploy --only functions:testAiEnrichmentSemanticReviewPlayground --project fresh-prints-dev`

### Deployment evidence

| Item | Result |
| --- | --- |
| Function deployed | `testAiEnrichmentSemanticReviewPlayground` only |
| Project / region | `fresh-prints-dev` / `us-central1` |
| State | **ACTIVE** |
| New Cloud Run revision | `testaienrichmentsemanticreviewplayground-00014-wof` |
| Firebase source/deployment hash | `aeb2e287d9d5748de9d2b6852dfc6c95fbda7c33` |
| Runtime | `nodejs20` |
| Memory | `512Mi` |
| Timeout | `60 seconds` |
| CPU / concurrency | `1` / `80` |
| Traffic | `100%` on latest revision |
| Service URL | `https://us-central1-fresh-prints-dev.cloudfunctions.net/testAiEnrichmentSemanticReviewPlayground` |
| Local Studio | **PASS** — `http://localhost:5173` returned HTTP 200 |

### Deployment boundary verification

| Boundary | Result |
| --- | --- |
| Unauthorized Functions deployed | **NO** |
| Pass 1 Playground redeployed | **NO** — hash remains `41072e3820d5c485849efeceae849e036639413d` |
| Processing Functions deployed | **NO** |
| `enqueueAiEnrichment` / `reprocessReadyDesignWithAi` changed | **NO** — hashes remain `e65080ba30b00bdd18ce99cc9ed052691fe5d057` |
| `testAiEnrichmentTagRerank` changed | **NO** — hash remains `7cf3135184a714a1becac39c4a3e5a84ae5b29da` |
| Rules / indexes / migrations / Settings | **NO** |
| Semantic Reviewer | **OFF** — Firestore flag absent/null; loader treats only `true` as enabled |
| Autonomous | **OFF** — `catalogAutonomousLiveEnabled=false` |
| Workflow mode | `shadow` |
| Provider calls by Codex | **0** |
| Production touched | **NO** |
| Commit / push | **NO** |

## Owner QA checkpoint — pending

Codex must not invoke the Pass 1 or Pass 2 callable. The owner performs the
bounded live-provider retest manually in DEV after hard-reloading local Studio.

1. Run normal Pass 1 images until one genuinely Pass 2-eligible result appears,
   up to the approved bounded maximum. Record the Pass 1 trace ID, eligible
   semantic blockers, initial WAA, provider/model, tokens, and cost.
2. For that displayed result, click **Run Semantic Review** exactly once.
3. In Inspector, verify `catalog-semantic-review-v4`, strict `json_schema`, the
   provider/model, `imageCount=0`, no image URL/bytes/part, one provider request,
   and no structural retry.
4. Confirm the prior unsupported-response error does not recur. If it does,
   stop on that result and capture the exact trace evidence without changing
   parser/schema or retry behavior.
5. If a valid patch is returned, verify immutable original versus effective
   Smart Profile, deterministic blocker recomputation, audit-only reviewer
   blocker arrays, protected/objective authority, final WAA, bounded cards, and
   no horizontal overflow.
6. Record Pass 1 cost, Pass 2 cost, combined displayed cost, and arithmetic.

Do not enable Semantic Reviewer or Autonomous. Do not run Processing, Y2, Gate
C, or WS6. Do not deploy again during this checkpoint.

`[NEEDS OWNER QA: SEMANTIC REVIEW V4 RESPONSE CONTRACT RETEST]`

## Owner QA amendment — Pass 2 `musicians` no-op contradiction and missing request observability

**Amendment date:** 2026-09-07
**Disposition:** Evidence-preserving corrective investigation complete; no implementation or deployment authorized by this amendment

The owner supplied failed Pass 2 Playground trace
`6373e41f-1489-422b-b87d-09d82f8872cf`, whose parent Pass 1 trace is
`363da659-b873-4868-b75f-f9ada9cdeb88`. The trace is retained in the owner
attachment `f994fac1-4588-4ed1-a2ec-4f4f04a9b92c/pasted-text.txt` and is not a
repository-generated artifact.

### Exact observed evidence

| Field | Observed value |
| --- | --- |
| Source | `PLAYGROUND` |
| Provider / model | `google / gemini-2.5-flash-lite` |
| Pass 2 input | `imageCount=0`, `textOnly=true`, `pass1TraceId=363da659-b873-4868-b75f-f9ada9cdeb88` |
| Lifecycle | `created → prompt_ready → request_sent → provider_response → failed` |
| Provider response | HTTP 200, one choice, string content, `finishReason=stop` |
| Response category | `patch_validation_failure` |
| Sanitized provider decision | `APPROVE_WITH_PATCH` |
| Sanitized provider patch | `subjects = ["beatles", "musicians"]` |
| Validator result | `Semantic review patch is a no-op after canonical normalization.` |
| Downstream stages | parsed/VCP/candidate/persistence/final result: `NOT REACHED` |
| Capture mode | `captureFullTrace=false` |

### Required classification

- Exact blocker-generation subjects: **UNPROVEN**.
- Exact Pass 1 serialized subjects: **UNPROVEN**; parent trace unavailable.
- Exact rendered prompt subjects: **UNPROVEN**; bounded trace stripped prompt text.
- Exact provider-request subjects/body: **UNPROVEN**; outbound body was not
  snapshotted.
- Exact patch-validator raw `from`: **UNPROVEN**.
- Canonical patch `to`: **PROVEN** as `["beatles", "musicians"]`.
- Canonical patch `from`: **INFERRED** equivalent to the same list from the
  no-op rejection, not directly captured.
- State skew, stale blocker, provider patch defect, and validator defect:
  **UNPROVEN**.
- Business-logic corrective justified from this trace: **NO**.

The blocker originates through
`computeCatalogAutomationDecision` → `findStructuredEvidenceGaps`.
Smart Profile presence alone does not satisfy the evidence check; title,
description, visible text, and structured VCP evidence also matter.

### Why `{}` is not proof of an empty request

The bounded trace serializer intentionally removes prompt text unless full
capture is enabled. The deployed serializer also redacted token-named fields
and stopped at a shallow nesting depth, which can leave request options and
deep response-schema content as `{}` or `[]`. This is a trace projection gap;
the historical evidence cannot prove that the provider received an empty
prompt, schema, or options.

### Corrective record

The evidence-based Plan and Formal Review are:

- Plan:
  `docs/workflow/plans/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-plan.md`
- Formal Review:
  `docs/workflow/reviews/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-review.md`

The approved direction is observability first: capture bounded, explicit
`semanticReviewInput`, `renderedPrompt`, `providerRequest`, and
`patchValidationInput` sections at the points where they are known. No prompt,
schema, provider, retry, blocker, validator, or business behavior change is
approved by this amendment. The corrective must preserve secrets/image bytes,
show truncation explicitly, preserve failed-stage evidence, and add no AI
calls or Firestore dependency to ordinary tests.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 2 INPUT-STATE CONSISTENCY AND PLAYGROUND REQUEST OBSERVABILITY CORRECTIVE]`

## Implementation amendment — Pass 2 boundary observability corrective

**Implementation date:** 2026-09-07
**Authorization:** Owner authorization received in the Pass 2 input-state
consistency and Playground request-observability corrective prompt
**Status:** Implemented and locally validated; not deployed

The approved narrow observability corrective is complete. The runtime now
captures the following explicit bounded sections for DEV Playground Pass 2:

- `pass2Diagnostics.semanticReviewInput` — title, description, category,
  original/effective Smart Profile, VCP, eligible/objective/semantic blockers,
  Pass 2 eligibility, and the server eligibility summary.
- `pass2Diagnostics.renderedPrompt` — prompt version, exact system message,
  and exact rendered user message.
- `pass2Diagnostics.providerRequest` — the actual provider request body built
  immediately before dispatch, including model, max completion tokens,
  response format, and messages. Authorization headers, credentials, secrets,
  image bytes, and image data URIs are excluded by explicit projection.
- `pass2Diagnostics.patchValidationInput` — current Smart Profile, raw
  provider patch, parsed patch, canonical from/to values, validation result,
  and validation reason; it remains explicitly `NOT REACHED` when validation
  is not reached.

The Inspector presents six distinct boundary sections: Semantic Review Input;
Rendered Prompt / Messages; Provider Request / Response Contract; Provider
Response; Patch Validation; and Deterministic Result / Decision. Downstream
parser, VCP, candidate, and persistence states remain truthful and display
`NOT REACHED` after a failure. Bounded projection includes explicit redaction
and truncation metadata, and the existing test/trace sink model remains
Firestore-free for ordinary unit tests.

Files changed for this corrective include:

- `packages/shared/src/types/ai/aiEnrichmentTrace.types.ts`
- `packages/shared/src/utils/aiEnrichmentTrace.ts` and its tests
- `functions/src/ai/semanticReviewCore.ts` and its tests
- `functions/src/ai/semanticReviewProvider.ts` and its tests
- `functions/src/ai/semanticReviewPlayground.ts` and its tests
- `functions/src/ai/semanticReviewErrors.ts`
- `apps/studio/src/renderer/src/features/settings/components/AiEnrichmentTraceInspector.tsx`
- Inspector settings contract tests and `settings.css`

This amendment does not claim that the historical `musicians` no-op root cause
is solved. It only makes the next controlled retest evidence-bearing. The
existing historical provider behavior, prompts, v4 schema, parser acceptance,
no-op rejection, retry behavior, authority/WAA behavior, and business result
remain unchanged. No provider request, Firebase callable, or deployment was
performed by this implementation pass.

Validation and the complete corrective Implementation Review are recorded in:

`docs/workflow/reviews/2026-09-07-pass2-input-state-consistency-and-playground-request-observability-corrective-implementation-review.md`

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 2 REQUEST OBSERVABILITY + OWNER RETEST]`

## Corrective investigation amendment — Semantic Review blocker semantics and canonical no-op

**Amendment date:** 2026-09-07
**Disposition:** Read-only investigation, Corrective Plan, and Formal Review complete; implementation and deployment remain unauthorized

This amendment preserves the prior QA and observability history. The Pass 2
request-observability corrective is implemented and locally validated, but its
deployment remains separately gated under the marker above. No observability
code was reimplemented by this amendment.

### Decisive full-capture evidence

The decisive trace is Pass 2
`a32ae4d0-5f55-45b4-8efe-43ddff3bc64e`, with parent Pass 1 trace
`df5712e1-f3d2-45f0-81f6-6cf83a5e0589`. It used Google /
`gemini-2.5-flash-lite` and prompt version `catalog-semantic-review-v4`.

The full captured prompt proves the actual provider input contained:

- original `subjects`: `['Flowers', 'Nature']`
- effective `subjects`: `['Flowers', 'Nature']`
- eligible blocker: `structured_evidence_gap:subjects:nature`

Gemini returned HTTP 200, valid JSON, and the supported v4 patch-map shape,
but described Nature as missing and proposed the identical target
`subjects: ['Flowers', 'Nature']`. The existing validator correctly rejected
the proposal:

`Semantic review patch is a no-op after canonical normalization.`

### Required classification record

| Finding | Result |
| --- | --- |
| Observability corrective implementation | Complete locally; deployment separately gated |
| Actual Smart Profile sent to Gemini | Proven: original/effective subjects were `['Flowers', 'Nature']` |
| Blocker | `structured_evidence_gap:subjects:nature` |
| Gemini said Nature was missing | Yes; incorrect interpretation |
| Gemini proposed identical target | Yes |
| Validator rejection | Correct canonical no-op rejection |
| Payload/state skew for this trace | **DISPROVEN** |
| Blocker-semantics misunderstanding | **PROVEN** |
| v4 patch-map response format | **PASS** |
| Pass 2 end-to-end result | **FAIL** |
| Current user-safe unsupported-response message | **Misleading** for this valid-response/no-op case |

The evidence does not justify changing the blocker algorithm, v4 schema,
parser, validator, retry behavior, or no-op rejection. It justifies the narrow
model-facing semantic metadata/prompt corrective and a distinct truthful no-op
classification described in the new Plan and Formal Review.

### New corrective artifacts

- Plan:
  `docs/workflow/plans/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-plan.md`
- Formal Review:
  `docs/workflow/reviews/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-review.md`

No code, prompt, schema, parser, provider, retry, no-op behavior, deployment,
provider call, Firebase callable, Semantic Reviewer setting, Autonomous mode,
Processing, Y2, Gate C, WS6, production, commit, or push was performed by
this amendment.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT SEMANTIC REVIEW BLOCKER-SEMANTICS + NO-OP CORRECTIVE]`

## Implementation amendment — Semantic Review blocker semantics and canonical no-op

**Amendment date:** 2026-09-07
**Disposition:** Approved corrective implemented and locally validated; DEV deployment remains separately gated

This amendment preserves all earlier QA and observability evidence. The
approved blocker-semantics/no-op corrective is now implemented in the local
checkout. No provider request, Firebase callable, deployment, Semantic
Reviewer enablement, Autonomous change, Processing invocation, Y2, Gate C,
WS6, production action, commit, or push was performed.

### Implementation completed

- Prompt version is now `catalog-semantic-review-v5`.
- The model receives `eligibleBlockers` unchanged plus explicit typed
  `eligibleBlockerDetails` for exactly `structured_evidence_gap` and
  `subject_specificity_risk`.
- Evidence-gap details state that the named value is already present in the
  current Smart Profile field and that the issue is insufficient deterministic
  evidence, not absence.
- Specificity-risk details state that the generic/head subject is already
  represented and require grounded, evidence-supported specificity.
- The `catalog_semantic_review_v4` response schema, parser acceptance,
  canonical no-op rejection, retry behavior, text-only Pass 2 request, and
  one-Pass-2-attempt boundary remain unchanged.
- Canonical no-op validation failures are classified as
  `semantic_review_noop`, mapped through the existing failed-precondition
  transport, and shown with:
  `Semantic Review proposed no effective change. No changes were applied.`
- No-op responses still apply no mutation, cannot produce Ready, and cannot
  override deterministic blocker/WAA authority. Reviewer blocker arrays remain
  audit-only.

### Local validation

- Focused shared/Functions/Studio semantic-review command: **PASS — 55/55**
  tests, 8 suites.
- Complete `functions/src/ai` sweep: **PASS — 402/402** tests, 69 suites.
- Shared AI/trace/policy scope: **PASS — 40/40** tests, 7 suites.
- Studio Settings scope: **PASS — 32/32** tests, 9 suites.
- Functions build: **PASS**.
- Shared semantic-review typecheck: **PASS**.
- Studio Vite renderer/electron/preload build: **PASS** — 2,575 / 533 / 10
  modules; existing dynamic-import and large-chunk warnings remain.
- Targeted ESLint: **PASS** with zero errors and warnings.

The broader shared sweep was run in Windows-safe batches: **1,668 tests,
1,664 passed, 4 failed**. The two unrelated failures are the existing public
Firestore-rule alignment assertion and the three `resolveImportUpscaleTargetPx`
assertions in `packages/shared/src/utils/printSizeMath.test.ts`.

The Studio full TypeScript check remains non-green with **33 error lines** in
the exact unrelated files/tests recorded in the implementation review. The
failure files are not part of this corrective inventory and none was modified
by the blocker-semantics/no-op corrective. Fifteen of the failure files are
byte-present and unchanged at checkpoint
`5712b51d0f0b867652e7f3e5ea0f22c620cebc1e`. The `useAiReviewInbox` callback
containing the nullability errors is unchanged; the current unrelated
`UpcomingShowsPage` unused-import error was introduced by a separate
post-checkpoint edit that removed its JSX use and is documented separately,
not misreported as baseline.

The complete implementation review records exact files, command results,
baseline comparison, accepted validation exceptions, and deployment safety:

`docs/workflow/reviews/2026-09-07-semantic-review-blocker-semantics-and-no-op-corrective-implementation-review.md`

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 2 OBSERVABILITY + BLOCKER-SEMANTICS V5 + OWNER RETEST]`

## DEV deployment amendment — Pass 2 observability + blocker-semantics v5

**Deployment date:** 2026-09-07
**Disposition:** Reviewed DEV deployment complete; owner-controlled QA is now
required. Codex did not invoke the callable, a provider, Processing, Y2, or
any other AI path.

### Exact reviewed deployment

The deployment was executed from the `development` branch and the checked-in
implementation represented by the reviewed source state. The exact command
was:

```powershell
firebase deploy --only functions:testAiEnrichmentSemanticReviewPlayground --project fresh-prints-dev
```

Firebase reported **1 Function Deployed, 0 Functions Errored, and 0 Function
Deployments Aborted**. The operation completed at
`2026-09-07T17:14:10.867686912Z`.

| Field | Verified result |
| --- | --- |
| Project | `fresh-prints-dev` |
| Function | `testAiEnrichmentSemanticReviewPlayground` |
| Region | `us-central1` |
| State | `ACTIVE` |
| Cloud Run revision | `testaienrichmentsemanticreviewplayground-00015-jur` |
| Firebase deployment/source hash | `b8ff05f45d26a59b1e52cff85b897d080b505974` |
| Previous Firebase source hash | `aeb2e287d9d5748de9d2b6852dfc6c95fbda7c33` |
| Runtime | Node.js 20 |
| Memory | 512 MiB |
| Timeout | 60 seconds |
| CPU | 1 |
| Concurrency | 80 |
| Maximum instances | 20 |
| Traffic | 100% on latest revision |
| Function URL | `https://us-central1-fresh-prints-dev.cloudfunctions.net/testAiEnrichmentSemanticReviewPlayground` |
| Cloud Build | `365aa483-cd3f-41a8-befa-001321889833` |

### Deployment boundary verification

| Surface | Result |
| --- | --- |
| `testAiEnrichmentPlayground` | **Not deployed** |
| Processing functions | **Not deployed** |
| Tag-rerank function | **Not deployed** |
| Firestore rules/indexes | **Not deployed/changed** |
| Storage rules | **Not deployed/changed** |
| Migrations | **Not run** |
| Studio publish/deploy | **Not performed**; local Studio remained available at `http://localhost:5173` (HTTP 200) |
| Settings mutation | **Not performed** |
| Semantic Reviewer | **OFF** |
| Autonomous | **OFF** |
| Production | **Untouched** |
| Commit/push | **Not performed** |

The five historically present, unauthorized functions were still present but
were not deployed by this action. Their Firebase source hashes were unchanged
before and after deployment:

- `testAiEnrichmentPlayground` — `41072e3820d5c485849efeceae849e036639413d`
- `enqueueAiEnrichment` — `e65080ba30b00bdd18ce99cc9ed052691fe5d057`
- `reprocessReadyDesignWithAi` — `e65080ba30b00bdd18ce99ed052691fe5d057`
- `onCatalogReprocessJobWritten` — `d277b49bd3eafd9bd956b0174d6750cef5645d95`
- `testAiEnrichmentTagRerank` — `7cf3135184a714a1becac39c4a3e5a84ae5b29da`

Therefore, unauthorized Functions deployed by this action: **NO**.

### Owner QA handoff

Before QA, hard-refresh Fresh Prints Studio DEV and open the AI Enrichment
Inspector. The owner must perform the approved manual DEV retest; Codex must
not invoke the callable or provider. Semantic Reviewer remains OFF and must
not be enabled as part of this checkpoint.

The owner QA must capture the reviewed Pass 2 observability and blocker-
semantics evidence, including the v5 prompt/version and typed blocker
semantics, exact Pass 2 input/profile, provider request/response, parser and
patch-validation boundary, truthful no-op or applied-patch classification,
authority/WAA protection, and measured Pass 2 cost. The owner should also
verify that a genuinely eligible case does not fail merely because the model
misreads an evidence-gap blocker, while a canonical no-op remains a safe
no-op. No new Pass 1 or Pass 2 cost, trace ID, or live provider result is
claimed by this deployment checkpoint because no live QA request was run by
Codex.

`[NEEDS OWNER QA: PASS 2 OBSERVABILITY + BLOCKER-SEMANTICS V5 RETEST]`

## Owner disposition amendment — park Pass 2 and release Pass 1-only/no-AI-tags

**Amendment date:** 2026-09-07
**Disposition:** Plan + Formal Review complete; implementation remains gated by owner authorization

This amendment preserves every earlier deployment, trace, failure, and QA
observation. It records the new release disposition; it does not erase or
rewrite the prior Pass 2 evidence.

### Decision

Semantic Review Pass 2 is **PARKED from the active enrichment/approval
workflow, not deleted**. The next release is planned as Pass 1 only for
Processing, ready-design reprocess, background reprocess, and Autonomous
paths. Pass 2 provider/core, v5 prompt, v4 schema, Playground, Inspector,
trace infrastructure, and valid tests remain available behind a separate
owner-controlled experimental setting.

### Existing-setting finding

The current `semanticReviewerEnabled` setting is **not safe** for the required
manual experiment. `loadAiEnrichmentSettings.ts` defaults it false, but
`aiEnrichmentCandidateCore.ts` uses it to gate an automatic Pass 2 provider
call, patch application, recomputed WAA, and possible Ready publication.
`updateAiEnrichmentSettings.ts` permits active admins as well as the owner to
write it, and `semanticReviewPlayground.ts` does not use it as the manual
Playground gate. A new `semanticReviewPlaygroundEnabled` field is proposed,
default false, with a server-enforced owner-only mutation path. The old field
must not be copied into the new field or retain automatic runtime authority.

### Blocker disposition

| Signal | Disposition |
|---|---|
| Provider/parser/schema/structural profile/title/description/exact category/settings-read/explicit-content/staff-import-lifecycle invariants | Objective hard gates retained; fail closed or route Needs Review. |
| Structured evidence gaps and subject-specificity risk | Pass 1 semantic review reasons retained conservatively; no automatic Pass 2 trigger. |
| Category dominant-intent conflict and category-gap suggestion | Conservative Pass 1 semantic review reasons/diagnostics; no automatic Pass 2 trigger. |
| Category alternatives, missing generated-at warning, shadow/cost/timing metadata | Non-blocking diagnostics. |
| Automatic verifier/reviewer-array authority | Retired from active release authority; historical fields remain auditable. |
| AI tags, Tag Rerank, Suggestion Author, suggested-new-tag approval, matched-tag category input | Retire from active AI path; preserve staff tags, historical fields, taxonomy, and ordinary catalog discovery. |

The exact release Plan and Formal Review are:

- `docs/workflow/plans/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-plan.md`
- `docs/workflow/reviews/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-review.md`

No implementation, provider call, Firebase callable, settings mutation,
deployment, Autonomous change, production action, commit, or push was
performed for this amendment.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 1-ONLY RELEASE + PARK PASS 2]`

## Owner intent clarification amendment — semantic lexical diagnostics must not veto Ready

**Amendment date:** 2026-09-07
**Disposition:** Plan + Formal Review amendment only; implementation remains gated by owner authorization

This amendment preserves the historical QA and deployment record above. It
supersedes only the prior classification of structured evidence gaps and
subject-specificity risk as conservative standalone Ready vetoes. It does not
change the parked-Pass-2 or AI-tag retirement scope.

### Exact policy path

The current shared WAA path is
`packages/shared/src/utils/catalogAutomationDecision.ts`:

`computeCatalogAutomationDecision` records
`findStructuredEvidenceGaps` and `detectSubjectSpecificityRisk` in
`reasonCodes`; `isHardBlockerCode` currently promotes their two prefixes into
`hardBlockers`; `policyWouldApprove` uses `uniqueHard.length === 0`; and the
hard branch returns `needs_review` / `shouldPublishReady: false`.

The approved narrow implementation correction is to remove only the two
semantic-prefix checks from `isHardBlockerCode`. The detectors and their
reason-code, trace, Inspector, and metric visibility remain. The resulting
classification is:

| Signal | Amended disposition |
|---|---|
| `structured_evidence_gap:subjects:*` / `objects:*` | **NON-BLOCKING SEMANTIC DIAGNOSTIC**; visible and auditable, but not an independent `hardBlocker` or Ready veto. |
| `subject_specificity_risk:*` | **NON-BLOCKING SEMANTIC DIAGNOSTIC**; visible and auditable, but not an independent `hardBlocker` or Ready veto. |
| Provider/parser/schema/Smart Profile/title/description/exact category/settings/safety/staff-import/lifecycle/persistence failures | **OBJECTIVE HARD GATE**; unchanged fail-closed or Needs Review authority. |
| `category_dominant_intent_conflict` / `category_gap_suggested` | Unchanged category-policy signals; no scope change. |

### Evidence basis

- Beatles/musicians: existing value plus ineffective/no-op Pass 2 target;
  semantic evidence remains useful diagnostics, not safe second-pass authority.
- Flowers/Nature: `['Flowers', 'Nature']` was already present and the
  provider proposed the same target; canonical no-op handling remains correct.
- Frankenstein: reviewer unresolved arrays demonstrated that semantic
  reviewer output is not final deterministic authority.

Required implementation tests must cover semantic-only non-blocking behavior,
subject specificity, objective-plus-semantic precedence, staff/import
non-override, and trace visibility. No Pass 2 trigger, category behavior, or
AI-tag behavior is changed by this clarification.

No implementation, provider/Firebase call, setting mutation, deployment,
commit, push, production action, Semantic Reviewer enablement, Autonomous,
WS6, or destructive data action occurred in this amendment.

`[NEEDS OWNER AUTHORIZATION: IMPLEMENT PASS 1 SEMANTIC AUTHORITY + PARK PASS 2 + RETIRE AI TAGS]`

## Release implementation amendment — 2026-09-07

The later approved release supersedes the prior proposed automatic Pass 2
authority: active Processing is Pass 1-only, while the existing manual Pass 2
Playground and Inspector remain parked behind the owner-only
`semanticReviewPlaygroundEnabled` gate, default OFF. Historical Pass 2 QA
evidence above is retained and is not reclassified as active production
authority.

## Release implementation complete — 2026-09-07 (source only; not deployed)

**Disposition:** Implementation + scoped local validation complete. Deployment
is **not** authorized and was **not** performed.

Implementation Review:

`docs/workflow/reviews/2026-09-07-pass1-semantic-authority-pass2-parking-and-tag-retirement-release-implementation-review.md`

Recovery note: the prior Codex implementation turn aborted while drafting the
IR after reporting green scoped validation. Recovery preserved the working
tree, found no hung validation process to kill, re-ran required scoped
checks, fixed one targeted ESLint unused binding in
`simpleCatalogEnrichmentResponse.ts`, and finished the IR/handoff.

Scoped validation highlights (recovery re-run; no provider/callable calls):

- Shared scoped: 86/86
- Functions AI: 423/423
- Boundary/authority/owner-setting: 39/39
- Pass 1 prompt/schema/authority: 104/104
- Studio Settings: 32/32
- Changed Studio util/contracts: 52/52
- Functions build: exit 0
- Studio vite build: exit 0
- Targeted ESLint (release surfaces): exit 0
- `git diff --check`: exit 0

Accepted pre-existing exceptions: Studio AI Review inbox/scroll 5 failures;
Studio typecheck baseline 33 errors outside release settings surfaces; root
lint not claimed green.

### Next owner authorization phrase

`[NEEDS OWNER AUTHORIZATION: DEPLOY PASS 1-ONLY RELEASE + PARKED PASS 2 EXPERIMENTAL GATE + OWNER QA]`

Do not enable Semantic Reviewer or Autonomous, invoke Processing as an agent
action, mutate settings, commit/push, or touch production until that
authorization is explicit.
