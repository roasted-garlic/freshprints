# Formal Review: Smart Catalog Intelligence — Slice 6 Plan

| Field | Value |
|-------|-------|
| Date | 2026-08-26 |
| Reviewer | Review Agent |
| Plan | `docs/workflow/plans/2026-08-26-smart-catalog-intelligence-slice-6-plan.md` |
| Verdict | **approved_with_changes** |

---

## Summary

The Slice 6 plan correctly identifies that the current Catalog Reprocess worker is **not** safe for Ready designs: AI-clear forces `imported`/`pending`, success writes `needs_review`, and any non-ready status write triggers Algolia **delete**. The proposed Ready-preservation architecture (separate clear, pipeline backfill mode, lifecycle assert, Shadow-only automation recording) aligns with master plan §13 and Slice 5 control-plane patterns. Scope correctly excludes Autonomous enablement, tag retirement, and production. Implement is **not** authorized by this review alone.

---

## Checklist

| Area | Status | Notes |
|------|--------|-------|
| Scope clear and bounded | pass | Ready reprocess + calibration; no Autonomous/tags/prod |
| Architecture alignment | pass | Reuses jobs/worker; extends pipeline with explicit mode |
| Security impact addressed | pass | Owner-only; phrase; Shadow + live OFF preflight to extend |
| Data model impact addressed | pass | Outcome/job fields; DATA_MODEL note planned |
| Backend impact addressed | pass | Callables/worker/pipeline; Algolia via existing sync |
| Test strategy adequate | pass | Lifecycle/Algolia regression tests required |
| Human checkpoints identified | pass | Deploy, Preview, Start, sample, Autonomous thresholds, tags |
| Roadmap alignment | pass | Matches parent Slice 6 Ready backfill doctrine |
| Documentation plan | pass | DATA_MODEL / BACKEND / ROADMAP / DECISIONS |
| No silent scope expansion | pass | Tag retirement deferred; Autonomous evidence-only |

---

## Architecture Review

**Findings:**
- Correct separation of AI Review Queue path vs Ready-backfill path.
- Binding: Ready backfill must **not** reuse `buildCatalogReprocessAiClearUpdate()` or default `markAiSuccess`/`markAiFailure`.
- Binding: Catalog Processing Mode must not change Ready lifecycle (shadow provenance only).
- Studio UI currently hardcodes Start to `ai_review_queue` — plan correctly includes enabling Ready when gate is on.

**Required changes:**
- [x] None architectural beyond binding implement conditions listed below

---

## Security Review

**Findings:**
- Owner-only callables + confirmation phrases already exist for Ready.
- Must extend `assertShadowCalibrationStartAllowed` (or equivalent) to `ready_catalog` Start.
- No production deploy in Slice 6 initial pass.

**Required changes:**
- [x] None beyond plan’s preflight extension

**Human approval needed before production:**
- [x] Production Ready Catalog reprocess (explicit future phrase) — out of this slice’s DEV work

---

## Data Model Review

**Findings:**
- Preservation matrix is sound; Ready `aiReviewNotes` preserve (unlike Slice 5 clear) is the right default.
- `remainedReady` / violation anomaly codes needed so Slice 5 `remainedNeedsReview` semantics are not misapplied.

**Required changes:**
1. Implement must document exact terminal `aiProcessingStage` for Ready success in DATA_MODEL (plan’s `ready_for_review` default is acceptable if unchanged elsewhere).

---

## Backend Review

**Findings:**
- Repo evidence in plan matches current code (gate false; stub count 0; worker fail-closed; Algolia delete on non-ready).
- Code changes are **mandatory before unlock**.
- Algolia upsert on Smart Profile change while Ready is expected and acceptable.

**Required changes:**
1. **Canary before full Ready Start (binding):** Implement must support a owner-authorized small canary (explicit design ID list **or** documented 2–3 ID dry path via retryDesignIds seeded job) before processing the full Ready set. Do not rely on “hope Preview is enough” alone.
2. **Pre-unlock deploy order (binding):** Deploy Ready-preservation Functions **before** flipping `CATALOG_REPROCESS_READY_CATALOG_ENABLED` to true (same release may include both only if Start remains phrase-gated and owner does not Start until canary). Prefer: deploy code with gate still false → verify → unlock gate → Preview → canary Start → full Start.

---

## Testing Review

**Findings:**
- Automated lifecycle tests are the critical gate; Algolia delete regression must remain.
- Manual owner sample strata are adequate; thresholds for Autonomous correctly deferred to human checkpoint.

**Required changes:**
- [x] None beyond plan; implement must not skip Ready failure-restore tests

---

## Documentation Review

**Findings:**
- Plan lists correct durable docs. ADR recommended for Ready-backfill lifecycle exception (parity with ADR-FP-145 style).

**Required changes:**
1. Add a short ADR (or DECISIONS entry) at implement: Ready Catalog reprocess preserves `ready`+`approved` and records shadow automation without Autonomous publish.

---

## Required Changes (approved_with_changes)

1. **Mandatory Ready-preservation code path** before any gate unlock or Start — do not unlock Ready Catalog on current Slice 5 worker.
2. **Canary mechanism** (explicit IDs / seeded retry list) required before full Ready Catalog Start; owner authorizes canary then full run separately if desired.
3. **Deploy-before-unlock ordering** (or equivalent fail-closed Start until preservation path is live) documented in implement/deploy record.
4. **DATA_MODEL + ADR** for Ready-backfill lifecycle exception at implement.
5. **Extend Shadow + Autonomous-OFF Start preflight** to `ready_catalog`.
6. Do **not** treat Formal Review as Implement authorization — separate owner phrase required.

Non-blocking preferences:
- Prefer minimizing Smart Profile delete window on Ready to reduce temporary Algolia thinning.
- Default include already-v30/v4 Ready designs unless owner later opts out at Start.

---

## Blockers

None for planning. Implement remains gated on owner authorization.

---

## Verdict Rationale

**approved_with_changes** — Plan is accurate, safety-first, and repo-grounded. Binding implement conditions (preservation path, canary, deploy order, docs/ADR, Start preflight) must be followed. No unlock/Start/Autonomous/tag retirement/production in this review.

---

## Next Step

**STOP.** Await owner authorization for **Slice 6 Implement** (and separately later: DEV deploy, Preview, canary Start, full Start). Do not implement from this review alone.
