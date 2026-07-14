# Plan: Studio import auto-start AI processing

| Field | Value |
|-------|-------|
| Date | 2026-07-13 |
| Author | Planning Agent |
| Status | ready_for_review |
| Workflow | managed-phase |
| Related | ADR-FP-014 (amend), owner direction 2026-07-13 |

---

## Goal

When Studio finishes importing image(s) with derivatives complete, if **Auto advance** is on (and **on by default**), automatically open AI Processing and start the **existing sequential** AI queue — same reliability model as today’s Start AI, without concurrent enqueue storms.

## Background

ADR-FP-014 removed auto-enqueue-on-import after bulk imports fired many Cloud Functions and hit provider 429s. Staff must open Processing and click Start AI. Owner wants cart-like continuity: import done → AI starts, gated by Auto advance, sequential only.

Auto advance preference currently defaults **off** when unset (`=== "true"` only).

## Scope

### In Scope

1. **Default Auto advance ON** — unset session key → `true`; explicit `"false"` stays off.
2. **Amend ADR-FP-014** — document: no concurrent auto-enqueue; when Auto advance on, post-import navigates to Processing and starts sequential queue once.
3. **Single + batch import success** — after successful import with pipeline/derivatives ready (at least one design awaiting AI), if Auto advance on → navigate to `/ai-review?autoStart=1` (Processing tab).
4. **AI Review consumes `autoStart=1`** — once Processing tab has awaiting designs and queue idle, call existing `startAutoQueue` once; strip query param.
5. **Auto advance OFF** — no auto-navigate / no auto-start; keep manual “Open AI Processing” + Start AI / Process one.
6. Update import result copy to match new behavior.
7. Unit tests for preference default + path/query helpers.

### Out of Scope

- Concurrent multi-enqueue from import orchestration
- Changing Cloud Function concurrency / `enqueueAiEnrichment` contract
- Customer-upload promote path changes
- Production deploy
- Changing Auto advance OFF manual single-step UX beyond copy

---

## Affected Areas

### Files / Modules (expected)

- `apps/studio/.../aiProcessingQueuePreferences.ts` (+ tests)
- `apps/studio/.../aiReviewInboxConstants.ts` / `designLibraryFilters.ts` — `autoStart` path helper
- `apps/studio/.../AiReviewPage.tsx` or `useAiProcessingQueue.ts` — consume autoStart
- `apps/studio/.../ImportsPage.tsx` / batch panel — navigate on complete when preference on
- `ImportResultPanel.tsx` / `BatchImportResultPanel.tsx` — copy + link with optional autoStart
- `docs/project/DECISIONS.md` — ADR-FP-014 amendment
- `docs/architecture/ARCHITECTURE.md` or BACKEND one-liner if import→AI flow described

### Architecture Impact

- [x] Details: Renderer-only orchestration; reuse sequential queue; no new CF auto-trigger from import pipeline

### Security Impact

- [x] None (staff Studio only; existing enqueue auth)

### Data Model Impact

- [x] None

### Backend Impact

- [x] None (no Functions deploy required for this goal)

### UI / UX Impact

- [x] Details: Imports auto-navigate when Auto advance on; Processing starts without Start AI click

### Migration Impact

- [x] None — sessionStorage preference semantics change (unset now means on)

---

## Approach

1. Change `readAiProcessingAutoAdvancePreference`: missing key → `true`; `"false"` → false; `"true"` → true.
2. Add `AI_REVIEW_AUTO_START_QUERY_PARAM = "autoStart"`; `getAiReviewPath({ autoStart?: boolean })`.
3. `ImportsPage` / batch complete: if preference on and success → `navigate(getAiReviewPath({ autoStart: true }))` once per completion (ref-guard).
4. `AiReviewPage`: when `autoStart=1`, Processing tab, not loading, `canStartAutoQueue` → `startAutoQueue()` once; `replace` URL without param.
5. If preference off or no awaiting designs, strip param without starting.
6. Amend ADR-FP-014 + import panel copy.
7. Tests + manual checkpoint.

---

## Test Strategy

### Automated

| Check | Command | Required |
|-------|---------|----------|
| Preference + eligibility tests | `npx tsx --test` on ai-processing queue preference/utils | yes |
| Lint touched files | ReadLints | best effort |

### Manual

| Scenario | Expected |
|----------|----------|
| Fresh session, Auto advance unset | Toggle shows ON |
| Batch import with Auto advance ON | Lands on Processing; queue starts sequentially |
| Auto advance OFF, import | Stays / manual open; no auto queue |
| Pause still works | Pause stops further starts |

---

## Human Checkpoints Anticipated

- Manual Studio import → AI Processing smoke (PASS / FAIL / PASS WITH NOTES)

---

## Risks & Rollback

| Risk | Mitigation |
|------|------------|
| Reintroduce 429 storms | Sequential queue only; CF max instances unchanged |
| Navigate before Firestore list catches up | Effect retries until `canStartAutoQueue` or timeout/strip |
| Unexpected auto-start on revisit | Consume `autoStart` once; strip from URL |

Rollback: revert preference default + autoStart navigation/consume; restore ADR text.

---

## Amendment (2026-07-13, owner during manual checkpoint)

- Do **not** navigate away from Imports after upload.
- When Auto advance is on, start AI in the **background** via a session-scoped sequential enqueue queue (same callable as Processing tab / similar to customer-upload promote starting enrichment).
- Staff may open AI Processing to watch progress; they can keep importing back to back.
