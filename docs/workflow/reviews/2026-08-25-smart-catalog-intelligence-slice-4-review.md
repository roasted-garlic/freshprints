# Review: Smart Catalog Intelligence — Slice 4 (Autonomy Engine + Catalog Processing Control Plane)

| Field | Value |
|-------|-------|
| Date | 2026-08-25 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-slice-4-plan.md` |
| Parent | `docs/workflow/plans/2026-08-24-smart-catalog-intelligence-unattended-enrichment-plan.md` |
| Reprocessing amendment | `docs/workflow/plans/2026-08-25-smart-catalog-intelligence-catalog-reprocessing-amendment-plan.md` |
| Verdict | **approved_with_changes** |
| Runtime | **Not authorized** — Plan + Formal Review only; owner must authorize implement |

---

## Summary

Slice 4 plan correctly scopes Catalog Processing Mode, evidence-based autonomy + conditional verifier, Automation Health, and the owner-only Catalog Reprocessing control plane without authorizing live Autonomous, Slice 5/6 bulk runs, tag retirement, or production promote. Architecture choice **A (Firestore job doc + backend worker)** with **callable start gates** (hybrid of `emailDeliveryJobs` worker + `backfillPrintRequestQueueTab` confirmation) is the correct repo-backed selection. Verdict is **approved_with_changes**: implement must follow the locked decisions below; owner must confirm those locks (or override explicitly) and separately authorize implement.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Control plane + autonomy engine; no Slice 5/6 execution |
| Architecture alignment | pass | Services/Functions own decisions; Studio UI + Settings only; no client bulk loops |
| Security impact addressed | pass | Owner-only reprocess + live Autonomous; server-validated phrases; client write deny |
| Data model impact addressed | pass | Additive settings fields + new job collection; no category auto-create |
| Backend impact addressed | pass | Callables + job worker + rules; Algolia reuse |
| Test strategy adequate | pass | Fail-safe, decision fixtures, lease/pause, owner gates |
| Human checkpoints identified | pass | Implement auth, DEV deploy, live Autonomous, Slice 5/6, prod |
| Roadmap alignment | pass | Matches master §§7, 11a, 12–13, 24 |
| Documentation plan | pass | DATA_MODEL, BACKEND, DECISIONS (ADR-FP-144), WORKFLOWS |
| No silent scope expansion | pass | Live Autonomous / Slice 5–6 / tags explicitly out |

---

## Architecture Review

**Findings:**
- **Selected architecture (locked):** Durable collection `catalogReprocessJobs` + backend worker (pattern `emailDeliveryJobs` / `onEmailDeliveryJobCreated`), started via owner callables with typed confirmation / dryRun / eligibility preview (pattern `backfillPrintRequestQueueTab`). Rejects Studio-open loops and sole use of long-running callables for bulk migration.
- Soft pause semantics (§C.5 of plan) are correct: finish current design, stop claiming, persist cursor, resume later. No mid-write cancel.
- One active job per `(projectId, targetType)` is required.
- Catalog Processing Mode on `settings/aiEnrichment` is correct; fail-safe missing/invalid → **`manual`**, never `autonomous`.
- Dual gate for live publication is required: `catalogWorkflowMode === "autonomous"` **and** `catalogAutonomousLiveEnabled === true` (default false). Selecting Autonomous in UI without live flag must behave like Shadow for publication (Needs Review + would-approve).
- Algolia: reuse `syncPortalCatalogDesignToAlgolia` / reconcile only — no second publisher.
- No hard architectural blocker found that would force broadening reprocess to **admin**. Owner-only stands.

**Required changes:**
- [x] Lock architecture A + soft pause + dual Autonomous gate (this review)
- [ ] Implement: record ADR-FP-144 for unattended catalog approval under Catalog Processing Mode before any live Autonomous enablement
- [ ] Master plan §11a.3 updated to record architecture selection (same workflow pass)

---

## Security Review

**Findings:**
- Reprocess start/pause/resume/retry and Autonomous **live** enable must be **owner-only** at callable layer (`caller.role === "owner"`), stricter than `updateAiEnrichmentSettings` (owner+admin).
- UI confirmation alone is insufficient; phrases validated server-side against environment/project and action.
- Job docs: client write deny; owner (and optionally staff read for Health) via rules — implement must not expose write paths.
- Live Autonomous remains fail-closed after Slice 4 ship until typed `ENABLE AUTONOMOUS` + owner checkpoint.

**Required changes:**
- [x] Lock owner-only for Catalog Reprocessing + live Autonomous enable (no admin unless owner later overrides)
- [ ] Implement: dedicated permission helper `canManageCatalogReprocessing` → owner only

**Human approval needed before production:**
- [ ] Production Catalog Reprocessing jobs
- [ ] Production live Autonomous
- [ ] Any production promote of Slice 4 Functions/Studio

---

## Data Model Review

**Findings:**
- Additive fields on `settings/aiEnrichment` are appropriate; current type (`packages/shared/src/types/ai/aiEnrichmentSettings.types.ts`) has no mode fields yet.
- Job schema in plan is sufficient for Slice 5/6; exact field names may trim during implement without changing semantics.
- Staff-only ready approval doctrine (`catalogApprovalService` / DATA_MODEL) must be intentionally revised via ADR before Autonomous live publishes without staff click.

**Required changes:**
- [ ] Implement: ADR-FP-144 + DATA_MODEL + WORKFLOWS updates in same Slice 4 docs pass
- [ ] No migration of historical designs required for mode field absence (fail-safe = manual)

---

## Backend Review

**Findings:**
- Enrichment success today always `needs_review` via `markAiSuccess` — Autonomous path must be an **explicit** branch, not accidental.
- Evolve `automationDecisionShadow.ts` into shared `computeCatalogAutomationDecision` used by Manual (metrics), Shadow, and Autonomous.
- Verifier conditional; Search Concept imperfection alone is **acceptable**, not auto-failure / not auto-verifier.
- Title: keep 200-char / 24-word; no global second title call.
- Category: select / gap / ambiguity only; never auto-create.

**Required changes:**
- [x] Lock uncertainty classes (Acceptable / Verifier-worthy / Needs Review hard) per plan §E.3
- [x] Lock confirmation phrases per plan §K (see Owner Decisions)

---

## Testing Review

**Findings:**
- Plan’s unit coverage for fail-safe, Highland/Jimothy-class fixtures, verifier gating, lease/pause, and owner rejection is adequate.
- Manual DEV checklist must keep live Autonomous OFF after deploy unless separately authorized.

**Required changes:**
- [ ] None beyond plan

---

## Documentation Review

**Findings:**
- Plan identifies correct doc targets. Next ADR number in repo is **ADR-FP-144**.
- Master §11a.3 still said “Formal Review must choose” — resolved by this review + master refinement.

---

## Uncertainty classes (locked)

| Class | Examples | Autonomy |
|-------|----------|----------|
| **Acceptable** | Mild Search Concept speculation/redundancy when title/category/structured metadata are strong | Do not block; Health optional |
| **Verifier-worthy** | Subject too generic vs specific title (Highland); structured token without supporting evidence (Jimothy `people` with no people visible — **not** a global ban on `people`); category ambiguity near boundary; conflicting signals | Invoke verifier; unresolved → Needs Review |
| **Needs Review hard** | Validation errors; missing required fields for Autonomous; category unresolved/gap; title over max; live gate off while mode autonomous (publication) | Block auto-approve; verifier optional |

---

## Confirmation phrases (locked — pending owner confirm)

| Action | Phrase |
|--------|--------|
| Enable live Autonomous | `ENABLE AUTONOMOUS` |
| DEV reprocess AI Review Queue | `REPROCESS AI REVIEW QUEUE` |
| DEV reprocess Ready Catalog | `REPROCESS READY CATALOG` |
| PROD reprocess AI Review Queue | `REPROCESS PRODUCTION AI REVIEW` |
| PROD reprocess Ready Catalog | `REPROCESS PRODUCTION READY CATALOG` |

---

## Required Changes (implement must follow)

1. **Architecture:** `catalogReprocessJobs` + worker + soft pause; start callables with typed phrase / preview; one active job per `(projectId, targetType)`.
2. **Mode fail-safe:** missing/invalid/unreadable → `manual` only; never default to `autonomous`.
3. **Dual Autonomous gate:** mode + `catalogAutonomousLiveEnabled` (default false); live enable owner-only + `ENABLE AUTONOMOUS`.
4. **Owner-only** for Catalog Reprocessing control plane and live Autonomous enable; do not broaden to admin without new owner decision.
5. **Slice 4 Start buttons:** visible but **disabled / gated** until Slice 5 (AI Review Queue) and Slice 6 (Ready Catalog) respectively authorize execution — control plane may create schemas and worker stubs; no bulk runs in Slice 4.
6. **Verifier / policy / title / category / Algolia / legacy tags / halftone** as plan §§E–N; ADR-FP-080 unchanged unless separate owner ADR.
7. **ADR-FP-144** + DATA_MODEL + WORKFLOWS before live Autonomous is permitted in any environment.
8. Ship Slice 4 with **live Autonomous OFF**; implementing the setting does not authorize live publication.

---

## Owner decisions (recorded 2026-08-25)

1. **Formal Review locks confirmed** (architecture A, soft pause, dual gate, owner-only, phrases, Start buttons disabled until Slice 5/6).
2. **Slice 4 implement authorized — DEV only** (no live Autonomous, no Slice 5/6 runs, no prod).
3. **Owner-only retained** (no admin for reprocess / live Autonomous enable).
4. **Override — no global unsupported-subject denylist:** Do not ban ordinary semantic tokens (`people`, `person`, `man`, `woman`, `child`, `animal`, etc.) as inherently unsupported Subjects/Objects. Use contextual evidence/consistency + targeted verifier. Jimothy-like inconsistency → verifier-worthy; genuine people artwork with `people` → must not be rejected solely for the token. Structural/schema-invalid lists only if needed.

---

## Blockers

None. Implement authorized under locks + override above.

---

## Verdict Rationale

Plan meets acceptance criteria 1–19 for planning/review. Architecture and safety model are repo-grounded and fail-closed. **approved_with_changes** records implement locks and requires owner confirm + implement authorization before code changes. No runtime work occurred in this phase.

---

## Acceptance criteria map

| # | Criterion | Met? |
|---|-----------|------|
| 1 | Catalog Processing Mode architecture documented | yes |
| 2 | Safe fallback never Autonomous | yes |
| 3 | Owner-only Settings + backend enforcement explicit | yes |
| 4 | Durable reprocessing architecture selected | yes — A |
| 5 | Studio disconnect while jobs continue | yes |
| 6 | Pause/resume/retry/idempotency defined | yes |
| 7 | DEV vs PROD safety model explicit | yes |
| 8 | High-impact confirmation strategy proposed | yes — locked pending owner |
| 9 | Targeted verifier triggers/handling defined | yes |
| 10 | Automation evidence hierarchy defined | yes |
| 11 | Category ambiguity/gap defined | yes |
| 12 | Automation Health minimum defined | yes |
| 13 | Slice 5 interaction explicit | yes |
| 14 | Slice 6 lifecycle preservation explicit | yes |
| 15 | Algolia reuses Slice 3 | yes |
| 16 | Legacy tags temporary coexistence | yes |
| 17 | Halftone human-controlled | yes |
| 18 | Required ADR/workflow revisions identified | yes — ADR-FP-144 |
| 19 | No implementation | yes |
| 20 | Explicit verdict + owner decisions | **approved_with_changes** + §Owner decisions |

---

## Next Step

**STOP for owner.** Await confirmation of locks and authorization to start Slice 4 **implement**. Do not implement, deploy, enable live Autonomous, or start Slice 5/6 until owner replies.
