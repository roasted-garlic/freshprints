# WS5 Enablement Checkpoint Refresh — Post Explicit Content Corrective

| Field | Value |
|---|---|
| Date | 2026-09-05 |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | WS5 Autonomous DEV Canary |
| Environment | `fresh-prints-dev` |
| Pass type | **Narrow refresh only** (read / verify / reconcile) |
| Prior checkpoint | `docs/workflow/reviews/2026-09-04-smart-catalog-intelligence-completion-ws5-autonomous-dev-canary-enablement-checkpoint.md` |
| Explicit corrective | Source Signoff + DEV deploy + **OWNER EXPLICIT CONTENT AUTOMATION QA: PASS** |
| Status | Refresh complete; Autonomous **OFF**; canary **not** authorized |
| WS5 readiness | **STRUCTURALLY READY** · Explicit Shadow QA **PASS** · **awaiting owner WS5 Autonomous canary authorization** (incl. Explicit Autonomous fixture decision) |

Historical pre-corrective findings remain in the 2026-09-04 checkpoint. This document refreshes only deltas from the Explicit Content automation corrective and re-verifies live canary preconditions.

---

## Recorded owner QA

```text
OWNER EXPLICIT CONTENT AUTOMATION QA: PASS
```

Covered: Settings Explicit Content Automation section (incl. sub-tab), defaults, add/edit/delete, per-design copy, manual Explicit toggle, manual censoredTerms, applicable Portal masking/manual regression. Chip-input 20-cap bug fixed during QA (Studio-local). Do not re-run owner QA unless source/runtime drift requires it.

---

## A. Live settings (2026-09-05 refresh)

Read-only Firestore `settings/aiEnrichment`:

| Field | Value |
|---|---|
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| Dual gate would publish | **false** |
| `visionModelId` | `gemini-2.5-flash-lite` |
| `explicitContentAutomationTerms` | **populated** (owner saved during QA) |
| Persisted term count | **43** (authoritative) |
| Effective term count | **43** |
| Code default count (absent field only) | **45** (reference only; not an error vs persisted) |
| Temporary QA terms (`qaexplicit*`) | **none remaining** |
| Settings `updatedAt` | `2026-09-05T06:06:21.087Z` |

Notes:

- Field is no longer absent; owner Settings save during QA persisted the list.
- **Owner clarification (2026-09-05):** 43 is **expected** — owner deleted 3 default seed terms and added 1 custom term (45 − 3 + 1 = 43). Do **not** treat this as missing defaults or restore/remove terms.
- Owner-edited vocabulary is authoritative. Matching uses the **persisted 43**.
- Intentional `[]` semantics remain supported by code; live state is populated, not empty.

AI runtime pins (source + deployed bundles):

- `catalog-enrich-v34`
- `smart-profile-normalizer-v6`
- `smart-profile-v1`

---

## B. Active Function revisions (us-central1, Node.js 20, ACTIVE)

| Function | Revision | Notes vs Explicit deploy |
|---|---|---|
| `updateAiEnrichmentSettings` | `updateaienrichmentsettings-00048-nel` | Matches Explicit deploy |
| `enqueueAiEnrichment` | `enqueueaienrichment-00095-nuf` | Matches Explicit deploy |
| `reprocessReadyDesignWithAi` | `reprocessreadydesignwithai-00006-jub` | Matches Explicit deploy |
| `onCatalogReprocessJobWritten` | `oncatalogreprocessjobwritten-00017-may` | Matches Explicit deploy |
| `syncPortalCatalogDesignToAlgolia` | `syncportalcatalogdesigntoalgolia-00005-riw` | Unchanged since 2026-09-03 |
| `reconcilePortalCatalogAlgoliaIndex` | `reconcileportalcatalogalgoliaindex-00004-foj` | Unchanged |
| `updateCatalogWorkflowMode` | `updatecatalogworkflowmode-00001-med` | Unchanged |

No unexpected revision drift on the Explicit allowlist. Publication/reconcile/mode callables unchanged as expected.

---

## C. Explicit automation safety (live code / deployed bundles)

Verified still present (prior GCF zip inspection + current source):

| Capability | Status |
|---|---|
| Deterministic artwork matcher | YES |
| B-light aliases | YES |
| Fuzzy / edit-distance matching | NO |
| Profanity hard blocker (`validation:profanity_*`) | **NO** |
| Otherwise-auto-approved + artwork hit → Ready + Explicit | YES (code path; not executed this pass) |
| Atomic `isExplicitContent` + `censoredTerms` in Ready write | YES |
| Masker-effective surface forms | YES |
| Human Explicit authority protection | YES |
| Intentional `[]` semantics | YES |
| Settings-load fail-closed `explicit_automation_settings_unavailable` | YES |
| Second AI call | NO |
| Tag dependency | NO |

Ready+Explicit write was **not** executed in this refresh.

---

## D. Autonomous hard blockers (current source)

From `packages/shared/src/utils/catalogAutomationDecision.ts`:

Hard blocker families:

- `category_unresolved`
- `description_missing`
- `title:title_missing`
- `title:title_exceeds_max_characters`
- `category_gap_suggested`
- `category_dominant_intent_conflict`
- hard `validation:*` except accepted `missing_generated_at` warnings
- `structured_evidence_gap:*`
- `subject_specificity_risk:*`
- `verifier_unresolved`

Confirmations:

- Explicit / profanity detection is **not** a hard blocker.
- Policy clear requires `hardBlockers.length === 0`; confidence does **not** appear in the decision gate and cannot bypass hard blockers.
- Verifier confirmed cannot clear existing hard blockers (source comment + logic at decision assembly).

---

## E. Six-candidate read-only replay (2026-09-05)

Deterministic replay against current decision source + current settings mode/live. Hypothetical live Autonomous class uses `autonomous` + live `true` only for expected canary class (no settings mutation).

| ID | Title | Hard blockers | Expected if live enabled | Prior class | Changed |
|---|---|---|---|---|---|
| `At5hu7vLjWgduiyzZCfR` | I Don't Do Matching Shirts | none | AUTO / Ready | AUTO | NO |
| `nff6PpkZF9TNitnpX2Mm` | Boston Terrier With Floral Bow Tie | `category_gap_suggested`, `structured_evidence_gap:objects:flowers` | Needs Review | Needs Review | NO |
| `03cbj1cIFH7Bavt38XBX` | Michael Jackson Dancing Silhouette | none | AUTO / Ready | AUTO | NO |
| `LYJcsxnfUyacRWtntEkd` | Highland Cow Relaxing In Inner Tube With Sunglasses | `subject_specificity_risk:cow` | Needs Review | Needs Review | NO |
| `Dr8lcyPE8imTQlNESP8X` | Fantasy Castle Opens From Enchanted Book | none | AUTO / Ready | AUTO | NO |
| `1Ws0T9fivryest6IUSbt` | Just Hit It Cannabis Leaves | none | AUTO / Ready | AUTO | NO |

**Final mix: 4 AUTO / 2 NEEDS REVIEW — unchanged from prior checkpoint.**

Authority: no staff-edited SP dimensions, no import presets, no human Explicit authority on any of the six.

Authority-bearing / verifier-natural fixture gaps from 2026-09-04 remain:

- `[FIXTURE GAP - natural verifier-worthy case]`
- `[FIXTURE GAP - imported human/preset-authority case]`

---

## F. Explicit match check on six

Against effective vocabulary (persisted 43 terms), using persisted `visibleText` / `readableTextLines` + title/description:

**No artwork Explicit hit on any of the six.**

→ **[FIXTURE GAP — WS5 EXPLICIT AUTO-CLASSIFICATION CANARY]**

Do not alter the six to create a match.

---

## G. Proposed Explicit auto-classification fixture strategy (NOT executed)

**Goal:** Prove Ready + `isExplicitContent=true` + masker-effective `censoredTerms` under Autonomous without touching the six.

**Preferred safe DEV-only approach (requires owner auth):**

1. Add a temporary Settings vocabulary term reserved for canary, e.g. `qaexplicitcanary` (valid charset; unlikely to hit real catalog art).
2. Staff-create / import a disposable DEV catalog design whose **artwork text** clearly shows that exact term (simple text PNG).
3. Keep the design free of staff Explicit authority, SP staff edits, and import presets.
4. Include it as an **additional** canary row (7th) or as a dedicated Explicit verification step after the six — not as a replacement for the six.
5. After verification: remove temporary Settings term (or leave intentional owner list), and archive/delete or leave-as-Ready the disposable design per owner preference.

**Do not:** use customer Print Request uploads; mutate the six; use human-authority-bearing designs; depend on tags.

**Label:** **[NEEDS OWNER DECISION — EXPLICIT AUTONOMOUS CANARY FIXTURE]**

Fixture creation is **not** authorized by this refresh.

---

## H. Publication health (read-only)

| Check | Result |
|---|---|
| Designs `portalCatalogPublicationStatus == failed` (sample) | **0** |
| Ready designs `pending` / `queued` publication (sample) | **0** |
| Search-only Algolia query | **OK** |
| Index | `portal_catalog_ready_dev` |
| `nbHits` | **346** (same as 2026-09-04 preflight) |

No mutate/reconcile performed.

---

## I. Dual gate + future enablement path (DO NOT EXECUTE)

Dual gate confirmed:

- Live Ready publish requires `catalogWorkflowMode === "autonomous"` **and** `catalogAutonomousLiveEnabled === true`.
- Current: `shadow` / `false` → publish **false**.

Callable: **`updateCatalogWorkflowMode`** (owner-only).

Exact future sequence:

1. `{ catalogWorkflowMode: "autonomous" }` → mode autonomous, live remains false.
2. Verify Firestore.
3. `{ catalogWorkflowMode: "autonomous", catalogAutonomousLiveEnabled: true, confirmationPhrase: "ENABLE AUTONOMOUS" }` → both true; audit fields set.
4. Verify Firestore before first enqueue.

Rollback (single callable; do not execute now):

- `{ catalogWorkflowMode: "shadow", catalogAutonomousLiveEnabled: false }`
- Non-autonomous mode also clears live gate in source.
- Stop submitting reruns; in-flight invocations may finish; already-Ready designs stay Ready.

---

## J. Future canary verification expectations (not run)

### Normal AUTO candidate (4)

- Becomes Ready; `aiReviewedBy = system:catalog-autonomy`; `readyAt` present; Algolia synced.

### Needs Review candidate (2)

- Remains Needs Review; blockers preserved; not Ready / not published as Ready.

### Explicit AUTO fixture (after owner authorizes fixture)

- Otherwise Ready-eligible; artwork configured-term match.
- Ready; `isExplicitContent === true`; `censoredTerms` contains masker-effective surface.
- No hard profanity blocker; human authority not overwritten; publication succeeds.

---

## K. Stop conditions

Inherit 2026-09-04 stop conditions, plus:

- Explicit fixture fails to set Explicit on Ready when artwork match exists.
- Auto Explicit overwrites protected human Explicit authority.
- Profanity incorrectly appears as a hard blocker.

---

## L. Owner decisions remaining

1. **[NEEDS OWNER DECISION — EXPLICIT AUTONOMOUS CANARY FIXTURE]** — approve fixture strategy (and creation) as part of / before canary.
2. **[NEEDS OWNER AUTHORIZATION — ENABLE WS5 AUTONOMOUS DEV CANARY]** — still required; not granted by this refresh.

WS5 is structurally ready for owner canary authorization **with** Explicit fixture authorization included.
