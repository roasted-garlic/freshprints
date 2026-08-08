# Review: Stage 5 — Generated-asset cleanup plan

| Field | Value |
|-------|-------|
| Date | 2026-08-07 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-07-stage-5-generated-asset-cleanup-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

Stage 5 plan correctly scopes **dev-only** dry-run → allowlisted Storage delete → orphan `snapshotPublicationState` cleanup → Rules narrowing after Stage 4 publisher retirement. Security posture is narrowing (remove public-read generated paths), Strategy 2 AI is respected (no tags-only retain), and production/Stage 6 remain gated. Implement is **not** authorized by this review — only after `APPROVE STAGE 5 IMPLEMENT`, with separate phrases for dry-run, delete, and Rules deploy.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Two Storage prefixes + one FS collection + Rules; stubs KEEP default |
| Architecture alignment | pass | Algolia + Firestore remain primary; no publisher revival |
| Security impact addressed | pass | Allowlist deletes; no Rules widening; dry-run before delete |
| Data model impact addressed | pass | Orphan coordination collection only |
| Backend impact addressed | pass | Dev Rules deploy gated; inventory stays dry-run-only unless extended carefully |
| Test strategy adequate | pass | Rules tests + owner dry-run/QA phrases |
| Human checkpoints identified | pass | Distinct phrases per risk tier |
| Roadmap alignment | pass | Matches Amendment 8 §16 Stage 5 |
| Documentation plan | pass | BACKEND / DECISIONS / handoff |
| No silent scope expansion | pass | Stage 6 / prod / PR #40 / shared type package delete excluded |

---

## Architecture Review

**Findings:**
- Correct separation: Stage 4 = writers/readers retired; Stage 5 = residual bytes + Rules.
- Shared `catalog-snapshots` types correctly **kept** (AI FS loader + Algolia classifier).
- Optional Portal stub removal deferred — good (avoid unnecessary churn).

**Required changes:**
1. **Implement Phase A must open with a Stage 4 residue check** — confirm `functions/src/index.ts` has no publisher exports, `functions/src/catalogSnapshots/` remains absent on disk, and Algolia classifier path is `functions/src/algolia/portalCatalogChangeClassifier.ts`. Do not restore deleted publisher sources from git during Stage 5.

---

## Security Review

**Findings:**
- Public-read `generated/portal-catalog/**` and catalog-reference client/manifest paths are obsolete attack/noise surface — removing them is the right direction.
- Critical risk is **prefix escape** on delete — plan’s hard allowlist + dual phrases (dry-run then delete) are mandatory, not optional.
- Rules deploy must not accidentally loosen other matches.

**Required changes:**
2. Dry-run record must include an explicit **negative checklist** (sample that `originals/`, `thumbnails/`, `previews/`, `customer-uploads/` were **not** listed for deletion).
3. Delete tooling (script or documented commands) must **refuse to run** if any target path does not start with exactly one of the two allowlisted prefixes.

---

## Data Model Review

**Findings:**
- `snapshotPublicationState` was publisher coordination only; safe to delete orphans after Stage 4.
- No design/tag/category schema change.

**Required changes:**
- None beyond documenting retirement in DATA_MODEL if the collection is currently named there (plan already flags).

---

## Backend Review

**Findings:**
- Prefer documented list/delete procedure or a narrow list-only helper over overloading `inventoryCatalogImageStorage` with delete modes.
- If a callable is added for delete, it must be owner/admin-only, dry-run default, and require an explicit `confirmDelete: true` (or separate callable) — **prefer ops script under Functions scripts with project pin** to avoid shipping a standing delete API. Plan already allows either; Formal Review **prefers non-callable ops script** for Phase C.

**Required changes:**
4. **Prefer** a repo script / documented `gsutil`/`firebase storage` procedure pinned to `fresh-prints-dev` over a production-callable delete. If a callable is proposed in Implement, stop and re-review before coding it.

---

## Test Review

**Findings:**
- Rules tests disposition from Amendment 8 §4.4 correctly owned here.
- Manual Algolia ON/OFF + no generated Network is the right regression set.

**Required changes:**
- None.

---

## Required Changes (must apply before or during Implement)

1. Stage 4 residue check at Implement start (no publisher source revival).
2. Dry-run negative checklist for artwork/upload roots.
3. Delete tooling hard-refuse non-allowlisted paths.
4. Prefer non-callable ops/delete procedure; callable delete needs re-review.

**Plan status after this review:** Treat as **approved_with_changes** — Planning Agent may fold items 1–4 into the plan Approach section as Implement constraints without a full re-plan. Owner may proceed to `APPROVE STAGE 5 IMPLEMENT` after constraints are acknowledged in plan or Implement kickoff notes.

---

## Risks / Blockers

| Item | Severity | Blocking Implement? |
|------|----------|---------------------|
| Accidental broad Storage delete | Critical | Mitigated by phrases + allowlist — not blocking planning |
| No bucket backup | Medium | Accepted post-Stage 4 |
| Production confusion | High if phrases ignored | Out of scope; do not authorize |

**Blocked:** no

---

## Verdict

**approved_with_changes**

Planning authorized by `APPROVE STAGE 5 PLANNING` is satisfied. **Do not start Implement, dry-run, Storage delete, or Rules deploy** until the matching owner phrases.

---

## Next Required Step

Owner: `APPROVE STAGE 5 IMPLEMENT` (source Rules + tests + dry-run tooling only)  
Then: `APPROVE DEV STORAGE DRY-RUN: STAGE 5` → delete phrase → Rules deploy phrase.
