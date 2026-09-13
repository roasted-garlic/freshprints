# Test Report: Smart Catalog Intelligence — Slice 2

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Slice | 2 — Smart Profile foundation + shadow mode |
| Status | **passed_with_notes** (automated + owner DEV QA) |
| Owner DEV QA | **PASS WITH NOTES** (2026-08-24) |
| Provenance check | **PASS** (owner 2026-08-24) — new batch import on `fresh-prints-dev`; shared `importBatchId` across batch |

---

## Owner DEV QA (retest after persistence corrective)

| Field | Value |
|-------|-------|
| Environment | Studio local → `fresh-prints-dev` |
| Result | **PASS WITH NOTES** |
| Persistence defect | **Fixed** — prior `smartProfile.provenance.validationWarnings` undefined failure resolved |
| Highland cow (retry) | AI completed → Needs Review; Smart Profile populated; `catalog-enrich-v27`; legacy Suggested Tags coexist; shadow `shadow_would_auto_approve`; **no auto-approve** |
| Additional designs | 5 varied designs evaluated (Nurse Brain, Sarcastic Santa, Summer Vibes, Goose/Plant, Jimothy/Seattle) |

### Per-design summary

| # | Design | Verdict | Category | Shadow | Notes retained for later slices |
|---|--------|---------|----------|--------|----------------------------------|
| 1 | Highland Cow With Bow | PASS WITH NOTE | Animals | would_auto_approve | Subject too generic (`cow` vs Highland cow) |
| 2 | Nurse Brain | PASS | Occupations | would_auto_approve | Strong profession/interest separation; legacy tag false positive `doctor` |
| 3 | Sarcastic Santa | PASS WITH NOTE | (Christmas/humor) | would_auto_approve | Search Concepts uneven / text-redundant |
| 4 | Summer Vibes Fruits | PASS | Holiday & Seasonal | would_auto_approve | Strong structure + discovery phrases |
| 5 | Oops Plant Goose | PASS | Funny & Sarcastic | would_auto_approve | Dominant-intent category good; speculative search concepts acceptable for now |
| 6 | Jimothy Seattle | PASS WITH NOTE | Funny & Sarcastic | would_auto_approve | Unsupported Subject `people` — calibration case |

### Cross-batch conclusions (owner)

1. Structured Smart Profile model materially more useful than flat legacy tags.
2. Search Concepts: monitor redundancy/awkward phrasing and mild speculation.
3. Subjects: prefer most specific visually supported identity when confident.
4. Structured fields more evidence-constrained than Search Concepts.
5. Dominant category intent: good — no blocker.
6. Titles/descriptions strong; **keep 24-word lean cap**; titles far under 200-char max.
7. Shadow automation: all successful designs Needs Review + `shadow_would_auto_approve` — publication behavior unchanged; do not treat would-approve as semantic perfection.
8. Halftone: shadow/evidence only; ADR-FP-080 unchanged.
9. Legacy tags: temporary coexistence only; retirement still Slice 6.

### Calibration evidence to retain (not Slice 2 blockers)

- Prefer specific Subjects (e.g. `highland cow` over `cow`) when model already confidently identified type.
- Search Concepts: favor customer-intent discovery language; avoid Visible Text fragments/duplication.
- Structured Subjects must be visually supported (reject unsupported `people` pattern in autonomy scoring later).
- Autonomy policy must weigh semantic consistency / false structured metadata — not only `shadow_would_auto_approve`.

---

## Automated checks (post-corrective)

| Check | Command | Result |
|-------|---------|--------|
| Functions build | `npm --prefix functions run build` | **PASS** |
| Studio typecheck | `npx tsc --noEmit` (apps/studio) | **PASS** |
| Smart Profile + shadow tests | smartProfileNormalization + automationDecisionShadow + smartProfileBuilder | **PASS** (10/10) |
| Title/prompt regressions | catalogTitleRules + simpleCatalogEnrichmentPrompt | **PASS** (68/68) |
| `git diff --check` | | **PASS** (CRLF warnings only) |

---

## Provenance gate

| Field | Status |
|-------|--------|
| Owner confirmation | **PROVENANCE PASS** (2026-08-24) |
| Environment | New batch import on `fresh-prints-dev` |
| `importBatchId` | Present; shared across designs in the same batch |
| `importSourceFileName` | Present |
| `importRelativePath` | Present |

---

## Explicit non-authorizations (unchanged)

- No auto-approval / Autonomous
- No legacy tag retirement
- No halftone authority change (ADR-FP-080)
- No backfill
- No Slice 3 until explicitly authorized after Slice 2 signoff

---

## Verdict

**passed_with_notes** — owner DEV QA PASS WITH NOTES; provenance PASS; Slice 2 signoff **approved_with_notes**. Calibration notes retained for Slices 3–4.
