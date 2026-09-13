# DEV Deploy + Fixture Checkpoint: WS5 Explicit Content Shadow Preview

| Field | Value |
|-------|-------|
| Date | 2026-09-05 |
| Project | `fresh-prints-dev` |
| Branch | `development` |
| Corrective | WS5 Explicit Content Shadow Preview / Owner QA Observability |
| IR | `docs/workflow/reviews/2026-09-05-ws5-explicit-content-shadow-preview-observability-implementation-review.md` |
| Result | **DEV DEPLOYED · OWNER SHADOW QA PASS · FIXTURE CLEANED UP** |
| Owner QA | **`EXPLICIT CONTENT SHADOW QA: PASS`** (2026-09-05) |

---

## Predeploy

| Check | Result |
|---|---|
| Branch | `development` |
| Mode | `shadow` |
| Live gate | `false` |
| Source drift | Shadow preview markers present; no material IR drift |
| Focused tests | PASS |
| Functions build | PASS |
| `git diff --check` | PASS (LF/CRLF warnings only) |
| Unrelated dirty tree | Preserved |

---

## Deploy

**Command:**

```bash
firebase deploy --only "functions:enqueueAiEnrichment,functions:reprocessReadyDesignWithAi,functions:onCatalogReprocessJobWritten" --project fresh-prints-dev --non-interactive
```

Exit: **0**

| Function | Prior | New | Traffic | Runtime | Region |
|---|---|---|---|---|---|
| `enqueueAiEnrichment` | `enqueueaienrichment-00095-nuf` | `enqueueaienrichment-00096-muz` | 100% | Node.js 20 | us-central1 |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00006-jub` | `reprocessreadydesignwithai-00007-puz` | 100% | Node.js 20 | us-central1 |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00017-may` | `oncatalogreprocessjobwritten-00018-keq` | 100% | Node.js 20 | us-central1 |

Unrelated unchanged: `updateCatalogWorkflowMode` `00001-med`, `updateAiEnrichmentSettings` `00048-nel`.

Not deployed: Rules, Storage, indexes, Hosting, Portal, Studio release, production.

---

## Vocabulary

| Item | Value |
|---|---|
| Persisted count | **43** (owner-authoritative) |
| Selected term | **`damn`** |
| Confirmed present | **YES** |

---

## Fixture

| Item | Value |
|---|---|
| Design ID | **`QFVEX3gYHhSrtPyi36SO`** |
| Title | `DEV QA FIXTURE — Explicit Shadow — DAMN — mto18fna` |
| Creation path | Admin Storage upload (PNG + WebP preview/thumb) + Firestore design create + deployed `enqueueAiEnrichment` callable |
| Artwork text | **DAMN** (simple white SVG→PNG/WebP) |
| Initial lifecycle | `status=imported`, `aiReviewStatus=pending` |
| Human Explicit authority | **NO** (`isExplicitContent` / `censoredTerms` absent) |
| Script | `functions/scripts/ws5-explicit-shadow-qa-fixture-dev.mjs` |
| Raw results | `docs/workflow/reviews/_ws5-explicit-shadow-qa-fixture-dev-results.json` |

**Label:** DEV QA FIXTURE — DO NOT USE FOR PRODUCTION (in title/description).

**Cleanup:** **COMPLETE** (2026-09-05 after owner PASS) — Firestore design deleted; Storage originals/previews/thumbnails deleted. Doc no longer exists.

---

## Shadow result (mechanical)

| Field | Value |
|---|---|
| Terminal lifecycle | `status=imported`, `aiReviewStatus=needs_review`, `aiProcessingStage=ready_for_review` |
| `automationDecision` | `shadow` |
| `automationReasonCodes` | `["shadow_would_auto_approve"]` |
| Would Auto Approve (derived) | **YES** |
| `explicitAutomationPreview.artworkHit` | **true** |
| `wouldMarkExplicitContent` | **true** |
| `proposedCensoredTerms` | `["damn"]` |
| `suppressedDueToHumanAuthority` | absent |
| Prompt / normalizer | `catalog-enrich-v34` / `smart-profile-normalizer-v6` |

---

## Root / publication safety

| Check | Result |
|---|---|
| Root `isExplicitContent` | **absent** (unchanged) |
| Root `censoredTerms` | **absent** (unchanged) |
| Ready | **NO** |
| `aiReviewedBy = system:catalog-autonomy` | **NO** |
| Ready publication metadata | **NO** (`portalCatalogPublicationStatus` absent) |
| Mode / live after | still `shadow` / `false` |

---

## Owner visual QA

```text
EXPLICIT CONTENT SHADOW QA: PASS
```

Owner visually verified (2026-09-05):

1. Would Auto Approve: YES — PASS  
2. Would Mark Explicit Content: YES — PASS  
3. Proposed Censored Terms: damn — PASS  
4. Real Explicit Content toggle unchanged — PASS  
5. Real Words/phrases to censor unchanged — PASS  
6. Design remained Needs Review / not Ready — PASS  
7. Preview wording/layout clear and acceptable — PASS  

Fixture at QA time: `QFVEX3gYHhSrtPyi36SO` (since cleaned up).

---

## Workflow

- Shadow preview: IMPLEMENTED · TESTED · DEV DEPLOYED · **OWNER SHADOW QA PASS** · fixture cleaned
- WS5: STRUCTURALLY READY · Explicit Shadow QA gate **CLEARED** · **awaiting owner WS5 Autonomous canary authorization**
- Autonomous: **OFF**
- Canary: **NOT RUN**
- Production / commit / push: **NOT DONE**

### Next owner checkpoint

**[NEEDS OWNER AUTHORIZATION — ENABLE WS5 AUTONOMOUS DEV CANARY]**

Still required separately:

1. Dual-gate enablement sequence via `updateCatalogWorkflowMode` (do not execute without auth)
2. Six parked candidates canary (4 AUTO / 2 Needs Review)
3. **[NEEDS OWNER DECISION — EXPLICIT AUTONOMOUS CANARY FIXTURE]** — shadow fixture was cleaned; Autonomous Ready+Explicit proof still needs a disposable Explicit fixture (or equivalent) under live Autonomous, separate from the six unless owner directs otherwise

Do **not** enable Autonomous or run canary until owner authorizes.