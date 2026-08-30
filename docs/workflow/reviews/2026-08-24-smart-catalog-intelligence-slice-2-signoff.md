# Signoff: Smart Catalog Intelligence — Slice 2

| Field | Value |
|-------|-------|
| Date | 2026-08-24 |
| Signoff by | Signoff Agent |
| Plan | docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md |
| Review | docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-unattended-enrichment-review.md |
| Corrective review | docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-slice-2-persistence-corrective-review.md |
| Test report | docs/workflow/reviews/2026-08-24-smart-catalog-intelligence-slice-2-test-report.md |
| Final status | **approved_with_notes** |

---

## Summary

Slice 2 delivered the Smart Profile foundation (`smart-profile-v1`), prompt **catalog-enrich-v27**, import batch provenance fields, shadow automation decisions (always Needs Review), Studio Smart Profile panel, Firestore rules for optional fields, and a persistence corrective so nested `undefined` cannot break Firestore writes. Owner DEV QA on `fresh-prints-dev` **PASS WITH NOTES**; provenance fields confirmed on a new batch import. Master goal continues; **Slice 3 not started**.

---

## Changes Delivered

### Behavior

- AI enrichment writes versioned `design.smartProfile` with structured dimensions + provenance
- Shadow automation records decisions (e.g. `shadow_would_auto_approve`) without publishing
- Successful AI still routes to **Needs Review** — no auto-approval
- Import create persists `importBatchId`, `importSourceFileName`, `importRelativePath` (when applicable)
- Legacy Suggested Tags coexist (temporary migration)
- Halftone remains shadow evidence only (ADR-FP-080 unchanged)
- Persistence corrective: omit empty `validationWarnings`; deep-strip Smart Profile before Firestore write

### Files Created (representative)

- `packages/shared/src/types/catalog/smartProfile.types.ts`
- `packages/shared/src/constants/smartProfile.constants.ts`
- `packages/shared/src/utils/smartProfileNormalization.ts` (+ tests)
- `packages/shared/src/utils/smartProfileValidation.ts`
- `functions/src/ai/smartProfileBuilder.ts` (+ tests)
- `functions/src/ai/automationDecisionShadow.ts` (+ tests)
- `apps/studio/.../AiReviewSmartProfileSection.tsx`
- Plan / reviews / this signoff under `docs/workflow/`

### Files Modified (representative)

- `functions/src/ai/aiEnrichmentPipeline.ts`, `catalogTitleRules.ts`, `simpleCatalogEnrichmentResponse.ts`, `resetAiEnrichmentForProcessing.ts`
- `functions/src/lib/firestoreDocument.ts` (`withoutUndefinedDeep`)
- `packages/shared/.../aiEnrichment.constants.ts`, `aiProcessing.types.ts`
- Studio design/import types & services; `AiReviewWorkspace.tsx`
- `firestore.rules`, `docs/architecture/DATA_MODEL.md`

### Documentation Updated

- Master plan (incl. Catalog Processing Mode plan amendment — Slice 4 scope, docs-only)
- Slice 2 test report, persistence corrective review, Catalog Processing Mode amendment review
- This signoff; ROADMAP header; workflow state

---

## Tests

### Automated

| Check | Result |
|-------|--------|
| Functions build | PASS |
| Studio typecheck | PASS |
| Smart Profile + shadow unit tests | PASS (10/10 post-corrective) |
| Title/prompt regressions | PASS (68/68) |
| `git diff --check` | PASS |

### Manual

| Test | Result | Approved by |
|------|--------|-------------|
| DEV QA after initial Slice 2 deploy | FAIL (validationWarnings undefined) | owner |
| Persistence corrective DEV redeploy + re-QA | **PASS WITH NOTES** | owner |
| Import provenance (`importBatchId` / `importSourceFileName` / `importRelativePath`; shared batch id) | **PASS** | owner |
| No auto-approval; Needs Review + shadow only | PASS | owner |
| Smart Profile populated; legacy tags coexist; v27 active | PASS | owner |

---

## Human Approvals Obtained

| Approval | Status | Date | Notes |
|----------|--------|------|-------|
| Plan + Slice 2 start | obtained | 2026-08-24 | APPROVE PLAN |
| DEV deploy (rules + 2 functions) | obtained | 2026-08-24 | APPROVE DEV DEPLOY Slice 2 |
| DEV redeploy (persistence corrective Functions) | obtained | 2026-08-24 | APPROVE DEV DEPLOY corrective |
| Owner DEV QA | obtained | 2026-08-24 | PASS WITH NOTES |
| Provenance confirmation | obtained | 2026-08-24 | PROVENANCE PASS |
| Production deploy | not required | | DEV only |
| Live auto-approval / Autonomous | not authorized | | Slice 4 + ADR + owner gate |
| Slice 3 start | not authorized | | Owner must authorize separately |
| Legacy tag retirement / backfill | not authorized | | Slice 6 |

---

## Risks & Known Issues

| Item | Severity | Mitigation / follow-up |
|------|----------|------------------------|
| Subject specificity (e.g. Highland cow → generic "cow") | Low–Med | Calibration for Slice 3–4; prefer specific identity when confident |
| Search Concept redundancy / awkward phrases | Low–Med | Improve discovery phrasing over time; avoid Visible Text duplication |
| Unsupported structured Subjects (e.g. "people") | Med (autonomy) | Evidence-constrain structured fields; weigh against Autonomous in Slice 4 |
| Mildly speculative Search Concepts (plant mom/dad) | Low | Acceptable for now; monitor for systematic speculation |
| `shadow_would_auto_approve` ≠ semantic perfection | Med (autonomy) | Catalog Processing Mode + shadow calibration before live Autonomous |
| Title 24-word cap | N/A | Keep; QA titles far under 200-char max |

---

## Deferred Items (Roadmap)

- **Slice 3** — Search Intelligence + Algolia + Smart Filters (not started; needs owner authorization)
- **Slice 4** — Catalog Processing Mode + autonomy engine + verifier + ADR revision
- **Slice 5** — Needs Review reprocess (honors Catalog Processing Mode)
- **Slice 6** — Ready backfill + legacy tag retirement (owner gate)
- Calibration cases from Slice 2 DEV QA (retain; do not discard)

---

## Open Blockers

- [x] None for Slice 2 signoff
- [ ] Slice 3 not authorized (intentional stop)

---

## Verdict

**approved_with_notes** — Slice 2 acceptance criteria met in DEV: Smart Profile + shadow foundation, persistence corrective proven, provenance fields verified, publication still staff-gated. Notes are quality/calibration evidence for later slices, not Slice 2 blockers.

---

## Workflow Complete (Slice 2)

- [x] `.cursor/workflow/state.md` updated (Slice 2 signed off; master goal continues)
- [x] `ROADMAP.md` updated
- [x] Calibration notes retained in test report / state
- [x] `references/project-chatgpt-handoff/` — **not present** in this checkout (N/A)

**Recommended next action for user:** Authorize Slice 3 when ready (`Continue Workflow` / explicit Slice 3 start). Do not enable auto-approval or retire legacy tags.
