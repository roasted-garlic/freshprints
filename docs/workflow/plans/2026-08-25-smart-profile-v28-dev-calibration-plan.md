# Plan: Smart Profile v28 DEV Calibration (~20–30 designs)

| Field | Value |
|-------|--------|
| Date | 2026-08-25 |
| Status | **ready_for_execution** — owner QA PASS recorded; await calibration run + owner review |
| Workflow goal | `smart-catalog-intelligence-unattended-enrichment` |
| Parent plan | `docs/workflow/plans/2026-08-25-smart-profile-quality-canonicalization-and-import-background-plan.md` § I.11–I.14 |
| Environment | **fresh-prints-dev only** |

---

## Purpose

Determine whether **`catalog-enrich-v28` + `smart-profile-normalizer-v2`** is good enough to authorize **Slice 5** backlog reprocessing.

This is a **bounded fixture evaluation** — not bulk reprocessing, not refinement signoff.

---

## Hard gates (do not violate)

| Forbidden | Reason |
|-----------|--------|
| AI Review Queue bulk reprocess | Slice 5 |
| Ready Catalog bulk reprocess | Slice 6 |
| Slice 5 / 6 implementation | Blocked until refinement signoff |
| Live Autonomous ON | Owner gate |
| Production | Never |
| Refinement signoff before calibration review | Owner checkpoint |

**Required:** Catalog Processing Mode remains **Manual** (or Shadow); `catalogAutonomousLiveEnabled` = **false**.

---

## Fixture set

**Authoritative inventory:** `docs/workflow/reviews/2026-08-25-smart-profile-v28-dev-calibration-fixture-inventory.md`

- **26 candidate designs** identified via read-only Firestore sample (2026-08-25)
- **19/75** sampled profiles already on v28; most fixtures still on v27 → **reset + re-run required** for fair comparison
- Color-variant pairs flagged (4 pairs in inventory)
- Owner may swap slots — do not invent IDs beyond inventory

**Regenerate candidates (read-only):**

```powershell
$env:FIREBASE_PROJECT_ID = "fresh-prints-dev"
node functions/scripts/calibration-fixture-inventory-dev-readonly.mjs
```

---

## Execution procedure

### Phase 0 — Preconditions

1. Studio `.env.local` → `fresh-prints-dev`
2. Settings → Catalog Processing Mode → **Manual**; Live Autonomous **OFF**
3. Settings → Catalog Reprocessing → Start buttons **disabled** (Slice 4 safe posture)
4. Confirm Functions deployed: `enqueueAiEnrichment`, vocab refresh (see dev deploy record)
5. `settings/aiSmartProfileVocab` populated (owner invoked refresh 2026-08-25)

### Phase 1 — Baseline capture (optional for v27 fixtures)

For each fixture in inventory:

1. Open design in AI Review (or export `smartProfile` from Firestore)
2. Record `promptVersion`, `normalizerVersion`, core dims, searchConcepts sample
3. Skip if fixture already v28 **and** profile generated after refinement deploy — note in results table

### Phase 2 — Normalize all fixtures to v28

For each calibration design **not** already on v28 (or when comparing repeated runs):

1. AI Review → **Reset for processing** (`resetAiEnrichmentForProcessing`)
2. AI Processing → **Start AI** (`enqueueAiEnrichment`)
3. Wait for Needs Review
4. Confirm provenance: `catalog-enrich-v28`, `smart-profile-normalizer-v2`

Process **sequentially** or small batches — avoid flooding queue; stay within fixture set only.

### Phase 3 — Per-design evaluation

Record in calibration report for each fixture:

| # | Measurement | How |
|---|-------------|-----|
| 1 | Text-design concept coverage | `textDominantSoftCheck` + manual: typography/quote designs emit meta concepts when warranted |
| 2 | Per-dimension useful coverage | Count non-empty dims vs visual/title evidence |
| 3 | Subject specificity | Highland-class: prefer specific breed/type when supported |
| 4 | Unsupported structured rate | Jimothy-class: no unsupported `people` in subjects |
| 5 | Search Concept usefulness | Manual: shopper phrases vs OCR fragments |
| 6 | Canonical vocabulary reuse | Compare tokens to `settings/aiSmartProfileVocab` snapshot |
| 7 | Near-duplicate vocabulary growth | Same-dim near-synonyms in one profile |
| 8 | Novel legitimate term preservation | Supported new terms not wrongly folded |
| 9 | Color-variant semantic parity | Pairs: `evaluateSemanticConsistency` excluding colors |
| 10 | Repeated-run stability | **2 runs** on 5 representative fixtures; aggregate Jaccard ≥ ~0.80 **and** no primary-identity loss |
| 11 | Required primary/core concept preservation | `checkRequiredCoreConcepts` per fixture archetype |
| 12 | Smart Filter / facet cleanliness | Studio Design Library smart filters (if enabled) — spot check |
| 13 | Algolia record-size safety | Portal DEV index record size / facet counts — spot check |
| 14 | Caps 12/24 | Note truncation; do not raise caps unless evidence |

**Consistency rule:** ~80% overlap is **informational only**. **FAIL** if a clearly supported primary identity disappears.

### Phase 4 — Color-variant pairs (required)

Run parity on inventory pairs:

| Pair | Design IDs |
|------|------------|
| Sarcastic Have The Day | `SrDNWipuL0kBj3EuXY2c` + `lvTN328EOc9JWazOAs7I` |
| Keep Growing B/W | `lbbMZuHQFILqZZmsUWit` + `S9ZeylZt0z0AyA0WFAoX` |
| Stoner Nike Swish | `mN90KyEM2rEOmOXeIbaL` + `yd2pLu6VsemM2mv9pYUQ` |

Use `packages/shared/src/utils/smartProfileConsistency.ts` helpers for aggregate + hard checks.

### Phase 5 — Summary & recommendation

Complete `docs/workflow/reviews/2026-08-25-smart-profile-v28-dev-calibration-report.md`:

- Results table (all fixtures)
- Summary metrics
- Failure patterns
- Corrective recommendations (if any)
- Caps recommendation: **keep / change** with evidence
- Final: **READY FOR REFINEMENT SIGNOFF** | **NEEDS CORRECTIVE**

**STOP** — do not sign off automatically; owner reviews calibration report.

---

## Automated helpers (no bulk reprocess)

```bash
# Unit tests (consistency + normalization contracts)
npx tsx --test \
  packages/shared/src/utils/smartProfileNormalization.test.ts \
  packages/shared/src/utils/resolveImportArtworkBackgroundDecision.test.ts \
  functions/src/ai/smartProfileQuality.contract.test.ts \
  functions/src/ai/smartProfileBuilder.test.ts
```

Manual Firestore export or Studio AI Review UI for profile JSON — no new bulk callable.

---

## Deliverables checklist

- [x] Calibration plan (this document)
- [x] Fixture inventory with DEV IDs
- [ ] Results table populated (execution pending)
- [ ] Summary metrics
- [ ] Owner review checkpoint

---

## FreshForge impact

| Area | Impact |
|------|--------|
| Starter Surface | No |
| Development Tooling | Read-only inventory script only |
| Documentation | Workflow artifacts |
