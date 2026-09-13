# Manual Test Checkpoint — Owner DEV Subject Canary (v31 / v5)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Workflow | managed-phase / `smart-profile-subject-canonicalization-and-derivative-suppression` |
| Reason | Targeted Owner DEV canary after Functions deploy |
| Status | **resolved** |
| Resolution | **PASS** — Owner 2026-09-03 |

---

## What We Need From You

Run a **small targeted** Re-run AI on representative DEV designs (fishing + cross-domain), then reply with the canary result template below. Do **not** bulk-reprocess AI Review or Ready Catalog.

---

## Context

- DEV Functions deployed: `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`
- Deploy record: `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-dev-deploy-record.md`
- Packaged live constants: **catalog-enrich-v31** + **smart-profile-normalizer-v5**
- Autonomous remains **OFF**; shadow / Needs Review lifecycle unchanged
- Success ≠ “fewer subjects”; success = cleaner reusable entities, junk derivatives gone, richness elsewhere, compounds survive

---

## Environment

- **fresh-prints-dev** Studio Design Library / AI Review
- Prerequisites: DEV Functions deploy complete (done this session)

---

## Sample selection (Owner picks IDs)

### Fishing (5–10 designs)

Cover as many of F1–F7 as available:

| ID | Pattern | Expect |
|----|---------|--------|
| F1 | Generic fish | subjects ⊇ `fish`; no junk derivative |
| F2 | Leaping/jumping fish | subjects ⊇ `fish`; **not** `leaping fish` |
| F3 | Bass / species fish | subjects ⊇ `fish`; may have atomic `bass`; **not** `bass fish`; species in searchConcepts if useful |
| F4 | Slogan “I make fish come” (or similar) | visibleText may keep wording; subjects **not** `make fish`; `fish` if depicted |
| F5 | Fish + waves/ocean | fish subject; waves→objects / ocean→places / fishing→interests/themes/searchConcepts when visually supported |
| F6 | Visible fisherman + fish | both may remain |
| F7 | Fishing text only, no person | do **not** invent `fisherman` / `people` |

### Cross-domain (5–10 designs)

**Compounds (must survive):** highland cow, sea turtle, fire truck, police officer, hot air balloon, Christmas tree (where available)

**Modifiers (base survives; phrase gone):** running dog, pink ghost, smiling pumpkin, vintage truck, watercolor flowers, dancing skeleton, tired nurse

---

### Steps

1. Open each selected design in Studio (AI Review or Design Library as appropriate).
2. Use existing **Re-run AI** / safe single-design reprocess — **not** Catalog Reprocessing Start for full queues.
3. After success, open Smart Profile and check:
   - `provenance.promptVersion` = `catalog-enrich-v31`
   - `provenance.normalizerVersion` = `smart-profile-normalizer-v5`
   - Subjects / related dimensions vs expectations above
4. If any design still shows v30/v4 after successful reprocess → **QA FAIL** for that item.
5. Spot-check that staff-edited / import-preset subjects (if present on a sample) are not rewritten by AI collapse.

### Pass criteria

- [x] Fish canonical subject: PASS
- [x] Bass fish suppressed: PASS
- [x] Leaping fish suppressed: PASS
- [x] Make fish suppressed: PASS
- [x] Species specificity preserved appropriately: PASS
- [x] Waves/ocean/fishing richness preserved: PASS
- [x] Visible fisherman handling: PASS
- [x] Non-visible fisherman not invented: PASS
- [x] Cross-domain modifier suppression: PASS
- [x] Legitimate compounds preserved: PASS
- [x] Staff/preset precedence preserved: PASS
- [x] v31/v5 provenance: PASS
- [x] Autonomous OFF: PASS

### Please reply with

```text
OWNER SMART PROFILE SUBJECT CANARY: PASS

Fish canonical subject: PASS
Bass fish suppressed: PASS
Leaping fish suppressed: PASS
Make fish suppressed: PASS
Species specificity preserved appropriately: PASS
Waves/ocean/fishing richness preserved: PASS
Visible fisherman handling: PASS
Non-visible fisherman not invented: PASS
Cross-domain modifier suppression: PASS
Legitimate compounds preserved: PASS
Staff/preset precedence preserved: PASS
v31/v5 provenance: PASS
Autonomous OFF: PASS
```

or:

```text
OWNER SMART PROFILE SUBJECT CANARY: FAIL — <exact design + symptom>
```

or:

```text
OWNER SMART PROFILE SUBJECT CANARY: PASS WITH NOTES — <non-blocking notes>
```

**Your result:** **OWNER SMART PROFILE SUBJECT CANARY: PASS** (2026-09-03)

Owner checklist (verbatim):

- v31/v5 provenance: PASS
- Fish canonical subject: PASS
- Bass fish suppressed: PASS
- Leaping fish suppressed: PASS
- Make fish suppressed: PASS
- Species specificity preserved: PASS
- Waves/ocean/fishing richness preserved: PASS
- Visible fisherman handling: PASS
- Non-visible fisherman not invented: PASS
- Cross-domain modifier suppression: PASS
- Legitimate compounds preserved: PASS
- Staff/preset precedence: PASS
- Autonomous remains OFF: PASS

---

## Failure gate

If canary fails on missing bases, collapsed compounds, lost specificity, OCR subjects, or over-aggressive normalization → **no Signoff**; return to this goal for a narrow corrective. Do **not** start Smart Profiling completion.

---

## After PASS

Recorded 2026-09-03: DEV v31/v5 deployed; targeted canary **PASS**; Autonomous still **OFF**; no mass reprocess; no tag retirement.

**STOP** for separate owner authorization of Signoff / commit / push. Smart Profiling completion stays queued, not auto-started.
