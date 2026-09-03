# Signoff: Smart Profile Subject Canonicalization and Derivative Suppression

| Field | Value |
|-------|-------|
| Date | 2026-09-03 |
| Signoff by | Signoff Agent |
| Plan | `docs/workflow/plans/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-plan.md` |
| Review | `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-review.md` |
| Implementation Review | `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-implementation-review.md` |
| Deploy record | `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-dev-deploy-record.md` |
| Owner canary | `docs/workflow/reviews/2026-09-03-smart-profile-subject-canonicalization-and-derivative-suppression-owner-canary-checkpoint.md` |
| Final status | **approved_with_notes** |

---

## Summary

Narrow Smart Catalog quality corrective closed on **fresh-prints-dev**. AI-generated `subjects` now prefer reusable depicted bases (e.g. `fish`) and suppress redundant action/color/style/OCR/type-class phrases (`leaping fish`, `bass fish`, `make fish`) while keeping legitimate atomic compounds and staff/import-preset authority. Schema remains `smart-profile-v1`. Prompt **catalog-enrich-v31** and normalizer **smart-profile-normalizer-v5** are live on the reviewed Functions allowlist. Owner targeted canary **PASS**. Autonomous **OFF**. Production **not authorized**. Full AI Review / Ready Catalog backfill **not** performed. Next queued goal is Smart Profiling completion (not started).

---

## Changes Delivered

### Behavior
- Prompt v31: canonical base subjects; no color/style/action/OCR subject phrases; keep atomic compounds; species in searchConcepts / optional atomic type
- Normalizer v5: AI-only derivative collapse before Gate I promote/sanitize; staff `normalizeSmartProfileDimensions` unchanged
- ADR-FP-145 amended (no curated subject allowlist)
- DEV Functions: `enqueueAiEnrichment`, `onCatalogReprocessJobWritten`, `startCatalogReprocessJob`, `previewCatalogReprocessJob`

### Files Created
- `packages/shared/src/utils/smartProfileSubjectCanonicalization.ts`
- `packages/shared/src/utils/smartProfileSubjectCanonicalization.test.ts`
- Plan, Formal Review, Implementation Review, deploy record, owner canary checkpoint, this signoff

### Files Modified
- Prompt/normalizer/reprocess version constants and tests
- `catalogAutomationEvidence.ts` (bound-compound promote only)
- `smartProfileNormalization.ts` (collapse then promote)
- `docs/project/DECISIONS.md` (ADR-FP-145 amendment)
- Workflow/handoff/roadmap

### Documentation Updated
- `docs/project/DECISIONS.md`, `docs/project/ROADMAP.md`
- `references/project-chatgpt-handoff/CURRENT-STATE.md`, `NEXT-PLANNED-GOAL.md`, `13-recent-completed-work.md`, `03-roadmap-and-phases.md`, `07-backend-and-ai-pipeline.md`, `12-decisions-and-constraints.md`

---

## Tests

### Automated
- Focused Smart Profile / versions / presets: **181/181 PASS**
- Gate I + shadow + slice 5/6 regression: **52/52 PASS**
- Functions build: **exit 0**
- ESLint on touched TS: **exit 0**

### Manual
| Test | Result | Approved by |
|------|--------|-------------|
| Owner DEV subject canary (fishing F1–F7 + cross-domain + provenance + staff/preset + Autonomous OFF) | **PASS** | Owner 2026-09-03 |

---

## Human Approvals Obtained
| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Production deploy | not required / **not authorized** | 2026-09-03 | DEV Functions only |
| Database migration | not required | | None |
| Design / UX | N/A | | No Studio/Portal runtime source |
| Business / policy | obtained | 2026-09-03 | Canonical subject contract + Owner canary PASS |
| Secrets / env | not required | | |
| DEV Functions allowlist | obtained | 2026-09-03 | Four Functions |
| Signoff / commit / push | obtained | 2026-09-03 | This closeout |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Existing Ready/AI Review profiles still on older prompt/normalizer until re-enriched | Medium | Targeted canary only; full backfill deferred to Smart Profiling completion |
| Bound-compound first-token class is grammatical, not exhaustive | Low | Conservative keep + base; Owner canary compounds PASS |
| Node.js 20 Functions runtime deprecation warning on deploy | Low | Existing Functions platform; not in this goal |

---

## Deferred Items (Roadmap)
- Smart Profiling completion / unattended catalog enrichment completion (next selected goal)
- Full AI Review / Ready Catalog reprocess strategy
- Legacy tag retirement
- Production promotion of v31/v5
- `show-queue-batch-allocation-performance` remains **DEFERRED**

---

## Open Blockers
- [x] None for this goal closeout

---

## Verdict

**approved_with_notes** — Implementation, tests, DEV deploy, and Owner canary PASS. Notes: no mass backfill; production untouched; Smart Profiling remains parked until owner starts it.

---

## Workflow Complete
- [x] `.cursor/workflow/state.md` updated with `DONE: yes`
- [x] `ROADMAP.md` updated
- [x] `RISK_REGISTER.md` not required (no new registered risk)
- [x] `references/project-chatgpt-handoff/CURRENT-STATE.md` updated
- [x] `references/project-chatgpt-handoff/13-recent-completed-work.md` updated
- [x] Handoff 03 / 07 / 12 / NEXT-PLANNED-GOAL updated

**Recommended next action for user:** Start managed goal **Smart Profiling completion / unattended catalog enrichment completion** when ready. Production remains separately gated.
