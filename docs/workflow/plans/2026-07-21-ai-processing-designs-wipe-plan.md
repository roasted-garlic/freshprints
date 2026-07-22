# Plan: Test Data wipe — AI Processing designs only

| Field | Value |
|-------|-------|
| Date | 2026-07-21 |
| Author | Planning Agent |
| Status | approved |
| Workflow | managed-phase |
| Related | docs/workflow/reviews/2026-07-21-ai-processing-designs-wipe-review.md |

---

## Goal

Add a Studio **Test Data Reset** wipe target (and preset) that deletes **only** designs that appear on the **AI Processing** page — Processing, Needs Review, and Rejected — **regardless of `aiProcessingStage` / review progress**, while **keeping** ready Design Library designs, archived designs, accounts, categories, tags, and settings.

## Background

Owners iterating on AI import/review fill `fresh-prints-dev` with imported / needs-review / rejected fixtures. Today the only design wipe is **all catalog designs** (`designs`), which also requires wiping print requests and nukes ready library assets + entire Storage prefixes. That is too blunt for clearing the AI Processing inbox between scratch runs.

AI Processing page membership (Studio SSOT):

| Tab | Design match |
|-----|----------------|
| Processing | `status ∈ {imported, processing}` and `aiReviewStatus === pending` |
| Needs Review | `status === imported` and `aiReviewStatus === needs_review` |
| Rejected | `status === rejected` |

“No matter what their status” = all three tabs (any pipeline stage / failed / ready_for_review / suggestions present), not ready or archived Design Library rows.

Refs: ADR-FP-068; `aiReviewInboxEligibility.ts` / `buildAiReviewInboxListQuery`; existing `wipeOperationalTestData` + shared `expandOperationalWipePlan`.

Parked: Library design sharing proof-line follow-up (manual re-check + Functions redeploy) remains parked until this goal closes or owner resumes it.

---

## Scope

### In Scope

1. New operational wipe target id: **`aiProcessingDesigns`**.
2. Shared eligibility helper matching the three AI Processing tabs (unit-tested).
3. Expand wipe plan flag: selective design-doc delete + **per-design** Storage delete (not full `originals/` / `thumbnails/` / `previews/` prefix wipe).
4. Callable `wipeOperationalTestData` implements selective delete when that flag is set.
5. Studio Test Data UI: checkbox + short help + preset button **AI Processing**.
6. Mutual exclusion / coexistence rules with full **`designs`** wipe (see Approach).
7. Doc touch: TESTING.md wipe notes; brief ADR-FP-068 amendment or DATA_MODEL/BACKEND one-liner; DECISIONS if review asks.
8. Unit tests for expand + eligibility; soft-reload Studio after implement.

### Out of Scope

- Wiping **ready** or **archived** designs
- Full catalog `designs` wipe behavior change (except coexistence with the new target)
- Forcing print-request wipe (AI Processing designs are not catalog-ready; print items require ready designs)
- Customer uploads wipe (promoted designs may leave `sourceCustomerUploadId` dangling — same note as full designs wipe)
- Favorites / other side refs cleanup
- Production allowlist / production deploy
- Retention / purge-archived maintenance panel changes

---

## Affected Areas

### Files / Modules (expected)

- `packages/shared/src/types/admin/wipeOperationalTestData.types.ts` — add target id
- `packages/shared/src/utils/operationalWipeTargets.ts` (+ tests) — expand plan, presets, toggle order, eligibility export or sibling util
- `packages/shared/src/utils/aiProcessingDesignWipeEligibility.ts` (new, preferred) + tests — pure predicate on `{ status, aiReviewStatus }`
- `functions/src/wipeOperationalTestData.ts` — query/delete matching designs; delete Storage for those ids only
- `apps/studio/.../test-data-reset/constants/wipeTargetOptions.ts`
- `apps/studio/.../test-data-reset/pages/TestDataResetPage.tsx` — preset + summary copy
- `docs/standards/TESTING.md` — wipe checklist note
- `docs/project/DECISIONS.md` — amend ADR-FP-068 (new target)
- Optional: `docs/architecture/BACKEND.md` one-line wipe target list

### Architecture Impact

- [x] Details: Shared expand + eligibility remain SSOT; Studio only selects targets. No client Firestore deletes. Selective delete is a new plan flag, not a new collection wipe entry.

### Security Impact

- [x] Details: Same gates — development Studio UI + allowlisted project (`fresh-prints-dev`) + owner + typed phrase `WIPE TEST DATA`. No production. Selective Storage deletes must be path-scoped to wiped design ids only (never wipe entire design Storage prefixes unless full `designs` target is also selected).

### Data Model Impact

- [x] Details: No schema change. Destructive delete of a **subset** of `designs` docs + their Storage objects on allowlisted projects only.

### Backend Impact

- [x] Details: Redeploy `wipeOperationalTestData` to `fresh-prints-dev` required before live selective deletes work. **No production.**

### UI / UX Impact

- [x] Details: New checkbox + **AI Processing** preset on Test Data Reset. Manual smoke on `fresh-prints-dev` after Functions redeploy.

### Migration Impact

- [x] None (destructive ops wipe only; no forward migration)

---

## Approach

1. **Eligibility (shared)** — `isAiProcessingPageDesign({ status, aiReviewStatus })` true iff design would match any AI Processing tab (same rules as `designMatchesInboxTab` for `processing` | `needs_review` | `rejected`). Ignore `aiProcessingStage` entirely.

2. **Target expand** — `aiProcessingDesigns` sets `wipeAiProcessingDesigns: true` (new plan field). Does **not** add `"designs"` to `deleteCollections` (that would wipe the whole collection). Does **not** set `wipeDesignStorage` (full prefix).

3. **Callable** — When `wipeAiProcessingDesigns`:
   - Page through `designs` (or status-filtered queries if indexes allow; otherwise scan + predicate).
   - Delete matching docs; collect ids + known asset paths (`originalPath` / `thumbnailPath` / `previewPath` when present, plus canonical `originals/{id}.png`, `thumbnails/{id}.webp`, `previews/{id}.webp` as fallbacks).
   - Delete those Storage objects only (`ignoreNotFound`).
   - Report counts: e.g. reuse `deleted.designs` for matched deletes and/or add `aiProcessingDesignsDeleted` if response typing needs clarity — prefer extending response with `aiProcessingDesignsDeleted: number` (0 when target unused) so full `designs` collection wipe remains distinguishable.

4. **Coexistence with full `designs` wipe**
   - If both `designs` and `aiProcessingDesigns` selected: full designs path wins (entire collection + prefix Storage); selective path skipped as redundant.
   - Full `designs` still requires `printRequests` + catalog ack modal; **`aiProcessingDesigns` alone does not** require print requests or catalog ack (narrower, keeps ready library).
   - Toggle: enabling full `designs` may leave `aiProcessingDesigns` checked or auto-clear it — prefer **auto-clear selective when full designs enabled** to avoid confusing double-ack UX; document in UI summary.

5. **Studio UI**
   - Option label: **AI Processing**; summary: “Imported / needs review / rejected designs + their Storage; keeps ready library.”
   - Preset button sets `[aiProcessingDesigns]` only.
   - Help text: does not wipe ready/archived; does not wipe print requests or customer uploads.

6. **Docs** — Amend ADR-FP-068 with the selective target; TESTING wipe section bullet.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Unit (eligibility + expand/presets) | `npx tsx --test packages/shared/src/utils/aiProcessingDesignWipeEligibility.test.ts packages/shared/src/utils/operationalWipeTargets.test.ts` | yes |
| Typecheck (touched packages if scripts exist) | project scripts as applicable | yes if cheap |
| Lint | only if touched files fail local lint | no |
| Build | no | no |
| Integration / E2E | no | no |
| Backend/rules | no rules change | no |

### Manual

- [x] Details: On `fresh-prints-dev` after Functions redeploy — seed or use existing AI Processing designs across tabs; run **AI Processing** preset; confirm those docs/assets gone; ready Design Library designs remain; phrase confirm still required.

---

## Human Checkpoints Anticipated

- [x] Manual UI smoke on Test Data Reset after deploy
- [ ] Design approval — n/a
- [ ] Business logic decision — n/a (owner request is clear)
- [ ] Production deploy — **forbidden** for wipe
- [x] Other: Owner approval to redeploy `wipeOperationalTestData` to **`fresh-prints-dev` only**

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Accidental full Storage prefix wipe | High | Selective path must never call existing `deleteDesignStorageAssets()` unless full `designs` also selected |
| Missed designs due to status drift | Medium | Shared predicate mirrored to inbox eligibility; unit tests for all three tabs + ready/archived false |
| Orphan print-request refs | Low | Ready-only attach rules; still document “does not wipe print requests” |
| Promoted upload dangling ids | Low | Same as full designs wipe; optional separate Customer Uploads wipe |
| Functions not redeployed | Medium | Checkpoint + TESTING note |

See also: `.cursor/workflow/risk-checklist.md`

---

## Rollback Plan

Revert shared target + Studio UI + callable changes. Redeploy previous `wipeOperationalTestData` to `fresh-prints-dev` if needed. No production impact if never deployed there.

---

## Documentation Updates Required

- [ ] PROJECT_BRIEF.md
- [ ] ARCHITECTURE.md
- [x] DATA_MODEL.md — optional one-liner under designs / wipe note if helpful
- [x] BACKEND.md — optional wipe target mention
- [x] TESTING.md
- [ ] DEPLOYMENT.md
- [ ] STYLE_GUIDE.md
- [x] DECISIONS.md — ADR-FP-068 amendment
- [x] Other: plan/review/test/signoff artifacts

---

## Open Questions

- [x] None — eligibility = all three AI Processing tabs; keep ready + archived; no print-request prerequisite for selective wipe.

---

## Approval

- Review doc: docs/workflow/reviews/2026-07-21-ai-processing-designs-wipe-review.md
- Verdict: pending
