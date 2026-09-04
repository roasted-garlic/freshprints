# WS3 Result: AI Review Queue v32/v6 Reprocess + Shadow Analysis

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Goal | `smart-catalog-intelligence-completion-and-legacy-tag-retirement` |
| Workstream | **WS3** — AI Review Queue full reprocess + Shadow analysis |
| Project | **fresh-prints-dev** |
| Job ID | `omLhRHLnpkyvhOc8yQp9` |
| Confirmation phrase | `REPROCESS AI REVIEW QUEUE` |
| Raw analysis | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-ws3-analysis-raw.json` |
| Outcomes rows | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-ws3-outcomes-rows.json` |
| Owner sample checkpoint | `docs/workflow/reviews/2026-09-03-smart-catalog-intelligence-completion-ws3-owner-shadow-sample-checkpoint.md` |
| WS3 Review verdict | **approved_with_notes** |
| Signoff | **NOT PERFORMED** (per owner scope) |
| WS4 | **NOT STARTED** |

---

## Pre-Start

| Check | Result |
|-------|--------|
| Target | `ai_review_queue` only |
| Preview eligible | **165** (delta from WS2: **0**) |
| Mode | **shadow** |
| Autonomous | **false** |
| Prompt / normalizer | **catalog-enrich-v32** / **smart-profile-normalizer-v6** |
| Ready Catalog selected | **NO** |
| Tag retirement coupled | **NO** |
| Mechanism | Trusted callable `startCatalogReprocessJob` (owner custom token + phrase) |

---

## Processing

| Metric | Value |
|--------|------:|
| Intended | 165 |
| Job terminal status | **completed** |
| Processed | 165 |
| Succeeded | 165 |
| Failed | 0 |
| Retrying | 0 |
| Retry-success | 0 |
| Unresolved / stuck | 0 |
| Attempt count | 1 |
| Outcomes written | 165 (all `succeeded`) |
| Job `autoApproved` | 0 |
| Job `remainedReady` | 0 |
| Job `remainedNeedsReview` | 165 |
| Anomalies / preservation violations | 0 / 0 |

Runtime ~10 minutes (Start ~22:57Z → completed ~23:07Z).

---

## Version reconciliation (post-run)

| Metric | Count |
|--------|------:|
| Exact v32 + v6 | **165 / 165** |
| Older versions | 0 |
| Missing provenance | 0 |
| Schema `smart-profile-v1` | 165 |
| Unexpected version combos | 0 |

---

## Lifecycle

| Metric | Count |
|--------|------:|
| `status=imported` | 165 |
| `aiReviewStatus=needs_review` | 165 |
| Automatic Ready transitions | **0** |
| Unexpected lifecycle changes | **0** |

Live settings after run: mode **shadow**, Autonomous **OFF**.

---

## Shadow automation (authoritative: job outcomes)

| Metric | Count |
|--------|------:|
| Total | 165 |
| wouldAutoApprove (`decision=shadow`) | **50** (30.3%) |
| Needs Review | **115** (69.7%) |
| Verifier invoked | 0 |
| Verifier confirmed | 0 |
| Verifier unresolved | 0 |
| Outcome `hardBlocked` flag | 2 (both `category_gap_suggested`) |

### Hard blockers (codes present on outcomes)

Dominant driver: **structured evidence gaps** (113 designs with ≥1 `structured_evidence_gap:*`).

| Code / family | Notes |
|---------------|-------|
| `structured_evidence_gap:objects:*` | 247 code occurrences (top labels: stars 22, flowers 17, heart 13, sunglasses 13, hat 10, …) |
| `structured_evidence_gap:subjects:*` | 56 code occurrences |
| `category_gap_suggested` | **2** |
| `subject_specificity_risk:cow` | **1** |
| `category_unresolved` | **0** (post-run) |
| `description_missing` | **0** (at decision time; see notes) |
| `title:*` | **0** |
| `category_dominant_intent_conflict` | **0** |
| `verifier_unresolved` | **0** |

### Soft / acceptable signals

| Code | Count |
|------|------:|
| `category_alternatives_present` | 1 |
| `shadow_would_auto_approve` | 50 (success marker, not a soft concern) |

### Category

| Metric | Count |
|--------|------:|
| smartProfile `categoryId` present | 165 |
| Root `categoryId` present | 0 (queue persist path does not write root category) |
| `category_unresolved` | 0 |
| `category_gap_suggested` | 2 |
| `category_dominant_intent_conflict` | 0 |
| `matchedTags` non-empty | 0 (expected for imported Needs Review; tags not retired/changed) |

---

## Important persistence note (not a lifecycle bug)

`markAiSuccess` **queue** path persists `smartProfile` / `aiSuggestions` / `aiAnalysis` but does **not** overwrite root `title`, `description`, or `categoryId`.

Shadow decisions used in-pipeline **aiSuggestions** title/description. Studio still shows import-era root titles.

Among 50 wouldAutoApprove:

| Check | Result |
|-------|--------|
| Root title ≠ AI suggested title | 50 / 50 |
| AI suggested title quality (heuristic) | 50 ok / 0 bad |
| AI suggested description present | 50 / 50 |

Owner QA must judge **aiSuggestedTitle / aiSuggestedDescription / artwork**, not import filenames alone.

---

## Failure / retry / publication

| Item | Result |
|------|--------|
| Failures | 0 |
| Retries | 0 |
| Gemini / parse / Firestore write failures | none observed on job |
| Unexpected Ready / Algolia publication for this queue | **none** (remainedReady=0, autoApproved=0) |

---

## Quality / protected regressions (spot)

| Area | Result |
|------|--------|
| v31/v5 subject regression | No mass subject wipe signal; Needs Review mostly evidence-gap on specific labels. Owner sample includes character/compound cases. |
| v32 title/description/visibleText | AI suggestions present and non-empty on wouldAutoApprove; visibleText retained on many Needs Review samples. |
| Import presets | 0 in this 165 set |
| Staff precedence | 0 `staffEditedDimensionKeys` in this set |
| Intake metadata | No wipe signal in job counters (`preservationViolations=0`) |

---

## Systemic failure gate

**Not tripped as automatic STOP.**

- wouldAutoApprove path has coherent AI copy (50/50).
- Needs Review concentrated in designed hard evidence gaps (113/165), not a single bogus rule blocking “good” designs into zero auto.
- No Ready corruption, Autonomous stayed OFF.

**Notes for owner sample** (may still FAIL sample if artwork ≠ decision):

1. Compare AI suggestions vs artwork carefully on wouldAutoApprove.
2. Evidence-gap density is high — confirm gaps look legitimate, not spurious.
3. Two `category_gap_suggested` hard blocks deserve explicit look.

---

## Safety (WS3)

| Action | Performed? |
|--------|-----------|
| Ready Catalog reprocess | **NO** |
| Autonomous enabled | **NO** |
| Tag retirement | **NO** |
| Tag resolver / matchedTags mutation | **NO** |
| Algolia settings change | **NO** |
| Firebase deploy | **NO** |
| Production | **NO** |
| Commit / push | **NO** |
| Signoff | **NO** |

(Operational note: DEV IAM `serviceAccountTokenCreator` was granted so the trusted Start callable could mint an owner custom token. No Functions deploy.)

---

## WS3 Review verdict

**approved_with_notes**

Safe enough to *plan* WS4 after owner Shadow sample PASS — **does not authorize WS4 Start**.

### Required notes

1. Await owner sample response.
2. Queue root fields intentionally lag AI suggestions until Ready publish.
3. Evidence-gap rate is the main calibration story for Autonomous later — do not “fix rules” in WS3.
4. Ready Catalog still 346 stale (WS4).

---

## Next

1. Owner sample: **`OWNER WS3 SHADOW SAMPLE: PASS WITH NOTES`** (recorded).
2. **WS4 Start blocked** pending category dominant-intent calibration.
3. Plan + Formal Review:  
   - `docs/workflow/plans/2026-09-03-category-dominant-intent-calibration-plan.md`  
   - `docs/workflow/reviews/2026-09-03-category-dominant-intent-calibration-review.md` (**approved_with_changes**)
4. Await `OWNER CATEGORY DOMINANT-INTENT CALIBRATION: AUTHORIZE IMPLEMENT` (then Gate A #9 + canary — still no WS4).
