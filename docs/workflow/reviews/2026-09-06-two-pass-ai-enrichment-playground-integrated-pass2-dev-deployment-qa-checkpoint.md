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
