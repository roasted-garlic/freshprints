# Manual Test Checkpoint — Owner DEV AI Text-Quality Canary (v32 / v6)

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Workflow | managed-phase / `ai-enrichment-visible-text-and-catalog-copy-quality` |
| Reason | Targeted Owner DEV canary after Functions deploy |
| Status | **resolved** |
| Resolution | **PASS** — Owner 2026-09-03 |
| Deploy record | `docs/workflow/reviews/2026-09-03-ai-enrichment-visible-text-and-catalog-copy-quality-dev-deploy-record.md` |

---

## What We Need From You

Re-run AI on **≤10 individual designs** (not a catalog-wide job), then reply with the result template below.

Do **not**:
- Start full AI Review Queue reprocess
- Start full Ready Catalog reprocess
- Enable Autonomous
- Signoff / commit / push

---

## Context

- DEV Functions live: `enqueueAiEnrichment` `00086-qet`, `onCatalogReprocessJobWritten` `00008-piw`, `startCatalogReprocessJob` `00007-viw`, `previewCatalogReprocessJob` `00007-hug`
- Packaged live constants: **catalog-enrich-v32** + **smart-profile-normalizer-v6**
- Schema: **smart-profile-v1**
- Autonomous remains **OFF**
- Subject v31/v5 behavior must still hold

---

## Environment

- **fresh-prints-dev** Studio Design Library / AI Review
- Prerequisites: DEV Functions deploy complete (done this session)

---

## Sample selection (Owner picks IDs; ≤10 total)

| Slot | Pattern | Expect |
|------|---------|--------|
| **A** | Dolly Parton + sheet music (or equivalent portrait + score) | Clean semantic title; natural description; visibleText short phrases only (e.g. song title + name); **no** OCR dump / underscores / chords / lyric body |
| **B** | Normal short slogan shirt | Full slogan preserved |
| **C** | Intentionally text-heavy typography | Primary multi-line text preserved (not treated as document dump) |
| **D** | Another document background (newspaper / book / letter / sheet music) | Semantic context retained; bulk transcription suppressed |
| **E** | Prior v31/v5 subject example (e.g. fish / leaping fish / bass fish / highland cow) | Subjects still canonical; no `bass fish` / `leaping fish` / `make fish`; compounds intact |

Optional false-positive spot checks if designs are handy: Class of 2026, John 3:16, Mama's Girl, Smith & Co., Route 66, USA 1776 (automated coverage already exists).

---

### Steps

1. Open each selected design in Studio (AI Review or Design Library).
2. Use existing **Re-run AI** / safe single-design re-enrich — **not** Catalog Reprocessing Start for full queues.
3. After success, check:
   - `provenance.promptVersion` = `catalog-enrich-v32`
   - `provenance.normalizerVersion` = `smart-profile-normalizer-v6`
   - Title / description / visibleText vs slot expectations
   - For slot E: subjects vs prior canary contract
4. If any design still shows **v31/v5** after a successful re-run → **FAIL** for that item.
5. If OCR dump still appears in title, description, or visibleText on slot A/D → **FAIL**.

### Pass criteria

- [x] v32/v6 provenance after re-run
- [x] Dolly / sheet-music title quality
- [x] Dolly / sheet-music description quality
- [x] Dolly / sheet-music visibleText quality
- [x] Sheet-music / document suppression
- [x] Normal slogan preserved
- [x] Text-heavy typography preserved
- [x] Background-document semantics preserved
- [x] v31/v5 subject regression still green
- [x] Autonomous OFF

### Owner result (2026-09-03)

```text
OWNER AI TEXT QUALITY DEV CANARY: PASS

v32/v6 provenance: PASS
Dolly title quality: PASS
Dolly description quality: PASS
Dolly visibleText quality: PASS
Sheet-music/document suppression: PASS
Normal slogan preserved: PASS
Text-heavy typography preserved: PASS
Background-document semantics preserved: PASS
v31/v5 subject regression: PASS
Autonomous remains OFF: PASS
```

Recorded 2026-09-03: DEV v32/v6 deployed; targeted canary **PASS**; Autonomous still **OFF**; no mass reprocess; no tag retirement.