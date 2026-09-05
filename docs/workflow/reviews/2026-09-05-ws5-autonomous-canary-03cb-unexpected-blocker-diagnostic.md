# WS5 Autonomous DEV Canary — Unexpected 03CB Blocker Diagnostic

| Field | Value |
|---|---|
| Date | 2026-09-05 |
| Mode | **READ ONLY — DIAGNOSTIC → RECOMMENDATION → STOP** |
| Parent goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | WS5 Autonomous DEV Canary |
| Environment | `fresh-prints-dev` |
| Design under study | `03cbj1cIFH7Bavt38XBX` |
| Companion observation | `nff6PpkZF9TNitnpX2Mm` |
| Explicit fixture (untouched) | `N3Ag21ThKyFXLTTsKAZZ` |
| Final gate (verified) | `catalogWorkflowMode=shadow`, `catalogAutonomousLiveEnabled=false` |

**Forbidden this pass (honored):** Autonomous re-enable · canary continue · 03cb reprocess · implement · deploy · commit/push · production · fixture cleanup · design mutation.

---

## Executive classification

**03cb live result = legitimate conservative Needs Review under the signed structured-evidence contract**, driven by **fresh Gemini enrichment variance** relative to the **persisted read-only preflight/replay** that predicted AUTO.

| Question | Answer |
|---|---|
| Safety invariant violated? | **NO** — hard blocker held Needs Review; no Ready bypass |
| Hard blocker bypass? | **NO** |
| Source defect requiring immediate fix? | **NO** for safety; optional quality follow-up only (see §Defect note) |
| Persisted replay ≡ fresh Gemini prediction? | **NO** |
| Recommended canary model | **MODEL 2 — SAFETY-INVARIANT** (requires owner decision to adopt formally) |

---

## 1. Current 03cb state (preserved canary output)

Read from Firestore `designs/03cbj1cIFH7Bavt38XBX` on 2026-09-05; forensic snapshot also at `_ws5-03cb-diagnostic-snapshot.json`. **No fields mutated.**

| Field | Value |
|---|---|
| `status` | `imported` |
| `aiReviewStatus` | `needs_review` |
| `aiProcessingStage` | `ready_for_review` |
| Catalog `title` | `(4)` (filename placeholder) |
| AI title | `Michael Jackson Dancing Watercolor Style` |
| AI description | Watercolor MJ dance pose; paint splashes — **does not mention “hat”** |
| Category | Music & Bands (`tHt9g1RiSUKSAf8Ge8kR`) |
| Subjects | `["jackson","michael"]` |
| Objects | `["hat"]` |
| Styles | `watercolor`, `illustration`, `colorful`, `artistic` |
| Themes | `iconic`, `dance`, `pop culture` |
| Search concepts | michael jackson art, king of pop, dancer, pop icon, music legend, moonwalk, dance pose, watercolor portrait, celebrity art, famous entertainer, michael |
| `visibleText` / `readableTextLines` | **not persisted** (null/absent) |
| `centralSubject` | absent |
| Automation decision | `needs_review` |
| Reason codes | `structured_evidence_gap:objects:hat` |
| Verifier | `verifierInvoked: false` |
| Prompt / normalizer / schema | `catalog-enrich-v34` / `smart-profile-normalizer-v6` / `smart-profile-v1` |
| Model | `gemini-2.5-flash-lite` (provider google) |
| `generatedAt` | `2026-09-05T16:10:16.615Z` |
| Explicit preview | wouldMark=false, artworkHit=false |
| Artwork paths | `/previews|thumbnails|originals/03cbj1cIFH7Bavt38XBX.*` |
| Pending enrichment jobs | **none** for this design |

---

## 2. Pre-canary vs live comparison

### Pre-canary expectation sources

| Artifact | What it recorded for 03cb |
|---|---|
| Enablement checkpoint refresh (2026-09-05) | Title **Michael Jackson Dancing Silhouette**; hard blockers **none**; expected live class **AUTO / Ready** — **deterministic replay of then-persisted enrichment**, not a fresh Gemini call |
| Prior enablement checkpoint (2026-09-04) | Same Silhouette title; shadow would auto-approve; prompt then recorded as **v32** on that snapshot |
| WS3 analysis raw | Subjects/objects **[]**; AI title Silhouette; short apparel description; `wouldAutoApprove` under shadow; category Pop Culture & Characters |
| Continue canary raw | Captured **after** only for 03cb (no full SP `before` objects dump) |

**Exact prior objects on the last AUTO-predicting persisted state were not fully serialized in canary `before` audits.** Mechanically known: refresh replay found **zero** hard blockers against that persisted state with title **Silhouette**. That implies the pre-canary structured profile either lacked unsupported `hat`, or had lexical support for every object token — **not** the live `{objects:["hat"]}` + hat-free title/description pair.

### Exact changed fields (material)

| Dimension | Pre-canary (persisted / expected) | Live canary (fresh enrich) |
|---|---|---|
| AI title | Michael Jackson Dancing **Silhouette** | Michael Jackson Dancing **Watercolor Style** |
| Category (WS3 era) | Pop Culture & Characters | **Music & Bands** (live) |
| Objects | Not hat-gap-blocked (exact list not in refresh table; WS3 era `[]`) | **`["hat"]`** |
| Subjects | (refresh did not list; WS3 `[]`) | **`["jackson","michael"]`** |
| Hard blockers | **none** | **`structured_evidence_gap:objects:hat`** |
| Class | AUTO / Ready (predicted) | **Needs Review** |
| Prompt on design | Refresh-era persisted (historically v32 on older snapshot) | **v34** |
| Description lexical “hat” | N/A for AUTO class | **absent** |

---

## 3. `objects:hat` forensic

### Source chain

1. **Gemini fresh output (v34)** emitted Smart Profile object token `hat` (present on both `smartProfile.objects` and `smartProfileAiSnapshot.objects`).
2. **Normalizer v6** retained `hat` (no evidence of inventing the token from subjects/themes; subjects are person-name tokens).
3. **Title/description/visibleText corpus** does **not** contain lexical `hat` (verified mechanically against live AI title + description; visibleText absent).
4. **`findStructuredEvidenceGaps`** (`packages/shared/src/utils/catalogAutomationEvidence.ts`) requires object tokens to have lexical support in corpus of **title + description + centralSubject + visibleText**. Visual presence alone does **not** count. Subjects/objects do **not** cross-support. Verifier evidence does **not** clear this gap. Confidence does **not** bypass hard blockers.
5. Decision emits hard reason `structured_evidence_gap:objects:hat` → Needs Review under Autonomous — **contract-correct**.

### Artwork inspection

DEV preview downloaded read-only to `_ws5-03cb-preview-forensic.webp` (Storage `previews/03cbj1cIFH7Bavt38XBX.webp`).

**Artwork classification: CLEAR HAT PRESENT** — iconic fedora is a dominant silhouette element on the dancing figure.

Therefore:

- The blocker is **not** “AI hallucinated a hat that is not in the art.”
- The blocker is **“object token lacks lexical support in title/description/visibleText.”**
- Under the **signed text-corpus evidence contract**, behavior is **correct** even though a hat is visually clear.

### Contract answers

| Question | Answer |
|---|---|
| Evidence required for objects? | Lexical support in title / description / centralSubject / visibleText |
| Is visibleText relevant? | Yes, when present — joins the corpus |
| Subjects/objects cross-support? | **No** |
| Verifier evidence count? | **No** (cannot clear other hard blockers) |
| Semantic/visual objects without literal text? | **Not supported** by current evidence helper |
| Confidence bypass? | **NO** (expected) |
| Unsupported `hat` hard-blocks? | **YES** |

---

## 4. AI variance analysis

**YES — fresh Gemini execution can legitimately change objects, subjects, title, category evidence, and blocker set** even with the same model / prompt v34 / normalizer v6 / schema v1.

Supporting facts:

- Preflight/refresh predicted class from **persisted** enrichment + deterministic decision replay.
- Canary rows performed **fresh** enrichment (`rerunFromReview` / enqueue).
- **nff6** same session: class stayed Needs Review, but blocker set **shrunk** (`category_gap_suggested` dropped) under fresh v34 — exact-blocker-set expectation already drifted while safety class held.
- **03cb**: title, category, objects, and blockers all moved vs persisted AUTO expectation.

**Deterministic replay of persisted data is NOT equivalent to predicting a fresh AI call.**

Requiring each fresh rerun to reproduce the exact prior AUTO/Needs Review class (and exact blocker set) is **too strict** for probabilistic enrichment. That does **not** justify loosening safety rules.

---

## 5. nff6 comparison

| | Prior (persisted before canary) | Live canary |
|---|---|---|
| Class | Needs Review | Needs Review |
| Blockers | `category_gap_suggested`, `structured_evidence_gap:objects:flowers` | **`structured_evidence_gap:objects:flowers` only** |
| Prompt on design | v32 (before audit) | v34 |
| Objects (live) | — | `bow tie`, `flowers` |

**Cause of drift:** expected **fresh enrichment / category-gap evidence variance** after live v34 re-enrich (category gap no longer emitted for this candidate). Flowers lexical gap remained → still Needs Review.

**Supports AI-variance explanation for 03cb: YES.**

Classification: expected fresh enrichment variance (not treated as category-resolver source defect without further proof).

---

## 6. Canary expectation model

### What WS5 Plan / Formal Review actually emphasize

Plan goal: prove safe designs may Ready, hard blockers remain Needs Review, authority/publication intact — stop on unexpected Ready, hard-block bypass, authority loss, enrichment/publication failure.

Acceptance language includes: hard-blocked rows remain Needs Review; unexpected results stop the run.

Operational canary + enablement refresh used **exact expected class** matching (Model 1), which correctly stopped on 03cb AUTO→NR.

### Model recommendation

| Model | Fit |
|---|---|
| **1 — Exact candidate expectation** | Matches how this canary was run; fragile under AI variance; treats valid new hard blockers as “failure” |
| **2 — Safety-invariant canary** | Aligns better with Plan **safety intent**: no hard blocker→Ready; policy-clear may Ready; **new valid hard blocker → Needs Review is conservative success**, not bypass; false/invalid blockers remain quality defects |

**Recommendation: adopt MODEL 2 for future WS5 disposition**, without rewriting acceptance silently.

**[NEEDS OWNER DECISION — WS5 CANARY EXPECTATION MODEL]**

Under Model 2, 03cb this run would be classified: **pass as conservative Needs Review** (valid blocker), with quality note on visual-object lexical gaps — **not** a dual-gate or bypass failure.

Under Model 1 (as executed), stop was **procedurally correct**.

---

## 7. Defect note (do not implement this pass)

| Item | Detail |
|---|---|
| Exact issue | Visual object (`hat` CLEARLY present) listed in SP objects without lexical mention in title/description → hard block |
| Impacted source | Enrichment content quality +/or evidence contract (`catalogAutomationEvidence.ts` lexical-only objects) |
| Nature | **Quality / calibration friction**, historically common (`structured_evidence_gap:objects:hat` appears across WS2/WS3/WS4 stats) — **not** a hard-blocker bypass |
| Smallest corrective scopes (future only) | (a) prompt guidance to mention listed objects in description, or (b) Plan+Review for visual-object evidence policy change — **both require Plan/Review**; do not loosen Autonomous safety |
| Plan/Review needed before fix? | **YES** if changing evidence contract or Autonomous acceptance criteria |

**STOP — no fix in this pass.**

---

## 8. Publication / gate safety (reconfirmed)

| Check | Result |
|---|---|
| `catalogWorkflowMode` | `shadow` |
| `catalogAutonomousLiveEnabled` | `false` |
| Pending/in-flight canary enrichment jobs | **none** observed |
| Unexpected publication failures from this diagnostic | **none** (diagnostic read-only) |
| Additional candidates processed this pass | **none** |
| Explicit fixture `N3Ag21ThKyFXLTTsKAZZ` | **preserved** (not deleted/mutated) |
| Production | **untouched** |
| Commit/push | **none** |

---

## 9. Recommended next actions (owner)

1. Decide **WS5 canary expectation model** (Model 1 vs Model 2) — required before re-auth of remaining rows.
2. Complete Explicit Autonomous visual QA on `N3Ag21ThKyFXLTTsKAZZ` if not already recorded.
3. Do **not** reprocess 03cb for forensics; preserve live NR+hat gap state.
4. Do **not** replace 03cb until model decision + classification accepted.
5. Remaining AUTO candidates (Dr8, 1Ws) and LYJ: **not safe to continue under Model 1 without re-auth**; under Model 2 may resume only with fresh owner authorization and dual-gate enablement.
6. No Autonomous enablement in this diagnostic.

---

## Artifacts

| Path | Role |
|---|---|
| `docs/workflow/reviews/_ws5-03cb-diagnostic-snapshot.json` | Live 03cb + nff6 field dump |
| `docs/workflow/reviews/_ws5-03cb-preview-forensic.webp` | Read-only DEV preview for hat presence |
| `docs/workflow/reviews/_ws5-autonomous-dev-canary-continue-raw.json` | Canary 4 after-state + rollback |
| `docs/workflow/reviews/_ws5-autonomous-dev-canary-execution-raw.json` | nff6 before/after blocker drift |
| This file | Diagnostic record |
